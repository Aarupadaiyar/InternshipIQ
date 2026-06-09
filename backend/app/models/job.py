from __future__ import annotations
import uuid
from datetime import datetime

from sqlalchemy import String, Text, DateTime, JSON, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base_class import Base


class JobModel(Base):
    __tablename__ = "jobs"

    # ── Primary Key ───────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )

    # ── Fields ────────────────────────────────────────────────────────────────
    external_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    company: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # Remote, Hybrid, On-site
    salary: Mapped[str | None] = mapped_column(String(100), nullable=True)
    source: Mapped[str] = mapped_column(String(100), nullable=False)  # LinkedIn, Internshala, Unstop
    domain: Mapped[str] = mapped_column(String(255), nullable=False, default="General")
    source_url: Mapped[str] = mapped_column(Text, nullable=False)
    application_url: Mapped[str] = mapped_column(Text, nullable=False)
    direct_job_url: Mapped[str] = mapped_column(Text, nullable=False, default="")
    verification_status: Mapped[str] = mapped_column(String(50), default="PENDING", nullable=False) # PENDING, VERIFIED, REJECTED
    source_type: Mapped[str] = mapped_column(String(50), default="TYPE_A", nullable=False) # TYPE_A, TYPE_B
    freshness_status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False) # ACTIVE, EXPIRED, BROKEN
    last_verified: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="ACTIVE", nullable=False) # ACTIVE, BROKEN_URL, DUPLICATE, EXPIRED, UNCATEGORIZED, NEEDS_REVIEW
    is_active: Mapped[bool] = mapped_column(default=True, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    posted_at: Mapped[str] = mapped_column(String(50), nullable=False)

    # Advanced filter columns
    salary_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    salary_max: Mapped[int | None] = mapped_column(Integer, nullable=True)
    experience_level: Mapped[str] = mapped_column(String(50), default="0 Years", nullable=False)
    internship_type: Mapped[str] = mapped_column(String(50), default="Full Time", nullable=False)
    company_type: Mapped[str] = mapped_column(String(50), default="Growth Stage", nullable=False)
    deadline_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


    description: Mapped[str] = mapped_column(Text, nullable=False)
    required_skills: Mapped[list[str]] = mapped_column(JSON, nullable=False)

    # ── Timestamps ────────────────────────────────────────────────────────────
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Job id={self.id} title={self.title!r} company={self.company!r} verification_status={self.verification_status} freshness_status={self.freshness_status}>"
