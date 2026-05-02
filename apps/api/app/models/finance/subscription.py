import datetime as dt
from decimal import Decimal
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Date, DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.finance.account import Account
    from app.models.finance.category import Category


class SubscriptionFrequency(str, Enum):
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    frequency: Mapped[SubscriptionFrequency] = mapped_column(
        SAEnum(
            SubscriptionFrequency,
            name="subscription_frequency_enum",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=SubscriptionFrequency.MONTHLY,
    )

    started_at: Mapped[dt.date] = mapped_column(Date, nullable=False)
    ended_at: Mapped[dt.date | None] = mapped_column(Date, nullable=True)

    account_id: Mapped[int | None] = mapped_column(
        ForeignKey("accounts.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    category_id: Mapped[int | None] = mapped_column(
        ForeignKey("categories.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    icon: Mapped[str | None] = mapped_column(String(10), nullable=True)
    color: Mapped[str | None] = mapped_column(String(7), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    account: Mapped["Account | None"] = relationship("Account")
    category: Mapped["Category | None"] = relationship("Category")
