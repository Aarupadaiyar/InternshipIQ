from __future__ import annotations
from typing import Optional
import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Text, func, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base_class import Base


class ResumeProfile(Base):
    __tablename__ = "user_profiles"

    # ── Primary Key ───────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # ── Foreign Keys ─────────────────────────────────────────────────────────
    resume_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_resumes.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,   # One profile per resume
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── Profiles Fields (from specs) ──────────────────────────────────────────
    career_interests: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    locations: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    preferred_domains: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    experience_level: Mapped[str] = mapped_column(String(50), default="0 Years", nullable=False)
    resume_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # ── Extracted Data (JSONB) ─────────────────────────────────────────────────
    skills: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    # e.g. ["Python", "FastAPI", "PostgreSQL"]

    projects: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    # e.g. [{"name": "...", "description": "...", "tech": [...]}]

    technologies: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    # Deduplicated tech stack across all projects

    education: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    # e.g. [{"degree": "B.Tech CS", "institution": "...", "year": "2025"}]

    certifications: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    # e.g. ["AWS Certified", "Google Cloud Associate"]

    achievements: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    # e.g. ["Winner of Smart India Hackathon", "Dean's list"]

    experience: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    # e.g. [{"role": "Intern", "company": "...", "duration": "3 months", "bullets": [...]}]

    links: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    # e.g. {"github": "...", "linkedin": "...", "portfolio": "..."}

    career_recommendations: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    # e.g. ["Frontend Developer", "Backend Developer"]

    soft_skills: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    # e.g. ["Leadership", "Communication"]

    experience_signals: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    # e.g. ["Club President", "Community Leader"]

    achievement_signals: Mapped[list] = mapped_column(JSONB, default=list, nullable=False)
    # e.g. ["Hackathon Winner", "Research Publication"]

    # ── Raw Text ──────────────────────────────────────────────────────────────
    # Stored for future AI re-parsing without requiring re-upload
    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Timestamp ─────────────────────────────────────────────────────────────
    parsed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    resume: Mapped["Resume"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "Resume",
        back_populates="profile",
        lazy="select",
    )

    # ── Indexes ───────────────────────────────────────────────────────────────
    __table_args__ = (
        Index("ix_user_profiles_user_id", "user_id"),
    )

    def __repr__(self) -> str:
        return f"<ResumeProfile id={self.id} resume_id={self.resume_id}>"
