import {
  Wallet,
  Target,
  Zap,
  Code2,
  GitCommit,
  Cloud,
  Clock,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { KpiCard } from "@/components/kpi-card";
import { BentoCard } from "@/components/bento-card";
import { ContributionHeatmap } from "@/components/contribution-heatmap";
import { WeatherCard } from "@/components/weather-card";
import {
  type FinanceStats,
  formatCurrency,
  parseStats,
} from "@/lib/types/finance";

type HealthResponse = {
  status: string;
  version: string;
  postgres: string;
  redis: string;
};

type GitHubStats = {
  commits_this_week: number;
  username: string;
  fetched_at: string;
};

type ContributionLevel =
  | "NONE"
  | "FIRST_QUARTILE"
  | "SECOND_QUARTILE"
  | "THIRD_QUARTILE"
  | "FOURTH_QUARTILE";

type ContributionDay = {
  date: string;
  count: number;
  level: ContributionLevel;
};

type ContributionCalendarData = {
  total_contributions: number;
  weeks: ContributionDay[][];
  repo_breakdown: unknown[];
  recent_repos: unknown[];
  fetched_at: string;
};

async function getApiHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch("http://localhost:8000/health", {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as HealthResponse;
  } catch {
    return null;
  }
}

async function getGithubStats(): Promise<GitHubStats | null> {
  try {
    const res = await fetch("http://localhost:8000/api/github/stats", {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as GitHubStats;
  } catch {
    return null;
  }
}

async function getGithubCalendar(): Promise<ContributionCalendarData | null> {
  try {
    const res = await fetch("http://localhost:8000/api/github/calendar", {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ContributionCalendarData;
  } catch {
    return null;
  }
}

type ApplicationStats = {
  total: number;
  by_status: Record<string, number>;
  active_count: number;
  response_rate: number;
  interview_rate: number;
  favorites_count: number;
};

async function getApplicationStats(): Promise<ApplicationStats | null> {
  try {
    const res = await fetch("http://localhost:8000/api/applications/stats", {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as ApplicationStats;
  } catch {
    return null;
  }
}

type TaskStatsResponse = {
  total: number;
  by_status: Record<string, number>;
  by_category: Record<string, number>;
  overdue: number;
  completed_this_week: number;
};

type TimeStatsResponse = {
  total_seconds_today: number;
  total_seconds_this_week: number;
  by_day_last_7_days: unknown[];
  by_task_this_week: unknown[];
};

async function getTaskStats(): Promise<TaskStatsResponse | null> {
  try {
    const res = await fetch("http://localhost:8000/api/tasks/stats", {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as TaskStatsResponse;
  } catch {
    return null;
  }
}

async function getTimeStats(): Promise<TimeStatsResponse | null> {
  try {
    const res = await fetch("http://localhost:8000/api/time/stats", {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as TimeStatsResponse;
  } catch {
    return null;
  }
}

async function getFinanceStats(): Promise<FinanceStats | null> {
  try {
    const res = await fetch("http://localhost:8000/api/finances/stats", {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const raw = (await res.json()) as Parameters<typeof parseStats>[0];
    return parseStats(raw);
  } catch {
    return null;
  }
}

function formatHoursShort(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}`;
  return `${m}min`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Bonne nuit";
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

export default async function HomePage() {
  const [health, stats, calendar, appStats, taskStats, timeStats, financeStats] =
    await Promise.all([
      getApiHealth(),
      getGithubStats(),
      getGithubCalendar(),
      getApplicationStats(),
      getTaskStats(),
      getTimeStats(),
      getFinanceStats(),
    ]);
  const greeting = getGreeting();

  const commitsValue = stats !== null ? String(stats.commits_this_week) : "—";

  const activeTasksValue = taskStats
    ? String(
        (taskStats.by_status.todo ?? 0) +
          (taskStats.by_status.in_progress ?? 0),
      )
    : "—";
  const todayTimeValue = timeStats
    ? formatHoursShort(timeStats.total_seconds_today)
    : "—";
  const balanceValue = financeStats
    ? formatCurrency(financeStats.total_balance)
    : "—";

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">
            {greeting}, <span className="text-emerald-600">Mathias</span>
          </h1>
          <p className="text-slate-500 mt-1">
            Voici ce qui se passe aujourd&apos;hui sur ton cockpit.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <KpiCard
                label="Solde courant"
                value={balanceValue}
                icon={<Wallet className="h-5 w-5" strokeWidth={2} />}
                accent="kiwi"
                delay={0.0}
              />
              <KpiCard
                label="Candidatures actives"
                value={appStats ? String(appStats.active_count) : "—"}
                icon={<Target className="h-5 w-5" strokeWidth={2} />}
                accent="cyan"
                delay={0.05}
              />
              <KpiCard
                label="Tâches actives"
                value={activeTasksValue}
                icon={<Zap className="h-5 w-5" strokeWidth={2} />}
                accent="amber"
                delay={0.1}
              />
              <KpiCard
                label="Temps aujourd'hui"
                value={todayTimeValue}
                icon={<Clock className="h-5 w-5" strokeWidth={2} />}
                accent="kiwi"
                delay={0.15}
              />
              <KpiCard
                label="Commits cette semaine"
                value={commitsValue}
                icon={<Code2 className="h-5 w-5" strokeWidth={2} />}
                accent="violet"
                delay={0.2}
              />
            </div>
          </div>

          <div className="col-span-12 md:col-span-8">
            <BentoCard delay={0.25}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <GitCommit
                    className="h-5 w-5 text-slate-500"
                    strokeWidth={2}
                  />
                  <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                    Contributions
                  </h2>
                </div>
                {calendar && (
                  <span className="text-xs text-slate-500 font-mono">
                    {calendar.total_contributions} cette année
                  </span>
                )}
              </div>
              {calendar ? (
                <ContributionHeatmap
                  weeks={calendar.weeks}
                  totalContributions={calendar.total_contributions}
                  compact
                />
              ) : (
                <p className="text-sm text-slate-500 py-4">
                  GitHub calendar unreachable.
                </p>
              )}
              <div className="mt-4 pt-4 border-t border-slate-200">
                <Link
                  href="/dev-activity"
                  className="text-xs text-slate-500 hover:text-emerald-600 inline-flex items-center gap-1 transition-colors"
                >
                  Voir toute mon activité dev
                  <ExternalLink className="h-3 w-3" strokeWidth={2} />
                </Link>
              </div>
            </BentoCard>
          </div>

          <div className="col-span-12 md:col-span-4">
            <BentoCard delay={0.3}>
              <div className="flex items-center gap-2 mb-5">
                <Cloud className="h-5 w-5 text-slate-500" strokeWidth={2} />
                <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                  Météo
                </h2>
              </div>
              <WeatherCard />
            </BentoCard>
          </div>

          <div className="col-span-12">
            <BentoCard delay={0.35}>
              <div className="flex items-center gap-2 mb-5">
                <Clock className="h-5 w-5 text-slate-500" strokeWidth={2} />
                <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                  API Status
                </h2>
              </div>
              {health ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatusBadge label="API" value="up" ok />
                  <StatusBadge label="Version" value={health.version} />
                  <StatusBadge
                    label="Postgres"
                    value={health.postgres}
                    ok={health.postgres === "up"}
                  />
                  <StatusBadge
                    label="Redis"
                    value={health.redis}
                    ok={health.redis === "up"}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 text-rose-600 text-sm">
                  <span className="h-2 w-2 rounded-full bg-rose-600" />
                  <span>Backend unreachable on localhost:8000</span>
                </div>
              )}
            </BentoCard>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({
  label,
  value,
  ok = false,
}: {
  label: string;
  value: string;
  ok?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3">
      <span
        className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-600" : "bg-slate-500"}`}
      />
      <div className="flex flex-col">
        <span className="text-xs text-slate-500 uppercase tracking-wide">
          {label}
        </span>
        <span className="text-sm font-mono text-slate-900">{value}</span>
      </div>
    </div>
  );
}
