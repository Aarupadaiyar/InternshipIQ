from __future__ import annotations
import uuid
from datetime import datetime, timezone, timedelta
import pytest
from fastapi import HTTPException

# Security magic bytes
from app.utils.file_utils import validate_file_signature

# Token handling
from app.auth.jwt_handler import create_access_token, decode_token

# Deduplication and verification
from app.utils.deduplication import is_duplicate, normalize_company, normalize_title, calculate_jaccard_similarity
from app.utils.verification_engine import is_generic_careers_url, clean_html_to_text


def test_file_signature_validation():
    """Verify that file signature checking accepts valid formats and rejects spoofed contents."""
    # 1. Valid PDF starts with %PDF
    valid_pdf = b"%PDF-1.4\n%..."
    # Should not raise exception
    validate_file_signature(valid_pdf, "application/pdf")

    # 2. Invalid PDF (e.g. text file renamed to PDF)
    invalid_pdf = b"Hello world! This is a fake pdf."
    with pytest.raises(HTTPException) as exc_info:
        validate_file_signature(invalid_pdf, "application/pdf")
    assert exc_info.value.status_code == 415
    assert "PDF signature" in exc_info.value.detail

    # 3. Valid DOCX starts with PK\x03\x04 (zip archive)
    valid_docx = b"PK\x03\x04\n\x00\x00..."
    validate_file_signature(valid_docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")

    # 4. Invalid DOCX
    invalid_docx = b"PK\x05\x06..." # not a standard zip signature
    with pytest.raises(HTTPException) as exc_info:
        validate_file_signature(invalid_docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    assert exc_info.value.status_code == 415
    assert "DOCX signature" in exc_info.value.detail


def test_access_token_expiry_settings():
    """Verify that access tokens expire within configured minutes."""
    from app.config import settings
    user_id = uuid.uuid4()
    token = create_access_token(user_id)
    
    # Decode token and check claims
    payload = decode_token(token)
    assert payload["sub"] == str(user_id)
    assert payload["type"] == "access"
    
    # Check that expiry is set to roughly configured minutes from now
    exp = payload["exp"]
    # jose returns exp as integer epoch timestamp
    exp_datetime = datetime.fromtimestamp(exp, tz=timezone.utc)
    now = datetime.now(timezone.utc)
    
    diff = exp_datetime - now
    # It should be around the configured setting
    assert timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES - 1) < diff < timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES + 1)



def test_generic_careers_url_detector():
    """Verify that generic careers/portal pages are rejected, but specific details pages are accepted."""
    # Generic URLs should be detected as generic
    assert is_generic_careers_url("https://careers.google.com") is True
    assert is_generic_careers_url("https://google.com/careers") is True
    assert is_generic_careers_url("https://google.com/jobs/") is True
    assert is_generic_careers_url("https://company.com/about/careers") is True
    assert is_generic_careers_url("https://company.com/careers?search=engineer") is True
    
    # Specific detail URLs should NOT be detected as generic
    assert is_generic_careers_url("https://jobs.cisco.com/jobs/ProjectDetail/AI-Intern-12345") is False
    assert is_generic_careers_url("https://unstop.com/jobs/google-hiring-intern-998877") is False
    assert is_generic_careers_url("https://internshala.com/internship/detail/react-internship-123") is False
    assert is_generic_careers_url("https://careers.google.com/jobs/results/123456-software-engineering-intern") is False


def test_deduplication_fuzzing():
    """Verify that duplicate postings are detected using titles, companies, locations, and descriptions."""
    job_base = {
        "title": "Software Engineering Intern (MERN Stack)",
        "company": "Zepto Pvt. Ltd.",
        "location": "Bangalore (Remote)",
        "description": "We are seeking a Full Stack Software Engineer Intern to join our engineering team. You will work on React, Node.js, Express, and MongoDB. Candidate must know Git and REST APIs.",
        "external_id": "zepto-123"
    }

    # Same company, slightly different title phrasing, remote, highly similar description -> duplicate
    job_dup = {
        "title": "Software Engineer Intern - MERN",
        "company": "Zepto",
        "location": "Remote",
        "description": "We are looking for a software engineering intern with MERN stack skills. Work on React, Node.js, and MongoDB. Knowledge of REST APIs and Git is required.",
        "external_id": "zepto-abc"
    }
    assert is_duplicate(job_base, job_dup) is True

    # Different company -> not duplicate
    job_diff_company = job_dup.copy()
    job_diff_company["company"] = "Swiggy"
    assert is_duplicate(job_base, job_diff_company) is False

    # Different mode (onsite vs remote) -> not duplicate
    job_diff_location = job_dup.copy()
    job_diff_location["location"] = "On-site (Bangalore)"
    assert is_duplicate(job_base, job_diff_location) is False

    # Completely different description -> not duplicate
    job_diff_desc = job_dup.copy()
    job_diff_desc["description"] = "This is a product management internship. You will manage backlogs, do research, design wireframes and interact with clients."
    assert is_duplicate(job_base, job_diff_desc) is False
