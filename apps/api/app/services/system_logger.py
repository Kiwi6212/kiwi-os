"""Hybrid logging service: persists to DB + emits to stdlib logger.

Designed to never raise — a logging failure must not crash the request that
triggered it.
"""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.system_log import LogLevel, SystemLog

logger = logging.getLogger(__name__)

_PY_LEVELS: dict[LogLevel, int] = {
    LogLevel.DEBUG: logging.DEBUG,
    LogLevel.INFO: logging.INFO,
    LogLevel.WARNING: logging.WARNING,
    LogLevel.ERROR: logging.ERROR,
    LogLevel.CRITICAL: logging.CRITICAL,
}


async def log_event(
    level: LogLevel,
    module: str,
    message: str,
    context: dict[str, Any] | None = None,
    *,
    http_method: str | None = None,
    http_path: str | None = None,
    http_status: int | None = None,
    db: AsyncSession | None = None,
    session_factory: async_sessionmaker[AsyncSession] | None = None,
) -> None:
    """Persist an event row, then also emit to stdlib logger (stdout).

    Pass `db` when called from inside a request handler that already has
    a session. Otherwise pass `session_factory` (typically
    `request.app.state.db_sessionmaker`) so we can spin up a short-lived
    one. Never raises.
    """
    try:
        entry = SystemLog(
            level=level,
            module=module,
            message=message,
            context=context,
            http_method=http_method,
            http_path=http_path,
            http_status=http_status,
        )

        if db is not None:
            db.add(entry)
            await db.flush()
        elif session_factory is not None:
            async with session_factory() as new_db:
                new_db.add(entry)
                await new_db.commit()
        else:
            # No session available; we can still emit to stdout below.
            pass

        py_level = _PY_LEVELS[level]
        logger.log(py_level, "[%s] %s", module, message, extra={"context": context})
    except Exception as exc:
        # Never propagate logging failures.
        logger.error("Failed to log system event: %s", exc)


async def log_debug(
    module: str,
    message: str,
    context: dict[str, Any] | None = None,
    **kw: Any,
) -> None:
    await log_event(LogLevel.DEBUG, module, message, context, **kw)


async def log_info(
    module: str,
    message: str,
    context: dict[str, Any] | None = None,
    **kw: Any,
) -> None:
    await log_event(LogLevel.INFO, module, message, context, **kw)


async def log_warning(
    module: str,
    message: str,
    context: dict[str, Any] | None = None,
    **kw: Any,
) -> None:
    await log_event(LogLevel.WARNING, module, message, context, **kw)


async def log_error(
    module: str,
    message: str,
    context: dict[str, Any] | None = None,
    **kw: Any,
) -> None:
    await log_event(LogLevel.ERROR, module, message, context, **kw)


async def log_critical(
    module: str,
    message: str,
    context: dict[str, Any] | None = None,
    **kw: Any,
) -> None:
    await log_event(LogLevel.CRITICAL, module, message, context, **kw)
