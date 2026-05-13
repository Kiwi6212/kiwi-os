import { authFetch } from "@/lib/auth-fetch";
import { Briefcase, Clock, Target, TrendingUp } from "lucide-react";

import { ApplicationListClient } from "@/components/application-list-client";
import { BentoCard } from "@/components/bento-card";
import {
  JobSearchDetailedStats,
  type DetailedStats,
} from "@/components/job-search-detailed-stats";
import { KpiCard } from "@/components/kpi-card";

type ApplicationStats = {
  total: number;
  by_status: Record<string, number>;
  active_count: number;
  response_rate: number;
  interview_rate: number;
  favorites_count: number;
} & DetailedStats;

async function getStats(): Promise<ApplicationStats | null> {
  try {
    const res = await authFetch(
      "http://localhost:8000/api/applications/stats",
      { cache: "no-store" },
    );
    if (!res.ok) return null;
    return (await res.json()) as ApplicationStats;
  } catch {
    return null;
  }
}

export default async function JobSearchPage() {
  const stats = await getStats();

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Job Search</h1>
          <p className="text-slate-500 mt-1">
            Suivi de tes candidatures. CrÃ©ation via Claude in Chrome + MCP.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-4 mb-6">
          <div className="col-span-12 md:col-span-3">
            <KpiCard
              label="Total candidatures"
              value={stats ? String(stats.total) : "â€”"}
              icon={<Briefcase className="h-5 w-5" strokeWidth={2} />}
              accent="kiwi"
              delay={0}
            />
          </div>
          <div className="col-span-12 md:col-span-3">
            <KpiCard
              label="Candidatures actives"
              value={stats ? String(stats.active_count) : "â€”"}
              icon={<Target className="h-5 w-5" strokeWidth={2} />}
              accent="cyan"
              delay={0.05}
            />
          </div>
          <div className="col-span-12 md:col-span-3">
            <KpiCard
              label="Taux de rÃ©ponse"
              value={stats ? String(stats.response_rate) : "â€”"}
              unit="%"
              icon={<Clock className="h-5 w-5" strokeWidth={2} />}
              accent="amber"
              delay={0.1}
            />
          </div>
          <div className="col-span-12 md:col-span-3">
            <KpiCard
              label="Taux entretien"
              value={stats ? String(stats.interview_rate) : "â€”"}
              unit="%"
              icon={<TrendingUp className="h-5 w-5" strokeWidth={2} />}
              accent="violet"
              delay={0.15}
            />
          </div>
        </div>

        {stats && stats.total > 0 && (
          <div className="mb-6">
            <BentoCard delay={0.2}>
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">
                RÃ©partition par statut
              </h2>
              <div className="space-y-2">
                {Object.entries(stats.by_status).map(([statusName, count]) => {
                  const percentage = (count / stats.total) * 100;
                  return (
                    <div
                      key={statusName}
                      className="flex items-center gap-3"
                    >
                      <span className="text-sm text-slate-700 w-28 shrink-0">
                        {statusName}
                      </span>
                      <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-600/70 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-slate-500 w-12 text-right">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </BentoCard>
          </div>
        )}

        {stats && stats.total > 0 && (
          <div className="mb-6">
            <JobSearchDetailedStats stats={stats} />
          </div>
        )}

        <BentoCard delay={0.25}>
          <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">
            Toutes les candidatures
          </h2>
          <ApplicationListClient />
        </BentoCard>
      </div>
    </div>
  );
}
