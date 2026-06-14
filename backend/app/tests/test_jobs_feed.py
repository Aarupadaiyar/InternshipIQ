from __future__ import annotations
import pytest
import datetime
from datetime import timezone
import uuid
from sqlalchemy import delete
from app.database.session import AsyncSessionLocal, engine
from app.models.job import JobModel
from app.api.jobs import get_jobs

@pytest.fixture
def anyio_backend():
    return "asyncio"

@pytest.mark.anyio
async def test_job_feed_shuffling_and_diversification():
    """
    Verify that the job feed:
    1. Returns a diverse feed where no more than 2 consecutive listings from the same source appear.
    2. Shuffles deterministically using a daily seed so that pagination is stable.
    """
    async with AsyncSessionLocal() as session:
        # Create a set of test jobs from the same source
        # to test consecutive de-clustering.
        sources = ["Unstop", "Unstop", "Unstop", "Internshala", "Internshala", "LinkedIn"]
        job_models = []
        
        for i, src in enumerate(sources):
            job = JobModel(
                external_id=str(uuid.uuid4()),
                title=f"Test Job Feed {i}",
                company=f"Company {i}",
                location="Remote",
                type="Remote",
                salary=str(10000 + i),
                source=src,
                source_url=f"https://example.com/test-feed-source-{i}",
                application_url=f"https://example.com/test-feed-{i}",
                posted_at=datetime.datetime.now(timezone.utc).date().isoformat(),
                description="Test description",
                required_skills=["Python"],
                is_active=True
            )
            session.add(job)
            job_models.append(job)
            
        await session.commit()

        try:
            # 1. Fetch all jobs directly calling the async function with explicit arguments
            data = await get_jobs(
                skills=None,
                search="Test Job Feed",
                type="all",
                source="all",
                domain="all",
                location=None,
                company=None,
                salary_min=None,
                salary_max=None,
                experience=None,
                internship_type=None,
                company_type=None,
                deadline=None,
                posted_days=None,
                verified_only=None,
                page=1,
                limit=10,
                db=session
            )
            jobs = data.get("jobs", [])
            
            # Filter to only our created test jobs
            test_jobs = [j for j in jobs if "Test Job Feed" in j["title"]]
            
            # Check consecutive sources constraint (max 2)
            consecutive = 0
            current_src = None
            for j in test_jobs:
                src = j["source"]
                if src == current_src:
                    consecutive += 1
                else:
                    current_src = src
                    consecutive = 1
                assert consecutive <= 2, f"Found {consecutive} consecutive listings from source '{src}': {test_jobs}"

            # 2. Test pagination consistency (no duplicates across pages)
            data_p1 = await get_jobs(
                skills=None,
                search="Test Job Feed",
                type="all",
                source="all",
                domain="all",
                location=None,
                company=None,
                salary_min=None,
                salary_max=None,
                experience=None,
                internship_type=None,
                company_type=None,
                deadline=None,
                posted_days=None,
                verified_only=None,
                page=1,
                limit=2,
                db=session
            )
            data_p2 = await get_jobs(
                skills=None,
                search="Test Job Feed",
                type="all",
                source="all",
                domain="all",
                location=None,
                company=None,
                salary_min=None,
                salary_max=None,
                experience=None,
                internship_type=None,
                company_type=None,
                deadline=None,
                posted_days=None,
                verified_only=None,
                page=2,
                limit=2,
                db=session
            )
            
            jobs_p1 = data_p1.get("jobs", [])
            jobs_p2 = data_p2.get("jobs", [])
            
            # Ensure the same job does not appear in page 1 and page 2
            ids_p1 = {j["id"] for j in jobs_p1}
            ids_p2 = {j["id"] for j in jobs_p2}
            
            duplicates = ids_p1.intersection(ids_p2)
            assert len(duplicates) == 0, f"Found duplicate jobs across pages 1 and 2: {duplicates}"
                
        finally:
            # Clean up test database records
            for job in job_models:
                await session.delete(job)
            await session.commit()
