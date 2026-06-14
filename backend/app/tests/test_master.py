from __future__ import annotations
import uuid
import pytest
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from sqlalchemy import select

from app.database.session import AsyncSessionLocal, engine
from app.repositories.user_repository import UserRepository, is_developer_email
from app.services.auth_service import AuthService
from app.schemas.user import UserCreate, UserLogin
from app.utils.search_engine import expand_query, correct_typos
from app.models.user import User
from app.models.subscription import PremiumUser, EmailDigestLog
from app.models.job import JobModel
from app.api.jobs import calculate_match_score
from app.utils.email_engine import send_daily_digest_email

@pytest.fixture
def anyio_backend():
    return "asyncio"

def test_developer_email_check():
    """Verify that is_developer_email correctly recognizes developer / tester emails."""
    assert is_developer_email("direct_test_antigravity@example.com") is True
    assert is_developer_email("test_aarupadaiyar_premium@example.com") is True
    assert is_developer_email("aarup@example.com") is True
    assert is_developer_email("normal_user@example.com") is False

def test_search_typo_and_alias_expansion():
    """Verify search engine helper expands aliases and corrects typos."""
    # Test typo correction
    corrected = correct_typos("Googel")
    assert corrected == "google"
    
    corrected2 = correct_typos("microsft pythn")
    assert "microsoft" in corrected2
    assert "python" in corrected2

    # Test alias queries
    expanded = expand_query("ML")
    assert "machine learning" in expanded

@pytest.mark.anyio
async def test_developer_promotion_on_registration():
    """Verify that standard registration automatically promotes a developer email to ADMIN."""
    async with AsyncSessionLocal() as session:
        repo = UserRepository(session)
        dev_email = "antigravity_test_dev@example.com"
        
        # Cleanup if exists
        existing = await repo.get_by_email(dev_email)
        if existing:
            await session.delete(existing)
            await session.commit()

        try:
            data = UserCreate(
                full_name="Developer Tester",
                email=dev_email,
                password="securepassword123"
            )
            user = await repo.create(data)
            await session.commit()
            
            assert user.role == "ADMIN"
            assert user.is_active is True
        finally:
            cleanup_user = await repo.get_by_email(dev_email)
            if cleanup_user:
                await session.delete(cleanup_user)
                await session.commit()

@pytest.mark.anyio
async def test_developer_promotion_on_login():
    """Verify that a developer account is promoted and updates last_login on login."""
    async with AsyncSessionLocal() as session:
        repo = UserRepository(session)
        auth_service = AuthService(session)
        dev_email = "direct_test_antigravity@example.com"
        
        # Cleanup first
        existing = await repo.get_by_email(dev_email)
        if existing:
            await session.delete(existing)
            await session.commit()

        try:
            # 1. Register user manually (force FREE role to start)
            from app.utils.security import hash_password
            user_init = User(
                full_name="Direct Developer",
                email=dev_email,
                password_hash=hash_password("securepassword123"),
                role="FREE",
                is_active=True
            )
            session.add(user_init)
            await session.commit()

            # 2. Login through AuthService
            login_data = UserLogin(email=dev_email, password="securepassword123")
            response = await auth_service.login(login_data)
            
            # Verify role promoted to ADMIN
            assert response.user.role == "ADMIN"
            assert response.user.last_login is not None
        finally:
            cleanup_user = await repo.get_by_email(dev_email)
            if cleanup_user:
                await session.delete(cleanup_user)
                await session.commit()

def test_daily_digest_matching_logic():
    """Verify daily digest match calculation and score categorization."""
    user_skills = ["Python", "FastAPI", "PostgreSQL", "React"]
    
    # 1. High Match (>= 80%)
    job_skills = ["Python", "FastAPI", "PostgreSQL"]
    score, breakdown, gaps = calculate_match_score(job_skills, user_skills)
    assert score >= 80
    assert len(gaps) == 0

    # 2. Medium Match (70% - 79%) (or Stretch Opportunities >= 50%)
    job_skills_med = ["Python", "React", "Docker"]
    score_med, _, gaps_med = calculate_match_score(job_skills_med, user_skills)
    assert score_med >= 50
    assert "Docker" in gaps_med

@pytest.mark.anyio
async def test_email_engine_mock_delivery():
    """Verify that send_daily_digest_email falls back to mock logger when environment is clean."""
    jobs = [{
        "title": "Machine Learning Intern",
        "company": "Google",
        "location": "Bangalore",
        "match_score": 90,
        "skills": ["Python", "PyTorch"],
        "gaps": [],
        "source_url": "https://careers.google.com/jobs/123",
        "posted_at": "Today",
        "source": "Google Careers"
    }]
    
    # Trigger mock email send
    success = await send_daily_digest_email(
        to_email="test_recipient@example.com",
        user_name="Test User",
        jobs=jobs,
        digest_log_id=str(uuid.uuid4())
    )
    assert success is True
