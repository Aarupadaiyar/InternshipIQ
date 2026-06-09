
"""
Resume and Resume Profile API endpoints.
"""
import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database.session import get_db
from app.middleware.rate_limit import limiter
from app.models.user import User
from app.schemas.user import MessageResponse
from app.schemas.resume import (
    ResumeResponse,
    ResumeProfileCreate,
    ResumeProfileResponse,
    ResumeWithProfileResponse,
)
from app.repositories.resume_repository import ResumeRepository
from app.repositories.resume_profile_repository import ResumeProfileRepository
from app.services.resume_service import ResumeService

router = APIRouter(prefix="/resume", tags=["Resumes"])


@router.post(
    "/upload",
    response_model=ResumeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a new resume file",
)
@limiter.limit("20/minute")
async def upload_resume(
    request: Request,
    file: UploadFile,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResumeResponse:
    """
    Uploads a resume file (PDF or DOCX), saves it to storage, creates a database record,
    and sets it as the active resume.
    Rate limited: 20 requests per minute.
    """
    resume_repo = ResumeRepository(db)
    resume_service = ResumeService(resume_repo)
    resume = await resume_service.process_upload(file, current_user.id)
    return resume


@router.get(
    "/",
    response_model=list[ResumeResponse],
    summary="List all resumes for the current user",
)
async def list_resumes(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ResumeResponse]:
    """
    Retrieves all resumes uploaded by the current user, ordered newest first.
    """
    resume_repo = ResumeRepository(db)
    return await resume_repo.get_all_by_user(current_user.id)


@router.get(
    "/active",
    response_model=ResumeWithProfileResponse,
    summary="Get the user's active resume and profile",
)
async def get_active_resume(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResumeWithProfileResponse:
    """
    Retrieves the currently active resume along with its parsed profile.
    Raises 404 if no active resume is set.
    """
    resume_repo = ResumeRepository(db)
    profile_repo = ResumeProfileRepository(db)

    active_resume = await resume_repo.get_active_by_user(current_user.id)
    if not active_resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active resume found.",
        )

    profile = await profile_repo.get_by_resume_id(active_resume.id)
    return ResumeWithProfileResponse(resume=active_resume, profile=profile)


@router.put(
    "/{resume_id}/activate",
    response_model=ResumeResponse,
    summary="Set a resume as active",
)
async def activate_resume(
    resume_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResumeResponse:
    """
    Deactivates all other resumes for the user and activates the specified one.
    """
    resume_repo = ResumeRepository(db)
    resume = await resume_repo.get_by_id(resume_id, current_user.id)
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found.",
        )

    active_resume = await resume_repo.set_active(resume_id, current_user.id)
    return active_resume


@router.delete(
    "/{resume_id}",
    response_model=MessageResponse,
    summary="Delete a resume and its associated files",
)
async def delete_resume(
    resume_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageResponse:
    """
    Deletes the resume database record and deletes its file from storage.
    """
    resume_repo = ResumeRepository(db)
    resume = await resume_repo.get_by_id(resume_id, current_user.id)
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found.",
        )

    resume_service = ResumeService(resume_repo)
    await resume_service.delete_resume(resume_id, current_user.id)
    return MessageResponse(message="Resume and files deleted successfully.")


@router.post(
    "/{resume_id}/profile",
    response_model=ResumeProfileResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create or update resume profile",
)
async def save_profile(
    resume_id: uuid.UUID,
    data: ResumeProfileCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ResumeProfileResponse:
    """
    Saves or updates parsed profile details (skills, education, etc.) for a specific resume.
    """
    resume_repo = ResumeRepository(db)
    resume = await resume_repo.get_by_id(resume_id, current_user.id)
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found.",
        )

    profile_repo = ResumeProfileRepository(db)
    profile = await profile_repo.create_or_update(resume_id, current_user.id, data)
    return profile


@router.get(
    "/{resume_id}/download",
    summary="Download or view the user's resume file",
)
async def download_resume(
    resume_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> FileResponse:
    """
    Downloads or views a specific resume file, strictly verifying that the caller
    is the owner.
    """
    resume_repo = ResumeRepository(db)
    resume = await resume_repo.get_by_id(resume_id, current_user.id)
    if not resume:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found.",
        )
    
    file_path = resume.file_path
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk.",
        )
    
    return FileResponse(
        path=file_path,
        media_type=resume.mime_type,
        filename=resume.original_filename,
    )

