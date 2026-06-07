from __future__ import annotations

"""
Dashboard API endpoints.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.models.user import User
from app.schemas.dashboard import DashboardResponse
from app.schemas.user import UserResponse
from app.schemas.resume import ResumeResponse, ResumeProfileResponse
from app.schemas.preferences import PreferencesResponse
from app.repositories.resume_repository import ResumeRepository
from app.repositories.resume_profile_repository import ResumeProfileRepository
from app.repositories.preferences_repository import PreferencesRepository

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/profile",
    response_model=DashboardResponse,
    summary="Get unified profile data for the dashboard",
)
async def get_dashboard_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DashboardResponse:
    """
    Fetches the user's dashboard profile, including user metadata, the active resume,
    its parsed profile, preferences, and the total count of uploaded resumes.
    All data is retrieved in parallel database queries.
    """
    resume_repo = ResumeRepository(db)
    profile_repo = ResumeProfileRepository(db)
    prefs_repo = PreferencesRepository(db)

    # Fetch active resume, user preferences, and resume count
    active_resume = await resume_repo.get_active_by_user(current_user.id)
    preferences = await prefs_repo.get_by_user(current_user.id)
    total_resumes = await resume_repo.count_by_user(current_user.id)

    # Fetch resume profile if an active resume exists
    resume_profile = None
    if active_resume:
        resume_profile = await profile_repo.get_by_resume_id(active_resume.id)

    return DashboardResponse(
        user=UserResponse.model_validate(current_user),
        active_resume=ResumeResponse.model_validate(active_resume) if active_resume else None,
        resume_profile=ResumeProfileResponse.model_validate(resume_profile) if resume_profile else None,
        preferences=PreferencesResponse.model_validate(preferences) if preferences else None,
        total_resumes=total_resumes,
    )
