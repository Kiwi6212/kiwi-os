import datetime as dt
from decimal import Decimal

from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.finance.account import Account
from app.schemas.finance.stats import (
    AccountBalance,
    CategoryBreakdown,
    FinanceStats,
    MonthlyEvolution,
    PeriodComparison,
    TopMerchant,
)
from app.services.finance_stats_service import (
    delta_pct,
    get_account_balances,
    get_expense_by_category,
    get_last_12_months_evolution,
    get_month_totals,
    get_top_merchants,
    get_transaction_count,
    month_label,
)

router = APIRouter()


@router.get("", response_model=FinanceStats)
async def get_stats(db: AsyncSession = Depends(get_db)) -> FinanceStats:
    today = dt.date.today()

    accounts_data = await get_account_balances(db)
    total_balance = sum(
        (a["current_balance"] for a in accounts_data), Decimal("0")
    )

    income, expense = await get_month_totals(db, today.year, today.month)
    savings = income - expense
    savings_rate = float(savings / income * 100) if income > 0 else 0.0

    evolution = await get_last_12_months_evolution(db, today)
    expense_breakdown = await get_expense_by_category(
        db, today.year, today.month
    )
    top_merchants = await get_top_merchants(db, today.year, today.month, 5)

    tx_count = await get_transaction_count(db, today.year, today.month)

    active_accounts_q = await db.execute(
        select(func.count(Account.id)).where(Account.is_active.is_(True))
    )
    active_count = active_accounts_q.scalar() or 0

    return FinanceStats(
        total_balance=total_balance,
        accounts=[AccountBalance(**a) for a in accounts_data],
        current_month_income=income,
        current_month_expense=expense,
        current_month_savings=savings,
        current_month_savings_rate=savings_rate,
        last_12_months=[MonthlyEvolution(**m) for m in evolution],
        expense_by_category=[CategoryBreakdown(**c) for c in expense_breakdown],
        top_merchants=[TopMerchant(**m) for m in top_merchants],
        transaction_count_this_month=tx_count,
        active_accounts_count=active_count,
    )


@router.get("/comparison", response_model=PeriodComparison)
async def get_comparison(
    db: AsyncSession = Depends(get_db),
    period: str = Query("month", pattern="^(month|year)$"),
) -> PeriodComparison:
    today = dt.date.today()

    if period == "month":
        current_year, current_month = today.year, today.month
        previous = today.replace(day=1) - relativedelta(months=1)
        previous_year, previous_month = previous.year, previous.month
        current_label = month_label(current_year, current_month)
        previous_label = month_label(previous_year, previous_month)

        current_income, current_expense = await get_month_totals(
            db, current_year, current_month
        )
        previous_income, previous_expense = await get_month_totals(
            db, previous_year, previous_month
        )
    else:
        current_year = today.year
        previous_year = today.year - 1
        current_label = str(current_year)
        previous_label = str(previous_year)

        current_income = Decimal("0")
        current_expense = Decimal("0")
        previous_income = Decimal("0")
        previous_expense = Decimal("0")

        for m in range(1, 13):
            ci, ce = await get_month_totals(db, current_year, m)
            pi, pe = await get_month_totals(db, previous_year, m)
            current_income += ci
            current_expense += ce
            previous_income += pi
            previous_expense += pe

    current_savings = current_income - current_expense
    previous_savings = previous_income - previous_expense

    return PeriodComparison(
        period=period,
        current_label=current_label,
        previous_label=previous_label,
        current_income=current_income,
        previous_income=previous_income,
        income_delta_pct=delta_pct(current_income, previous_income),
        current_expense=current_expense,
        previous_expense=previous_expense,
        expense_delta_pct=delta_pct(current_expense, previous_expense),
        current_savings=current_savings,
        previous_savings=previous_savings,
        savings_delta_pct=delta_pct(current_savings, previous_savings),
    )
