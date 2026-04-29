from datetime import date, datetime

from pydantic import BaseModel


class TimeSeriesPoint(BaseModel):
    date: str
    value: int
    label: str | None = None


class CategoricalCount(BaseModel):
    category: str
    count: int


class WeekdayCount(BaseModel):
    weekday: str
    count: int


class DeltaMetric(BaseModel):
    current: float
    previous: float
    delta: float
    delta_pct: float


class JobStatsExtended(BaseModel):
    applications_count: DeltaMetric
    interviews_count: DeltaMetric
    response_rate: DeltaMetric
    active_count: DeltaMetric

    applications_over_time: list[TimeSeriesPoint]

    by_weekday: list[WeekdayCount]
    by_contract_type: list[CategoricalCount]

    period_days: int
    period_start: date
    period_end: date
    fetched_at: datetime


class GithubStatsExtended(BaseModel):
    commits_count: DeltaMetric

    commits_over_time: list[TimeSeriesPoint]

    top_repos: list[CategoricalCount]
    by_weekday: list[WeekdayCount]

    period_days: int
    period_start: date
    period_end: date
    fetched_at: datetime


class CrossInsight(BaseModel):
    type: str
    message: str
    context: str | None = None


class CrossInsights(BaseModel):
    insights: list[CrossInsight]
    fetched_at: datetime
