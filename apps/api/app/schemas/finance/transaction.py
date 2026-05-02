import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.finance.transaction import TransactionSource, TransactionType


class TransactionBase(BaseModel):
    account_id: int
    category_id: int | None = None
    date: datetime.date
    amount: Decimal
    description: str = Field(..., min_length=1, max_length=500)
    merchant: str | None = Field(None, max_length=200)
    type: TransactionType
    tags: list[str] | None = None
    notes: str | None = None


class TransactionCreate(TransactionBase):
    pass


class TransferCreate(BaseModel):
    """Crée 2 transactions liées (sortie + entrée) avec le même transfer_group_id."""

    from_account_id: int
    to_account_id: int
    date: datetime.date
    amount: Decimal = Field(..., gt=0)
    description: str = Field(..., min_length=1, max_length=500)
    notes: str | None = None


class TransactionUpdate(BaseModel):
    account_id: int | None = None
    category_id: int | None = None
    date: datetime.date | None = None
    amount: Decimal | None = None
    description: str | None = Field(None, min_length=1, max_length=500)
    merchant: str | None = Field(None, max_length=200)
    type: TransactionType | None = None
    tags: list[str] | None = None
    notes: str | None = None


class TransactionOut(TransactionBase):
    id: int
    transfer_group_id: str | None
    source: TransactionSource
    external_id: str | None
    created_at: datetime.datetime
    updated_at: datetime.datetime

    model_config = ConfigDict(from_attributes=True)
