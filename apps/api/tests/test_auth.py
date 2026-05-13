"""Tests for the auth router and service.

Same pattern as test_portfolio / test_rss: SQLite in-memory + dependency
override of get_db so the suite runs without Postgres.

The rate limiter is reset between tests so the 5/min cap on /login can
be exercised in isolation.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.auth_deps import get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.main import create_app
from app.models.auth.refresh_token import RefreshToken  # noqa: F401
from app.models.auth.user import User
from app.models.base import Base
from app.services import auth_service


TEST_PASSWORD = "test-password-123"
TEST_EMAIL = "test@kiwi.local"


@pytest.fixture(autouse=True)
def _env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("ADMIN_EMAIL", TEST_EMAIL)
    monkeypatch.setenv("ADMIN_PASSWORD", TEST_PASSWORD)
    monkeypatch.setenv(
        "JWT_SECRET",
        "test-secret-key-do-not-use-in-prod-make-this-long-enough-please",
    )
    monkeypatch.setenv("JWT_ACCESS_TTL_MINUTES", "15")
    monkeypatch.setenv("JWT_REFRESH_TTL_DAYS", "30")
    get_settings.cache_clear()
    # Reset the in-process slowapi limiter so the per-IP counter starts
    # fresh in each test.
    limiter.reset()
    yield
    get_settings.cache_clear()


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
                    Base.metadata.tables["users"],
                    Base.metadata.tables["refresh_tokens"],
                ],
            )
        )

    factory = async_sessionmaker(engine, expire_on_commit=False)
    # Seed the admin user — mirrors the bootstrap_admin_user step that
    # runs in the FastAPI lifespan.
    async with factory() as session:
        await auth_service.bootstrap_admin_user(session)
    yield factory
    await engine.dispose()


def _make_app(factory: async_sessionmaker[AsyncSession]):
    app = create_app()

    async def override_get_db() -> AsyncIterator[AsyncSession]:
        async with factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    return app


# ---------- Bootstrap ----------


@pytest.mark.asyncio
async def test_bootstrap_creates_user(session_factory) -> None:
    async with session_factory() as session:
        # Calling bootstrap twice should still leave a single user.
        await auth_service.bootstrap_admin_user(session)
        from sqlalchemy import select

        result = await session.execute(select(User))
        users = list(result.scalars().all())
    assert len(users) == 1
    assert users[0].email == TEST_EMAIL
    assert users[0].is_active is True


# ---------- /login ----------


@pytest.mark.asyncio
async def test_login_success(session_factory) -> None:
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/auth/login", json={"password": TEST_PASSWORD}
        )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "Bearer"
    assert body["expires_in"] == 15 * 60
    assert len(body["access_token"]) > 20
    # Refresh cookie should be set with httpOnly + the /api/auth path.
    set_cookie = response.headers.get("set-cookie", "")
    assert "kiwi_refresh=" in set_cookie
    assert "HttpOnly" in set_cookie or "httponly" in set_cookie.lower()


@pytest.mark.asyncio
async def test_login_wrong_password(session_factory) -> None:
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/auth/login", json={"password": "wrong-password"}
        )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_rate_limit(session_factory) -> None:
    """Six rapid login attempts: the sixth must be throttled to 429."""
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        statuses: list[int] = []
        for i in range(6):
            r = await client.post(
                "/api/auth/login", json={"password": "wrong-password"}
            )
            statuses.append(r.status_code)
    # First five attempts are normal failures (401), the 6th hits the
    # rate limit (429).
    assert statuses[:5] == [401] * 5
    assert statuses[5] == 429


# ---------- /refresh ----------


@pytest.mark.asyncio
async def test_refresh_success(session_factory) -> None:
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login = await client.post(
            "/api/auth/login", json={"password": TEST_PASSWORD}
        )
        assert login.status_code == 200
        refresh_cookie = login.cookies.get("kiwi_refresh")
        assert refresh_cookie

        refresh = await client.post(
            "/api/auth/refresh",
            cookies={"kiwi_refresh": refresh_cookie},
        )
    assert refresh.status_code == 200
    body = refresh.json()
    assert len(body["access_token"]) > 20
    # New refresh cookie issued (rotation).
    assert refresh.cookies.get("kiwi_refresh") != refresh_cookie


@pytest.mark.asyncio
async def test_refresh_rotation_invalidates_old_token(session_factory) -> None:
    """Replaying the same refresh token must fail after the first use."""
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login = await client.post(
            "/api/auth/login", json={"password": TEST_PASSWORD}
        )
        old_cookie = login.cookies.get("kiwi_refresh")
        assert old_cookie

        first = await client.post(
            "/api/auth/refresh", cookies={"kiwi_refresh": old_cookie}
        )
        assert first.status_code == 200

        # Replay
        second = await client.post(
            "/api/auth/refresh", cookies={"kiwi_refresh": old_cookie}
        )
    assert second.status_code == 401


@pytest.mark.asyncio
async def test_refresh_missing_cookie(session_factory) -> None:
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post("/api/auth/refresh")
    assert response.status_code == 401


# ---------- /logout ----------


@pytest.mark.asyncio
async def test_logout_revokes_refresh(session_factory) -> None:
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login = await client.post(
            "/api/auth/login", json={"password": TEST_PASSWORD}
        )
        refresh_cookie = login.cookies.get("kiwi_refresh")
        assert refresh_cookie

        logout = await client.post(
            "/api/auth/logout", cookies={"kiwi_refresh": refresh_cookie}
        )
        assert logout.status_code == 204

        # Refresh with the revoked cookie should now fail.
        retry = await client.post(
            "/api/auth/refresh", cookies={"kiwi_refresh": refresh_cookie}
        )
    assert retry.status_code == 401


# ---------- /me ----------


@pytest.mark.asyncio
async def test_me_with_valid_bearer(session_factory) -> None:
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        login = await client.post(
            "/api/auth/login", json={"password": TEST_PASSWORD}
        )
        access = login.json()["access_token"]

        me = await client.get(
            "/api/auth/me", headers={"Authorization": f"Bearer {access}"}
        )
    assert me.status_code == 200
    body = me.json()
    assert body["email"] == TEST_EMAIL
    assert body["is_active"] is True


@pytest.mark.asyncio
async def test_me_without_bearer(session_factory) -> None:
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/auth/me")
    assert response.status_code == 401
    assert response.headers.get("www-authenticate", "").lower().startswith(
        "bearer"
    )


@pytest.mark.asyncio
async def test_me_with_invalid_bearer(session_factory) -> None:
    app = _make_app(session_factory)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/auth/me", headers={"Authorization": "Bearer not-a-real-token"}
        )
    assert response.status_code == 401


# ---------- Service-level edge cases ----------


def test_password_hash_and_verify() -> None:
    h = auth_service.hash_password("secret-123")
    assert h != "secret-123"
    assert auth_service.verify_password("secret-123", h) is True
    assert auth_service.verify_password("wrong", h) is False


def test_decode_access_token_rejects_random_string() -> None:
    assert auth_service.decode_access_token("garbage") is None
