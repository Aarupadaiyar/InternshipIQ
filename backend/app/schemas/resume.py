from __future__ import annotations

"""
Resume and ResumeProfile schemas.
"""
import uuid
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


# ── Resume Response ───────────────────────────────────────────────────────────

class ResumeResponse(BaseModel):
    """Public resume metadata — never exposes file_path."""
    id: uuid.UUID
    user_id: uuid.UUID
    original_filename: str
    file_size: int
    mime_type: str
    is_active: bool
    uploaded_at: datetime

    model_config = {"from_attributes": True}


# ── Resume Profile Sub-Schemas ────────────────────────────────────────────────

class EducationItem(BaseModel):
    degree: str = Field(default="", examples=["B.Tech Computer Science"])
    institution: str = Field(default="", examples=["Lovely Professional University"])
    branch: Optional[str] = Field(default=None, examples=["Computer Science"])
    university: Optional[str] = Field(default=None, examples=["Lovely Professional University"])
    cgpa: Optional[str] = Field(default=None, examples=["8.21"])
    year: Optional[str] = Field(default=None, examples=["2025"])


class ExperienceItem(BaseModel):
    role: str = Field(default="", examples=["Data Automation Intern"])
    company: str = Field(default="", examples=["Bitzure"])
    duration: Optional[str] = Field(default=None, examples=["3 months"])
    bullets: list[str] = Field(default_factory=list)


class ProjectItem(BaseModel):
    name: str = Field(default="", examples=["Surge Price Prediction"])
    description: str = Field(default="", examples=["LightGBM + ExtraTreesRegressor model"])
    tech: list[str] = Field(default_factory=list, examples=[["Python", "LightGBM"]])
    technologies: list[str] = Field(default_factory=list)
    github: Optional[str] = None


# ── Resume Profile Schemas ────────────────────────────────────────────────────

class ResumeProfileCreate(BaseModel):
    """
    Schema for storing parsed resume data.
    Used by POST /resume/upload after parsing is done client-side or via AI.
    """
    skills: list[str] = Field(default_factory=list)
    projects: list[ProjectItem] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)
    education: list[EducationItem] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)
    experience: list[ExperienceItem] = Field(default_factory=list)
    links: dict = Field(default_factory=dict)
    raw_text: Optional[str] = None


class ResumeProfileResponse(BaseModel):
    """Full resume profile for API responses."""
    id: uuid.UUID
    resume_id: uuid.UUID
    user_id: uuid.UUID
    skills: list[Any]
    projects: list[Any]
    technologies: list[Any]
    education: list[Any]
    certifications: list[Any]
    achievements: list[Any] = Field(default_factory=list)
    experience: list[Any]
    links: dict
    parsed_at: datetime

    model_config = {"from_attributes": True}


class ResumeWithProfileResponse(BaseModel):
    """Resume metadata bundled with its parsed profile."""
    resume: ResumeResponse
    profile: Optional[ResumeProfileResponse] = None

    model_config = {"from_attributes": True}
