import datetime as dt
from calendar import monthrange
from collections import defaultdict
from decimal import Decimal
from typing import Any

from dateutil.relativedelta import relativedelta
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.finance.account import Account
from app.models.finance.category import Category
from app.models.finance.transaction import Transaction, TransactionType


FRENCH_MONTHS = [
    "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
    "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc",
]


def month_label(year: int, month: int) -> str:
    return f"{FRENCH_MONTHS[month - 1]} {year}"


def month_bounds(year: int, month: int) -> tuple[dt.date, dt.date]:
    last_day = monthrange(year, month)[1]
    return dt.date(year, month, 1), dt.date(year, month, last_day)


def delta_pct(current: Decimal, previous: Decimal) -> float | None:
    """Relative variation in %. None if previous is zero (undefined)."""
    if previous == 0:
        return None
    return float((current - previous) / previous * 100)


async def get_account_balances(db: AsyncSession) -> list[dict[str, Any]]:
    """For each account: initial_balance + sum of all linked transactions.

    Transfers are signed (-amount on from_account, +amount on to_account),
    so summing per account naturally gives the right balance per side.
    """
    accounts_result = await db.execute(
        select(Account).order_by(Account.created_at)
    )
    accounts = list(accounts_result.scalars().all())

    sums_result = await db.execute(
        select(
            Transaction.account_id,
            func.coalesce(func.sum(Transaction.amount), 0).label("total"),
        ).group_by(Transaction.account_id)
    )
    sums: dict[int, Decimal] = {
        acc_id: Decimal(str(total)) for acc_id, total in sums_result.all()
    }

    output: list[dict[str, Any]] = []
    for acc in accounts:
        movements = sums.get(acc.id, Decimal("0"))
        initial = Decimal(str(acc.initial_balance))
        output.append(
            {
                "account_id": acc.id,
                "account_name": acc.name,
                "account_type": acc.type,
                "account_color": acc.color,
                "initial_balance": initial,
                "current_balance": initial + movements,
            }
        )
    return output


async def get_month_totals(
    db: AsyncSession, year: int, month: int
) -> tuple[Decimal, Decimal]:
    """Return (income, expense) totals for the given month."""
    period_start, period_end = month_bounds(year, month)

    income_q = await db.execute(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            and_(
                Transaction.type == TransactionType.INCOME,
                Transaction.date >= period_start,
                Transaction.date <= period_end,
            )
        )
    )
    income = Decimal(str(income_q.scalar() or 0))

    expense_q = await db.execute(
        select(func.coalesce(func.sum(func.abs(Transaction.amount)), 0)).where(
            and_(
                Transaction.type == TransactionType.EXPENSE,
                Transaction.date >= period_start,
                Transaction.date <= period_end,
            )
        )
    )
    expense = Decimal(str(expense_q.scalar() or 0))

    return income, expense


async def get_last_12_months_evolution(
    db: AsyncSession, today: dt.date | None = None
) -> list[dict[str, Any]]:
    """Income/expense/savings for the last 12 months (oldest first)."""
    if today is None:
        today = dt.date.today()

    start_date = today.replace(day=1) - relativedelta(months=11)

    transactions_q = await db.execute(
        select(Transaction.date, Transaction.amount, Transaction.type).where(
            and_(
                Transaction.date >= start_date,
                Transaction.date <= today,
                Transaction.type != TransactionType.TRANSFER,
            )
        )
    )
    transactions = list(transactions_q.all())

    buckets: dict[tuple[int, int], dict[str, Decimal]] = defaultdict(
        lambda: {"income": Decimal("0"), "expense": Decimal("0")}
    )
    for tx_date, tx_amount, tx_type in transactions:
        key = (tx_date.year, tx_date.month)
        amount = Decimal(str(tx_amount))
        if tx_type == TransactionType.INCOME:
            buckets[key]["income"] += amount
        elif tx_type == TransactionType.EXPENSE:
            buckets[key]["expense"] += abs(amount)

    output: list[dict[str, Any]] = []
    cursor = start_date
    while cursor <= today:
        key = (cursor.year, cursor.month)
        data = buckets.get(
            key, {"income": Decimal("0"), "expense": Decimal("0")}
        )
        output.append(
            {
                "year": cursor.year,
                "month": cursor.month,
                "label": month_label(cursor.year, cursor.month),
                "income": data["income"],
                "expense": data["expense"],
                "savings": data["income"] - data["expense"],
            }
        )
        cursor += relativedelta(months=1)
    return output


async def get_expense_by_category(
    db: AsyncSession, year: int, month: int
) -> list[dict[str, Any]]:
    """Breakdown of the month's expenses by category, ordered by amount desc."""
    period_start, period_end = month_bounds(year, month)

    total_q = await db.execute(
        select(func.coalesce(func.sum(func.abs(Transaction.amount)), 0)).where(
            and_(
                Transaction.type == TransactionType.EXPENSE,
                Transaction.date >= period_start,
                Transaction.date <= period_end,
            )
        )
    )
    total = Decimal(str(total_q.scalar() or 0))
    if total == 0:
        return []

    grouped_q = await db.execute(
        select(
            Transaction.category_id,
            func.coalesce(func.sum(func.abs(Transaction.amount)), 0).label(
                "total"
            ),
            func.count(Transaction.id).label("count"),
        )
        .where(
            and_(
                Transaction.type == TransactionType.EXPENSE,
                Transaction.date >= period_start,
                Transaction.date <= period_end,
            )
        )
        .group_by(Transaction.category_id)
        .order_by(func.sum(func.abs(Transaction.amount)).desc())
    )
    rows = list(grouped_q.all())

    cat_ids = [r[0] for r in rows if r[0] is not None]
    cats_by_id: dict[int, Category] = {}
    if cat_ids:
        cats_q = await db.execute(
            select(Category).where(Category.id.in_(cat_ids))
        )
        cats_by_id = {c.id: c for c in cats_q.scalars().all()}

    output: list[dict[str, Any]] = []
    for cat_id, cat_total, cat_count in rows:
        cat = cats_by_id.get(cat_id) if cat_id is not None else None
        amount = Decimal(str(cat_total))
        output.append(
            {
                "category_id": cat_id,
                "category_name": cat.name if cat else "Sans catégorie",
                "category_icon": cat.icon if cat else None,
                "category_color": cat.color if cat else "#94a3b8",
                "total_amount": amount,
                "transaction_count": cat_count,
                "percentage": float(amount / total * 100),
            }
        )
    return output


async def get_top_merchants(
    db: AsyncSession, year: int, month: int, limit: int = 5
) -> list[dict[str, Any]]:
    """Top N merchants by total spent in the month."""
    period_start, period_end = month_bounds(year, month)

    q = await db.execute(
        select(
            Transaction.merchant,
            func.coalesce(func.sum(func.abs(Transaction.amount)), 0).label(
                "total"
            ),
            func.count(Transaction.id).label("count"),
        )
        .where(
            and_(
                Transaction.type == TransactionType.EXPENSE,
                Transaction.merchant.is_not(None),
                Transaction.merchant != "",
                Transaction.date >= period_start,
                Transaction.date <= period_end,
            )
        )
        .group_by(Transaction.merchant)
        .order_by(func.sum(func.abs(Transaction.amount)).desc())
        .limit(limit)
    )
    return [
        {
            "merchant": merchant,
            "total_amount": Decimal(str(total)),
            "transaction_count": count,
        }
        for merchant, total, count in q.all()
    ]


async def get_transaction_count(
    db: AsyncSession, year: int, month: int
) -> int:
    period_start, period_end = month_bounds(year, month)
    q = await db.execute(
        select(func.count(Transaction.id)).where(
            and_(
                Transaction.date >= period_start,
                Transaction.date <= period_end,
            )
        )
    )
    return q.scalar() or 0
