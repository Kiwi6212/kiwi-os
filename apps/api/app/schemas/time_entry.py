from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.time_entry import TimeEntryType


class TimeEntryStart(BaseModel):
    task_id: int | None = None
    type: TimeEntryType = TimeEntryType.FREE_TIMER
    label: str | None = Field(None, max_length=255)


class TimeEntryUpdate(BaseModel):
    task_id: int | None = None
    label: str | None = Field(None, max_length=255)


class TimeEntryOut(BaseModel):
    id: int
    task_id: int | None
    started_at: datetime
    ended_at: datetime | None
    duration_seconds: int | None
    type: TimeEntryType
    label: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TimeStatsByDay(BaseModel):
    date: str
    total_seconds: int
    focus_seconds: int
    free_seconds: int
    break_seconds: int


class TimeStatsByTask(BaseModel):
    task_id: int
    task_title: str
    total_seconds: int


class TimeStats(BaseModel):
    total_seconds_today: int
    total_seconds_this_week: int
    by_day_last_7_days: list[TimeStatsByDay]
    by_task_this_week: list[TimeStatsByTask]
