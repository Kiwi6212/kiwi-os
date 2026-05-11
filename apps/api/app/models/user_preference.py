import enum
from datetime import datetime

from sqlalchemy import DateTime, Float, String
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base


class UIDensity(str, enum.Enum):
    COMPACT = "compact"
    COMFORTABLE = "comfortable"


class Locale(str, enum.Enum):
    FR = "fr"
    EN = "en"


class UserPreference(Base):
    """Singleton: a single row with id=1 stores app-wide preferences."""

    __tablename__ = "user_preferences"

    id: Mapped[int] = mapped_column(primary_key=True)

    ui_density: Mapped[str] = mapped_column(
        String(20), nullable=False, default=UIDensity.COMFORTABLE.value
    )
    locale: Mapped[str] = mapped_column(
        String(5), nullable=False, default=Locale.FR.value
    )

    display_name: Mapped[str | None] = mapped_column(String(100), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    weather_location_lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    weather_location_lon: Mapped[float | None] = mapped_column(Float, nullable=True)
    weather_location_name: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )

    github_username: Mapped[str | None] = mapped_column(String(100), nullable=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
