import datetime as dt
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Numeric, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.finance.category import Category


class Budget(Base):
    """Budget mensuel par catégorie.

    Si year+month sont NULL : budget récurrent (s'applique à chaque mois).
    Si year+month sont set  : budget spécifique à ce mois (override le récurrent).
    """

    __tablename__ = "budgets"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    monthly_limit: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    month: Mapped[int | None] = mapped_column(Integer, nullable=True)

    created_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[dt.datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    category: Mapped["Category"] = relationship("Category")

    __table_args__ = (
        UniqueConstraint(
            "category_id",
            "year",
            "month",
            name="uq_budgets_category_period",
            postgresql_nulls_not_distinct=True,
        ),
    )
