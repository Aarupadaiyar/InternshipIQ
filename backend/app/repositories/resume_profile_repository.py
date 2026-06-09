from __future__ import annotations
from typing import Optional

"""
ResumeProfile repository — stores and retrieves parsed resume data.
"""
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.resume import Resume
from app.models.resume_profile import ResumeProfile
from app.schemas.resume import ResumeProfileCreate


class ResumeProfileRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(
        self,
        resume_id: uuid.UUID,
        user_id: uuid.UUID,
        data: ResumeProfileCreate,
    ) -> ResumeProfile:
        """Create a new resume profile record."""
        profile = ResumeProfile(
            resume_id=resume_id,
            user_id=user_id,
            skills=data.skills,
            projects=[p.model_dump() for p in data.projects],
            technologies=data.technologies,
            education=[e.model_dump() for e in data.education],
            certifications=data.certifications,
            achievements=data.achievements,
            experience=[ex.model_dump() for ex in data.experience],
            links=data.links,
            raw_text=data.raw_text,
        )
        self.db.add(profile)
        await self.db.flush()
        await self.db.refresh(profile)
        return profile

    async def update(
        self,
        profile: ResumeProfile,
        data: ResumeProfileCreate,
    ) -> ResumeProfile:
        """Update an existing resume profile in-place."""
        profile.skills = data.skills
        profile.projects = [p.model_dump() for p in data.projects]
        profile.technologies = data.technologies
        profile.education = [e.model_dump() for e in data.education]
        profile.certifications = data.certifications
        profile.achievements = data.achievements
        profile.experience = [ex.model_dump() for ex in data.experience]
        profile.links = data.links
        if data.raw_text is not None:
            profile.raw_text = data.raw_text
        await self.db.flush()
        await self.db.refresh(profile)
        return profile

    async def create_or_update(
        self,
        resume_id: uuid.UUID,
        user_id: uuid.UUID,
        data: ResumeProfileCreate,
    ) -> ResumeProfile:
        """Upsert: create if not exists, update if exists."""
        existing = await self.get_by_resume_id(resume_id)
        if existing:
            return await self.update(existing, data)
        return await self.create(resume_id, user_id, data)

    async def get_by_resume_id(self, resume_id: uuid.UUID) -> Optional[ResumeProfile]:
        """Fetch a profile by its associated resume_id."""
        result = await self.db.execute(
            select(ResumeProfile).where(ResumeProfile.resume_id == resume_id)
        )
        return result.scalar_one_or_none()

    async def get_active_by_user(self, user_id: uuid.UUID) -> Optional[ResumeProfile]:
        """
        Fetch the profile for the user's currently active resume.
        Uses a join to avoid N+1 queries.
        """
        result = await self.db.execute(
            select(ResumeProfile)
            .join(Resume, ResumeProfile.resume_id == Resume.id)
            .where(
                Resume.user_id == user_id,
                Resume.is_active == True,  # noqa: E712
            )
        )
        return result.scalar_one_or_none()
