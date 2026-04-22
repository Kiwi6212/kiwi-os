from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.application import Application, ApplicationStatus, ContractType
from app.schemas.application import (
    ApplicationCreate,
    ApplicationOut,
    ApplicationStats,
    ApplicationUpdate,
)

router = APIRouter()


@router.get("", response_model=list[ApplicationOut])
async def list_applications(
    db: AsyncSession = Depends(get_db),
    status_filter: ApplicationStatus | None = Query(None, alias="status"),
    contract_type: ContractType | None = None,
    is_favorite: bool | None = None,
    search: str | None = Query(None, description="Search in company or position"),
    sort_by: str = Query(
        "created_at",
        pattern="^(created_at|updated_at|date_applied|company|status)$",
    ),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[Application]:
    query = select(Application)

    if status_filter is not None:
        query = query.where(Application.status == status_filter)
    if contract_type is not None:
        query = query.where(Application.contract_type == contract_type)
    if is_favorite is not None:
        query = query.where(Application.is_favorite == is_favorite)
    if search:
        s = f"%{search.lower()}%"
        query = query.where(
            or_(
                func.lower(Application.company).like(s),
                func.lower(Application.position).like(s),
            )
        )

    sort_column = getattr(Application, sort_by)
    query = query.order_by(
        sort_column.desc() if sort_order == "desc" else sort_column.asc()
    )
    query = query.limit(limit).offset(offset)

    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/stats", response_model=ApplicationStats)
async def get_stats(db: AsyncSession = Depends(get_db)) -> ApplicationStats:
    total_result = await db.execute(select(func.count(Application.id)))
    total = total_result.scalar() or 0

    if total == 0:
        return ApplicationStats(
            total=0,
            by_status={},
            active_count=0,
            response_rate=0.0,
            interview_rate=0.0,
            favorites_count=0,
        )

    by_status_result = await db.execute(
        select(Application.status, func.count(Application.id)).group_by(
            Application.status
        )
    )
    by_status = {row[0].value: row[1] for row in by_status_result.all()}

    active_statuses = [
        ApplicationStatus.APPLIED,
        ApplicationStatus.FOLLOWED_UP,
        ApplicationStatus.INTERVIEW,
    ]
    active_count = sum(by_status.get(s.value, 0) for s in active_statuses)

    no_response = by_status.get(ApplicationStatus.NO_RESPONSE.value, 0)
    responded = total - no_response
    response_rate = round((responded / total) * 100, 1) if total > 0 else 0.0

    reached_interview = by_status.get(
        ApplicationStatus.INTERVIEW.value, 0
    ) + by_status.get(ApplicationStatus.ACCEPTED.value, 0)
    interview_rate = (
        round((reached_interview / total) * 100, 1) if total > 0 else 0.0
    )

    favorites_result = await db.execute(
        select(func.count(Application.id)).where(Application.is_favorite.is_(True))
    )
    favorites_count = favorites_result.scalar() or 0

    return ApplicationStats(
        total=total,
        by_status=by_status,
        active_count=active_count,
        response_rate=response_rate,
        interview_rate=interview_rate,
        favorites_count=favorites_count,
    )


@router.get("/{application_id}", response_model=ApplicationOut)
async def get_application(
    application_id: int, db: AsyncSession = Depends(get_db)
) -> Application:
    result = await db.execute(
        select(Application).where(Application.id == application_id)
    )
    app_obj = result.scalar_one_or_none()
    if app_obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
        )
    return app_obj


@router.post("", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
async def create_application(
    payload: ApplicationCreate, db: AsyncSession = Depends(get_db)
) -> Application:
    app_obj = Application(**payload.model_dump())
    db.add(app_obj)
    await db.commit()
    await db.refresh(app_obj)
    return app_obj


@router.patch("/{application_id}", response_model=ApplicationOut)
async def update_application(
    application_id: int,
    payload: ApplicationUpdate,
    db: AsyncSession = Depends(get_db),
) -> Application:
    result = await db.execute(
        select(Application).where(Application.id == application_id)
    )
    app_obj = result.scalar_one_or_none()
    if app_obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
        )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(app_obj, field, value)

    await db.commit()
    await db.refresh(app_obj)
    return app_obj


@router.delete("/{application_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_application(
    application_id: int, db: AsyncSession = Depends(get_db)
) -> None:
    result = await db.execute(
        select(Application).where(Application.id == application_id)
    )
    app_obj = result.scalar_one_or_none()
    if app_obj is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
        )
    await db.delete(app_obj)
    await db.commit()
