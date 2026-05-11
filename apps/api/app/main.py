# Configure file logging FIRST so bootstrap errors below get captured.
from app.core.file_logging import configure_file_logging

configure_file_logging()

import logging  # noqa: E402

try:
    from collections.abc import AsyncIterator  # noqa: E402
    from contextlib import asynccontextmanager  # noqa: E402

    from fastapi import FastAPI  # noqa: E402
    from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

    from app.core.config import get_settings  # noqa: E402
    from app.core.database import create_engine, create_session_factory  # noqa: E402
    from app.core.redis import create_redis_client  # noqa: E402
    from app.middleware.log_errors import ErrorLogMiddleware  # noqa: E402
    from app.routers import (  # noqa: E402
        applications,
        github,
        health,
        pomodoro,
        settings as settings_router,
        settings_data,
        stats,
        tasks,
        time_entries,
        weather,
    )
    from app.routers.finance import (  # noqa: E402
        accounts,
        budgets,
        categories,
        subscriptions,
        transactions,
    )
    from app.routers.finance import stats as finance_stats  # noqa: E402
except Exception as exc:  # pragma: no cover — exercised only on bootstrap failure
    logging.getLogger("bootstrap").critical(
        "Failed to import application modules: %s: %s",
        type(exc).__name__,
        exc,
        exc_info=True,
    )
    raise


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
    app.include_router(
        settings_data.router,
        prefix="/api/settings/data",
        tags=["settings-data"],
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
