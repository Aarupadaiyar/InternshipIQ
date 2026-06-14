from __future__ import annotations
from typing import Optional

"""
Resume model — tracks uploaded resume files per user.
One user may have multiple resumes; exactly one is marked is_active=True.
"""
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base_class import Base


class Resume(Base):
    __tablename__ = "user_resumes"

    # ── Primary Key ───────────────────────────────────────────────────────────
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # ── Foreign Key ───────────────────────────────────────────────────────────
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # ── File Metadata ─────────────────────────────────────────────────────────
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    stored_filename: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    file_path: Mapped[str] = mapped_column(String(512), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, nullable=False)         # bytes
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)

    # ── Status ────────────────────────────────────────────────────────────────
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # ── Timestamp ─────────────────────────────────────────────────────────────
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )

    # ── Relationships ─────────────────────────────────────────────────────────
    user: Mapped["User"] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "User",
        back_populates="resumes",
        lazy="select",
    )
    profile: Mapped[Optional["ResumeProfile"]] = relationship(  # type: ignore[name-defined]  # noqa: F821
        "ResumeProfile",
        back_populates="resume",
        cascade="all, delete-orphan",
        uselist=False,
        lazy="select",
    )

    # ── Composite Indexes ─────────────────────────────────────────────────────
    __table_args__ = (
        Index("ix_resumes_user_uploaded", "user_id", "uploaded_at"),
        Index("ix_resumes_user_active", "user_id", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<Resume id={self.id} user_id={self.user_id} active={self.is_active}>"
