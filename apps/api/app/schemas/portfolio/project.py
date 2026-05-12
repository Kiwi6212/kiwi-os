from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PortfolioProjectBase(BaseModel):
    name: str
    slug: str
    description_short: str | None = None
    description_long: str | None = None
    screenshot_url: str | None = None
    demo_url: str | None = None
    repo_url: str | None = None
    tech_stack: list[str] = []
    is_featured: bool = False
    is_visible: bool = True
    display_order: int = Field(default=0, alias="order")
    github_repo_id: int | None = None

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class PortfolioProjectCreate(BaseModel):
    """Same fields as Base but `slug` is optional (auto-generated server-side)."""

    name: str
    slug: str | None = None
    description_short: str | None = None
    description_long: str | None = None
    screenshot_url: str | None = None
    demo_url: str | None = None
    repo_url: str | None = None
    tech_stack: list[str] = []
    is_featured: bool = False
    is_visible: bool = True
    display_order: int = Field(default=0, alias="order")
    github_repo_id: int | None = None

    model_config = ConfigDict(populate_by_name=True)


class PortfolioProjectUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    description_short: str | None = None
    description_long: str | None = None
    demo_url: str | None = None
    repo_url: str | None = None
    tech_stack: list[str] | None = None
    is_featured: bool | None = None
    is_visible: bool | None = None
    display_order: int | None = Field(default=None, alias="order")

    model_config = ConfigDict(populate_by_name=True)


class PortfolioProjectOut(PortfolioProjectBase):
    id: int
    github_synced_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class PortfolioProjectPublic(BaseModel):
    """Public-facing — drops github metadata and is_visible flag."""

    name: str
    slug: str
    description_short: str | None = None
    description_long: str | None = None
    screenshot_url: str | None = None
    demo_url: str | None = None
    repo_url: str | None = None
    tech_stack: list[str] = []
    is_featured: bool = False
    display_order: int = Field(default=0, alias="order")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)
