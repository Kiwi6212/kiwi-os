"""RSS/Atom feed parser + sync. Builds on the system_logger for telemetry."""

from __future__ import annotations

import datetime as dt
import logging
import re
from typing import Any

import feedparser
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.rss import RSSFeed, RSSItem
from app.services.system_logger import log_error, log_info

logger = logging.getLogger(__name__)

_TAG_RE = re.compile(r"<[^>]+>")
_WHITESPACE_RE = re.compile(r"\s+")


def _parse_published(entry: Any) -> dt.datetime | None:
    """Coerce feedparser's struct_time into a tz-aware datetime (UTC)."""
    for key in ("published_parsed", "updated_parsed"):
        ts = getattr(entry, key, None)
        if ts:
            try:
                return dt.datetime(*ts[:6], tzinfo=dt.UTC)
            except (TypeError, ValueError):
                continue
    return None


def _clean_html(text: str | None) -> str | None:
    """Strip tags and collapse whitespace; cap at 2000 chars for preview."""
    if not text:
        return None
    cleaned = _TAG_RE.sub("", text).strip()
    cleaned = _WHITESPACE_RE.sub(" ", cleaned)
    return cleaned[:2000] if cleaned else None


async def sync_feed(db: AsyncSession, feed: RSSFeed) -> dict[str, Any]:
    """Parse a feed and insert any new items.

    Returns ``{created, total_in_feed, error}``. Logs INFO on success and
    ERROR on failure via the system_logger (DB + stdout).
    """
    try:
        parsed = feedparser.parse(feed.url)

        if parsed.bozo and parsed.bozo_exception:
            # Not fatal — many real-world feeds emit minor parse warnings.
            logger.warning(
                "Feed %s bozo: %s", feed.name, parsed.bozo_exception
            )

        entries = parsed.entries
        created = 0

        for entry in entries:
            link = getattr(entry, "link", None)
            if not link:
                continue

            existing = await db.execute(
                select(RSSItem).where(
                    RSSItem.feed_id == feed.id,
                    RSSItem.link == link,
                )
            )
            if existing.scalar_one_or_none():
                continue

            author = getattr(entry, "author", None)
            summary = getattr(entry, "summary", None) or getattr(
                entry, "description", None
            )

            item = RSSItem(
                feed_id=feed.id,
                title=(getattr(entry, "title", "(sans titre)") or "(sans titre)")[
                    :500
                ],
                link=link[:1000],
                description=_clean_html(summary),
                author=author[:200] if author else None,
                guid=(getattr(entry, "id", None) or link)[:500],
                published_at=_parse_published(entry),
            )
            db.add(item)
            created += 1

        feed.last_synced_at = dt.datetime.now(dt.UTC)
        feed.last_error = None
        await db.commit()

        await log_info(
            "rss",
            f"Synced {feed.name}: {created} new items",
            context={
                "feed_id": feed.id,
                "created": created,
                "total": len(entries),
            },
            db=db,
        )

        return {
            "created": created,
            "total_in_feed": len(entries),
            "error": None,
        }

    except Exception as exc:
        error_msg = f"{type(exc).__name__}: {str(exc)[:500]}"
        await db.rollback()
        feed.last_error = error_msg
        feed.last_synced_at = dt.datetime.now(dt.UTC)
        try:
            db.add(feed)
            await db.commit()
        except Exception:
            await db.rollback()

        await log_error(
            "rss",
            f"Failed to sync {feed.name}",
            context={"feed_id": feed.id, "error": error_msg},
            db=db,
        )

        return {"created": 0, "total_in_feed": 0, "error": error_msg}


async def sync_all_feeds(db: AsyncSession) -> dict[str, Any]:
    """Sync every active feed sequentially. Returns aggregated stats."""
    result = await db.execute(
        select(RSSFeed)
        .where(RSSFeed.is_active.is_(True))
        .order_by(RSSFeed.display_order)
    )
    feeds = list(result.scalars().all())

    results: dict[str, dict[str, Any]] = {}
    total_created = 0
    failed = 0

    for feed in feeds:
        sync_result = await sync_feed(db, feed)
        results[feed.name] = sync_result
        total_created += sync_result["created"]
        if sync_result["error"]:
            failed += 1

    return {
        "total_created": total_created,
        "feeds_synced": len(feeds),
        "feeds_failed": failed,
        "results": results,
    }
