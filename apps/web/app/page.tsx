import {
  Wallet,
  Target,
  Zap,
  Code2,
  Calendar,
  GitCommit,
  Briefcase,
  Clock,
  ExternalLink,
} from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { BentoCard } from "@/components/bento-card";

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

type CommitActivity = {
  repo: string;
  message: string;
  sha: string;
  url: string;
  timestamp: string;
};

type GitHubActivityFeed = {
  items: CommitActivity[];
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

async function getGithubActivity(): Promise<GitHubActivityFeed | null> {
  try {
    const res = await fetch(
      "http://localhost:8000/api/github/activity?limit=4",
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return (await res.json()) as GitHubActivityFeed;
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

function formatRelativeTime(iso: string): string {
  const diffSec = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000),
  );
  if (diffSec < 60) return "à l'instant";
  if (diffSec < 3600) return `il y a ${Math.floor(diffSec / 60)} min`;
  if (diffSec < 86400) return `il y a ${Math.floor(diffSec / 3600)} h`;
  if (diffSec < 604800) return `il y a ${Math.floor(diffSec / 86400)} j`;
  return `il y a ${Math.floor(diffSec / 604800)} sem`;
}

export default async function HomePage() {
  const [health, stats, activity] = await Promise.all([
    getApiHealth(),
    getGithubStats(),
    getGithubActivity(),
  ]);
  const greeting = getGreeting();

  const commitsValue =
    stats !== null ? String(stats.commits_this_week) : "—";

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
              value="—"
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
              <div className="flex items-center gap-2 mb-5">
                <GitCommit className="h-5 w-5 text-slate-400" strokeWidth={2} />
                <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wide">
                  Activité récente
                </h2>
              </div>
              {activity && activity.items.length > 0 ? (
                <div className="space-y-3">
                  {activity.items.map((item) => (
                    <a
                      key={item.sha}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 text-sm rounded-lg -mx-2 px-2 py-1 transition-colors hover:bg-slate-800/40"
                    >
                      <div className="h-2 w-2 rounded-full bg-kiwi-500/50 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-300 truncate">{item.message}</p>
                        <p className="text-xs text-slate-500 font-mono">
                          {formatRelativeTime(item.timestamp)}
                          <span className="text-slate-600"> · {item.repo}</span>
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 py-4">
                  {activity
                    ? "Aucun commit récent."
                    : "GitHub adapter unreachable."}
                </p>
              )}
              <div className="mt-4 pt-4 border-t border-slate-800">
                <a
                  href="https://github.com/Kiwi6212"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-500 hover:text-kiwi-400 inline-flex items-center gap-1 transition-colors"
                >
                  Voir tous les commits sur GitHub
                  <ExternalLink className="h-3 w-3" strokeWidth={2} />
                </a>
              </div>
            </BentoCard>
          </div>

          <div className="col-span-12 md:col-span-4">
            <BentoCard delay={0.25}>
              <div className="flex items-center gap-2 mb-5">
                <Briefcase className="h-5 w-5 text-slate-400" strokeWidth={2} />
                <h2 className="text-sm font-semibold text-slate-100 uppercase tracking-wide">
                  Prochain entretien
                </h2>
              </div>
              <div className="py-8 text-center">
                <Calendar
                  className="h-10 w-10 text-slate-600 mx-auto mb-3"
                  strokeWidth={1.5}
                />
                <p className="text-sm text-slate-400 mb-1">
                  Aucun entretien planifié
                </p>
                <p className="text-xs text-slate-500">
                  Intégration MyJobHunter à venir
                </p>
              </div>
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
