"""
Rejection Log Model — tracks every rejected job with full reason chain.
Every rejected job is stored here. No silent failures.
"""
from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base_class import Base


class RejectionLog(Base):
    __tablename__ = "rejection_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    # Source identification
    source: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    external_id: Mapped[str] = mapped_column(String(255), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    company: Mapped[str] = mapped_column(String(255), nullable=True)
    url: Mapped[str] = mapped_column(Text, nullable=True)

    # Rejection details
    rejection_reason: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    # Reason codes:
    # BROKEN_URL | DUPLICATE | EMPTY_DESCRIPTION | INVALID_TITLE | MISSING_COMPANY
    # FAILED_CATEGORY | VERIFICATION_FAILED | EXPIRED_JOB | JS_SPA_REJECTED
    # HTTP_ERROR | TIMEOUT | PARSE_ERROR

    rejection_detail: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Pipeline stage where rejection occurred
    pipeline_stage: Mapped[str] = mapped_column(String(50), nullable=False)
    # Stages: STRUCTURAL_CHECK | URL_VALIDATION | HTTP_VERIFICATION | TITLE_CHECK
    #         DESCRIPTION_CHECK | APPLY_CHECK | DEDUPLICATION | SAVE

    scrape_run_id: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<RejectionLog source={self.source!r} reason={self.rejection_reason!r} title={self.title[:40]!r}>"
