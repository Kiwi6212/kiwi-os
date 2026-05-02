from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.finance.account import AccountType


class AccountBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: AccountType
    institution: str | None = Field(None, max_length=100)
    currency: str = Field("EUR", min_length=3, max_length=3)
    initial_balance: Decimal = Decimal("0")
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    is_active: bool = True


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    type: AccountType | None = None
    institution: str | None = Field(None, max_length=100)
    currency: str | None = Field(None, min_length=3, max_length=3)
    initial_balance: Decimal | None = None
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    is_active: bool | None = None


class AccountOut(AccountBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
