"""Unit tests for the settings_data router (export/import).

These tests cover the validation paths that don't require a live DB. The
`get_db` dependency is overridden with a no-op stub so the FastAPI dep
resolution succeeds before the route's own validation runs.

Full end-to-end (real export → real import) lives in the integration suite.
"""

import io
import json
from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.database import get_db
from app.main import create_app
from app.routers.settings_data import _coerce_date, _coerce_datetime


async def _stub_db() -> AsyncIterator[None]:
    # The validation paths reject the upload before touching the DB,
    # so a stub that yields `None` is enough.
    yield None  # type: ignore[misc]


def _make_app_with_stub_db():
    from tests._auth_helper import install_fake_auth_override

    app = create_app()
    app.dependency_overrides[get_db] = _stub_db
    install_fake_auth_override(app)
    return app


@pytest.mark.asyncio
async def test_import_requires_json_extension() -> None:
    app = _make_app_with_stub_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/settings/data/import",
            files={"file": ("notes.txt", b"hello", "text/plain")},
        )
    assert response.status_code == 400
    assert ".json" in response.json()["detail"]


@pytest.mark.asyncio
async def test_import_rejects_invalid_json() -> None:
    app = _make_app_with_stub_db()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/settings/data/import",
            files={"file": ("broken.json", b"{not valid", "application/json")},
        )
    assert response.status_code == 400
    assert "JSON" in response.json()["detail"]


@pytest.mark.asyncio
async def test_import_rejects_missing_data_field() -> None:
    app = _make_app_with_stub_db()
    transport = ASGITransport(app=app)
    body = json.dumps({"version": "1.0"}).encode()
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/settings/data/import",
            files={"file": ("export.json", io.BytesIO(body), "application/json")},
        )
    assert response.status_code == 400
    assert "'data'" in response.json()["detail"]


def test_coerce_datetime_handles_iso_and_z() -> None:
    assert _coerce_datetime("2026-05-11T12:30:00+00:00") is not None
    assert _coerce_datetime("2026-05-11T12:30:00Z") is not None
    assert _coerce_datetime("not-a-date") is None
    assert _coerce_datetime(None) is None


def test_coerce_date_handles_date_and_datetime_strings() -> None:
    assert _coerce_date("2026-05-11") is not None
    assert _coerce_date("2026-05-11T12:30:00Z") is not None
    assert _coerce_date("rubbish") is None
    assert _coerce_date(None) is None
