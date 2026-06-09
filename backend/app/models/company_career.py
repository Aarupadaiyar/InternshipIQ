from __future__ import annotations
import uuid
from datetime import datetime
from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database.base_class import Base

class CompanyCareer(Base):
    __tablename__ = "company_careers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True,
    )
    company_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    career_portal_url: Mapped[str] = mapped_column(String(512), nullable=False)
    career_platform: Mapped[str] = mapped_column(String(100), nullable=False) # Workday, Greenhouse, Lever, Taleo, Custom
    country: Mapped[str] = mapped_column(String(100), nullable=False)
    industry: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<CompanyCareer id={self.id} company_name={self.company_name!r}>"
