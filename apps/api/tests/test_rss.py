"""Unit tests for the RSS reader.

Uses SQLite in-memory for ORM coverage and monkeypatches `feedparser.parse`
to avoid hitting the network. Mirrors the dependency-override pattern from
test_portfolio.
"""

from __future__ import annotations

import datetime as dt
from collections.abc import AsyncIterator
from types import SimpleNamespace

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db
from app.main import create_app
from app.models.base import Base
from app.models.rss.feed import RSSFeed  # noqa: F401 — register table
from app.models.rss.item import RSSItem  # noqa: F401
from app.services import rss_service


@pytest_asyncio.fixture
async def session_factory() -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(
            lambda sync_conn: Base.metadata.create_all(
                sync_conn,
                tables=[
                    Base.metadata.tables["rss_feeds"],
                    Base.metadata.tables["rss_items"],
                ],
            )
        )

    factory = async_sessionmaker(engine, expire_on_commit=False)
    yield factory
    await engine.dispose()


def _make_app(factory: async_sessionmaker[AsyncSession]):
    from tests._auth_helper import install_fake_auth_override

    app = create_app()

    async def override_get_db() -> AsyncIterator[AsyncSession]:
        async with factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    install_fake_auth_override(app)
    return app


# ---------- feeds ----------


@pytest.mark.asyncio
async def test_list_feeds_empty(session_factory) -> None:
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/rss/feeds")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_create_feed_returns_201(session_factory) -> None:
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/rss/feeds",
            json={
                "name": "Krebs",
                "url": "https://krebsonsecurity.com/feed/",
                "category": "cyber",
                "display_order": 10,
            },
        )
    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Krebs"
    assert body["category"] == "cyber"
    assert body["unread_count"] == 0


@pytest.mark.asyncio
async def test_create_duplicate_url_returns_409(session_factory) -> None:
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        first = await client.post(
            "/api/rss/feeds",
            json={"name": "A", "url": "https://example.com/feed"},
        )
        assert first.status_code == 201
        dup = await client.post(
            "/api/rss/feeds",
            json={"name": "B", "url": "https://example.com/feed"},
        )
    assert dup.status_code == 409


@pytest.mark.asyncio
async def test_update_feed_changes_fields(session_factory) -> None:
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post(
            "/api/rss/feeds",
            json={"name": "Original", "url": "https://x.example.com/feed"},
        )
        feed_id = created.json()["id"]
        patched = await client.patch(
            f"/api/rss/feeds/{feed_id}",
            json={"name": "Renamed", "is_active": False},
        )
    assert patched.status_code == 200
    body = patched.json()
    assert body["name"] == "Renamed"
    assert body["is_active"] is False


@pytest.mark.asyncio
async def test_delete_feed_returns_204(session_factory) -> None:
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post(
            "/api/rss/feeds",
            json={"name": "X", "url": "https://y.example.com/feed"},
        )
        feed_id = created.json()["id"]
        deleted = await client.delete(f"/api/rss/feeds/{feed_id}")
        assert deleted.status_code == 204
        gone = await client.delete(f"/api/rss/feeds/{feed_id}")
    assert gone.status_code == 404


# ---------- items ----------


async def _insert_feed_and_items(
    factory: async_sessionmaker[AsyncSession],
) -> tuple[int, int, int]:
    """Helper: insert a feed + 3 items with mixed flags; returns IDs."""
    async with factory() as session:
        feed = RSSFeed(
            name="Test Feed",
            url="https://t.example.com/feed",
            category="cyber",
            is_active=True,
            display_order=0,
        )
        session.add(feed)
        await session.flush()
        items = [
            RSSItem(
                feed_id=feed.id,
                title="Read favorited",
                link="https://t.example.com/1",
                is_read=True,
                is_favorited=True,
                published_at=dt.datetime(2026, 5, 10, tzinfo=dt.UTC),
            ),
            RSSItem(
                feed_id=feed.id,
                title="Unread",
                link="https://t.example.com/2",
                is_read=False,
                is_favorited=False,
                published_at=dt.datetime(2026, 5, 11, tzinfo=dt.UTC),
            ),
            RSSItem(
                feed_id=feed.id,
                title="Old read",
                link="https://t.example.com/3",
                is_read=True,
                is_favorited=False,
                published_at=dt.datetime(2026, 4, 1, tzinfo=dt.UTC),
            ),
        ]
        for it in items:
            session.add(it)
        await session.commit()
        await session.refresh(items[0])
        return feed.id, items[0].id, items[1].id


@pytest.mark.asyncio
async def test_list_items_filters(session_factory) -> None:
    feed_id, _, _ = await _insert_feed_and_items(session_factory)
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        unread = await client.get("/api/rss/items?is_read=false")
        favorited = await client.get("/api/rss/items?is_favorited=true")
        by_cat = await client.get("/api/rss/items?category=cyber")
        by_feed = await client.get(f"/api/rss/items?feed_id={feed_id}")

    assert len(unread.json()) == 1
    assert unread.json()[0]["title"] == "Unread"
    assert len(favorited.json()) == 1
    assert favorited.json()[0]["title"] == "Read favorited"
    assert len(by_cat.json()) == 3
    assert len(by_feed.json()) == 3
    # Items have feed_name + feed_category annotated
    assert by_cat.json()[0]["feed_name"] == "Test Feed"
    assert by_cat.json()[0]["feed_category"] == "cyber"


@pytest.mark.asyncio
async def test_update_item_toggles_flags(session_factory) -> None:
    _, _, unread_id = await _insert_feed_and_items(session_factory)
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.patch(
            f"/api/rss/items/{unread_id}",
            json={"is_read": True, "is_favorited": True},
        )
    assert response.status_code == 200
    body = response.json()
    assert body["is_read"] is True
    assert body["is_favorited"] is True


@pytest.mark.asyncio
async def test_items_stats(session_factory) -> None:
    await _insert_feed_and_items(session_factory)
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/rss/items/stats")
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 3
    assert body["unread"] == 1
    assert body["favorited"] == 1


# ---------- sync ----------


@pytest.mark.asyncio
async def test_sync_feed_inserts_new_items(
    session_factory, monkeypatch: pytest.MonkeyPatch
) -> None:
    """sync_feed parses entries, dedups by (feed_id, link), records sync time."""
    async with session_factory() as session:
        feed = RSSFeed(
            name="Mock",
            url="https://mock.example.com/feed",
            is_active=True,
        )
        session.add(feed)
        await session.commit()
        feed_id = feed.id

    fake_entries = [
        SimpleNamespace(
            title="First post",
            link="https://mock.example.com/1",
            summary="<p>hello <b>world</b></p>",
            author="alice",
            id="guid-1",
            published_parsed=(2026, 5, 11, 10, 0, 0, 0, 0, 0),
        ),
        SimpleNamespace(
            title="Second post",
            link="https://mock.example.com/2",
            summary="another",
            published_parsed=None,
        ),
    ]

    def fake_parse(url: str):
        return SimpleNamespace(
            entries=fake_entries, bozo=False, bozo_exception=None
        )

    monkeypatch.setattr(rss_service.feedparser, "parse", fake_parse)

    async with session_factory() as session:
        result = await session.execute(
            rss_service.select(RSSFeed).where(RSSFeed.id == feed_id)
        )
        feed_db = result.scalar_one()
        first = await rss_service.sync_feed(session, feed_db)
        # Second invocation must be idempotent (dedup by link).
        second = await rss_service.sync_feed(session, feed_db)

    assert first["created"] == 2
    assert first["total_in_feed"] == 2
    assert first["error"] is None
    assert second["created"] == 0


@pytest.mark.asyncio
async def test_sync_feed_handles_parser_error(
    session_factory, monkeypatch: pytest.MonkeyPatch
) -> None:
    """When feedparser raises, error is captured on feed.last_error."""
    async with session_factory() as session:
        feed = RSSFeed(
            name="Broken", url="https://broken.example.com/feed", is_active=True
        )
        session.add(feed)
        await session.commit()
        feed_id = feed.id

    def boom(url: str):
        raise RuntimeError("network down")

    monkeypatch.setattr(rss_service.feedparser, "parse", boom)

    async with session_factory() as session:
        result = await session.execute(
            rss_service.select(RSSFeed).where(RSSFeed.id == feed_id)
        )
        feed_db = result.scalar_one()
        outcome = await rss_service.sync_feed(session, feed_db)

    assert outcome["error"] is not None
    assert "network down" in outcome["error"]
    async with session_factory() as session:
        result = await session.execute(
            rss_service.select(RSSFeed).where(RSSFeed.id == feed_id)
        )
        feed_db = result.scalar_one()
        assert feed_db.last_error is not None
        assert feed_db.last_synced_at is not None
