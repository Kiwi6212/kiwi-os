from datetime import date

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
    CompanyCount,
    FollowUpReminder,
    SalaryRange,
)

SALARY_BUCKETS: tuple[tuple[str, int, int | None], ...] = (
    ("0-30k", 0, 30_000),
    ("30-40k", 30_000, 40_000),
    ("40-50k", 40_000, 50_000),
    ("50-60k", 50_000, 60_000),
    ("60-80k", 60_000, 80_000),
    ("80k+", 80_000, None),
)


def _bucket_for_salary(amount: int | None) -> str:
    if amount is None:
        return "Non spécifié"
    for label, low, high in SALARY_BUCKETS:
        if high is None:
            if amount >= low:
                return label
        elif low <= amount < high:
            return label
    return "Non spécifié"

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

    all_apps_result = await db.execute(select(Application))
    all_apps = list(all_apps_result.scalars().all())

    response_statuses = {
        ApplicationStatus.INTERVIEW,
        ApplicationStatus.ACCEPTED,
        ApplicationStatus.REJECTED,
    }
    deltas: list[int] = []
    for app in all_apps:
        if (
            app.status in response_statuses
            and app.date_applied is not None
            and app.last_contact is not None
            and app.last_contact >= app.date_applied
        ):
            deltas.append((app.last_contact - app.date_applied).days)
    avg_response_time_days = (
        round(sum(deltas) / len(deltas), 1) if deltas else None
    )

    salary_counter: dict[str, int] = {label: 0 for label, _, _ in SALARY_BUCKETS}
    salary_counter["Non spécifié"] = 0
    for app in all_apps:
        amount = app.salary_max if app.salary_max is not None else app.salary_min
        bucket = _bucket_for_salary(amount)
        salary_counter[bucket] = salary_counter.get(bucket, 0) + 1
    by_salary_range = [
        SalaryRange(range=label, count=salary_counter[label])
        for label, _, _ in SALARY_BUCKETS
    ]
    by_salary_range.append(
        SalaryRange(range="Non spécifié", count=salary_counter["Non spécifié"])
    )

    top_companies_result = await db.execute(
        select(Application.company, func.count(Application.id).label("c"))
        .group_by(Application.company)
        .order_by(func.count(Application.id).desc())
        .limit(5)
    )
    top_companies = [
        CompanyCount(company=row[0], count=row[1]) for row in top_companies_result.all()
    ]

    today = date.today()
    follow_up_result = await db.execute(
        select(Application)
        .where(
            Application.follow_up_date.is_not(None),
            Application.follow_up_done.is_(False),
        )
        .order_by(Application.follow_up_date.asc())
        .limit(10)
    )
    upcoming_follow_ups = [
        FollowUpReminder(
            id=app.id,
            company=app.company,
            position=app.position,
            follow_up_date=app.follow_up_date,
            days_until=(app.follow_up_date - today).days,
        )
        for app in follow_up_result.scalars().all()
        if app.follow_up_date is not None
    ]

    return ApplicationStats(
        total=total,
        by_status=by_status,
        active_count=active_count,
        response_rate=response_rate,
        interview_rate=interview_rate,
        favorites_count=favorites_count,
        avg_response_time_days=avg_response_time_days,
        by_salary_range=by_salary_range,
        top_companies=top_companies,
        upcoming_follow_ups=upcoming_follow_ups,
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
