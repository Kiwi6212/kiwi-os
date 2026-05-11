"""Settings router: user preferences, system logs, and integration status."""

from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.system_log import LogLevel, SystemLog
from app.models.user_preference import UserPreference
from app.schemas.system_log import (
    IntegrationStatus,
    LogStats,
    LogStatsByLevel,
    SystemLogOut,
)
from app.schemas.user_preference import UserPreferenceOut, UserPreferenceUpdate

router = APIRouter()

PREF_ID = 1


@router.get("/preferences", response_model=UserPreferenceOut)
async def get_preferences(db: AsyncSession = Depends(get_db)) -> UserPreference:
    result = await db.execute(
        select(UserPreference).where(UserPreference.id == PREF_ID)
    )
    pref = result.scalar_one_or_none()
    if pref is None:
        pref = UserPreference(id=PREF_ID)
        db.add(pref)
        await db.commit()
        await db.refresh(pref)
    return pref


@router.patch("/preferences", response_model=UserPreferenceOut)
async def update_preferences(
    update: UserPreferenceUpdate,
    db: AsyncSession = Depends(get_db),
) -> UserPreference:
    result = await db.execute(
        select(UserPreference).where(UserPreference.id == PREF_ID)
    )
    pref = result.scalar_one_or_none()
    if pref is None:
        pref = UserPreference(id=PREF_ID)
        db.add(pref)
        await db.flush()

    for key, value in update.model_dump(exclude_unset=True).items():
        setattr(pref, key, value)

    await db.commit()
    await db.refresh(pref)
    return pref


@router.get("/logs", response_model=list[SystemLogOut])
async def list_logs(
    db: AsyncSession = Depends(get_db),
    level: LogLevel | None = Query(None),
    module: str | None = Query(None),
    date_from: dt.datetime | None = Query(None),
    date_to: dt.datetime | None = Query(None),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
) -> list[SystemLog]:
    query = select(SystemLog)

    conditions = []
    if level:
        conditions.append(SystemLog.level == level)
    if module:
        conditions.append(SystemLog.module == module)
    if date_from:
        conditions.append(SystemLog.timestamp >= date_from)
    if date_to:
        conditions.append(SystemLog.timestamp <= date_to)

    if conditions:
        query = query.where(and_(*conditions))

    query = query.order_by(SystemLog.timestamp.desc()).limit(limit).offset(offset)

    result = await db.execute(query)
    return list(result.scalars().all())


@router.delete("/logs", status_code=status.HTTP_204_NO_CONTENT)
async def purge_logs(
    db: AsyncSession = Depends(get_db),
    older_than_days: int | None = Query(None, ge=1),
    level: LogLevel | None = Query(None),
) -> None:
    """Purge logs. Filters compose with AND. With no filter, deletes everything."""
    query = delete(SystemLog)
    conditions = []

    if older_than_days is not None:
        cutoff = dt.datetime.now(dt.UTC) - dt.timedelta(days=older_than_days)
        conditions.append(SystemLog.timestamp < cutoff)
    if level is not None:
        conditions.append(SystemLog.level == level)

    if conditions:
        query = query.where(and_(*conditions))

    await db.execute(query)
    await db.commit()


@router.get("/logs/stats", response_model=LogStats)
async def get_logs_stats(db: AsyncSession = Depends(get_db)) -> LogStats:
    now = dt.datetime.now(dt.UTC)
    last_24h = now - dt.timedelta(hours=24)
    last_7d = now - dt.timedelta(days=7)

    total_q = await db.execute(select(func.count(SystemLog.id)))
    total = total_q.scalar() or 0

    by_level: list[LogStatsByLevel] = []
    for lvl in LogLevel:
        c24_q = await db.execute(
            select(func.count(SystemLog.id)).where(
                and_(SystemLog.level == lvl, SystemLog.timestamp >= last_24h)
            )
        )
        c7d_q = await db.execute(
            select(func.count(SystemLog.id)).where(
                and_(SystemLog.level == lvl, SystemLog.timestamp >= last_7d)
            )
        )
        by_level.append(
            LogStatsByLevel(
                level=lvl,
                count_24h=c24_q.scalar() or 0,
                count_7d=c7d_q.scalar() or 0,
            )
        )

    by_module_q = await db.execute(
        select(SystemLog.module, func.count(SystemLog.id))
        .where(SystemLog.timestamp >= last_7d)
        .group_by(SystemLog.module)
    )
    by_module = {module: count for module, count in by_module_q.all()}

    most_recent_err_q = await db.execute(
        select(func.max(SystemLog.timestamp)).where(
            SystemLog.level.in_([LogLevel.ERROR, LogLevel.CRITICAL])
        )
    )
    most_recent_error = most_recent_err_q.scalar()

    return LogStats(
        total=total,
        by_level=by_level,
        by_module=by_module,
        most_recent_error=most_recent_error,
    )


@router.get("/integrations/{name}/status", response_model=IntegrationStatus)
async def integration_status(name: str) -> IntegrationStatus:
    """Health-check a named integration (github, weather, …)."""
    now = dt.datetime.now(dt.UTC)
    settings = get_settings()

    if name == "github":
        token = (
            settings.github_token.get_secret_value()
            if settings.github_token
            else None
        )
        healthy = token is not None and len(token) > 20
        return IntegrationStatus(
            name="github",
            healthy=healthy,
            last_check=now,
            message=(
                "GITHUB_TOKEN configured"
                if healthy
                else "GITHUB_TOKEN missing or invalid"
            ),
            details={
                "token_configured": healthy,
                "username": settings.github_username,
            },
        )

    if name == "weather":
        return IntegrationStatus(
            name="weather",
            healthy=True,
            last_check=now,
            message="Open-Meteo API does not require credentials",
            details={"provider": "open-meteo"},
        )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Integration '{name}' not found",
    )
