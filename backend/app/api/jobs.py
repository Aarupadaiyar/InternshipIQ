from __future__ import annotations
import uuid
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.models.job import JobModel
from app.schemas.job import JobResponse, JobPaginatedResponse, MatchBreakdown

router = APIRouter(prefix="/jobs", tags=["Jobs"])


def calculate_match_score(job_skills: List[str], user_skills: List[str]) -> tuple[int, MatchBreakdown, List[str]]:
    # Convert lists to lowercase for case-insensitive matching
    user_skills_lower = [s.lower() for s in user_skills]
    job_skills_lower = [s.lower() for s in job_skills]
    
    # Overlap calculation
    matched = []
    gaps = []
    for js in job_skills:
        js_lower = js.lower()
        is_matched = False
        for us_lower in user_skills_lower:
            if us_lower in js_lower or js_lower in us_lower:
                is_matched = True
                break
        if is_matched:
            matched.append(js)
        else:
            gaps.append(js)
            
    ratio = len(matched) / max(len(job_skills), 1)
    
    # Match criteria matches frontend mockJobs.ts
    skill_match = round(ratio * 25)
    resume_match = round(min(ratio * 1.4, 1.0) * 40)
    experience = 12  # deterministic experience score
    location = 10    # default location score
    preferences = 10 # default preferences score
    
    total = min(skill_match + resume_match + experience + location + preferences, 99)
    
    breakdown = MatchBreakdown(
        resumeMatch=resume_match,
        skillMatch=skill_match,
        experience=experience,
        location=location,
        preferences=preferences,
        total=total
    )
    return total, breakdown, gaps


@router.get("", response_model=JobPaginatedResponse)
async def get_jobs(
    skills: Optional[str] = Query(None, description="Comma separated list of user skills"),
    search: Optional[str] = Query(None, description="Search query"),
    type: Optional[str] = Query("all", description="Job type (Remote, Hybrid, On-site, all)"),
    source: Optional[str] = Query("all", description="Job source (LinkedIn, Internshala, Unstop, all)"),
    domain: Optional[str] = Query("all", description="Job domain (all or specific domain)"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    db: AsyncSession = Depends(get_db)
):
    # Base query
    stmt = select(JobModel)
    
    # Filters list
    filters = []
    if search:
        search_lower = f"%{search.lower()}%"
        filters.append(
            or_(
                JobModel.title.ilike(search_lower),
                JobModel.company.ilike(search_lower),
                JobModel.location.ilike(search_lower),
                JobModel.description.ilike(search_lower)
            )
        )
        
    if type and type != "all":
        filters.append(JobModel.type == type)
        
    if source and source != "all":
        filters.append(JobModel.source == source)
        
    if domain and domain != "all":
        filters.append(JobModel.domain == domain)
        
    if filters:
        stmt = stmt.where(and_(*filters))
        
    # Execute query
    result = await db.execute(stmt)
    all_jobs = result.scalars().all()
    
    # Parse user skills
    user_skills = [s.strip() for s in skills.split(",")] if skills else []
    user_skills = [s for s in user_skills if s]
    
    # Compute match scores if skills are provided
    jobs_list = []
    for job in all_jobs:
        match_score = None
        match_breakdown = None
        skill_gaps = None
        
        if user_skills:
            score, breakdown, gaps = calculate_match_score(job.required_skills, user_skills)
            match_score = score
            match_breakdown = breakdown
            skill_gaps = gaps
            
        jobs_list.append({
            "id": job.id,
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "type": job.type,
            "salary": job.salary,
            "source": job.source,
            "sourceUrl": job.source_url,  # Field maps to frontend's camelCase
            "postedAt": job.posted_at,
            "description": job.description,
            "requiredSkills": job.required_skills,
            "matchScore": match_score,
            "matchBreakdown": match_breakdown,
            "skillGaps": skill_gaps
        })
        
    # Sort by match score if skills present, otherwise sort by postedAt desc
    if user_skills:
        jobs_list.sort(key=lambda j: j["matchScore"] or 0, reverse=True)
    else:
        jobs_list.sort(key=lambda j: j["postedAt"], reverse=True)
        
    # Paginate in memory
    total = len(jobs_list)
    start_idx = (page - 1) * limit
    end_idx = start_idx + limit
    paginated_jobs = jobs_list[start_idx:end_idx]
    
    # Get all distinct sources dynamically
    sources_stmt = select(JobModel.source).distinct()
    sources_result = await db.execute(sources_stmt)
    distinct_sources = list(sources_result.scalars().all())
    
    return {
        "jobs": paginated_jobs,
        "total": total,
        "sources": distinct_sources,
        "fetchedAt": datetime.datetime.now().isoformat()
    }
