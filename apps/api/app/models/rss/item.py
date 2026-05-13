from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.models.base import Base

if TYPE_CHECKING:
    from app.models.rss.feed import RSSFeed


class RSSItem(Base):
    __tablename__ = "rss_items"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    feed_id: Mapped[int] = mapped_column(
        ForeignKey("rss_feeds.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    link: Mapped[str] = mapped_column(String(1000), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    author: Mapped[str | None] = mapped_column(String(200), nullable=True)
    guid: Mapped[str | None] = mapped_column(String(500), nullable=True)

    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, index=True
    )

    is_read: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false", index=True
    )
    is_favorited: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false", index=True
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

    feed: Mapped["RSSFeed"] = relationship(back_populates="items")

    __table_args__ = (
        UniqueConstraint("feed_id", "link", name="uq_rss_items_feed_link"),
        Index("ix_rss_items_feed_published", "feed_id", "published_at"),
    )
