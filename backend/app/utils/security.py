from __future__ import annotations

"""
Password hashing and verification utilities using bcrypt via passlib.
"""
from passlib.context import CryptContext

# bcrypt with 12 rounds — good balance of security vs. performance
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)


def hash_password(plain_password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return _pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain-text password against a bcrypt hash.
    Returns False (not raises) on mismatch — safe for timing-attack resistance.
    """
    return _pwd_context.verify(plain_password, hashed_password)
