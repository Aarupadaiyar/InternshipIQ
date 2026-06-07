from __future__ import annotations

"""
User Preferences schemas.
"""
import uuid
from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

WorkMode = Literal["remote", "hybrid", "onsite", "any"]
CompanySize = Optional[Literal["startup", "mid-size", "enterprise"]]


# ── Request Schemas ───────────────────────────────────────────────────────────

class PreferencesCreate(BaseModel):
    """Schema for POST /preferences"""
    preferred_roles: list[str] = Field(
        default_factory=list,
        examples=[["ML Engineer", "Data Scientist"]],
    )
    preferred_domains: list[str] = Field(
        default_factory=list,
        examples=[["AI / ML", "FinTech"]],
    )
    preferred_locations: list[str] = Field(
        default_factory=list,
        examples=[["Bangalore", "Remote"]],
    )
    preferred_countries: list[str] = Field(
        default_factory=list,
        examples=[["India"]],
    )
    work_mode: WorkMode = Field(default="any")
    minimum_stipend: Optional[int] = Field(
        default=None,
        ge=0,
        examples=[15000],
        description="Monthly stipend in INR",
    )
    preferred_company_size: CompanySize = Field(default=None)
    notification_email: bool = Field(default=True)
    notification_whatsapp: bool = Field(default=False)
    notification_in_app: bool = Field(default=True)


class PreferencesUpdate(BaseModel):
    """Schema for PUT /preferences — all fields optional."""
    preferred_roles: Optional[list[str]] = None
    preferred_domains: Optional[list[str]] = None
    preferred_locations: Optional[list[str]] = None
    preferred_countries: Optional[list[str]] = None
    work_mode: Optional[WorkMode] = None
    minimum_stipend: Optional[int] = None
    preferred_company_size: CompanySize = None
    notification_email: Optional[bool] = None
    notification_whatsapp: Optional[bool] = None
    notification_in_app: Optional[bool] = None


# ── Response Schema ───────────────────────────────────────────────────────────

class PreferencesResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    preferred_roles: list[str]
    preferred_domains: list[str]
    preferred_locations: list[str]
    preferred_countries: list[str]
    work_mode: str
    minimum_stipend: Optional[int]
    preferred_company_size: Optional[str]
    notification_email: bool
    notification_whatsapp: bool
    notification_in_app: bool
    updated_at: datetime

    model_config = {"from_attributes": True}
