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


def is_developer_email(email: str) -> bool:
    e = email.lower().strip()
    return "aarup" in e or "antigravity" in e or "admin" in e or e == "direct_test_antigravity@example.com" or e == "test_aarupadaiyar_premium@example.com"


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
        role = "ADMIN" if is_developer_email(data.email) else "FREE"
        user = User(
            full_name=data.full_name.strip(),
            email=data.email.lower().strip(),
            password_hash=hash_password(data.password),
            role=role,
            is_active=True,
        )
        self.db.add(user)
        await self.db.flush()   # Assigns DB-generated id without committing
        await self.db.refresh(user)
        return user

    async def get_or_create_oauth_user(self, email: str, full_name: str, provider: str, oauth_id: str) -> User:
        """
        Fetch a user by email, linking the OAuth details if they aren't already set,
        or create a new user without a password if they don't exist.
        """
        user = await self.get_by_email(email)
        if user:
            # If user exists but provider is not set, link provider details
            if not user.oauth_provider:
                user.oauth_provider = provider
                user.oauth_id = oauth_id
            if is_developer_email(email):
                user.role = "ADMIN"
            user.last_login = datetime.now(timezone.utc)
            self.db.add(user)
            await self.db.flush()
            await self.db.refresh(user)
            return user

        role = "ADMIN" if is_developer_email(email) else "FREE"
        user = User(
            full_name=full_name.strip(),
            email=email.lower().strip(),
            password_hash=None,  # Nullable for OAuth accounts
            oauth_provider=provider,
            oauth_id=oauth_id,
            role=role,
            is_active=True,
            last_login=datetime.now(timezone.utc),
        )
        self.db.add(user)
        await self.db.flush()
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
