from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime
from sqlalchemy import Enum as SAEnum
from sqlalchemy import Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.time_entry import TimeEntry


class TaskCategory(str, Enum):
    SCHOOL = "school"
    PERSONAL = "personal"


class TaskSubtype(str, Enum):
    TP = "tp"
    HOMEWORK = "homework"
    SCHOOL_PROJECT = "school_project"
    EXAM = "exam"
    SIDE_PROJECT = "side_project"
    PERSONAL_TODO = "personal_todo"
    ADMIN = "admin"
    LEARNING = "learning"
    OTHER = "other"


class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"


class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    category: Mapped[TaskCategory] = mapped_column(
        SAEnum(
            TaskCategory,
            name="task_category_enum",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        index=True,
    )
    subtype: Mapped[TaskSubtype] = mapped_column(
        SAEnum(
            TaskSubtype,
            name="task_subtype_enum",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=TaskSubtype.OTHER,
    )
    status: Mapped[TaskStatus] = mapped_column(
        SAEnum(
            TaskStatus,
            name="task_status_enum",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=TaskStatus.TODO,
        index=True,
    )
    priority: Mapped[TaskPriority] = mapped_column(
        SAEnum(
            TaskPriority,
            name="task_priority_enum",
            values_callable=lambda x: [e.value for e in x],
        ),
        nullable=False,
        default=TaskPriority.MEDIUM,
    )

    deadline: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    time_entries: Mapped[list["TimeEntry"]] = relationship(
        "TimeEntry",
        back_populates="task",
        cascade="all",
        passive_deletes=True,
    )

    __table_args__ = (
        Index("ix_tasks_category_status", "category", "status"),
    )
