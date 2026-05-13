"""JWT access + opaque refresh tokens (rotated, hashed in DB).

Design:
- access_token: short-lived (15 min) JWT signed with HS256, contains the
  user id. Sent in `Authorization: Bearer ...` headers.
- refresh_token: long-lived (30 days) random URL-safe string. Stored as
  SHA-256 hash so a DB leak doesn't expose live tokens. Rotated on every
  use — the consumed token is marked revoked_at and a new one is issued.
- bootstrap_admin_user: idempotent helper that creates the singleton
  admin row from ADMIN_EMAIL / ADMIN_PASSWORD env vars on startup.
"""

from __future__ import annotations

import datetime as dt
import hashlib
import secrets

from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.auth import RefreshToken, User

pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


# ---------- Password ----------


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return pwd_context.verify(password, password_hash)
    except Exception:
        return False


# ---------- Access JWT ----------


def create_access_token(user_id: int) -> tuple[str, int]:
    """Returns (token, expires_in_seconds)."""
    settings = get_settings()
    ttl_min = settings.jwt_access_ttl_minutes
    now = dt.datetime.now(dt.UTC)
    exp = now + dt.timedelta(minutes=ttl_min)

    payload = {
        "sub": str(user_id),
        "type": "access",
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    token = jwt.encode(
        payload, settings.jwt_secret, algorithm=settings.jwt_algorithm
    )
    return token, ttl_min * 60


def decode_access_token(token: str) -> int | None:
    """Returns user_id if valid, None otherwise."""
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        if payload.get("type") != "access":
            return None
        sub = payload.get("sub")
        return int(sub) if sub else None
    except (JWTError, ValueError):
        return None


# ---------- Refresh tokens ----------


def _hash_refresh(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def create_refresh_token(
    db: AsyncSession, user_id: int
) -> tuple[str, dt.datetime]:
    """Generate and persist a refresh token. Returns (raw_token, expires_at)."""
    settings = get_settings()
    raw = secrets.token_urlsafe(48)
    token_hash = _hash_refresh(raw)
    expires_at = dt.datetime.now(dt.UTC) + dt.timedelta(
        days=settings.jwt_refresh_ttl_days
    )

    rt = RefreshToken(
        user_id=user_id, token_hash=token_hash, expires_at=expires_at
    )
    db.add(rt)
    await db.commit()
    return raw, expires_at


async def consume_refresh_token(
    db: AsyncSession, raw: str
) -> User | None:
    """Validate, rotate (revoke), and return the associated user.

    Returns None if the token is unknown, revoked, expired, or owned by
    an inactive user.
    """
    token_hash = _hash_refresh(raw)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    rt = result.scalar_one_or_none()
    if rt is None:
        return None

    now = dt.datetime.now(dt.UTC)
    # SQLite (used in tests) returns DateTime(timezone=True) columns as
    # naive — Postgres returns them tz-aware. Normalize to UTC-aware
    # before comparing so the same code works on both backends.
    expires_at = rt.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=dt.UTC)
    if rt.revoked_at is not None or expires_at < now:
        return None

    rt.revoked_at = now
    await db.commit()

    user_result = await db.execute(select(User).where(User.id == rt.user_id))
    user = user_result.scalar_one_or_none()
    if user is None or not user.is_active:
        return None
    return user


async def revoke_refresh_token(db: AsyncSession, raw: str) -> bool:
    token_hash = _hash_refresh(raw)
    result = await db.execute(
        select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    )
    rt = result.scalar_one_or_none()
    if rt is None or rt.revoked_at is not None:
        return False
    rt.revoked_at = dt.datetime.now(dt.UTC)
    await db.commit()
    return True


async def revoke_all_user_tokens(db: AsyncSession, user_id: int) -> int:
    """Revoke every active refresh token for a user. Returns the count."""
    now = dt.datetime.now(dt.UTC)
    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
        )
    )
    tokens = list(result.scalars().all())
    for t in tokens:
        t.revoked_at = now
    await db.commit()
    return len(tokens)


# ---------- Bootstrap ----------


async def bootstrap_admin_user(db: AsyncSession) -> User:
    """Create the admin user from env vars if absent. Idempotent."""
    settings = get_settings()
    result = await db.execute(
        select(User).where(User.email == settings.admin_email)
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        return existing

    user = User(
        email=settings.admin_email,
        password_hash=hash_password(settings.admin_password),
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
