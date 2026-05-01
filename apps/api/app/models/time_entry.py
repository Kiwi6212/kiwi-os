from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.task import Task


class TimeEntryType(str, Enum):
    POMODORO_FOCUS = "pomodoro_focus"
    POMODORO_SHORT_BREAK = "pomodoro_short_break"
    POMODORO_LONG_BREAK = "pomodoro_long_break"
    FREE_TIMER = "free_timer"


class TimeEntry(Base):
    __tablename__ = "time_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    task_id: Mapped[int | None] = mapped_column(
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    task: Mapped["Task | None"] = relationship(
        "Task", back_populates="time_entries"
    )

    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)

    type: Mapped[TimeEntryType] = mapped_column(
        SAEnum(
            TimeEntryType,
            name="time_entry_type_enum",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=TimeEntryType.FREE_TIMER,
    )

    label: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        Index("ix_time_entries_started_type", "started_at", "type"),
    )
