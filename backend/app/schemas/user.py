from __future__ import annotations

"""
User schemas — input validation and response shaping.
Never exposes password_hash or internal file paths.
"""
import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


# ── Request Schemas ───────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    """Schema for POST /auth/register"""
    full_name: str = Field(..., min_length=2, max_length=255, examples=["Aarav Kumar"])
    email: EmailStr = Field(..., examples=["aarav@example.com"])
    password: str = Field(..., min_length=8, max_length=128, examples=["securepassword"])

    @field_validator("full_name")
    @classmethod
    def full_name_must_not_be_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("full_name cannot be blank")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_complexity(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    """Schema for POST /auth/login"""
    email: EmailStr = Field(..., examples=["aarav@example.com"])
    password: str = Field(..., examples=["securepassword"])


class OAuthLoginRequest(BaseModel):
    """Schema for OAuth login endpoints"""
    code: str = Field(..., examples=["oauthcode123"])
    redirect_uri: str = Field("", examples=["http://localhost:3000/auth/callback/google"])



# ── Response Schemas ──────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    """Safe user representation — never includes password_hash."""
    id: uuid.UUID
    full_name: str
    email: EmailStr
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    """Schema for POST /auth/login response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class TokenRefreshRequest(BaseModel):
    """Schema for POST /auth/refresh request."""
    refresh_token: str


class LogoutRequest(BaseModel):
    """Schema for POST /auth/logout request."""
    refresh_token: str


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
