from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import create_engine, create_session_factory
from app.core.redis import create_redis_client
from app.middleware.log_errors import ErrorLogMiddleware
from app.routers import (
    applications,
    github,
    health,
    pomodoro,
    settings as settings_router,
    stats,
    tasks,
    time_entries,
    weather,
)
from app.routers.finance import (
    accounts,
    budgets,
    categories,
    subscriptions,
    transactions,
)
from app.routers.finance import stats as finance_stats


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
    app.add_middleware(ErrorLogMiddleware)
    app.include_router(health.router, tags=["health"])
    app.include_router(
        settings_router.router, prefix="/api/settings", tags=["settings"]
    )
    app.include_router(github.router, prefix="/api/github", tags=["github"])
    app.include_router(weather.router, prefix="/api/weather", tags=["weather"])
    app.include_router(
        applications.router, prefix="/api/applications", tags=["applications"]
    )
    app.include_router(stats.router, prefix="/api/stats", tags=["stats"])
    app.include_router(tasks.router, prefix="/api/tasks", tags=["tasks"])
    app.include_router(time_entries.router, prefix="/api/time", tags=["time"])
    app.include_router(pomodoro.router, prefix="/api/pomodoro", tags=["pomodoro"])
    app.include_router(
        accounts.router,
        prefix="/api/finances/accounts",
        tags=["finance-accounts"],
    )
    app.include_router(
        categories.router,
        prefix="/api/finances/categories",
        tags=["finance-categories"],
    )
    app.include_router(
        transactions.router,
        prefix="/api/finances/transactions",
        tags=["finance-transactions"],
    )
    app.include_router(
        subscriptions.router,
        prefix="/api/finances/subscriptions",
        tags=["finance-subscriptions"],
    )
    app.include_router(
        budgets.router,
        prefix="/api/finances/budgets",
        tags=["finance-budgets"],
    )
    app.include_router(
        finance_stats.router,
        prefix="/api/finances/stats",
        tags=["finance-stats"],
    )
    return app


app = create_app()
