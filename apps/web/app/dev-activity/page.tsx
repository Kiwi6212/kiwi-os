import { GitCommit, Lock, Globe } from "lucide-react";
import { BentoCard } from "@/components/bento-card";
import { ContributionHeatmap } from "@/components/contribution-heatmap";
import { RepoBreakdown } from "@/components/repo-breakdown";

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

type RepoContribution = {
  name: string;
  name_with_owner: string;
  url: string;
  is_private: boolean;
  commit_count: number;
};

type RecentRepo = {
  name: string;
  name_with_owner: string;
  url: string;
  is_private: boolean;
  created_at: string;
  primary_language: string | null;
  primary_language_color: string | null;
};

type ContributionCalendarData = {
  total_contributions: number;
  weeks: ContributionDay[][];
  repo_breakdown: RepoContribution[];
  recent_repos: RecentRepo[];
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

async function getCalendar(): Promise<ContributionCalendarData | null> {
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

async function getActivity(): Promise<GitHubActivityFeed | null> {
  try {
    const res = await fetch(
      "http://localhost:8000/api/github/activity?limit=10",
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return (await res.json()) as GitHubActivityFeed;
  } catch {
    return null;
  }
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

function formatDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function DevActivityPage() {
  const [calendar, activity] = await Promise.all([getCalendar(), getActivity()]);

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Dev Activity</h1>
          <p className="text-slate-500 mt-1">
            Tes contributions et projets GitHub. Sync automatique.
          </p>
        </div>

        {!calendar ? (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-8">
            <p className="text-sm text-slate-500">
              GitHub unreachable. Vérifie que le backend tourne sur :8000.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12">
              <BentoCard delay={0}>
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <GitCommit
                      className="h-5 w-5 text-slate-500"
                      strokeWidth={2}
                    />
                    <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
                      Contributions des 365 derniers jours
                    </h2>
                  </div>
                </div>
                <ContributionHeatmap
                  weeks={calendar.weeks}
                  totalContributions={calendar.total_contributions}
                />
              </BentoCard>
            </div>

            <div className="col-span-12 md:col-span-6">
              <BentoCard delay={0.1}>
                <RepoBreakdown
                  repos={calendar.repo_breakdown}
                  title="Commits par repo (cette année)"
                />
              </BentoCard>
            </div>

            <div className="col-span-12 md:col-span-6">
              <BentoCard delay={0.15}>
                <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-3">
                  Repos récents
                </h3>
                <div className="space-y-2">
                  {calendar.recent_repos.slice(0, 6).map((repo) => (
                    <a
                      key={repo.name_with_owner}
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between py-2 px-2 -mx-2 rounded-lg hover:bg-slate-100/40 transition-colors group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {repo.is_private ? (
                          <Lock
                            className="h-3 w-3 text-slate-500 shrink-0"
                            strokeWidth={2}
                          />
                        ) : (
                          <Globe
                            className="h-3 w-3 text-slate-500 shrink-0"
                            strokeWidth={2}
                          />
                        )}
                        <span className="text-sm text-slate-700 group-hover:text-emerald-600 transition-colors truncate">
                          {repo.name}
                        </span>
                        {repo.primary_language && (
                          <span className="flex items-center gap-1 shrink-0">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{
                                backgroundColor:
                                  repo.primary_language_color ?? "#64748b",
                              }}
                            />
                            <span className="text-xs text-slate-500">
                              {repo.primary_language}
                            </span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-mono shrink-0">
                        {formatDateShort(repo.created_at)}
                      </span>
                    </a>
                  ))}
                </div>
              </BentoCard>
            </div>

            <div className="col-span-12">
              <BentoCard delay={0.2}>
                <div className="flex items-center gap-2 mb-5">
                  <GitCommit
                    className="h-5 w-5 text-slate-500"
                    strokeWidth={2}
                  />
                  <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
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
                        className="flex items-start gap-3 text-sm rounded-lg -mx-2 px-2 py-1 transition-colors hover:bg-slate-100/40"
                      >
                        <div className="h-2 w-2 rounded-full bg-emerald-600/50 mt-1.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-700 truncate">
                            {item.message}
                          </p>
                          <p className="text-xs text-slate-500 font-mono">
                            {formatRelativeTime(item.timestamp)}
                            <span className="text-slate-500">
                              {" "}
                              · {item.repo}
                            </span>
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 py-4">
                    Aucun commit récent.
                  </p>
                )}
              </BentoCard>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
