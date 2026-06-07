from __future__ import annotations

"""
JWT token creation and decoding.
Uses python-jose with HS256 algorithm.
"""
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt

from app.config import settings

# ── Token Payload Keys ────────────────────────────────────────────────────────
SUB_KEY = "sub"      # subject (user_id as string)
EXP_KEY = "exp"      # expiry timestamp
IAT_KEY = "iat"      # issued-at timestamp
TYPE_KEY = "type"    # token type ("access")


def create_access_token(user_id: uuid.UUID) -> str:
    """
    Create a signed JWT access token for the given user_id.
    Expiry is configured via ACCESS_TOKEN_EXPIRE_MINUTES.
    """
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: dict[str, Any] = {
        SUB_KEY: str(user_id),
        EXP_KEY: expire,
        IAT_KEY: now,
        TYPE_KEY: "access",
    }

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """
    Decode and validate a JWT token.
    Returns the payload dict on success.
    Raises JWTError on any failure (expired, invalid signature, etc.).
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])


def get_user_id_from_token(token: str) -> uuid.UUID:
    """
    Extract and return the user_id (UUID) from a verified JWT token.
    Raises JWTError if the token is invalid or sub is missing.
    """
    payload = decode_token(token)
    sub = payload.get(SUB_KEY)
    if not sub:
        raise JWTError("Token missing 'sub' claim")
    return uuid.UUID(sub)
