from datetime import datetime

from pydantic import BaseModel


class CommitActivity(BaseModel):
    repo: str
    message: str
    sha: str
    url: str
    timestamp: datetime


class GitHubStats(BaseModel):
    commits_this_week: int
    username: str
    fetched_at: datetime


class GitHubActivityFeed(BaseModel):
    items: list[CommitActivity]
    fetched_at: datetime
