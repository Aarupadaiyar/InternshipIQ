import asyncio
from app.database.session import AsyncSessionLocal
from app.api.jobs import get_jobs

async def check():
    async with AsyncSessionLocal() as session:
        # Fetch first page of jobs
        res = await get_jobs(
            skills=None,
            search=None,
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
            limit=20,
            db=session
        )
        jobs = res.get("jobs", [])
        print(f"Total jobs returned: {len(jobs)}")
        for idx, j in enumerate(jobs):
            print(f"{idx+1}. Title: {j['title'][:30]} | Source: {j['source']} | Date: {j['postedAt']}")

if __name__ == "__main__":
    asyncio.run(check())
