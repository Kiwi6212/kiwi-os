from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.finance.category import CategoryType


class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    icon: str | None = Field(None, max_length=10)
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    type: CategoryType = CategoryType.BOTH
    parent_id: int | None = None


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    icon: str | None = Field(None, max_length=10)
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    type: CategoryType | None = None
    parent_id: int | None = None


class CategoryOut(CategoryBase):
    id: int
    is_system: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
