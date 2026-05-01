from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.task import TaskCategory, TaskPriority, TaskStatus, TaskSubtype


class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    category: TaskCategory
    subtype: TaskSubtype = TaskSubtype.OTHER
    status: TaskStatus = TaskStatus.TODO
    priority: TaskPriority = TaskPriority.MEDIUM
    deadline: datetime | None = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    category: TaskCategory | None = None
    subtype: TaskSubtype | None = None
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    deadline: datetime | None = None


class TaskOut(TaskBase):
    id: int
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None = None

    model_config = ConfigDict(from_attributes=True)


class TaskStats(BaseModel):
    total: int
    by_status: dict[str, int]
    by_category: dict[str, int]
    overdue: int
    completed_this_week: int
