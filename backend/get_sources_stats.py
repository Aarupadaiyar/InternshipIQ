import asyncio
from sqlalchemy import select, func
from app.database.session import AsyncSessionLocal
from app.models.source import Source
from app.models.job import JobModel
from app.models.rejection_log import RejectionLog

target_sources = ["Internshala", "Unstop", "Remote Jobs", "LinkedIn", "Naukri", "Wellfound"]

async def get_stats():
    async with AsyncSessionLocal() as session:
        print("Source Name,Implemented,Scheduled,Running,Last Run,Jobs Found,Jobs Saved,Jobs Rejected,Error Count,Coverage %")
        for name in target_sources:
            stmt = select(Source).where(Source.source_name == name)
            res = await session.execute(stmt)
            s = res.scalar()
            
            if s:
                implemented = "Yes" if s.scraper_status in ("ACTIVE", "TESTING") else "No"
                # Scheduled? Yes if active, since background runner runs it
                scheduled = "Yes (6h)" if s.scraper_status == "ACTIVE" else "No"
                running = "Idle" if s.scraper_status == "ACTIVE" else "No"
                last_run = s.last_run.isoformat() if s.last_run else "Never"
                
                # count from JobModel
                # jobs found: we can sum parsed + rejections, or get from jobs table.
                # let's look at counts from JobModel
                stmt_saved = select(func.count(JobModel.id)).where(JobModel.source == name, JobModel.is_active == True)
                jobs_saved = (await session.execute(stmt_saved)).scalar() or 0
                
                stmt_rejected = select(func.count(RejectionLog.id)).where(RejectionLog.source == name)
                jobs_rejected = (await session.execute(stmt_rejected)).scalar() or 0
                
                jobs_found = jobs_saved + jobs_rejected
                
                # error count: let's count error rejections (e.g., pipeline stage errors or logs)
                # For this source
                err_stmt = select(func.count(RejectionLog.id)).where(RejectionLog.source == name, RejectionLog.rejection_reason != "DUPLICATE")
                error_count = (await session.execute(err_stmt)).scalar() or 0
                
                coverage = "0%"
                if jobs_found > 0:
                    coverage = f"{round((jobs_saved / jobs_found) * 100, 1)}%"
                elif s.jobs_scraped > 0:
                    coverage = f"{round((s.jobs_active / s.jobs_scraped) * 100, 1)}%"
                
                print(f"{name},{implemented},{scheduled},{running},{last_run},{jobs_found},{jobs_saved},{jobs_rejected},{error_count},{coverage}")
            else:
                print(f"{name},No,No,No,Never,0,0,0,0,0%")

if __name__ == '__main__':
    asyncio.run(get_stats())
