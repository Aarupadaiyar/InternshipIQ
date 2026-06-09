from __future__ import annotations
from typing import Optional

"""
Resume service — orchestrates file validation, saving to storage, and metadata persistence.
"""
import uuid
from fastapi import UploadFile

from app.config import settings
from app.repositories.resume_repository import ResumeRepository, ResumeCreateData
from app.services.storage_service import StorageBackend, storage
from app.utils.file_utils import (
    validate_mime_type,
    validate_file_size,
    generate_unique_filename,
    validate_file_signature,
)
from app.models.resume import Resume


class ResumeService:
    def __init__(
        self,
        resume_repo: ResumeRepository,
        storage_backend: StorageBackend = storage,
    ) -> None:
        self.resume_repo = resume_repo
        self.storage = storage_backend

    async def validate_file(self, file: UploadFile) -> bytes:
        """
        Validates the file type, size, and magic byte signature.
        Returns the file contents in bytes.
        """
        mime_type = validate_mime_type(file)
        file_bytes = await validate_file_size(file, settings.max_file_size_bytes)
        validate_file_signature(file_bytes, mime_type)
        return file_bytes

    async def process_upload(self, file: UploadFile, user_id: uuid.UUID) -> Resume:
        """
        Orchestrates resume upload validation, storage saving,
        database creation, and setting it as the active resume.
        """
        # 1. Validate file content and size
        file_bytes = await self.validate_file(file)
        mime_type = validate_mime_type(file)
        original_filename = file.filename or "resume.pdf"

        # 2. Save file to storage
        stored_filename = generate_unique_filename(original_filename, user_id)
        file_path = await self.storage.save(file_bytes, stored_filename)

        # 3. Create metadata record in database
        create_data = ResumeCreateData(
            user_id=user_id,
            original_filename=original_filename,
            stored_filename=stored_filename,
            file_path=file_path,
            file_size=len(file_bytes),
            mime_type=mime_type,
        )
        resume = await self.resume_repo.create(create_data)

        # 4. Set the newly uploaded resume as active
        active_resume = await self.resume_repo.set_active(resume.id, user_id)
        if not active_resume:
            return resume
        return active_resume

    async def delete_resume(self, resume_id: uuid.UUID, user_id: uuid.UUID) -> Optional[Resume]:
        """
        Delete a resume record from the database and remove the actual file from storage.
        """
        resume = await self.resume_repo.delete(resume_id, user_id)
        if resume:
            # Clean up the file in background or synchronously
            await self.storage.delete(resume.file_path)
        return resume
