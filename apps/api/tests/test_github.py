from datetime import UTC, datetime

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import create_app
from app.schemas.github import CommitActivity, GitHubActivityFeed, GitHubStats


def test_schemas_round_trip() -> None:
    commit = CommitActivity(
        repo="Kiwi6212/kiwi-os",
        message="feat: test",
        sha="abc123",
        url="https://github.com/Kiwi6212/kiwi-os/commit/abc123",
        timestamp=datetime.now(UTC),
    )
    stats = GitHubStats(
        commits_this_week=3,
        username="Kiwi6212",
        fetched_at=datetime.now(UTC),
    )
    feed = GitHubActivityFeed(items=[commit], fetched_at=datetime.now(UTC))

    assert GitHubStats.model_validate_json(stats.model_dump_json()) == stats
    assert (
        GitHubActivityFeed.model_validate_json(feed.model_dump_json()).items[0].sha
        == "abc123"
    )


@pytest.mark.asyncio
async def test_github_stats_endpoint_responds() -> None:
    app = create_app()
    async with app.router.lifespan_context(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/github/stats")

    assert response.status_code in (200, 503)
    if response.status_code == 200:
        GitHubStats.model_validate(response.json())


@pytest.mark.asyncio
async def test_github_activity_endpoint_responds() -> None:
    app = create_app()
    async with app.router.lifespan_context(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/github/activity?limit=3")

    assert response.status_code in (200, 503)
    if response.status_code == 200:
        feed = GitHubActivityFeed.model_validate(response.json())
        assert len(feed.items) <= 3
