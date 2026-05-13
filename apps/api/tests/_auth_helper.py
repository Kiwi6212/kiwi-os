"""Shared test helper to skip the auth dependency in protected routes.

Apps/api commit 3/3 mounts every data router under
``dependencies=[Depends(get_current_user)]``. Existing test files
(test_settings, test_portfolio, test_rss, test_settings_data) hit those
routes without a Bearer token, so without this override every call
would now return 401.

`install_fake_auth_override(app)` flips that off for the duration of
the test by overriding `get_current_user` with a stub that returns a
fake admin user. Tests that intentionally exercise the real auth flow
(test_auth.py, test_auth_enforcement.py) deliberately DON'T install
this override.
"""

from __future__ import annotations

import datetime as dt

from fastapi import FastAPI

from app.core.auth_deps import get_current_user
from app.models.auth import User


def install_fake_auth_override(app: FastAPI) -> None:
    """Make every Depends(get_current_user) resolve to a fake admin."""

    def _fake_current_user() -> User:
        # Minimal viable User — id is the only field most callers read.
        # Other fields populated to satisfy any from_attributes serializer.
        return User(
            id=1,
            email="test-admin@kiwi.local",
            password_hash="",
            is_active=True,
            last_login_at=None,
            created_at=dt.datetime.now(dt.UTC),
            updated_at=dt.datetime.now(dt.UTC),
        )

    app.dependency_overrides[get_current_user] = _fake_current_user
