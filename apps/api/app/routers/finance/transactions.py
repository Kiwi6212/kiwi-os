from datetime import date as date_type
from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.finance.account import Account
from app.models.finance.transaction import Transaction, TransactionType
from app.schemas.finance.transaction import (
    TransactionCreate,
    TransactionOut,
    TransactionUpdate,
    TransferCreate,
)

router = APIRouter()


@router.get("", response_model=list[TransactionOut])
async def list_transactions(
    db: AsyncSession = Depends(get_db),
    date_from: date_type | None = Query(None),
    date_to: date_type | None = Query(None),
    account_id: int | None = Query(None),
    category_id: int | None = Query(None),
    type_filter: TransactionType | None = Query(None, alias="type"),
    search: str | None = Query(None, description="Match in description or merchant"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[Transaction]:
    query = select(Transaction)

    if date_from is not None:
        query = query.where(Transaction.date >= date_from)
    if date_to is not None:
        query = query.where(Transaction.date <= date_to)
    if account_id is not None:
        query = query.where(Transaction.account_id == account_id)
    if category_id is not None:
        query = query.where(Transaction.category_id == category_id)
    if type_filter is not None:
        query = query.where(Transaction.type == type_filter)
    if search:
        s = f"%{search.lower()}%"
        query = query.where(
            or_(
                Transaction.description.ilike(s),
                Transaction.merchant.ilike(s),
            )
        )

    query = (
        query.order_by(Transaction.date.desc(), Transaction.id.desc())
        .limit(limit)
        .offset(offset)
    )

    result = await db.execute(query)
    return list(result.scalars().all())


@router.post(
    "", response_model=TransactionOut, status_code=status.HTTP_201_CREATED
)
async def create_transaction(
    payload: TransactionCreate,
    db: AsyncSession = Depends(get_db),
) -> Transaction:
    account_check = await db.execute(
        select(Account).where(Account.id == payload.account_id)
    )
    if account_check.scalar_one_or_none() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Account not found"
        )

    transaction = Transaction(**payload.model_dump())
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    return transaction


@router.post(
    "/transfer",
    response_model=list[TransactionOut],
    status_code=status.HTTP_201_CREATED,
)
async def create_transfer(
    payload: TransferCreate,
    db: AsyncSession = Depends(get_db),
) -> list[Transaction]:
    if payload.from_account_id == payload.to_account_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="from_account_id and to_account_id must differ",
        )

    accounts_result = await db.execute(
        select(Account).where(
            Account.id.in_([payload.from_account_id, payload.to_account_id])
        )
    )
    accounts = list(accounts_result.scalars().all())
    found_ids = {a.id for a in accounts}
    missing = {payload.from_account_id, payload.to_account_id} - found_ids
    if missing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Account(s) not found: {sorted(missing)}",
        )

    group_id = str(uuid4())
    amount = payload.amount

    out_tx = Transaction(
        account_id=payload.from_account_id,
        category_id=None,
        date=payload.date,
        amount=Decimal("-1") * amount,
        description=payload.description,
        type=TransactionType.TRANSFER,
        transfer_group_id=group_id,
        notes=payload.notes,
    )
    in_tx = Transaction(
        account_id=payload.to_account_id,
        category_id=None,
        date=payload.date,
        amount=amount,
        description=payload.description,
        type=TransactionType.TRANSFER,
        transfer_group_id=group_id,
        notes=payload.notes,
    )
    db.add_all([out_tx, in_tx])
    await db.commit()
    await db.refresh(out_tx)
    await db.refresh(in_tx)
    return [out_tx, in_tx]


@router.get("/{transaction_id}", response_model=TransactionOut)
async def get_transaction(
    transaction_id: int, db: AsyncSession = Depends(get_db)
) -> Transaction:
    result = await db.execute(
        select(Transaction).where(Transaction.id == transaction_id)
    )
    tx = result.scalar_one_or_none()
    if tx is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )
    return tx


@router.patch("/{transaction_id}", response_model=TransactionOut)
async def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
) -> Transaction:
    result = await db.execute(
        select(Transaction).where(Transaction.id == transaction_id)
    )
    tx = result.scalar_one_or_none()
    if tx is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )

    update_data = payload.model_dump(exclude_unset=True)
    if "account_id" in update_data:
        account_check = await db.execute(
            select(Account).where(Account.id == update_data["account_id"])
        )
        if account_check.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Account not found"
            )

    for field, value in update_data.items():
        setattr(tx, field, value)

    await db.commit()
    await db.refresh(tx)
    return tx


@router.delete("/{transaction_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    transaction_id: int, db: AsyncSession = Depends(get_db)
) -> None:
    result = await db.execute(
        select(Transaction).where(Transaction.id == transaction_id)
    )
    tx = result.scalar_one_or_none()
    if tx is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found"
        )
    await db.delete(tx)
    await db.commit()
