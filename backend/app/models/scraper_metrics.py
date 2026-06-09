from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import String, Integer, Float, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base_class import Base

class ScraperMetrics(Base):
    __tablename__ = "scraper_metrics"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    source_name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    jobs_found: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    jobs_parsed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    jobs_saved: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    jobs_rejected: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_run: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    runtime: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    success_rate: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="NOT_RUN", nullable=False)
