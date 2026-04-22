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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return "Bonne nuit";
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

export default async function HomePage() {
  const [health, stats, calendar, appStats] = await Promise.all([
    getApiHealth(),
    getGithubStats(),
    getGithubCalendar(),
    getApplicationStats(),
  ]);
  const greeting = getGreeting();

  const commitsValue = stats !== null ? String(stats.commits_this_week) : "—";

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-100">
            {greeting}, <span className="text-kiwi-500">Mathias</span>
          </h1>
          <p className="text-slate-400 mt-1">
            Voici ce qui se passe aujourd&apos;hui sur ton cockpit.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-3">
            <KpiCard
              label="Solde courant"
              value="—"
              unit="€"
              icon={<Wallet className="h-5 w-5" strokeWidth={2} />}
              accent="kiwi"
              delay={0.0}
            />
          </div>
          <div className="col-span-12 md:col-span-3">
            <KpiCard
              label="Candidatures actives"
              value={appStats ? String(appStats.active_count) : "—"}
              icon={<Target className="h-5 w-5" strokeWidth={2} />}
              accent="cyan"
              delay={0.05}
            />
          </div>
          <div className="col-span-12 md:col-span-3">
            <KpiCard
              label="Tâches aujourd'hui"
              value="—"
              icon={<Zap className="h-5 w-5" strokeWidth={2} />}
              accent="amber"
              delay={0.1}
            />
          </div>
          <div className="col-span-12 md:col-span-3">
            <KpiCard
              label="Commits cette semaine"
              value={commitsValue}
              icon={<Code2 className="h-5 w-5" strokeWidth={2} />}
              accent="violet"
              delay={0.15}
            />
          </div>

          <div className="col-span-12 md:col-span-8">
            <BentoCard delay={0.2}>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <GitCommit
                    className="h-5 w-5 text-slate-400"
                    strokeWidth={2}
                  />
                  <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wide">
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
              <div className="mt-4 pt-4 border-t border-slate-800">
                <Link
                  href="/portfolio"
                  className="text-xs text-slate-500 hover:text-kiwi-400 inline-flex items-center gap-1 transition-colors"
                >
                  Voir le portfolio complet
                  <ExternalLink className="h-3 w-3" strokeWidth={2} />
                </Link>
              </div>
            </BentoCard>
          </div>

          <div className="col-span-12 md:col-span-4">
            <BentoCard delay={0.25}>
              <div className="flex items-center gap-2 mb-5">
                <Cloud className="h-5 w-5 text-slate-400" strokeWidth={2} />
                <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wide">
                  Météo
                </h2>
              </div>
              <WeatherCard />
            </BentoCard>
          </div>

          <div className="col-span-12">
            <BentoCard delay={0.3}>
              <div className="flex items-center gap-2 mb-5">
                <Clock className="h-5 w-5 text-slate-400" strokeWidth={2} />
                <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wide">
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
                <div className="flex items-center gap-2 text-rose-400 text-sm">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
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
    <div className="flex items-center gap-3 rounded-lg bg-slate-800/30 px-4 py-3">
      <span
        className={`h-2 w-2 rounded-full ${ok ? "bg-kiwi-500" : "bg-slate-500"}`}
      />
      <div className="flex flex-col">
        <span className="text-xs text-slate-500 uppercase tracking-wide">
          {label}
        </span>
        <span className="text-sm font-mono text-slate-200">{value}</span>
      </div>
    </div>
  );
}
