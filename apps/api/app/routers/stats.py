import logging
from collections import defaultdict
from datetime import UTC, date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.adapters.github import GitHubAdapter
from app.core.config import get_settings
from app.core.database import get_db
from app.models.application import Application, ApplicationStatus
from app.schemas.stats import (
    CategoricalCount,
    CrossInsight,
    CrossInsights,
    DeltaMetric,
    GithubStatsExtended,
    JobStatsExtended,
    TimeSeriesPoint,
    WeekdayCount,
)

logger = logging.getLogger(__name__)
router = APIRouter()

WEEKDAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]


def _compute_delta(current: float, previous: float) -> DeltaMetric:
    delta = current - previous
    delta_pct = round((delta / previous) * 100, 1) if previous != 0 else 0.0
    return DeltaMetric(
        current=current,
        previous=previous,
        delta=delta,
        delta_pct=delta_pct,
    )


def _start_of(d: date) -> datetime:
    """Return a tz-aware UTC datetime at midnight for a given date."""
    return datetime.combine(d, datetime.min.time(), tzinfo=UTC)


@router.get("/jobs", response_model=JobStatsExtended)
async def get_job_stats_extended(
    db: AsyncSession = Depends(get_db),
    period: int = Query(30, ge=1, le=365),
) -> JobStatsExtended:
    today = date.today()
    period_start = today - timedelta(days=period)
    previous_period_start = today - timedelta(days=period * 2)

    current_apps_query = select(Application).where(
        Application.created_at >= _start_of(period_start)
    )
    current_apps = list((await db.execute(current_apps_query)).scalars().all())

    previous_apps_query = select(Application).where(
        and_(
            Application.created_at >= _start_of(previous_period_start),
            Application.created_at < _start_of(period_start),
        )
    )
    previous_apps = list((await db.execute(previous_apps_query)).scalars().all())

    current_count = len(current_apps)
    previous_count = len(previous_apps)

    interview_statuses = {ApplicationStatus.INTERVIEW, ApplicationStatus.ACCEPTED}
    current_interviews = sum(1 for a in current_apps if a.status in interview_statuses)
    previous_interviews = sum(
        1 for a in previous_apps if a.status in interview_statuses
    )

    current_responded = sum(
        1 for a in current_apps if a.status != ApplicationStatus.NO_RESPONSE
    )
    previous_responded = sum(
        1 for a in previous_apps if a.status != ApplicationStatus.NO_RESPONSE
    )

    current_response_rate = (
        (current_responded / current_count * 100) if current_count > 0 else 0.0
    )
    previous_response_rate = (
        (previous_responded / previous_count * 100) if previous_count > 0 else 0.0
    )

    active_statuses = {
        ApplicationStatus.APPLIED,
        ApplicationStatus.FOLLOWED_UP,
        ApplicationStatus.INTERVIEW,
    }
    current_active = sum(1 for a in current_apps if a.status in active_statuses)
    previous_active = sum(1 for a in previous_apps if a.status in active_statuses)

    series_data: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))
    for app in current_apps:
        d = app.created_at.date().isoformat()
        series_data[d][app.status.value] += 1

    time_series: list[TimeSeriesPoint] = []
    current_day = period_start
    tracked_statuses = ["Applied", "Interview", "Rejected", "No response"]
    while current_day <= today:
        d_str = current_day.isoformat()
        for status_val in tracked_statuses:
            time_series.append(
                TimeSeriesPoint(
                    date=d_str,
                    value=series_data.get(d_str, {}).get(status_val, 0),
                    label=status_val,
                )
            )
        current_day += timedelta(days=1)

    weekday_counter: dict[int, int] = defaultdict(int)
    for app in current_apps:
        weekday_counter[app.created_at.weekday()] += 1
    by_weekday = [
        WeekdayCount(weekday=WEEKDAYS_FR[i], count=weekday_counter.get(i, 0))
        for i in range(7)
    ]

    contract_counter: dict[str, int] = defaultdict(int)
    for app in current_apps:
        ct = app.contract_type.value if app.contract_type else "Non spécifié"
        contract_counter[ct] += 1
    by_contract = [
        CategoricalCount(category=k, count=v)
        for k, v in sorted(contract_counter.items(), key=lambda x: -x[1])
    ]

    return JobStatsExtended(
        applications_count=_compute_delta(current_count, previous_count),
        interviews_count=_compute_delta(current_interviews, previous_interviews),
        response_rate=_compute_delta(
            round(current_response_rate, 1), round(previous_response_rate, 1)
        ),
        active_count=_compute_delta(current_active, previous_active),
        applications_over_time=time_series,
        by_weekday=by_weekday,
        by_contract_type=by_contract,
        period_days=period,
        period_start=period_start,
        period_end=today,
        fetched_at=datetime.now(UTC),
    )


@router.get("/github", response_model=GithubStatsExtended)
async def get_github_stats_extended(
    period: int = Query(30, ge=1, le=365),
) -> GithubStatsExtended:
    settings = get_settings()
    adapter = GitHubAdapter(
        token=settings.github_token.get_secret_value()
        if settings.github_token
        else None,
        username=settings.github_username,
    )

    today = date.today()
    period_start = today - timedelta(days=period)
    previous_period_start = today - timedelta(days=period * 2)

    try:
        try:
            commits_raw = await adapter.search_recent_commits(per_page=100)
        except Exception as exc:
            logger.exception("GitHub commits fetch failed in stats")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"GitHub commits unavailable: {exc}",
            ) from exc

        current_commits: list[tuple[date, dict]] = []
        previous_commits: list[tuple[date, dict]] = []
        for c in commits_raw:
            commit_data = c.get("commit", {}) or {}
            author_date_str = (commit_data.get("author") or {}).get("date")
            if not author_date_str:
                continue
            try:
                d = datetime.fromisoformat(
                    author_date_str.replace("Z", "+00:00")
                ).date()
            except ValueError:
                continue

            if period_start <= d <= today:
                current_commits.append((d, c))
            elif previous_period_start <= d < period_start:
                previous_commits.append((d, c))

        commits_delta = _compute_delta(len(current_commits), len(previous_commits))

        commits_by_day: dict[str, int] = defaultdict(int)
        for d, _ in current_commits:
            commits_by_day[d.isoformat()] += 1

        time_series: list[TimeSeriesPoint] = []
        current_day = period_start
        while current_day <= today:
            time_series.append(
                TimeSeriesPoint(
                    date=current_day.isoformat(),
                    value=commits_by_day.get(current_day.isoformat(), 0),
                    label="Commits",
                )
            )
            current_day += timedelta(days=1)

        repo_counter: dict[str, int] = defaultdict(int)
        for _, c in current_commits:
            repo = (c.get("repository") or {}).get("name") or "unknown"
            repo_counter[repo] += 1
        top_repos = [
            CategoricalCount(category=k, count=v)
            for k, v in sorted(repo_counter.items(), key=lambda x: -x[1])[:5]
        ]

        weekday_counter: dict[int, int] = defaultdict(int)
        for d, _ in current_commits:
            weekday_counter[d.weekday()] += 1
        by_weekday = [
            WeekdayCount(weekday=WEEKDAYS_FR[i], count=weekday_counter.get(i, 0))
            for i in range(7)
        ]

        return GithubStatsExtended(
            commits_count=commits_delta,
            commits_over_time=time_series,
            top_repos=top_repos,
            by_weekday=by_weekday,
            period_days=period,
            period_start=period_start,
            period_end=today,
            fetched_at=datetime.now(UTC),
        )
    finally:
        await adapter.aclose()


@router.get("/insights", response_model=CrossInsights)
async def get_cross_insights(
    db: AsyncSession = Depends(get_db),
    period: int = Query(30, ge=1, le=365),
) -> CrossInsights:
    """Insights croisés générés par règles statiques (Job Search + GitHub)."""
    today = date.today()
    period_start = today - timedelta(days=period)
    previous_period_start = today - timedelta(days=period * 2)

    current_apps_query = select(Application).where(
        Application.created_at >= _start_of(period_start)
    )
    current_apps = list((await db.execute(current_apps_query)).scalars().all())

    previous_apps_query = select(Application).where(
        and_(
            Application.created_at >= _start_of(previous_period_start),
            Application.created_at < _start_of(period_start),
        )
    )
    previous_apps = list((await db.execute(previous_apps_query)).scalars().all())

    insights: list[CrossInsight] = []

    if len(current_apps) == 0:
        insights.append(
            CrossInsight(
                type="warning",
                message=f"Aucune candidature sur les {period} derniers jours.",
                context="Pense à postuler régulièrement pour maintenir ton pipeline.",
            )
        )

    if len(previous_apps) > 0:
        delta = len(current_apps) - len(previous_apps)
        if delta < 0 and len(current_apps) >= 1:
            plural = "s" if abs(delta) > 1 else ""
            insights.append(
                CrossInsight(
                    type="info",
                    message=(
                        f"{abs(delta)} candidature{plural} de moins que la "
                        "période précédente."
                    ),
                    context=(
                        f"{len(current_apps)} actuel vs {len(previous_apps)} "
                        "précédent."
                    ),
                )
            )
        elif delta > 0:
            plural = "s" if delta > 1 else ""
            insights.append(
                CrossInsight(
                    type="success",
                    message=f"+{delta} candidature{plural} vs période précédente.",
                    context=(
                        f"{len(current_apps)} actuel vs {len(previous_apps)} "
                        "précédent."
                    ),
                )
            )

    if len(current_apps) >= 5:
        responded = sum(
            1 for a in current_apps if a.status != ApplicationStatus.NO_RESPONSE
        )
        rate = responded / len(current_apps) * 100
        if rate < 30:
            insights.append(
                CrossInsight(
                    type="warning",
                    message=(
                        f"Taux de réponse à {rate:.0f}% sur les {period} "
                        "derniers jours."
                    ),
                    context=(
                        "Si <30%, ton CV ne passe peut-être pas les filtres "
                        "ATS. Pense à le revoir."
                    ),
                )
            )
        elif rate >= 60:
            insights.append(
                CrossInsight(
                    type="success",
                    message=f"Taux de réponse excellent à {rate:.0f}%.",
                    context="Ton CV passe bien les filtres, continue comme ça.",
                )
            )

    if len(current_apps) >= 5:
        weekday_counter: dict[int, int] = defaultdict(int)
        for app in current_apps:
            weekday_counter[app.created_at.weekday()] += 1
        if weekday_counter:
            best_day_idx = max(weekday_counter, key=lambda k: weekday_counter[k])
            best_day = WEEKDAYS_FR[best_day_idx]
            count = weekday_counter[best_day_idx]
            insights.append(
                CrossInsight(
                    type="tip",
                    message=f"Tu postules le plus le {best_day} ({count} candidatures).",
                    context=(
                        "Identifier ses jours de productivité aide à structurer "
                        "ses semaines."
                    ),
                )
            )

    favorites_not_applied = [
        a
        for a in current_apps
        if a.is_favorite and a.status == ApplicationStatus.NEW
    ]
    if favorites_not_applied:
        n = len(favorites_not_applied)
        plural = "s" if n > 1 else ""
        insights.append(
            CrossInsight(
                type="tip",
                message=(
                    f"{n} favori{plural} pas encore postulé{plural}."
                ),
                context=(
                    "Tu as marqué ces offres comme intéressantes, pense à les traiter."
                ),
            )
        )

    if not insights:
        insights.append(
            CrossInsight(
                type="info",
                message=f"Période de {period} jours analysée.",
                context="Continue à utiliser le tracker pour générer plus d'insights.",
            )
        )

    return CrossInsights(insights=insights, fetched_at=datetime.now(UTC))
