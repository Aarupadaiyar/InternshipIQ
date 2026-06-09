from __future__ import annotations
import pytest
from pydantic import ValidationError

from app.schemas.user import OAuthLoginRequest
from app.database.session import AsyncSessionLocal, engine
from app.repositories.user_repository import UserRepository
from app.services.auth_service import AuthService

@pytest.fixture
def anyio_backend():
    return "asyncio"

def test_oauth_login_request_schema():
    """Verify that OAuthLoginRequest schema validates fields correctly."""
    # Valid request
    req = OAuthLoginRequest(code="testcode", redirect_uri="http://localhost/callback")
    assert req.code == "testcode"
    assert req.redirect_uri == "http://localhost/callback"

    # Optional redirect_uri
    req_default = OAuthLoginRequest(code="testcode")
    assert req_default.code == "testcode"
    assert req_default.redirect_uri == ""

    # Missing code
    with pytest.raises(ValidationError):
        OAuthLoginRequest()

@pytest.mark.anyio
async def test_oauth_user_repository_flow():
    """Verify get_or_create_oauth_user handles linking and registration correctly."""
    async with AsyncSessionLocal() as session:
        repo = UserRepository(session)
        
        test_email = "test_oauth_repo_flow@example.com"
        
        # Ensure user does not exist
        existing = await repo.get_by_email(test_email)
        if existing:
            await session.delete(existing)
            await session.commit()
            
        try:
            # 1. Create new OAuth user
            user = await repo.get_or_create_oauth_user(
                email=test_email,
                full_name="OAuth Test User",
                provider="google",
                oauth_id="google-id-12345"
            )
            await session.commit()
            
            assert user.email == test_email
            assert user.full_name == "OAuth Test User"
            assert user.oauth_provider == "google"
            assert user.oauth_id == "google-id-12345"
            assert user.password_hash is None

            # 2. Get existing OAuth user (same provider)
            user_existing = await repo.get_or_create_oauth_user(
                email=test_email,
                full_name="OAuth Test User Renamed",
                provider="google",
                oauth_id="google-id-12345"
            )
            assert user_existing.id == user.id
            assert user_existing.oauth_provider == "google"

        finally:
            # Cleanup
            cleanup_user = await repo.get_by_email(test_email)
            if cleanup_user:
                await session.delete(cleanup_user)
                await session.commit()
            
            # Dispose engine to close connections attached to this event loop
            await engine.dispose()

@pytest.mark.anyio
async def test_auth_service_google_sandbox_login():
    """Verify Google sandbox/mock login triggers correctly and returns TokenResponse."""
    async with AsyncSessionLocal() as session:
        auth_service = AuthService(session)
        test_email = "mock_google_user@example.com"
        
        # Ensure cleanup
        repo = UserRepository(session)
        existing = await repo.get_by_email(test_email)
        if existing:
            await session.delete(existing)
            await session.commit()
            
        try:
            # Google sandbox login
            res = await auth_service.login_google(code="mock_code_google", redirect_uri="")
            await session.commit()
            
            assert res.access_token is not None
            assert res.refresh_token is not None
            assert res.user.email == test_email
            assert res.user.full_name == "Google Sandbox User"
            
        finally:
            cleanup_user = await repo.get_by_email(test_email)
            if cleanup_user:
                await session.delete(cleanup_user)
                await session.commit()
            
            await engine.dispose()

@pytest.mark.anyio
async def test_auth_service_github_sandbox_login():
    """Verify GitHub sandbox/mock login triggers correctly and returns TokenResponse."""
    async with AsyncSessionLocal() as session:
        auth_service = AuthService(session)
        test_email = "mock_github_user@example.com"
        
        # Ensure cleanup
        repo = UserRepository(session)
        existing = await repo.get_by_email(test_email)
        if existing:
            await session.delete(existing)
            await session.commit()
            
        try:
            # GitHub sandbox login
            res = await auth_service.login_github(code="mock_code_github", redirect_uri="")
            await session.commit()
            
            assert res.access_token is not None
            assert res.refresh_token is not None
            assert res.user.email == test_email
            assert res.user.full_name == "GitHub Sandbox User"
            
        finally:
            cleanup_user = await repo.get_by_email(test_email)
            if cleanup_user:
                await session.delete(cleanup_user)
                await session.commit()
            
            await engine.dispose()
