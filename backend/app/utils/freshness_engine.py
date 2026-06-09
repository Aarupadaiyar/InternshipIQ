from __future__ import annotations
import asyncio
import sys
import uuid
import httpx
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.job import JobModel
from app.utils.verification_engine import clean_html_to_text, HEADERS

CLOSED_KEYWORDS = [
    "job is closed",
    "position has been filled",
    "no longer accepting applications",
    "application is closed",
    "listing has expired",
    "job is no longer available",
    "this posting has expired",
    "not found",
    "404",
]

async def check_single_job_freshness(job: JobModel, db: AsyncSession) -> tuple[uuid.UUID, str]:
    """
    Check freshness of a single job.
    Returns (job_id, new_freshness_status)
    """
    url = job.application_url
    try:
        async with httpx.AsyncClient(headers=HEADERS, timeout=10.0, follow_redirects=True) as client:
            res = await client.get(url)
            
            # If 404/410, it's broken or expired
            if res.status_code in [404, 410]:
                return job.id, "BROKEN"
                
            # If any other error (except redirect 200)
            if res.status_code != 200:
                return job.id, "BROKEN"

            # Check if redirected to homepage/careers index (meaning original job page is gone)
            from app.utils.verification_engine import is_generic_careers_url
            final_url = str(res.url)
            if is_generic_careers_url(final_url) or "login" in final_url.lower():
                return job.id, "EXPIRED"

            # Check page body for closed keywords
            page_text = clean_html_to_text(res.text).lower()
            for kw in CLOSED_KEYWORDS:
                if kw in page_text:
                    return job.id, "EXPIRED"

            return job.id, "ACTIVE"

    except Exception:
        # Network errors, DNS resolution failures, timeouts -> mark BROKEN
        return job.id, "BROKEN"


async def run_freshness_check(db: AsyncSession) -> dict[str, int]:
    """
    Run freshness validation for all currently ACTIVE and VERIFIED jobs in the database.
    Updates the database record status.
    Returns a dict with statistics of the run.
    """
    # 1. Fetch all active verified jobs
    stmt = select(JobModel).where(
        JobModel.verification_status == "VERIFIED",
        JobModel.freshness_status == "ACTIVE"
    )
    res = await db.execute(stmt)
    active_jobs = list(res.scalars().all())
    
    if not active_jobs:
        return {"total_checked": 0, "active": 0, "expired": 0, "broken": 0}

    print(f"Freshness Check: Validating {len(active_jobs)} active listings...")
    
    # 2. Run concurrently in batches of 15 to avoid spamming target sites
    batch_size = 15
    results = []
    
    for i in range(0, len(active_jobs), batch_size):
        batch = active_jobs[i:i + batch_size]
        tasks = [check_single_job_freshness(job, db) for job in batch]
        batch_results = await asyncio.gather(*tasks)
        results.extend(batch_results)
        # Polite delay between batches
        await asyncio.sleep(0.5)

    # 3. Apply updates to DB
    active_count = 0
    expired_count = 0
    broken_count = 0
    
    for job_id, status in results:
        await db.execute(
            update(JobModel)
            .where(JobModel.id == job_id)
            .values(freshness_status=status)
        )
        
        if status == "ACTIVE":
            active_count += 1
        elif status == "EXPIRED":
            expired_count += 1
        elif status == "BROKEN":
            broken_count += 1

    await db.commit()
    
    stats = {
        "total_checked": len(active_jobs),
        "active": active_count,
        "expired": expired_count,
        "broken": broken_count
    }
    print(f"Freshness Check Complete: {stats}")
    return stats
