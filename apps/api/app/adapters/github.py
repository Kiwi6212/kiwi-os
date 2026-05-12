from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.models.system_log import LogLevel
from app.services.system_logger import log_event

_CONTRIBUTION_GRAPHQL_QUERY = """
query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            contributionLevel
          }
        }
      }
      commitContributionsByRepository(maxRepositories: 10) {
        repository {
          name
          nameWithOwner
          url
          isPrivate
        }
        contributions {
          totalCount
        }
      }
    }
    repositories(first: 10, orderBy: {field: CREATED_AT, direction: DESC}, ownerAffiliations: OWNER) {
      nodes {
        name
        nameWithOwner
        url
        isPrivate
        createdAt
        primaryLanguage {
          name
          color
        }
      }
    }
  }
}
"""


class GitHubAdapter:
    def __init__(
        self,
        token: str | None,
        username: str,
        session_factory: async_sessionmaker[AsyncSession] | None = None,
    ) -> None:
        self.username = username
        self._session_factory = session_factory
        headers = {
            "User-Agent": "kiwi-os/0.1.0",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if token:
            headers["Authorization"] = f"Bearer {token}"
        self._client = httpx.AsyncClient(
            base_url="https://api.github.com",
            headers=headers,
            timeout=10.0,
        )

    async def _log_call(
        self,
        endpoint: str,
        status_code: int,
        ok: bool,
        extra: dict[str, Any] | None = None,
    ) -> None:
        if self._session_factory is None:
            return
        level = LogLevel.INFO if ok else LogLevel.ERROR
        message = (
            f"GitHub {endpoint} → {status_code}"
            if ok
            else f"GitHub {endpoint} failed ({status_code})"
        )
        context: dict[str, Any] = {"endpoint": endpoint, "status": status_code}
        if extra:
            context.update(extra)
        await log_event(
            level=level,
            module="github",
            message=message,
            context=context,
            session_factory=self._session_factory,
        )

    async def search_recent_commits(self, per_page: int = 30) -> list[dict[str, Any]]:
        try:
            response = await self._client.get(
                "/search/commits",
                params={
                    "q": f"author:{self.username}",
                    "sort": "author-date",
                    "order": "desc",
                    "per_page": per_page,
                },
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            await self._log_call(
                "/search/commits", exc.response.status_code, ok=False
            )
            raise
        await self._log_call("/search/commits", response.status_code, ok=True)
        body = response.json()
        items = body.get("items", [])
        return items if isinstance(items, list) else []

    async def count_week_commits(self) -> int:
        now = datetime.now(UTC)
        week_start = (now - timedelta(days=now.weekday())).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        query = (
            f"author:{self.username} "
            f"author-date:>={week_start.date().isoformat()}"
        )
        try:
            response = await self._client.get(
                "/search/commits",
                params={"q": query, "per_page": 1},
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            await self._log_call(
                "/search/commits", exc.response.status_code, ok=False
            )
            raise
        await self._log_call("/search/commits", response.status_code, ok=True)
        body = response.json()
        total = body.get("total_count", 0)
        return int(total) if isinstance(total, int) else 0

    async def fetch_contribution_calendar(self) -> dict[str, Any]:
        try:
            response = await self._client.post(
                "/graphql",
                json={
                    "query": _CONTRIBUTION_GRAPHQL_QUERY,
                    "variables": {"login": self.username},
                },
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            await self._log_call("/graphql", exc.response.status_code, ok=False)
            raise
        body = response.json()
        if body.get("errors"):
            await self._log_call(
                "/graphql",
                response.status_code,
                ok=False,
                extra={"graphql_errors": str(body["errors"])[:500]},
            )
            raise RuntimeError(f"GitHub GraphQL errors: {body['errors']}")
        data = body.get("data", {})
        user = data.get("user")
        if not user:
            await self._log_call(
                "/graphql",
                response.status_code,
                ok=False,
                extra={"reason": "user_not_found"},
            )
            raise RuntimeError(
                f"GitHub user '{self.username}' not found in GraphQL response"
            )
        await self._log_call("/graphql", response.status_code, ok=True)
        return user

    async def fetch_user_repos(self, limit: int = 50) -> list[dict[str, Any]]:
        """List the user's repos via the REST API (recently updated first)."""
        try:
            response = await self._client.get(
                f"/users/{self.username}/repos",
                params={
                    "per_page": min(limit, 100),
                    "sort": "updated",
                    "type": "owner",
                },
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            await self._log_call(
                f"/users/{self.username}/repos",
                exc.response.status_code,
                ok=False,
            )
            raise
        await self._log_call(
            f"/users/{self.username}/repos", response.status_code, ok=True
        )
        body = response.json()
        repos = body if isinstance(body, list) else []
        return repos[:limit]

    async def aclose(self) -> None:
        await self._client.aclose()
