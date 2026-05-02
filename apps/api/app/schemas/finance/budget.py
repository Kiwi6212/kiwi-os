import datetime as dt
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class BudgetBase(BaseModel):
    category_id: int
    monthly_limit: Decimal = Field(..., gt=0)
    year: int | None = Field(None, ge=2000, le=2100)
    month: int | None = Field(None, ge=1, le=12)


class BudgetCreate(BudgetBase):
    pass


class BudgetUpdate(BaseModel):
    monthly_limit: Decimal | None = Field(None, gt=0)
    year: int | None = Field(None, ge=2000, le=2100)
    month: int | None = Field(None, ge=1, le=12)


class BudgetOut(BudgetBase):
    id: int
    created_at: dt.datetime
    updated_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)


class BudgetWithSpending(BudgetOut):
    """Budget enrichi avec le montant réellement dépensé sur la période."""

    category_name: str
    category_icon: str | None
    category_color: str | None
    spent: Decimal
    remaining: Decimal
    percentage_used: float
    is_overspent: bool
