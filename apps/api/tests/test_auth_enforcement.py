"""End-to-end checks that the JWT guard is actually enforced.

Each protected router must reject unauthenticated requests with 401.
Each public router must remain accessible. With a valid Bearer token,
protected routers must not respond 401 anymore (they may still 4xx for
bad payloads, missing rows, etc. — we only assert "not 401").

Distinct from test_auth.py:
- test_auth.py exercises the auth router itself (login, refresh, /me).
- This file enumerates every other router and confirms it's gated.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import get_settings
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.main import create_app
from app.models.auth.refresh_token import RefreshToken  # noqa: F401 — registers table
from app.models.auth.user import User  # noqa: F401
from app.models.base import Base
from app.services import auth_service


TEST_PASSWORD = "test-password-123"
TEST_EMAIL = "enforcement@kiwi.local"


PROTECTED_ENDPOINTS = [
    ("GET", "/api/settings/preferences"),
    ("GET", "/api/settings/logs"),
    ("GET", "/api/settings/logs/stats"),
    ("GET", "/api/settings/data/export"),
    ("GET", "/api/portfolio/bio"),
    ("GET", "/api/portfolio/projects"),
    ("GET", "/api/rss/feeds"),
    ("GET", "/api/rss/items"),
    ("GET", "/api/rss/items/stats"),
    ("GET", "/api/applications/stats"),
    ("GET", "/api/tasks"),
    ("GET", "/api/tasks/stats"),
    ("GET", "/api/time/stats"),
    ("GET", "/api/github/stats"),
    ("GET", "/api/stats/github"),
    ("GET", "/api/weather?lat=48.85&lon=2.35"),
    ("GET", "/api/finances/accounts"),
    ("GET", "/api/finances/transactions"),
    ("GET", "/api/finances/categories"),
    ("GET", "/api/finances/budgets"),
    ("GET", "/api/finances/subscriptions"),
    ("GET", "/api/finances/stats"),
    ("GET", "/api/pomodoro/preferences"),
]


PUBLIC_ENDPOINTS_NO_AUTH_HEADERS = [
    ("GET", "/health", None),
    ("GET", "/api/portfolio/public", None),
    # Login is "public" in the sense that it accepts an unauthenticated
    # request — it will return 401 only because the body is empty.
]


@pytest.fixture(autouse=True)
def _env(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("ADMIN_EMAIL", TEST_EMAIL)
    monkeypatch.setenv("ADMIN_PASSWORD", TEST_PASSWORD)
    monkeypatch.setenv(
        "JWT_SECRET",
        "enforcement-test-secret-do-not-use-in-prod-please-thanks-12345",
    )
    monkeypatch.setenv("JWT_ACCESS_TTL_MINUTES", "15")
    monkeypatch.setenv("JWT_REFRESH_TTL_DAYS", "30")
    get_settings.cache_clear()
    limiter.reset()
    yield
    get_settings.cache_clear()


@pytest_asyncio.fixture
async def session_factory() -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    # Patch PG ARRAY columns to JSON for SQLite portability — same trick
    # as in test_portfolio. We only need this for the portfolio_bio table
    # because that's the one /api/portfolio/public touches.
    from sqlalchemy import ARRAY, JSON

    for table_name in ("portfolio_bio", "portfolio_projects"):
        table = Base.metadata.tables.get(table_name)
        if table is None:
            continue
        for col in table.columns:
            if isinstance(col.type, ARRAY):
                col.type = JSON()
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
        # Tables: auth + portfolio (for /api/portfolio/public anonymous read).
        await conn.run_sync(
            lambda sync_conn: Base.metadata.create_all(
                sync_conn,
                tables=[
                    Base.metadata.tables["users"],
                    Base.metadata.tables["refresh_tokens"],
                    Base.metadata.tables["portfolio_bio"],
                    Base.metadata.tables["portfolio_projects"],
                ],
            )
        )

    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory() as session:
        await auth_service.bootstrap_admin_user(session)
    yield factory
    await engine.dispose()


class _StubRedis:
    """Minimal Redis stand-in so cache helpers don't blow up in tests."""

    async def get(self, *_args, **_kwargs):
        return None

    async def set(self, *_args, **_kwargs):
        return None

    async def setex(self, *_args, **_kwargs):
        return None

    async def aclose(self):
        return None


def _make_app(factory: async_sessionmaker[AsyncSession]):
    app = create_app()

    async def override_get_db() -> AsyncIterator[AsyncSession]:
        async with factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    # Without the lifespan running, app.state is empty. Stub the bits
    # that lifespan-dependent routes (/health, github, weather, etc.)
    # poke at — they may still fail downstream, but we only assert
    # "not 401" so the actual response code (500 / 503) is acceptable.
    app.state.db_sessionmaker = factory
    app.state.redis = _StubRedis()
    return app


async def _login(client: AsyncClient) -> dict[str, str]:
    res = await client.post("/api/auth/login", json={"password": TEST_PASSWORD})
    assert res.status_code == 200, res.text
    return {"Authorization": f"Bearer {res.json()['access_token']}"}


# ---------- Protected: rejects unauthenticated ----------


@pytest.mark.asyncio
@pytest.mark.parametrize("method,path", PROTECTED_ENDPOINTS)
async def test_protected_endpoint_rejects_unauthenticated(
    session_factory, method: str, path: str
) -> None:
    app = _make_app(session_factory)
    # raise_app_exceptions=False so missing-table errors etc. surface as
    # 500 responses instead of bubbling out of the AsyncClient — we only
    # want to assert "not 401", and the handler may legitimately error
    # on the SQLite test backend that doesn't have every table.
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.request(method, path)
    assert res.status_code == 401, (
        f"{method} {path} should reject unauthenticated request, "
        f"got {res.status_code}"
    )
    # WWW-Authenticate header surfaces the scheme.
    assert (
        res.headers.get("www-authenticate", "").lower().startswith("bearer")
    ), f"{method} {path}: missing WWW-Authenticate: Bearer header"


# ---------- Protected: accepts authenticated ----------


@pytest.mark.asyncio
@pytest.mark.parametrize("method,path", PROTECTED_ENDPOINTS)
async def test_protected_endpoint_accepts_authenticated(
    session_factory, method: str, path: str
) -> None:
    app = _make_app(session_factory)
    # raise_app_exceptions=False so missing-table errors etc. surface as
    # 500 responses instead of bubbling out of the AsyncClient — we only
    # want to assert "not 401", and the handler may legitimately error
    # on the SQLite test backend that doesn't have every table.
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        headers = await _login(client)
        res = await client.request(method, path, headers=headers)
    # Auth-passed: the route may still 4xx/5xx for downstream reasons
    # (missing tables, missing data, external network…), but it MUST
    # NOT respond 401.
    assert res.status_code != 401, (
        f"{method} {path} should accept valid Bearer, got 401"
    )


# ---------- Public: no auth required ----------


@pytest.mark.asyncio
@pytest.mark.parametrize("method,path,_body", PUBLIC_ENDPOINTS_NO_AUTH_HEADERS)
async def test_public_endpoint_does_not_require_auth(
    session_factory, method: str, path: str, _body: object
) -> None:
    app = _make_app(session_factory)
    # raise_app_exceptions=False so missing-table errors etc. surface as
    # 500 responses instead of bubbling out of the AsyncClient — we only
    # want to assert "not 401", and the handler may legitimately error
    # on the SQLite test backend that doesn't have every table.
    transport = ASGITransport(app=app, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.request(method, path)
    # May be 200 (portfolio public, health) — but never 401.
    assert res.status_code != 401, (
        f"{method} {path} should not require auth, got 401"
    )
