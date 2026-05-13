"""Unit tests for the settings router that don't require a live database.

Smoke tests against the real Postgres are covered by the manual curl
commands in the commit message; tests that hit the DB belong to a separate
integration-test suite (TODO).
"""

import datetime as dt

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import get_settings
from app.main import create_app


@pytest.mark.asyncio
async def test_integration_status_github_without_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("GITHUB_TOKEN", raising=False)
    get_settings.cache_clear()  # reload from env
    try:
        from tests._auth_helper import install_fake_auth_override
        app = create_app()
        install_fake_auth_override(app)
        # Skip lifespan so we don't need a running Postgres/Redis.
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/settings/integrations/github/status")
        assert response.status_code == 200
        body = response.json()
        assert body["name"] == "github"
        assert body["healthy"] is False
        assert "missing" in body["message"].lower()
    finally:
        get_settings.cache_clear()


@pytest.mark.asyncio
async def test_integration_status_weather_always_healthy() -> None:
    from tests._auth_helper import install_fake_auth_override
    app = create_app()
    install_fake_auth_override(app)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/settings/integrations/weather/status")
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "weather"
    assert body["healthy"] is True


@pytest.mark.asyncio
async def test_integration_status_unknown_returns_404() -> None:
    from tests._auth_helper import install_fake_auth_override
    app = create_app()
    install_fake_auth_override(app)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/settings/integrations/nonexistent/status"
        )
    assert response.status_code == 404


def test_log_level_enum_values() -> None:
    from app.models.system_log import LogLevel

    assert LogLevel.DEBUG.value == "debug"
    assert LogLevel.INFO.value == "info"
    assert LogLevel.WARNING.value == "warning"
    assert LogLevel.ERROR.value == "error"
    assert LogLevel.CRITICAL.value == "critical"


def test_ui_density_enum_values() -> None:
    from app.models.user_preference import Locale, UIDensity

    assert UIDensity.COMPACT.value == "compact"
    assert UIDensity.COMFORTABLE.value == "comfortable"
    assert Locale.FR.value == "fr"
    assert Locale.EN.value == "en"


def test_log_event_signature_accepts_kwargs() -> None:
    """Smoke test that log_event() helpers accept all kwargs we use."""
    import inspect

    from app.services.system_logger import log_event

    sig = inspect.signature(log_event)
    assert "level" in sig.parameters
    assert "module" in sig.parameters
    assert "session_factory" in sig.parameters
    assert "http_status" in sig.parameters


@pytest.mark.asyncio
async def test_404_triggers_error_log_middleware_in_pipeline(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Verify the middleware is wired and a 404 is captured.

    We monkeypatch log_event to record calls instead of touching the DB.
    """
    captured: list[dict] = []

    async def fake_log_event(**kwargs: object) -> None:
        captured.append(dict(kwargs))

    monkeypatch.setattr(
        "app.middleware.log_errors.log_event", fake_log_event
    )

    from tests._auth_helper import install_fake_auth_override
    app = create_app()
    install_fake_auth_override(app)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/this-does-not-exist")
    assert response.status_code == 404

    assert len(captured) >= 1, "ErrorLogMiddleware should have logged the 404"
    last = captured[-1]
    assert last["http_status"] == 404
    assert last["http_path"] == "/api/this-does-not-exist"
    assert last["http_method"] == "GET"
