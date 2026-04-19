from datetime import datetime
from typing import Literal

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


ContributionLevel = Literal[
    "NONE",
    "FIRST_QUARTILE",
    "SECOND_QUARTILE",
    "THIRD_QUARTILE",
    "FOURTH_QUARTILE",
]


class ContributionDay(BaseModel):
    date: str
    count: int
    level: ContributionLevel


class RepoContribution(BaseModel):
    name: str
    name_with_owner: str
    url: str
    is_private: bool
    commit_count: int


class RecentRepo(BaseModel):
    name: str
    name_with_owner: str
    url: str
    is_private: bool
    created_at: datetime
    primary_language: str | None = None
    primary_language_color: str | None = None


class ContributionCalendar(BaseModel):
    total_contributions: int
    weeks: list[list[ContributionDay]]
    repo_breakdown: list[RepoContribution]
    recent_repos: list[RecentRepo]
    fetched_at: datetime
