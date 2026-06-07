from __future__ import annotations
from typing import Optional

"""
Resume repository — all database operations for the Resume model.
"""
import uuid
from dataclasses import dataclass

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.resume import Resume


@dataclass
class ResumeCreateData:
    """Value object carrying file metadata for resume creation."""
    user_id: uuid.UUID
    original_filename: str
    stored_filename: str
    file_path: str
    file_size: int
    mime_type: str


class ResumeRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, data: ResumeCreateData) -> Resume:
        """Create a new resume record. Sets is_active=False by default."""
        resume = Resume(
            user_id=data.user_id,
            original_filename=data.original_filename,
            stored_filename=data.stored_filename,
            file_path=data.file_path,
            file_size=data.file_size,
            mime_type=data.mime_type,
            is_active=False,
        )
        self.db.add(resume)
        await self.db.flush()
        await self.db.refresh(resume)
        return resume

    async def get_by_id(self, resume_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Resume]:
        """Fetch a resume by ID, scoped to the owning user."""
        result = await self.db.execute(
            select(Resume).where(
                Resume.id == resume_id,
                Resume.user_id == user_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_active_by_user(self, user_id: uuid.UUID) -> Optional[Resume]:
        """Fetch the currently active resume for a user."""
        result = await self.db.execute(
            select(Resume).where(
                Resume.user_id == user_id,
                Resume.is_active == True,  # noqa: E712
            )
        )
        return result.scalar_one_or_none()

    async def get_all_by_user(self, user_id: uuid.UUID) -> list[Resume]:
        """
        Fetch all resumes for a user, ordered newest first.
        """
        result = await self.db.execute(
            select(Resume)
            .where(Resume.user_id == user_id)
            .order_by(Resume.uploaded_at.desc())
        )
        return list(result.scalars().all())

    async def count_by_user(self, user_id: uuid.UUID) -> int:
        """Count total resumes for a user."""
        result = await self.db.execute(
            select(func.count()).where(Resume.user_id == user_id)
        )
        return result.scalar_one()

    async def set_active(self, resume_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Resume]:
        """
        Set the given resume as active for the user.
        Atomically deactivates all others first.
        """
        # Deactivate all resumes for this user
        await self.db.execute(
            update(Resume)
            .where(Resume.user_id == user_id)
            .values(is_active=False)
        )
        # Activate the selected one
        await self.db.execute(
            update(Resume)
            .where(Resume.id == resume_id, Resume.user_id == user_id)
            .values(is_active=True)
        )
        return await self.get_by_id(resume_id, user_id)

    async def delete(self, resume_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Resume]:
        """Delete a resume record. Returns the deleted object for cleanup."""
        resume = await self.get_by_id(resume_id, user_id)
        if resume:
            await self.db.delete(resume)
            await self.db.flush()
        return resume
