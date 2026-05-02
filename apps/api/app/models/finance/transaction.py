from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import ARRAY, Date, DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Index, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.finance.account import Account
    from app.models.finance.category import Category


class TransactionType(str, Enum):
    EXPENSE = "expense"
    INCOME = "income"
    TRANSFER = "transfer"


class TransactionSource(str, Enum):
    MANUAL = "manual"
    IMPORT_LCL = "import_lcl"
    IMPORT_OTHER = "import_other"


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    account_id: Mapped[int] = mapped_column(
        ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    merchant: Mapped[str | None] = mapped_column(String(200), nullable=True)

    type: Mapped[TransactionType] = mapped_column(
        SAEnum(
            TransactionType,
            name="transaction_type_enum",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
    )

    transfer_group_id: Mapped[str | None] = mapped_column(
        String(36), nullable=True, index=True
    )

    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    source: Mapped[TransactionSource] = mapped_column(
        SAEnum(
            TransactionSource,
            name="transaction_source_enum",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=TransactionSource.MANUAL,
    )
    external_id: Mapped[str | None] = mapped_column(
        String(200), nullable=True, index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    account: Mapped["Account"] = relationship(
        "Account", back_populates="transactions"
    )
    category: Mapped["Category | None"] = relationship(
        "Category", back_populates="transactions"
    )

    __table_args__ = (
        Index("ix_transactions_date_account", "date", "account_id"),
        Index("ix_transactions_date_type", "date", "type"),
    )
