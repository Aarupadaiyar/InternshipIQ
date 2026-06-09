from __future__ import annotations
import uuid
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.refresh_token import RefreshToken
from app.config import settings

class RefreshTokenRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_token(self, user_id: uuid.UUID) -> str:
        """Create a new secure random refresh token and store it in the database."""
        token_str = secrets.token_hex(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        refresh_token = RefreshToken(
            user_id=user_id,
            token=token_str,
            expires_at=expires_at,
            is_revoked=False
        )
        self.db.add(refresh_token)
        await self.db.flush()
        return token_str

    async def get_by_token(self, token_str: str) -> Optional[RefreshToken]:
        """Fetch refresh token from database."""
        result = await self.db.execute(
            select(RefreshToken).where(RefreshToken.token == token_str)
        )
        return result.scalar_one_or_none()

    async def verify_and_refresh(self, token_str: str) -> uuid.UUID:
        """
        Verify the refresh token. If valid and not expired/revoked, return the user_id.
        Otherwise raise ValueError.
        """
        db_token = await self.get_by_token(token_str)
        if not db_token:
            raise ValueError("Refresh token does not exist")
        if db_token.is_revoked:
            raise ValueError("Refresh token has been revoked")
            
        # Standardize timezone comparison
        expires_at = db_token.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
            
        if expires_at < datetime.now(timezone.utc):
            raise ValueError("Refresh token has expired")
            
        return db_token.user_id

    async def revoke_token(self, token_str: str) -> None:
        """Revoke a refresh token by setting is_revoked to True."""
        await self.db.execute(
            update(RefreshToken)
            .where(RefreshToken.token == token_str)
            .values(is_revoked=True)
        )
