"""Authentication router: /login, /refresh, /logout, /me.

Strategy:
- /login: validates ADMIN_EMAIL+password, returns access JWT in body and
  sets refresh token in an httpOnly cookie scoped to /api/auth.
- /refresh: trades the refresh cookie for a new access token; rotates
  the refresh token (old one is invalidated).
- /logout: revokes the current refresh token + clears the cookie.
- /me: returns the authenticated user (Bearer access token).
"""

from __future__ import annotations

import datetime as dt

from fastapi import (
    APIRouter,
    Cookie,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth_deps import get_current_user
from app.core.config import get_settings
from app.core.database import get_db
from app.core.rate_limit import limiter
from app.models.auth import User
from app.schemas.auth.auth import LoginRequest, TokenResponse, UserOut
from app.services.auth_service import (
    consume_refresh_token,
    create_access_token,
    create_refresh_token,
    revoke_refresh_token,
    verify_password,
)

router = APIRouter()

REFRESH_COOKIE_NAME = "kiwi_refresh"
REFRESH_COOKIE_PATH = "/api/auth"


def _set_refresh_cookie(
    response: Response, raw_token: str, expires_at: dt.datetime
) -> None:
    settings = get_settings()
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=raw_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        expires=expires_at,
        path=REFRESH_COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(REFRESH_COOKIE_NAME, path=REFRESH_COOKIE_PATH)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    settings = get_settings()
    result = await db.execute(
        select(User).where(User.email == settings.admin_email)
    )
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    user.last_login_at = dt.datetime.now(dt.UTC)
    await db.commit()

    access_token, expires_in = create_access_token(user.id)
    refresh_raw, refresh_exp = await create_refresh_token(db, user.id)
    _set_refresh_cookie(response, refresh_raw, refresh_exp)

    return TokenResponse(access_token=access_token, expires_in=expires_in)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    response: Response,
    db: AsyncSession = Depends(get_db),
    kiwi_refresh: str | None = Cookie(default=None),
) -> TokenResponse:
    if not kiwi_refresh:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing refresh token",
        )

    user = await consume_refresh_token(db, kiwi_refresh)
    if user is None:
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    access_token, expires_in = create_access_token(user.id)
    new_refresh, new_exp = await create_refresh_token(db, user.id)
    _set_refresh_cookie(response, new_refresh, new_exp)

    return TokenResponse(access_token=access_token, expires_in=expires_in)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    response: Response,
    db: AsyncSession = Depends(get_db),
    kiwi_refresh: str | None = Cookie(default=None),
) -> None:
    if kiwi_refresh:
        await revoke_refresh_token(db, kiwi_refresh)
    _clear_refresh_cookie(response)


@router.get("/me", response_model=UserOut)
async def me(current: User = Depends(get_current_user)) -> User:
    return current
