import logging
from datetime import UTC, datetime

from redis.asyncio import Redis

from app.adapters.github import GitHubAdapter
from app.core.cache import get_or_set_json
from app.core.config import get_settings
from app.schemas.github import (
    CommitActivity,
    ContributionCalendar,
    ContributionDay,
    GitHubActivityFeed,
    GitHubStats,
    RecentRepo,
    RepoContribution,
)

logger = logging.getLogger(__name__)

_ACTIVITY_CACHE_MAX = 20


async def get_github_stats(adapter: GitHubAdapter, redis: Redis) -> GitHubStats:
    settings = get_settings()

    async def fetch() -> GitHubStats:
        count = await adapter.count_week_commits()
        return GitHubStats(
            commits_this_week=count,
            username=adapter.username,
            fetched_at=datetime.now(UTC),
        )

    return await get_or_set_json(
        redis=redis,
        key=f"github:stats:{adapter.username}",
        ttl_seconds=settings.github_cache_ttl_seconds,
        model=GitHubStats,
        fetch=fetch,
    )


async def get_github_activity(
    adapter: GitHubAdapter, redis: Redis, limit: int = 5
) -> GitHubActivityFeed:
    settings = get_settings()

    async def fetch() -> GitHubActivityFeed:
        raw = await adapter.search_recent_commits(per_page=_ACTIVITY_CACHE_MAX)
        items: list[CommitActivity] = []
        for item in raw:
            commit = item.get("commit", {})
            repo = item.get("repository", {}).get("full_name", "unknown")
            author_date = commit.get("author", {}).get("date")
            if not author_date:
                continue
            timestamp = datetime.fromisoformat(author_date.replace("Z", "+00:00"))
            message = commit.get("message", "").splitlines()[0][:200]
            sha = item.get("sha", "")
            url = item.get("html_url") or f"https://github.com/{repo}/commit/{sha}"
            items.append(
                CommitActivity(
                    repo=repo,
                    message=message,
                    sha=sha,
                    url=url,
                    timestamp=timestamp,
                )
            )
        return GitHubActivityFeed(
            items=items[:_ACTIVITY_CACHE_MAX],
            fetched_at=datetime.now(UTC),
        )

    cached = await get_or_set_json(
        redis=redis,
        key=f"github:activity:{adapter.username}",
        ttl_seconds=settings.github_cache_ttl_seconds,
        model=GitHubActivityFeed,
        fetch=fetch,
    )
    return GitHubActivityFeed(
        items=cached.items[:limit],
        fetched_at=cached.fetched_at,
    )


async def get_contribution_calendar(
    adapter: GitHubAdapter, redis: Redis
) -> ContributionCalendar:
    settings = get_settings()

    async def fetch() -> ContributionCalendar:
        user = await adapter.fetch_contribution_calendar()

        calendar_data = user["contributionsCollection"]["contributionCalendar"]
        weeks: list[list[ContributionDay]] = []
        for week in calendar_data["weeks"]:
            days = [
                ContributionDay(
                    date=d["date"],
                    count=d["contributionCount"],
                    level=d["contributionLevel"],
                )
                for d in week["contributionDays"]
            ]
            weeks.append(days)

        breakdown_raw = user["contributionsCollection"][
            "commitContributionsByRepository"
        ]
        breakdown = [
            RepoContribution(
                name=r["repository"]["name"],
                name_with_owner=r["repository"]["nameWithOwner"],
                url=r["repository"]["url"],
                is_private=r["repository"]["isPrivate"],
                commit_count=r["contributions"]["totalCount"],
            )
            for r in breakdown_raw
        ]

        repos_raw = user["repositories"]["nodes"]
        recent: list[RecentRepo] = []
        for r in repos_raw:
            primary = r.get("primaryLanguage")
            recent.append(
                RecentRepo(
                    name=r["name"],
                    name_with_owner=r["nameWithOwner"],
                    url=r["url"],
                    is_private=r["isPrivate"],
                    created_at=datetime.fromisoformat(
                        r["createdAt"].replace("Z", "+00:00")
                    ),
                    primary_language=primary["name"] if primary else None,
                    primary_language_color=primary["color"] if primary else None,
                )
            )

        return ContributionCalendar(
            total_contributions=calendar_data["totalContributions"],
            weeks=weeks,
            repo_breakdown=breakdown,
            recent_repos=recent,
            fetched_at=datetime.now(UTC),
        )

    return await get_or_set_json(
        redis=redis,
        key=f"github:calendar:{adapter.username}",
        ttl_seconds=settings.github_cache_ttl_seconds,
        model=ContributionCalendar,
        fetch=fetch,
    )
