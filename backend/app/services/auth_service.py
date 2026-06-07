from __future__ import annotations

"""
Auth service — business logic for registration, login, and token management.
"""
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt_handler import create_access_token
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.user import TokenResponse, UserCreate, UserLogin, UserResponse
from app.utils.security import verify_password

_EMAIL_TAKEN = HTTPException(
    status_code=status.HTTP_409_CONFLICT,
    detail="An account with this email already exists",
)

_INVALID_CREDENTIALS = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid email or password",
    headers={"WWW-Authenticate": "Bearer"},
)


class AuthService:
    def __init__(self, db: AsyncSession) -> None:
        self.repo = UserRepository(db)

    async def register(self, data: UserCreate) -> User:
        """
        Register a new user.
        Raises HTTP 409 if the email is already in use.
        """
        if await self.repo.email_exists(data.email):
            raise _EMAIL_TAKEN
        return await self.repo.create(data)

    async def login(self, data: UserLogin) -> TokenResponse:
        """
        Authenticate a user and return a JWT access token.
        Uses constant-time comparison via passlib to resist timing attacks.
        Raises HTTP 401 on any failure (intentionally vague for security).
        """
        user = await self.repo.get_by_email(data.email)
        if not user or not verify_password(data.password, user.password_hash):
            raise _INVALID_CREDENTIALS
        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated. Contact support.",
            )

        token = create_access_token(user.id)
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=UserResponse.model_validate(user),
        )
