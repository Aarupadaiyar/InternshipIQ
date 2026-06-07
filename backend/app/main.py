from __future__ import annotations

"""
Main FastAPI Application Entrypoint.
"""
from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api import api_router
from app.config import settings
from app.middleware.cors import setup_cors
from app.middleware.rate_limit import limiter


def create_app() -> FastAPI:
    """
    App factory to build, configure, and return the FastAPI application instance.
    """
    app = FastAPI(
        title="Internship IQ Backend API",
        description="Production-ready FastAPI backend for user profiles, resumes, and preferences.",
        version="1.0.0",
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
    )

    # 1. Register Rate Limiter
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # 2. Setup CORS Middleware
    setup_cors(app)

    # 3. Mount Routers
    app.include_router(api_router)

    # 4. Health Check Route
    @app.get("/health", tags=["System"], summary="Health check endpoint")
    async def health() -> dict[str, str]:
        """Verify the API server is alive and responding."""
        return {"status": "ok"}

    return app


app = create_app()
