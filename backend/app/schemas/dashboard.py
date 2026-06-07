from __future__ import annotations
from typing import Optional

"""
Dashboard schema — single optimized response for GET /dashboard/profile.
"""
from pydantic import BaseModel

from app.schemas.preferences import PreferencesResponse
from app.schemas.resume import ResumeResponse, ResumeProfileResponse
from app.schemas.user import UserResponse


class DashboardResponse(BaseModel):
    """
    Composite response for the dashboard profile endpoint.
    Fetched in a single optimized DB query chain.
    """
    user: UserResponse
    active_resume: Optional[ResumeResponse] = None
    resume_profile: Optional[ResumeProfileResponse] = None
    preferences: Optional[PreferencesResponse] = None
    total_resumes: int = 0

    model_config = {"from_attributes": True}
