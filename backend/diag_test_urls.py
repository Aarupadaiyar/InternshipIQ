import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

async def run():
    from app.config import settings
    from app.models.job import JobModel
    from app.utils.verification_engine import verify_job

    engine = create_async_engine(settings.DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        r = await session.execute(
            select(JobModel.title, JobModel.company, JobModel.source_url, JobModel.description)
            .where(JobModel.source == "Unstop", JobModel.status == "BROKEN_URL")
            .limit(5)
        )
        rows = r.all()

        print("--- TESTING 5 REJECTED UNSTOP URLS ---")
        for row in rows:
            title, company, url, desc = row
            print(f"\nTesting: {title[:60]}")
            print(f"  URL: {url[:90]}")
            result = await verify_job(title, company, desc or "", url)
            print(f"  verified: {result['verified']}")
            print(f"  reason: {result['reason']}")

    await engine.dispose()

asyncio.run(run())
