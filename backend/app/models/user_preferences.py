from __future__ import annotations
from typing import Optional

"""
UserPreferences model — stores onboarding and job-matching preferences.
One-to-one with User (created during onboarding, updated anytime).
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base_class import Base


class UserPreferences(Base):
    __tablename__ = "user_preferences"

    # ── Primary Key ───────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # ── Foreign Key (one-to-one) ───────────────────────────────────────────────
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # ── Job Preferences (JSONB arrays) ────────────────────────────────────────
    preferred_roles: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    # e.g. ["ML Engineer", "Data Scientist", "Backend Developer"]

    preferred_domains: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    # e.g. ["AI / ML", "FinTech", "EdTech"]

    preferred_locations: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    # e.g. ["Bangalore", "Mumbai", "Remote"]

    preferred_countries: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    # e.g. ["India", "USA"]

    # ── Work Style ────────────────────────────────────────────────────────────
    work_mode: Mapped[str] = mapped_column(
        String(20),
        default="any",
        nullable=False,
    )
    # Values: "remote" | "hybrid" | "onsite" | "any"

    # ── Compensation ─────────────────────────────────────────────────────────
    minimum_stipend: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    # Monthly stipend in INR

    # ── Company Preferences ───────────────────────────────────────────────────
    preferred_company_size: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )
    # Values: "startup" | "mid-size" | "enterprise" | null

    # ── Notification Preferences ──────────────────────────────────────────────
    notification_email: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notification_whatsapp: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    notification_in_app: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # ── Timestamp ─────────────────────────────────────────────────────────────
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # ── Relationship ──────────────────────────────────────────────────────────
    user: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User",
        back_populates="preferences",
        lazy="select",
    )

    def __repr__(self) -> str:
        return f"<UserPreferences user_id={self.user_id} work_mode={self.work_mode!r}>"
