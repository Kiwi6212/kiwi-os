from datetime import datetime

from sqlalchemy import ARRAY, Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.models.base import Base


class PortfolioProject(Base):
    __tablename__ = "portfolio_projects"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(200), nullable=False, unique=True, index=True
    )

    description_short: Mapped[str | None] = mapped_column(String(500), nullable=True)
    description_long: Mapped[str | None] = mapped_column(Text, nullable=True)
    screenshot_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    demo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    repo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    tech_stack: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, server_default="{}"
    )

    is_featured: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    is_visible: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
    )
    display_order: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )

    github_repo_id: Mapped[int | None] = mapped_column(
        Integer, nullable=True, unique=True
    )
    github_synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
