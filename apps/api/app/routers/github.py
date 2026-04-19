import logging

from fastapi import APIRouter, HTTPException, Query, Request, status

from app.adapters.github import GitHubAdapter
from app.core.config import get_settings
from app.schemas.github import GitHubActivityFeed, GitHubStats
from app.services.github import get_github_activity, get_github_stats

logger = logging.getLogger(__name__)

router = APIRouter()


def _make_adapter() -> GitHubAdapter:
    settings = get_settings()
    token = (
        settings.github_token.get_secret_value() if settings.github_token else None
    )
    if token is None:
        logger.warning(
            "GITHUB_TOKEN not set — using unauthenticated GitHub API (rate-limited)"
        )
    return GitHubAdapter(token=token, username=settings.github_username)


@router.get("/stats", response_model=GitHubStats)
async def github_stats(request: Request) -> GitHubStats:
    redis = request.app.state.redis
    adapter = _make_adapter()
    try:
        return await get_github_stats(adapter, redis)
    except Exception as exc:
        logger.exception("GitHub stats fetch failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"GitHub stats unavailable: {exc}",
        ) from exc
    finally:
        await adapter.aclose()


@router.get("/activity", response_model=GitHubActivityFeed)
async def github_activity(
    request: Request,
    limit: int = Query(default=5, ge=1, le=20),
) -> GitHubActivityFeed:
    redis = request.app.state.redis
    adapter = _make_adapter()
    try:
        return await get_github_activity(adapter, redis, limit=limit)
    except Exception as exc:
        logger.exception("GitHub activity fetch failed")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"GitHub activity unavailable: {exc}",
        ) from exc
    finally:
        await adapter.aclose()
