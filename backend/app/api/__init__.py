from __future__ import annotations

"""
Unified API router mounting all subdomain routers.
"""
from fastapi import APIRouter

from app.api.auth import router as auth_router
from app.api.resume import router as resume_router
from app.api.preferences import router as preferences_router
from app.api.dashboard import router as dashboard_router
from app.api.jobs import router as jobs_router
from app.api.diagnostics import router as diagnostics_router
from app.api.payments import router as payments_router
from app.api.admin import router as admin_router

api_router = APIRouter()

api_router.include_router(auth_router)
api_router.include_router(resume_router)
api_router.include_router(preferences_router)
api_router.include_router(dashboard_router)
api_router.include_router(jobs_router)
api_router.include_router(diagnostics_router)
api_router.include_router(payments_router)
api_router.include_router(admin_router)
