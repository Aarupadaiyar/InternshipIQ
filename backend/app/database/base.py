from __future__ import annotations

"""
Declarative base for all SQLAlchemy ORM models.
Import all models here so Alembic's autogenerate can detect them.
"""
from app.database.base_class import Base


# ── Import all models so Alembic can see them ─────────────────────────────────
# These imports are required even if not used directly in this file.
from app.models.user import User  # noqa: F401, E402
from app.models.resume import Resume  # noqa: F401, E402
from app.models.resume_profile import ResumeProfile  # noqa: F401, E402
from app.models.user_preferences import UserPreferences  # noqa: F401, E402
from app.models.job import JobModel  # noqa: F401, E402
from app.models.refresh_token import RefreshToken  # noqa: F401, E402
from app.models.company_career import CompanyCareer  # noqa: F401, E402
from app.models.job_source import JobSource  # noqa: F401, E402
from app.models.scraper_metrics import ScraperMetrics  # noqa: F401, E402
from app.models.source import Source  # noqa: F401, E402
from app.models.rejection_log import RejectionLog  # noqa: F401, E402
from app.models.subscription import Subscription, Payment, PremiumUser, EmailDigestLog, SubscriptionEvent  # noqa: F401, E402


