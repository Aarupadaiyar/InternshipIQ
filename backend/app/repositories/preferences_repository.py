from __future__ import annotations
from typing import Optional

"""
UserPreferences repository — one-to-one with User.
"""
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user_preferences import UserPreferences
from app.schemas.preferences import PreferencesCreate, PreferencesUpdate


class PreferencesRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_user(self, user_id: uuid.UUID) -> Optional[UserPreferences]:
        """Fetch preferences for a user."""
        result = await self.db.execute(
            select(UserPreferences).where(UserPreferences.user_id == user_id)
        )
        return result.scalar_one_or_none()

    async def create(
        self, user_id: uuid.UUID, data: PreferencesCreate
    ) -> UserPreferences:
        """Create a new preferences record for a user."""
        prefs = UserPreferences(
            user_id=user_id,
            preferred_roles=data.preferred_roles,
            preferred_domains=data.preferred_domains,
            preferred_locations=data.preferred_locations,
            preferred_countries=data.preferred_countries,
            work_mode=data.work_mode,
            minimum_stipend=data.minimum_stipend,
            preferred_company_size=data.preferred_company_size,
            notification_email=data.notification_email,
            notification_whatsapp=data.notification_whatsapp,
            notification_in_app=data.notification_in_app,
        )
        self.db.add(prefs)
        await self.db.flush()
        await self.db.refresh(prefs)
        return prefs

    async def update(
        self, prefs: UserPreferences, data: PreferencesUpdate
    ) -> UserPreferences:
        """Partially update existing preferences — only non-None fields."""
        update_data = data.model_dump(exclude_none=True)
        for field, value in update_data.items():
            setattr(prefs, field, value)
        await self.db.flush()
        await self.db.refresh(prefs)
        return prefs

    async def create_or_update(
        self, user_id: uuid.UUID, data: PreferencesCreate
    ) -> UserPreferences:
        """Upsert preferences for a user."""
        existing = await self.get_by_user(user_id)
        if existing:
            # Convert PreferencesCreate to PreferencesUpdate for partial update
            update_data = PreferencesUpdate(**data.model_dump())
            return await self.update(existing, update_data)
        return await self.create(user_id, data)
