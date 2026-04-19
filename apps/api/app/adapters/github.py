from datetime import UTC, datetime, timedelta
from typing import Any

import httpx


class GitHubAdapter:
    def __init__(self, token: str | None, username: str) -> None:
        self.username = username
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

    async def search_recent_commits(self, per_page: int = 30) -> list[dict[str, Any]]:
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
        response = await self._client.get(
            "/search/commits",
            params={"q": query, "per_page": 1},
        )
        response.raise_for_status()
        body = response.json()
        total = body.get("total_count", 0)
        return int(total) if isinstance(total, int) else 0

    async def aclose(self) -> None:
        await self._client.aclose()
