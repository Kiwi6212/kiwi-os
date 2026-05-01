from datetime import datetime

from sqlalchemy import DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base


class PomodoroPreference(Base):
    """Singleton table — only one row (id=1). No per-user concept yet."""

    __tablename__ = "pomodoro_preferences"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)

    focus_duration_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1500
    )
    short_break_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=300
    )
    long_break_seconds: Mapped[int] = mapped_column(
        Integer, nullable=False, default=900
    )
    cycles_before_long_break: Mapped[int] = mapped_column(
        Integer, nullable=False, default=4
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
