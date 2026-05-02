import datetime as dt
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.finance.subscription import SubscriptionFrequency


class SubscriptionBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    amount: Decimal = Field(..., gt=0)
    frequency: SubscriptionFrequency = SubscriptionFrequency.MONTHLY
    started_at: dt.date
    ended_at: dt.date | None = None
    account_id: int | None = None
    category_id: int | None = None
    is_active: bool = True
    icon: str | None = Field(None, max_length=10)
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    notes: str | None = None


class SubscriptionCreate(SubscriptionBase):
    pass


class SubscriptionUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    amount: Decimal | None = Field(None, gt=0)
    frequency: SubscriptionFrequency | None = None
    started_at: dt.date | None = None
    ended_at: dt.date | None = None
    account_id: int | None = None
    category_id: int | None = None
    is_active: bool | None = None
    icon: str | None = Field(None, max_length=10)
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    notes: str | None = None


class SubscriptionOut(SubscriptionBase):
    id: int
    next_billing_date: dt.date | None
    monthly_cost: Decimal
    created_at: dt.datetime
    updated_at: dt.datetime

    model_config = ConfigDict(from_attributes=True)
