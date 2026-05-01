from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import create_engine, create_session_factory
from app.core.redis import create_redis_client
from app.routers import applications, github, health, stats, tasks, weather


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    engine = create_engine()
    session_factory = create_session_factory(engine)
    redis_client = create_redis_client()

    app.state.db_engine = engine
    app.state.db_sessionmaker = session_factory
    app.state.redis = redis_client

    try:
        yield
    finally:
        await redis_client.aclose()
        await engine.dispose()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router, tags=["health"])
    app.include_router(github.router, prefix="/api/github", tags=["github"])
    app.include_router(weather.router, prefix="/api/weather", tags=["weather"])
    app.include_router(
        applications.router, prefix="/api/applications", tags=["applications"]
    )
    app.include_router(stats.router, prefix="/api/stats", tags=["stats"])
    app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
    return app


app = create_app()
