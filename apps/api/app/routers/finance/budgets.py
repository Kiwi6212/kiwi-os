import datetime as dt
from calendar import monthrange
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.finance.budget import Budget
from app.models.finance.category import Category
from app.models.finance.transaction import Transaction, TransactionType
from app.schemas.finance.budget import (
    BudgetCreate,
    BudgetOut,
    BudgetUpdate,
    BudgetWithSpending,
)

router = APIRouter()


@router.get("", response_model=list[BudgetOut])
async def list_budgets(db: AsyncSession = Depends(get_db)) -> list[Budget]:
    result = await db.execute(select(Budget).order_by(Budget.created_at))
    return list(result.scalars().all())


@router.get("/current", response_model=list[BudgetWithSpending])
async def get_current_month_budgets(
    db: AsyncSession = Depends(get_db),
    year: int | None = Query(None, ge=2000, le=2100),
    month: int | None = Query(None, ge=1, le=12),
) -> list[BudgetWithSpending]:
    """Return budgets applicable to the current month (or year+month).

    Recurring budgets (year+month NULL) apply unless overridden by a
    specific budget for the same category in the target period.
    """
    today = dt.date.today()
    target_year = year or today.year
    target_month = month or today.month

    query = (
        select(Budget, Category)
        .join(Category, Category.id == Budget.category_id)
        .where(
            or_(
                and_(Budget.year.is_(None), Budget.month.is_(None)),
                and_(Budget.year == target_year, Budget.month == target_month),
            )
        )
    )
    result = await db.execute(query)
    rows = list(result.all())

    by_cat: dict[int, tuple[Budget, Category]] = {}
    for budget, category in rows:
        is_specific = budget.year is not None and budget.month is not None
        existing = by_cat.get(category.id)
        if existing is None:
            by_cat[category.id] = (budget, category)
        else:
            existing_budget, _ = existing
            existing_is_specific = existing_budget.year is not None
            if is_specific and not existing_is_specific:
                by_cat[category.id] = (budget, category)

    if not by_cat:
        return []

    last_day = monthrange(target_year, target_month)[1]
    period_start = dt.date(target_year, target_month, 1)
    period_end = dt.date(target_year, target_month, last_day)

    spending_query = (
        select(
            Transaction.category_id,
            func.coalesce(func.sum(func.abs(Transaction.amount)), 0).label("total"),
        )
        .where(
            and_(
                Transaction.type == TransactionType.EXPENSE,
                Transaction.date >= period_start,
                Transaction.date <= period_end,
                Transaction.category_id.in_(list(by_cat.keys())),
            )
        )
        .group_by(Transaction.category_id)
    )
    spending_result = await db.execute(spending_query)
    spending_by_cat: dict[int, Decimal] = {
        cat_id: Decimal(str(total)) for cat_id, total in spending_result.all()
    }

    output: list[BudgetWithSpending] = []
    for cat_id, (budget, category) in by_cat.items():
        spent = spending_by_cat.get(cat_id, Decimal("0"))
        limit = Decimal(str(budget.monthly_limit))
        remaining = limit - spent
        pct = float(spent / limit * 100) if limit > 0 else 0.0
        output.append(
            BudgetWithSpending(
                id=budget.id,
                category_id=cat_id,
                monthly_limit=limit,
                year=budget.year,
                month=budget.month,
                category_name=category.name,
                category_icon=category.icon,
                category_color=category.color,
                spent=spent,
                remaining=remaining,
                percentage_used=pct,
                is_overspent=spent > limit,
                created_at=budget.created_at,
                updated_at=budget.updated_at,
            )
        )
    return output


@router.post(
    "", response_model=BudgetOut, status_code=status.HTTP_201_CREATED
)
async def create_budget(
    payload: BudgetCreate,
    db: AsyncSession = Depends(get_db),
) -> Budget:
    if (payload.year is None) != (payload.month is None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="year and month must both be set or both be null",
        )

    budget = Budget(**payload.model_dump())
    db.add(budget)
    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        if "uq_budgets_category_period" in str(e):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Un budget existe déjà pour cette catégorie et cette période",
            ) from e
        raise
    await db.refresh(budget)
    return budget


@router.patch("/{budget_id}", response_model=BudgetOut)
async def update_budget(
    budget_id: int,
    payload: BudgetUpdate,
    db: AsyncSession = Depends(get_db),
) -> Budget:
    result = await db.execute(select(Budget).where(Budget.id == budget_id))
    budget = result.scalar_one_or_none()
    if budget is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found"
        )
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(budget, field, value)
    await db.commit()
    await db.refresh(budget)
    return budget


@router.delete("/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_budget(
    budget_id: int, db: AsyncSession = Depends(get_db)
) -> None:
    result = await db.execute(select(Budget).where(Budget.id == budget_id))
    budget = result.scalar_one_or_none()
    if budget is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Budget not found"
        )
    await db.delete(budget)
    await db.commit()
