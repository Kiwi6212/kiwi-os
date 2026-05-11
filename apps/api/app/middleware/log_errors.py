"""Auto-log 4xx/5xx responses and unhandled exceptions to system_logs."""

from __future__ import annotations

import logging

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.models.system_log import LogLevel
from app.services.system_logger import log_event

logger = logging.getLogger(__name__)


def _session_factory(request: Request):
    return getattr(request.app.state, "db_sessionmaker", None)


class ErrorLogMiddleware(BaseHTTPMiddleware):
    """Persist every 4xx/5xx response (and unhandled exceptions) in DB."""

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        try:
            response = await call_next(request)
        except Exception as exc:
            await log_event(
                level=LogLevel.CRITICAL,
                module="http",
                message=f"Unhandled exception: {type(exc).__name__}: {exc}",
                context={"exception_type": type(exc).__name__},
                http_method=request.method,
                http_path=request.url.path,
                http_status=500,
                session_factory=_session_factory(request),
            )
            raise

        status_code = response.status_code
        if status_code >= 500:
            await log_event(
                level=LogLevel.ERROR,
                module="http",
                message=f"Server error: {status_code}",
                http_method=request.method,
                http_path=request.url.path,
                http_status=status_code,
                session_factory=_session_factory(request),
            )
        elif status_code >= 400:
            await log_event(
                level=LogLevel.WARNING,
                module="http",
                message=f"Client error: {status_code}",
                http_method=request.method,
                http_path=request.url.path,
                http_status=status_code,
                session_factory=_session_factory(request),
            )

        return response
