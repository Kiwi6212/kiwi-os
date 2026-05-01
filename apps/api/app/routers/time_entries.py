from collections import defaultdict
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.task import Task
from app.models.time_entry import TimeEntry, TimeEntryType
from app.schemas.time_entry import (
    TimeEntryOut,
    TimeEntryStart,
    TimeEntryUpdate,
    TimeStats,
    TimeStatsByDay,
    TimeStatsByTask,
)

router = APIRouter()


@router.get("/entries", response_model=list[TimeEntryOut])
async def list_time_entries(
    db: AsyncSession = Depends(get_db),
    task_id: int | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[TimeEntry]:
    query = select(TimeEntry)
    if task_id is not None:
        query = query.where(TimeEntry.task_id == task_id)
    query = query.order_by(TimeEntry.started_at.desc()).limit(limit).offset(offset)

    result = await db.execute(query)
    return list(result.scalars().all())


@router.post(
    "/entries", response_model=TimeEntryOut, status_code=status.HTTP_201_CREATED
)
async def start_time_entry(
    payload: TimeEntryStart,
    db: AsyncSession = Depends(get_db),
) -> TimeEntry:
    if payload.task_id is not None:
        task_check = await db.execute(
            select(Task).where(Task.id == payload.task_id)
        )
        if task_check.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
            )

    entry = TimeEntry(
        task_id=payload.task_id,
        type=payload.type,
        label=payload.label,
        started_at=datetime.now(UTC),
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


@router.get("/active", response_model=TimeEntryOut | None)
async def get_active_entry(db: AsyncSession = Depends(get_db)) -> TimeEntry | None:
    result = await db.execute(
        select(TimeEntry)
        .where(TimeEntry.ended_at.is_(None))
        .order_by(TimeEntry.started_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


@router.get("/stats", response_model=TimeStats)
async def get_time_stats(db: AsyncSession = Depends(get_db)) -> TimeStats:
    now = datetime.now(UTC)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    monday = today_start - timedelta(days=today_start.weekday())
    seven_days_ago = today_start - timedelta(days=6)

    today_result = await db.execute(
        select(func.coalesce(func.sum(TimeEntry.duration_seconds), 0)).where(
            and_(
                TimeEntry.started_at >= today_start,
                TimeEntry.duration_seconds.is_not(None),
            )
        )
    )
    total_seconds_today = int(today_result.scalar() or 0)

    week_result = await db.execute(
        select(func.coalesce(func.sum(TimeEntry.duration_seconds), 0)).where(
            and_(
                TimeEntry.started_at >= monday,
                TimeEntry.duration_seconds.is_not(None),
            )
        )
    )
    total_seconds_this_week = int(week_result.scalar() or 0)

    entries_7d_result = await db.execute(
        select(TimeEntry).where(
            and_(
                TimeEntry.started_at >= seven_days_ago,
                TimeEntry.duration_seconds.is_not(None),
            )
        )
    )
    entries_7d = list(entries_7d_result.scalars().all())

    by_day_buckets: dict[str, dict[str, int]] = defaultdict(
        lambda: {"total": 0, "focus": 0, "free": 0, "break": 0}
    )
    for e in entries_7d:
        d = e.started_at.date().isoformat()
        bucket = by_day_buckets[d]
        seconds = e.duration_seconds or 0
        bucket["total"] += seconds
        if e.type == TimeEntryType.POMODORO_FOCUS:
            bucket["focus"] += seconds
        elif e.type == TimeEntryType.FREE_TIMER:
            bucket["free"] += seconds
        else:
            bucket["break"] += seconds

    by_day = []
    for i in range(7):
        d = (seven_days_ago + timedelta(days=i)).date().isoformat()
        b = by_day_buckets.get(
            d, {"total": 0, "focus": 0, "free": 0, "break": 0}
        )
        by_day.append(
            TimeStatsByDay(
                date=d,
                total_seconds=b["total"],
                focus_seconds=b["focus"],
                free_seconds=b["free"],
                break_seconds=b["break"],
            )
        )

    by_task_result = await db.execute(
        select(
            TimeEntry.task_id,
            Task.title,
            func.sum(TimeEntry.duration_seconds).label("total"),
        )
        .join(Task, Task.id == TimeEntry.task_id)
        .where(
            and_(
                TimeEntry.started_at >= monday,
                TimeEntry.duration_seconds.is_not(None),
                TimeEntry.task_id.is_not(None),
            )
        )
        .group_by(TimeEntry.task_id, Task.title)
        .order_by(func.sum(TimeEntry.duration_seconds).desc())
        .limit(10)
    )
    by_task = [
        TimeStatsByTask(
            task_id=tid, task_title=title, total_seconds=int(total)
        )
        for tid, title, total in by_task_result.all()
    ]

    return TimeStats(
        total_seconds_today=total_seconds_today,
        total_seconds_this_week=total_seconds_this_week,
        by_day_last_7_days=by_day,
        by_task_this_week=by_task,
    )


@router.patch("/entries/{entry_id}/stop", response_model=TimeEntryOut)
async def stop_time_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
) -> TimeEntry:
    result = await db.execute(
        select(TimeEntry).where(TimeEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Time entry not found"
        )
    if entry.ended_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Time entry already stopped",
        )

    now = datetime.now(UTC)
    entry.ended_at = now
    entry.duration_seconds = int((now - entry.started_at).total_seconds())

    await db.commit()
    await db.refresh(entry)
    return entry


@router.patch("/entries/{entry_id}", response_model=TimeEntryOut)
async def update_time_entry(
    entry_id: int,
    payload: TimeEntryUpdate,
    db: AsyncSession = Depends(get_db),
) -> TimeEntry:
    result = await db.execute(
        select(TimeEntry).where(TimeEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Time entry not found"
        )

    update_data = payload.model_dump(exclude_unset=True)

    if "task_id" in update_data and update_data["task_id"] is not None:
        task_check = await db.execute(
            select(Task).where(Task.id == update_data["task_id"])
        )
        if task_check.scalar_one_or_none() is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
            )

    for field, value in update_data.items():
        setattr(entry, field, value)

    await db.commit()
    await db.refresh(entry)
    return entry


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_time_entry(
    entry_id: int,
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(TimeEntry).where(TimeEntry.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Time entry not found"
        )
    await db.delete(entry)
    await db.commit()
