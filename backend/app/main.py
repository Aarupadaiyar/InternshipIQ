from __future__ import annotations

"""
Main FastAPI Application Entrypoint with Background Task Scheduler.
"""
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api import api_router
from app.config import settings
from app.database.base import Base  # Load all models for SQLAlchemy registry
from app.middleware.cors import setup_cors
from app.middleware.rate_limit import limiter
from app.middleware.headers import SecurityHeadersMiddleware



async def run_periodic_scraper():
    """
    Background worker loop that crawls new jobs every 6 hours.
    """
    print("Background Scraper: Worker loop started.")
    # Allow the FastAPI server a short buffer to boot and bind to port
    await asyncio.sleep(5)
    
    while True:
        try:
            print("Background Scraper: Fetching new jobs from Unstop and Internshala...")
            from app.utils.scraper import crawl_and_save
            await crawl_and_save()
            print("Background Scraper: Fetching complete. Next run in 6 hours.")
        except Exception as e:
            import sys
            print(f"Background Scraper Error: {e}", file=sys.stderr)
            
        # 6 hours = 21600 seconds
        await asyncio.sleep(21600)


async def run_periodic_freshness_check():
    """
    Background worker loop that checks the freshness of jobs every 24 hours.
    """
    print("Background Freshness Checker: Worker loop started.")
    # Run first check after 30 seconds
    await asyncio.sleep(30)
    
    from app.database.session import AsyncSessionLocal
    from app.utils.freshness_engine import run_freshness_check
    
    while True:
        try:
            print("Background Freshness Checker: Starting validation run...")
            async with AsyncSessionLocal() as session:
                stats = await run_freshness_check(session)
                print(f"Background Freshness Checker: Complete. Stats: {stats}")
        except Exception as e:
            import sys
            print(f"Background Freshness Checker Error: {e}", file=sys.stderr)
            
        # 24 hours = 86400 seconds
        await asyncio.sleep(86400)


async def run_periodic_daily_digest():
    """
    Background worker loop that matches daily new jobs with premium users and dispatches digests.
    Checks hourly for pending email dispatches.
    """
    print("Background Daily Digest Worker: Worker loop started.")
    # Allow server buffer
    await asyncio.sleep(15)

    import datetime
    import zoneinfo
    import uuid
    from sqlalchemy import select
    from app.database.session import AsyncSessionLocal
    from app.models.subscription import PremiumUser, EmailDigestLog
    from app.models.user import User
    from app.models.user_preferences import UserPreferences
    from app.models.resume_profile import ResumeProfile
    from app.models.job import JobModel
    from app.api.jobs import calculate_match_score
    from app.utils.email_engine import send_daily_digest_email

    while True:
        try:
            print("Background Daily Digest Worker: Beginning email digest checking cycle...")
            async with AsyncSessionLocal() as db:
                # 1. Fetch active premium users and their preferences
                now = datetime.datetime.now(datetime.timezone.utc)
                stmt_pu = select(PremiumUser, User, UserPreferences).join(
                    User, PremiumUser.user_id == User.id
                ).outerjoin(
                    UserPreferences, User.id == UserPreferences.user_id
                ).where(
                    PremiumUser.is_premium == True,
                    PremiumUser.premium_until >= now
                )
                res_pu = await db.execute(stmt_pu)
                active_premiums = res_pu.all()

                # 2. Fetch jobs added in last 24 hours
                yesterday = now - datetime.timedelta(days=1)
                stmt_jobs = select(JobModel).where(
                    JobModel.created_at >= yesterday,
                    JobModel.is_active == True
                )
                res_jobs = await db.execute(stmt_jobs)
                latest_jobs = res_jobs.scalars().all()

                if not latest_jobs:
                    print("Background Daily Digest Worker: No new listings in the last 24 hours.")
                else:
                    for pu, user, prefs in active_premiums:
                        # Skip if email digest is disabled
                        email_enabled = prefs.email_digest_enabled if prefs else True
                        if not email_enabled:
                            continue

                        # Check timezone and scheduled hour
                        user_tz = prefs.timezone if (prefs and prefs.timezone) else "UTC"
                        user_digest_time = prefs.digest_time if (prefs and prefs.digest_time) else "09:00 AM"

                        try:
                            tz = zoneinfo.ZoneInfo(user_tz)
                        except Exception:
                            tz = zoneinfo.ZoneInfo("UTC")

                        local_now = now.astimezone(tz)

                        # Parse scheduled hour from digest_time string (e.g. "09:00 AM")
                        try:
                            dt_str = user_digest_time.strip().upper()
                            time_part, ampm = dt_str.split()
                            h_str, m_str = time_part.split(":")
                            sched_hour = int(h_str)
                            if ampm == "PM" and sched_hour < 12:
                                sched_hour += 12
                            elif ampm == "AM" and sched_hour == 12:
                                sched_hour = 0
                        except Exception:
                            sched_hour = 9  # Default to 9 AM

                        if local_now.hour != sched_hour:
                            continue

                        # Prevent duplicate sends in last 20 hours
                        stmt_log = select(EmailDigestLog).where(
                            EmailDigestLog.user_id == user.id,
                            EmailDigestLog.sent_at >= now - datetime.timedelta(hours=20)
                        )
                        res_log = await db.execute(stmt_log)
                        already_sent = res_log.scalars().first()
                        if already_sent:
                            continue

                        # Get latest resume profile for skills
                        stmt_profile = select(ResumeProfile).where(
                            ResumeProfile.user_id == user.id
                        ).order_by(ResumeProfile.parsed_at.desc())
                        res_profile = await db.execute(stmt_profile)
                        profile = res_profile.scalars().first()

                        user_skills = profile.skills if profile else []

                        matched_jobs = []
                        for job in latest_jobs:
                            score, breakdown, gaps = calculate_match_score(job.required_skills, user_skills)
                            if score >= 50:
                                matched_jobs.append({
                                    "title": job.title,
                                    "company": job.company,
                                    "location": job.location,
                                    "match_score": score,
                                    "skills": job.required_skills,
                                    "gaps": gaps,
                                    "source_url": job.source_url,
                                    "posted_at": job.posted_at,
                                    "source": job.source
                                })

                        if matched_jobs:
                            digest_log_id = uuid.uuid4()
                            # Trigger email sending (handles sandbox/mock modes natively)
                            sent_success = await send_daily_digest_email(
                                user.email,
                                user.full_name,
                                matched_jobs,
                                digest_log_id=str(digest_log_id)
                            )

                            # Log sent status
                            digest_log = EmailDigestLog(
                                id=digest_log_id,
                                user_id=user.id,
                                recipient_email=user.email,
                                subject="Your InternshipIQ Daily Internship Digest",
                                jobs_sent_count=len(matched_jobs),
                                status="sent" if sent_success else "failed"
                            )
                            db.add(digest_log)
                            await db.commit()
                            print(f"Background Daily Digest Worker: Dispatched digest email to {user.email} with {len(matched_jobs)} recommendations. Log ID: {digest_log_id}")
                        else:
                            print(f"Background Daily Digest Worker: No suitable matches (>=50%) found for user {user.email}.")
        except Exception as e:
            print(f"Background Daily Digest Worker Error: {e}")

        # Re-check every hour
        await asyncio.sleep(3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager that handles server startup and shutdown hooks.
    """
    # 1. Startup: Spawn background tasks
    scraper_task = asyncio.create_task(run_periodic_scraper())
    freshness_task = asyncio.create_task(run_periodic_freshness_check())
    digest_task = asyncio.create_task(run_periodic_daily_digest())
    yield
    # 2. Shutdown: Cancel background tasks to prevent dangling threads
    print("Shutting down background workers...")
    scraper_task.cancel()
    freshness_task.cancel()
    digest_task.cancel()
    try:
        await asyncio.gather(scraper_task, freshness_task, digest_task, return_exceptions=True)
    except asyncio.CancelledError:
        pass


def create_app() -> FastAPI:
    """
    App factory to build, configure, and return the FastAPI application instance.
    """
    app = FastAPI(
        title="Internship IQ Backend API",
        description="Production-ready FastAPI backend for user profiles, resumes, and preferences.",
        version="1.0.0",
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
        lifespan=lifespan,
    )

    # 1. Register Rate Limiter
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # 2. Setup CORS Middleware and Security Headers
    setup_cors(app)
    app.add_middleware(SecurityHeadersMiddleware)

    # 3. Mount Routers
    app.include_router(api_router)

    # 4. Health Check Route
    @app.get("/health", tags=["System"], summary="Health check endpoint")
    async def health() -> dict[str, str]:
        """Verify the API server is alive and responding."""
        return {"status": "ok"}

    return app


app = create_app()
