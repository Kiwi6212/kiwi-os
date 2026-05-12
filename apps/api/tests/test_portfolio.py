"""Unit tests for the portfolio router.

DB-backed flows are exercised via an in-memory SQLite session injected
through `app.dependency_overrides`. This keeps the suite self-contained
(no Postgres required) while still touching real ORM behavior.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import JSON, ARRAY, String, TypeDecorator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db
from app.main import create_app
from app.models.base import Base
from app.models.portfolio.bio import PortfolioBio  # noqa: F401 — register
from app.models.portfolio.project import PortfolioProject  # noqa: F401
from app.routers.portfolio import _slugify


# SQLite has no ARRAY type. Patch the column types for in-memory testing
# by overriding ARRAY → JSON for the duration of the test session.
class JsonArrayCompat(TypeDecorator):
    impl = JSON
    cache_ok = True


@pytest_asyncio.fixture
async def session_factory() -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    # Force SQLite-friendly column types on the portfolio metadata before
    # creating tables. This mutates Base.metadata in place — fine because
    # tests run in an isolated event loop.
    for table_name in ("portfolio_bio", "portfolio_projects"):
        table = Base.metadata.tables.get(table_name)
        if table is None:
            continue
        for col in table.columns:
            if isinstance(col.type, ARRAY):
                col.type = JSON()
            # SQLite chokes on PG-specific server defaults like "'{}'::varchar[]"
            if col.server_default is not None and isinstance(
                getattr(col.server_default, "arg", None), str
            ):
                arg = col.server_default.arg
                if "::varchar" in arg or "::json" in arg:
                    col.server_default = None

    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(
            lambda sync_conn: Base.metadata.create_all(
                sync_conn,
                tables=[
                    Base.metadata.tables["portfolio_bio"],
                    Base.metadata.tables["portfolio_projects"],
                ],
            )
        )

    factory = async_sessionmaker(engine, expire_on_commit=False)
    yield factory
    await engine.dispose()


def _make_app(
    factory: async_sessionmaker[AsyncSession],
):
    app = create_app()

    async def override_get_db() -> AsyncIterator[AsyncSession]:
        async with factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    return app


def test_slugify_basic() -> None:
    assert _slugify("My Cool Project") == "my-cool-project"
    assert _slugify("  Hello, World!  ") == "hello-world"
    assert _slugify("---") == "project"
    assert _slugify("Already-slug") == "already-slug"


@pytest.mark.asyncio
async def test_get_bio_creates_singleton(session_factory) -> None:
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/portfolio/bio")
    assert response.status_code == 200
    body = response.json()
    assert body["id"] == 1
    assert body["public_enabled"] is False
    assert body["skills"] == []


@pytest.mark.asyncio
async def test_patch_bio_updates_fields(session_factory) -> None:
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.patch(
            "/api/portfolio/bio",
            json={
                "name": "Mathias",
                "tagline": "IT Tech",
                "skills": ["Python", "TypeScript"],
                "public_enabled": True,
            },
        )
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "Mathias"
    assert body["tagline"] == "IT Tech"
    assert body["skills"] == ["Python", "TypeScript"]
    assert body["public_enabled"] is True


@pytest.mark.asyncio
async def test_create_project_auto_slug(session_factory) -> None:
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/portfolio/projects",
            json={"name": "My Cool Project"},
        )
    assert response.status_code == 201
    body = response.json()
    assert body["slug"] == "my-cool-project"
    assert body["name"] == "My Cool Project"


@pytest.mark.asyncio
async def test_create_project_slug_collision(session_factory) -> None:
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        first = await client.post(
            "/api/portfolio/projects",
            json={"name": "Project A", "slug": "shared"},
        )
        assert first.status_code == 201

        dup = await client.post(
            "/api/portfolio/projects",
            json={"name": "Project B", "slug": "shared"},
        )
    assert dup.status_code == 409
    assert "shared" in dup.json()["detail"]


@pytest.mark.asyncio
async def test_delete_project(session_factory) -> None:
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post(
            "/api/portfolio/projects", json={"name": "To Delete"}
        )
        project_id = created.json()["id"]

        deleted = await client.delete(f"/api/portfolio/projects/{project_id}")
        assert deleted.status_code == 204

        gone = await client.delete(f"/api/portfolio/projects/{project_id}")
    assert gone.status_code == 404


@pytest.mark.asyncio
async def test_public_endpoint_when_disabled(session_factory) -> None:
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Bio singleton starts with public_enabled=False
        await client.get("/api/portfolio/bio")
        response = await client.get("/api/portfolio/public")
    assert response.status_code == 200
    body = response.json()
    assert body["public_enabled"] is False
    assert body["bio"] is None
    assert body["projects"] == []


@pytest.mark.asyncio
async def test_public_endpoint_when_enabled_filters_invisible(
    session_factory,
) -> None:
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        await client.patch(
            "/api/portfolio/bio",
            json={"name": "Mathias", "public_enabled": True},
        )
        await client.post(
            "/api/portfolio/projects",
            json={"name": "Visible One", "is_visible": True},
        )
        await client.post(
            "/api/portfolio/projects",
            json={"name": "Hidden", "is_visible": False},
        )

        response = await client.get("/api/portfolio/public")
    assert response.status_code == 200
    body = response.json()
    assert body["public_enabled"] is True
    assert body["bio"]["name"] == "Mathias"
    assert len(body["projects"]) == 1
    assert body["projects"][0]["name"] == "Visible One"
    # No id / created_at / github_repo_id leaks in public payload
    assert "id" not in body["projects"][0]
    assert "github_repo_id" not in body["projects"][0]


@pytest.mark.asyncio
async def test_update_project(session_factory) -> None:
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        created = await client.post(
            "/api/portfolio/projects", json={"name": "Initial"}
        )
        project_id = created.json()["id"]

        patched = await client.patch(
            f"/api/portfolio/projects/{project_id}",
            json={"description_short": "Now described", "is_featured": True},
        )
    assert patched.status_code == 200
    body = patched.json()
    assert body["description_short"] == "Now described"
    assert body["is_featured"] is True
    assert body["name"] == "Initial"  # unchanged
