from __future__ import annotations
from typing import Optional

"""
User repository — all database operations for the User model.
Business logic lives in services; this layer only handles DB queries.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserCreate
from app.utils.security import hash_password


class UserRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, user_id: uuid.UUID) -> Optional[User]:
        """Fetch a user by primary key."""
        result = await self.db.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        """Fetch a user by email (case-insensitive)."""
        result = await self.db.execute(
            select(User).where(User.email == email.lower().strip())
        )
        return result.scalar_one_or_none()

    async def create(self, data: UserCreate) -> User:
        """
        Create and persist a new user.
        Password is hashed here — callers pass plain text.
        """
        user = User(
            full_name=data.full_name.strip(),
            email=data.email.lower().strip(),
            password_hash=hash_password(data.password),
            is_active=True,
        )
        self.db.add(user)
        await self.db.flush()   # Assigns DB-generated id without committing
        await self.db.refresh(user)
        return user

    async def update_name(self, user_id: uuid.UUID, full_name: str) -> Optional[User]:
        """Update a user's display name."""
        await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(full_name=full_name.strip(), updated_at=datetime.now(timezone.utc))
        )
        return await self.get_by_id(user_id)

    async def deactivate(self, user_id: uuid.UUID) -> None:
        """Soft-delete: mark user as inactive instead of deleting."""
        await self.db.execute(
            update(User)
            .where(User.id == user_id)
            .values(is_active=False, updated_at=datetime.now(timezone.utc))
        )

    async def email_exists(self, email: str) -> bool:
        """Check if an email is already registered."""
        result = await self.db.execute(
            select(User.id).where(User.email == email.lower().strip())
        )
        return result.scalar_one_or_none() is not None
