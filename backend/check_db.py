import asyncio
import re
from app.database.session import AsyncSessionLocal
from app.models.job import JobModel
from sqlalchemy import select

async def run():
    session = AsyncSessionLocal()
    res = await session.execute(select(JobModel).where(JobModel.title == "Full Stack Web Developer"))
    job = res.scalar()
    if job:
        skills_str = " ".join(job.required_skills).lower()
        searchable_text = f"{job.title} {job.company} {job.location} {job.description} {skills_str}".lower()
        print(f"Title: {job.title} | Company: {job.company} | Skills: {job.required_skills}")
        print(f"Searchable Text: {searchable_text}")
        
        term = "ml"
        synonyms = {
            "ml": [r"\bml\b", r"\bmachine\s+learning\b", r"\bai\b", r"\bartificial\s+intelligence\b", r"\bdata\s+science\b"],
        }
        for pattern_str in synonyms[term]:
            match = re.search(pattern_str, searchable_text)
            if match:
                print(f"Matched pattern: {pattern_str}")
                print(f"Match group: '{match.group(0)}' at {match.start()}-{match.end()}")
                break
    else:
        print("Job not found")
    await session.close()

if __name__ == '__main__':
    asyncio.run(run())
