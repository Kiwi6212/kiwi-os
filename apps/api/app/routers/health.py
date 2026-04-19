from typing import Any

from fastapi import APIRouter, HTTPException, Request, status
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

from app.core.config import get_settings

router = APIRouter()


@router.get("/health")
async def health(request: Request) -> dict[str, Any]:
    engine: AsyncEngine = request.app.state.db_engine
    redis_client: Redis = request.app.state.redis

    settings = get_settings()
    details: dict[str, Any] = {
        "status": "ok",
        "version": settings.app_version,
    }

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        details["postgres"] = "up"
    except Exception as exc:
        details["postgres"] = "down"
        details["postgres_error"] = str(exc)

    try:
        pong = await redis_client.ping()
        details["redis"] = "up" if pong else "down"
    except Exception as exc:
        details["redis"] = "down"
        details["redis_error"] = str(exc)

    if details["postgres"] != "up" or details["redis"] != "up":
        details["status"] = "degraded"
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=details)

    return details
