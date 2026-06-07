from __future__ import annotations

"""
FastAPI dependency for authenticated routes.
Extracts and validates the JWT from the Authorization header,
then returns the current User ORM object.
"""
import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt_handler import get_user_id_from_token
from app.database.session import get_db
from app.models.user import User
from app.repositories.user_repository import UserRepository

# OAuth2-compatible Bearer scheme — appears in Swagger UI
_bearer_scheme = HTTPBearer(auto_error=True)

_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    FastAPI dependency for protected routes.

    Usage:
        @router.get("/protected")
        async def protected(user: User = Depends(get_current_user)):
            ...
    """
    try:
        user_id: uuid.UUID = get_user_id_from_token(credentials.credentials)
    except (JWTError, ValueError):
        raise _CREDENTIALS_EXCEPTION

    repo = UserRepository(db)
    user = await repo.get_by_id(user_id)
    if user is None:
        raise _CREDENTIALS_EXCEPTION
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )
    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Alias dependency that explicitly names the active-user requirement."""
    return current_user
