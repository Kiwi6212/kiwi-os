from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.task import Task, TaskCategory, TaskStatus
from app.schemas.task import TaskCreate, TaskOut, TaskStats, TaskUpdate

router = APIRouter()


@router.get("", response_model=list[TaskOut])
async def list_tasks(
    db: AsyncSession = Depends(get_db),
    category: TaskCategory | None = Query(None),
    status_filter: TaskStatus | None = Query(None, alias="status"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[Task]:
    query = select(Task)

    if category is not None:
        query = query.where(Task.category == category)
    if status_filter is not None:
        query = query.where(Task.status == status_filter)

    query = query.order_by(Task.created_at.desc()).limit(limit).offset(offset)

    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate, db: AsyncSession = Depends(get_db)
) -> Task:
    task = Task(**payload.model_dump())
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.get("/stats", response_model=TaskStats)
async def get_task_stats(db: AsyncSession = Depends(get_db)) -> TaskStats:
    total_result = await db.execute(select(func.count(Task.id)))
    total = total_result.scalar() or 0

    by_status_result = await db.execute(
        select(Task.status, func.count(Task.id)).group_by(Task.status)
    )
    by_status = {row[0].value: row[1] for row in by_status_result.all()}
    for s in TaskStatus:
        by_status.setdefault(s.value, 0)

    by_category_result = await db.execute(
        select(Task.category, func.count(Task.id)).group_by(Task.category)
    )
    by_category = {row[0].value: row[1] for row in by_category_result.all()}
    for c in TaskCategory:
        by_category.setdefault(c.value, 0)

    now = datetime.now(UTC)
    overdue_result = await db.execute(
        select(func.count(Task.id)).where(
            and_(
                Task.deadline.is_not(None),
                Task.deadline < now,
                Task.status != TaskStatus.DONE,
            )
        )
    )
    overdue = overdue_result.scalar() or 0

    monday = now - timedelta(days=now.weekday())
    monday = monday.replace(hour=0, minute=0, second=0, microsecond=0)
    completed_this_week_result = await db.execute(
        select(func.count(Task.id)).where(
            and_(
                Task.status == TaskStatus.DONE,
                Task.completed_at.is_not(None),
                Task.completed_at >= monday,
            )
        )
    )
    completed_this_week = completed_this_week_result.scalar() or 0

    return TaskStats(
        total=total,
        by_status=by_status,
        by_category=by_category,
        overdue=overdue,
        completed_this_week=completed_this_week,
    )


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(task_id: int, db: AsyncSession = Depends(get_db)) -> Task:
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )
    return task


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: int,
    payload: TaskUpdate,
    db: AsyncSession = Depends(get_db),
) -> Task:
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )

    update_data = payload.model_dump(exclude_unset=True)

    new_status = update_data.get("status")
    if new_status == TaskStatus.DONE and task.status != TaskStatus.DONE:
        update_data["completed_at"] = datetime.now(UTC)
    elif new_status is not None and new_status != TaskStatus.DONE:
        update_data["completed_at"] = None

    for field, value in update_data.items():
        setattr(task, field, value)

    await db.commit()
    await db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: int, db: AsyncSession = Depends(get_db)) -> None:
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )
    await db.delete(task)
    await db.commit()


@router.patch("/{task_id}/complete", response_model=TaskOut)
async def mark_task_complete(
    task_id: int, db: AsyncSession = Depends(get_db)
) -> Task:
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )

    task.status = TaskStatus.DONE
    task.completed_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(task)
    return task
