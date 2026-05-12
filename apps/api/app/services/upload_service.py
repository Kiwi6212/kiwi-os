"""Disk-backed file storage for portfolio uploads."""

from __future__ import annotations

import secrets
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

from app.core.config import PORTFOLIO_UPLOADS

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_PDF_TYPES = {"application/pdf"}
MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5 MB
MAX_PDF_SIZE = 10 * 1024 * 1024  # 10 MB


def _gen_filename(original: str | None, prefix: str = "") -> str:
    """Random unique filename, preserving the original extension when possible."""
    ext = Path(original or "upload.bin").suffix.lower() or ".bin"
    return f"{prefix}{secrets.token_urlsafe(12)}{ext}"


async def save_upload(
    file: UploadFile,
    subdir: str,
    allowed_types: set[str],
    max_size: int,
    filename_prefix: str = "",
) -> str:
    """Persist `file` under PORTFOLIO_UPLOADS/<subdir>/.

    Returns the URL path served by FastAPI's StaticFiles mount, e.g.
    ``/uploads/portfolio/photos/photo-abc.jpg``.
    """
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Type de fichier non supporté : {file.content_type}",
        )

    contents = await file.read()
    if len(contents) > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Fichier trop volumineux (max {max_size // (1024 * 1024)} MB)",
        )

    target_dir = PORTFOLIO_UPLOADS / subdir
    target_dir.mkdir(parents=True, exist_ok=True)

    filename = _gen_filename(file.filename, filename_prefix)
    target_path = target_dir / filename
    target_path.write_bytes(contents)

    return f"/uploads/portfolio/{subdir}/{filename}"


async def save_photo(file: UploadFile) -> str:
    return await save_upload(
        file, "photos", ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, "photo-"
    )


async def save_screenshot(file: UploadFile) -> str:
    return await save_upload(
        file, "projects", ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE, "shot-"
    )


async def save_cv(file: UploadFile) -> str:
    return await save_upload(
        file, "cv", ALLOWED_PDF_TYPES, MAX_PDF_SIZE, "cv-"
    )
