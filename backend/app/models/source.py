from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base_class import Base

class Source(Base):
    __tablename__ = "sources"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    source_name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)  # PORTAL or COMPANY
    base_url: Mapped[str] = mapped_column(String(255), nullable=False)
    scraper_status: Mapped[str] = mapped_column(String(50), default="NOT_IMPLEMENTED", nullable=False)  # ACTIVE, NOT_IMPLEMENTED, FAILED, DISABLED, TESTING
    jobs_scraped: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    jobs_active: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_run: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_success: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Source id={self.id} name={self.source_name!r} status={self.scraper_status}>"
