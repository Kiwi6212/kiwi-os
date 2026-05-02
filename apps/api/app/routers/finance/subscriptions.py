from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.finance.subscription import Subscription
from app.schemas.finance.subscription import (
    SubscriptionCreate,
    SubscriptionOut,
    SubscriptionUpdate,
)
from app.services.subscription_service import (
    calculate_monthly_cost,
    calculate_next_billing_date,
)

router = APIRouter()


def _enrich(sub: Subscription) -> dict[str, Any]:
    return {
        "id": sub.id,
        "name": sub.name,
        "amount": sub.amount,
        "frequency": sub.frequency,
        "started_at": sub.started_at,
        "ended_at": sub.ended_at,
        "account_id": sub.account_id,
        "category_id": sub.category_id,
        "is_active": sub.is_active,
        "icon": sub.icon,
        "color": sub.color,
        "notes": sub.notes,
        "created_at": sub.created_at,
        "updated_at": sub.updated_at,
        "next_billing_date": calculate_next_billing_date(sub),
        "monthly_cost": calculate_monthly_cost(sub),
    }


@router.get("", response_model=list[SubscriptionOut])
async def list_subscriptions(
    db: AsyncSession = Depends(get_db),
    is_active: bool | None = Query(None),
) -> list[dict[str, Any]]:
    query = select(Subscription)
    if is_active is not None:
        query = query.where(Subscription.is_active == is_active)
    query = query.order_by(Subscription.name)
    result = await db.execute(query)
    return [_enrich(s) for s in result.scalars().all()]


@router.post(
    "", response_model=SubscriptionOut, status_code=status.HTTP_201_CREATED
)
async def create_subscription(
    payload: SubscriptionCreate,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    sub = Subscription(**payload.model_dump())
    db.add(sub)
    await db.commit()
    await db.refresh(sub)
    return _enrich(sub)


@router.get("/{sub_id}", response_model=SubscriptionOut)
async def get_subscription(
    sub_id: int, db: AsyncSession = Depends(get_db)
) -> dict[str, Any]:
    result = await db.execute(
        select(Subscription).where(Subscription.id == sub_id)
    )
    sub = result.scalar_one_or_none()
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found"
        )
    return _enrich(sub)


@router.patch("/{sub_id}", response_model=SubscriptionOut)
async def update_subscription(
    sub_id: int,
    payload: SubscriptionUpdate,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    result = await db.execute(
        select(Subscription).where(Subscription.id == sub_id)
    )
    sub = result.scalar_one_or_none()
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found"
        )
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(sub, field, value)
    await db.commit()
    await db.refresh(sub)
    return _enrich(sub)


@router.delete("/{sub_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subscription(
    sub_id: int, db: AsyncSession = Depends(get_db)
) -> None:
    result = await db.execute(
        select(Subscription).where(Subscription.id == sub_id)
    )
    sub = result.scalar_one_or_none()
    if sub is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found"
        )
    await db.delete(sub)
    await db.commit()
