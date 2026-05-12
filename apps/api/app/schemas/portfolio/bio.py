from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class PortfolioBioBase(BaseModel):
    name: str | None = None
    tagline: str | None = None
    bio: str | None = None
    photo_url: str | None = None
    cv_url: str | None = None
    email: str | None = None
    github_url: str | None = None
    linkedin_url: str | None = None
    location: str | None = None
    skills: list[str] = []
    education: list[dict[str, Any]] = []
    experience: list[dict[str, Any]] = []
    public_enabled: bool = False


class PortfolioBioUpdate(BaseModel):
    name: str | None = None
    tagline: str | None = None
    bio: str | None = None
    email: str | None = None
    github_url: str | None = None
    linkedin_url: str | None = None
    location: str | None = None
    skills: list[str] | None = None
    education: list[dict[str, Any]] | None = None
    experience: list[dict[str, Any]] | None = None
    public_enabled: bool | None = None


class PortfolioBioOut(PortfolioBioBase):
    id: int
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class PortfolioBioPublic(BaseModel):
    """Version publique : pas d'id, pas d'updated_at."""

    name: str | None = None
    tagline: str | None = None
    bio: str | None = None
    photo_url: str | None = None
    cv_url: str | None = None
    email: str | None = None
    github_url: str | None = None
    linkedin_url: str | None = None
    location: str | None = None
    skills: list[str] = []
    education: list[dict[str, Any]] = []
    experience: list[dict[str, Any]] = []
    model_config = ConfigDict(from_attributes=True)
