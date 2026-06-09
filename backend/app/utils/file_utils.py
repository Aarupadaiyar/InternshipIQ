from __future__ import annotations

"""
File validation and naming utilities for resume uploads.
"""
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

# ── Allowed MIME Types ────────────────────────────────────────────────────────
ALLOWED_MIME_TYPES: dict[str, str] = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
}

ALLOWED_EXTENSIONS: set[str] = {".pdf", ".docx"}


def get_file_extension(filename: str) -> str:
    """Return lowercase file extension including the dot, e.g. '.pdf'"""
    return Path(filename).suffix.lower()


def validate_mime_type(file: UploadFile) -> str:
    """
    Validate that the uploaded file has an allowed MIME type.
    Returns the validated mime_type string.
    Raises HTTP 415 if unsupported.
    """
    content_type = file.content_type or ""
    if content_type not in ALLOWED_MIME_TYPES:
        # Also check by extension as a fallback (some browsers send wrong MIME)
        ext = get_file_extension(file.filename or "")
        if ext not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail=(
                    f"Unsupported file type: {content_type!r}. "
                    "Only PDF and DOCX files are accepted."
                ),
            )
        # Extension is valid; normalise MIME type
        content_type = (
            "application/pdf"
            if ext == ".pdf"
            else "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    return content_type


async def validate_file_size(file: UploadFile, max_bytes: int) -> bytes:
    """
    Read the entire file into memory and validate its size.
    Returns the raw bytes so the caller doesn't need to re-read.
    Raises HTTP 413 if the file exceeds max_bytes.
    """
    contents = await file.read()
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"File size {len(contents) / 1024 / 1024:.1f} MB exceeds "
                f"the {max_bytes / 1024 / 1024:.0f} MB limit."
            ),
        )
    return contents


def generate_unique_filename(original_filename: str, user_id: uuid.UUID) -> str:
    """
    Generate a UUID-based filename that preserves the original extension.
    Format: {user_id_short}_{uuid4}.{ext}
    Example: a1b2_3e4f5a6b7c8d9e0f.pdf
    """
    ext = get_file_extension(original_filename)
    unique_id = uuid.uuid4().hex
    user_prefix = str(user_id).replace("-", "")[:8]
    return f"{user_prefix}_{unique_id}{ext}"


def validate_file_signature(contents: bytes, mime_type: str) -> None:
    """
    Validate the file's magic bytes to ensure it matches its declared format.
    - PDF magic bytes: '%PDF' (0x25, 0x50, 0x44, 0x46)
    - DOCX (ZIP archive) magic bytes: 'PK\\x03\\x04' (0x50, 0x4b, 0x03, 0x04)
    Raises HTTP 415 if signature check fails.
    """
    if len(contents) < 4:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is too small to be a valid document."
        )
    
    header = contents[:4]
    if mime_type == "application/pdf":
        if header != b"%PDF":
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Malicious or invalid file: file content does not match PDF signature."
            )
    elif mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        if header != b"PK\x03\x04":
            raise HTTPException(
                status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                detail="Malicious or invalid file: file content does not match DOCX signature."
            )

