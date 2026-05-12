from datetime import datetime
from typing import Any

from sqlalchemy import ARRAY, JSON, Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base


class PortfolioBio(Base):
    """Singleton (id=1). Identité publique pour la vitrine portfolio."""

    __tablename__ = "portfolio_bio"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    tagline: Mapped[str | None] = mapped_column(String(300), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)

    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cv_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    email: Mapped[str | None] = mapped_column(String(200), nullable=True)
    github_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(300), nullable=True)
    location: Mapped[str | None] = mapped_column(String(200), nullable=True)

    skills: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, server_default="{}"
    )

    education: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, nullable=False, server_default="[]"
    )
    experience: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, nullable=False, server_default="[]"
    )

    public_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
