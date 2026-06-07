from __future__ import annotations

"""
Storage service — abstract interface for file storage.
Currently implemented as local filesystem storage.
Swap to S3StorageBackend or R2StorageBackend by changing the active backend.
"""
import os
import uuid
from abc import ABC, abstractmethod
from pathlib import Path

import aiofiles

from app.config import settings


# ── Abstract Interface ────────────────────────────────────────────────────────

class StorageBackend(ABC):
    """
    Abstract storage backend.
    All implementations must support save, delete, and get_url.
    """

    @abstractmethod
    async def save(self, content: bytes, filename: str) -> str:
        """
        Save file content under the given filename.
        Returns the full storage path/key.
        """
        ...

    @abstractmethod
    async def delete(self, file_path: str) -> None:
        """Delete a file by its storage path/key."""
        ...

    @abstractmethod
    def get_url(self, file_path: str) -> str:
        """
        Return a URL or path for accessing the file.
        For local storage this is a filesystem path.
        For S3/R2 this would be a presigned URL.
        """
        ...


# ── Local Storage Implementation ──────────────────────────────────────────────

class LocalStorageBackend(StorageBackend):
    """
    Stores files in the local filesystem under UPLOAD_DIR.
    Files are NOT served directly via FastAPI — only stored and referenced.
    To serve resumes, add a protected endpoint in app/api/resume.py.
    """

    def __init__(self, upload_dir: str = settings.UPLOAD_DIR) -> None:
        self.upload_dir = Path(upload_dir).resolve()
        self.upload_dir.mkdir(parents=True, exist_ok=True)

    async def save(self, content: bytes, filename: str) -> str:
        file_path = self.upload_dir / filename
        async with aiofiles.open(file_path, "wb") as f:
            await f.write(content)
        return str(file_path)

    async def delete(self, file_path: str) -> None:
        path = Path(file_path)
        if path.exists() and path.is_file():
            os.remove(path)

    def get_url(self, file_path: str) -> str:
        # For local dev, return the relative path.
        # In prod, replace with a presigned URL or CDN URL.
        return f"/uploads/{Path(file_path).name}"


# ── Future S3 Backend (stub for documentation) ────────────────────────────────
# class S3StorageBackend(StorageBackend):
#     def __init__(self, bucket: str, region: str):
#         import boto3
#         self.s3 = boto3.client("s3", region_name=region)
#         self.bucket = bucket
#
#     async def save(self, content: bytes, filename: str) -> str:
#         self.s3.put_object(Bucket=self.bucket, Key=filename, Body=content)
#         return filename  # S3 key
#
#     async def delete(self, file_path: str) -> None:
#         self.s3.delete_object(Bucket=self.bucket, Key=file_path)
#
#     def get_url(self, file_path: str) -> str:
#         return self.s3.generate_presigned_url(
#             "get_object",
#             Params={"Bucket": self.bucket, "Key": file_path},
#             ExpiresIn=3600,
#         )


# ── Active Backend (singleton) ────────────────────────────────────────────────
# To switch to S3: replace LocalStorageBackend() with S3StorageBackend(...)
storage: StorageBackend = LocalStorageBackend()
