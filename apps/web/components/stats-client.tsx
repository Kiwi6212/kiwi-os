"use client";

import { authFetch } from "@/lib/auth-fetch";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  CheckCircle2,
  Info,
  Lightbulb,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { FinanceStatsClient } from "./finance-stats-client";
import { ProductivityStatsClient } from "./productivity-stats-client";

type DeltaMetric = {
  current: number;
  previous: number;
  delta: number;
  delta_pct: number;
};

type TimeSeriesPoint = {
  date: string;
  value: number;
  label: string | null;
};

type CategoricalCount = { category: string; count: number };
type WeekdayCount = { weekday: string; count: number };

type JobStats = {
  applications_count: DeltaMetric;
  interviews_count: DeltaMetric;
  response_rate: DeltaMetric;
  active_count: DeltaMetric;
  applications_over_time: TimeSeriesPoint[];
  by_weekday: WeekdayCount[];
  by_contract_type: CategoricalCount[];
  period_days: number;
  period_start: string;
  period_end: string;
};

type GithubStats = {
  commits_count: DeltaMetric;
  commits_over_time: TimeSeriesPoint[];
  top_repos: CategoricalCount[];
  by_weekday: WeekdayCount[];
  period_days: number;
};

type InsightType = "info" | "warning" | "success" | "tip";

type Insight = {
  type: InsightType;
  message: string;
  context: string | null;
};

type Insights = { insights: Insight[]; fetched_at: string };

const PERIODS = [
  { label: "7j", value: 7 },
  { label: "30j", value: 30 },
  { label: "90j", value: 90 },
];

const STATUS_COLORS: Record<string, string> = {
  Applied: "#60A5FA",
  Interview: "#A78BFA",
  Rejected: "#FB7185",
  "No response": "#64748B",
};

const CONTRACT_COLORS = [
  "#10B981",
  "#60A5FA",
  "#A78BFA",
  "#FBBF24",
  "#FB7185",
  "#64748B",
];

const INSIGHT_ICONS: Record<InsightType, typeof AlertCircle> = {
  warning: AlertCircle,
  success: CheckCircle2,
  tip: Lightbulb,
  info: Info,
};

const INSIGHT_COLORS: Record<InsightType, string> = {
  warning: "text-amber-600 bg-amber-50 border-amber-200",
  success: "text-emerald-600 bg-emerald-50 border-emerald-300",
  tip: "text-violet-600 bg-violet-50 border-violet-300",
  info: "text-cyan-600 bg-cyan-50 border-cyan-300",
};

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function pivotApplicationsByStatus(
  data: TimeSeriesPoint[],
): Array<Record<string, number | string>> {
  const grouped: Record<string, Record<string, number | string>> = {};
  for (const p of data) {
    if (!grouped[p.date]) grouped[p.date] = { date: p.date };
    if (p.label) grouped[p.date][p.label] = p.value;
  }
  return Object.values(grouped).sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
}

function commitsSeries(
  data: TimeSeriesPoint[],
): Array<{ date: string; commits: number }> {
  return data
    .map((p) => ({ date: p.date, commits: p.value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function DeltaIndicator({ deltaPct }: { deltaPct: number }) {
  if (deltaPct === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-mono text-slate-500">
        <Minus className="h-3 w-3" strokeWidth={2} />
        0%
      </span>
    );
  }
  const isUp = deltaPct > 0;
  const Icon = isUp ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-mono ${
        isUp ? "text-emerald-600" : "text-rose-600"
      }`}
    >
      <Icon className="h-3 w-3" strokeWidth={2} />
      {isUp ? "+" : ""}
      {deltaPct.toFixed(1)}%
    </span>
  );
}

function KpiBox({
  label,
  metric,
  unit,
}: {
  label: string;
  metric: DeltaMetric;
  unit: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 transition-all hover:-translate-y-0.5 hover:border-slate-300">
      <p className="text-xs uppercase tracking-wider text-slate-500 mb-2">
        {label}
      </p>
      <div className="flex items-baseline gap-1 mb-2">
        <span className="font-mono text-3xl font-semibold text-slate-900 tabular-nums">
          {metric.current.toLocaleString("fr-FR")}
        </span>
        {unit && (
          <span className="text-sm text-slate-500 font-mono">{unit}</span>
        )}
      </div>
      <DeltaIndicator deltaPct={metric.delta_pct} />
      <p className="text-xs text-slate-500 mt-1 font-mono">
        Avant&nbsp;: {metric.previous.toLocaleString("fr-FR")}
        {unit}
      </p>
    </div>
  );
}

function ChartCard({
  title,
  empty,
  children,
}: {
  title: string;
  empty?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
      <h3 className="text-sm text-slate-700 mb-3">{title}</h3>
      {empty ? (
        <div className="h-60 flex items-center justify-center text-sm text-slate-500">
          Aucune donnÃ©e sur la pÃ©riode
        </div>
      ) : (
        children
      )}
    </div>
  );
}

const TOOLTIP_STYLE: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.95)",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  fontSize: 12,
  color: "#0f172a",
};

export function StatsClient() {
  const [period, setPeriod] = useState(30);
  const [jobStats, setJobStats] = useState<JobStats | null>(null);
  const [githubStats, setGithubStats] = useState<GithubStats | null>(null);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const [jobsRes, ghRes, insRes] = await Promise.all([
          authFetch(`http://localhost:8000/api/stats/jobs?period=${period}`),
          authFetch(`http://localhost:8000/api/stats/github?period=${period}`),
          authFetch(`http://localhost:8000/api/stats/insights?period=${period}`),
        ]);
        if (cancelled) return;
        const jobs = jobsRes.ok ? ((await jobsRes.json()) as JobStats) : null;
        const gh = ghRes.ok ? ((await ghRes.json()) as GithubStats) : null;
        const ins = insRes.ok ? ((await insRes.json()) as Insights) : null;
        if (cancelled) return;
        setJobStats(jobs);
        setGithubStats(gh);
        setInsights(ins);
        if (!jobs || !ins) {
          setError("Backend partiellement injoignable.");
        }
      } catch {
        if (!cancelled) setError("Backend injoignable.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [period]);

  if (loading) {
    return (
      <div className="text-slate-500 text-sm py-8">
        Chargement des statistiquesâ€¦
      </div>
    );
  }

  if (!jobStats || !insights) {
    return (
      <div className="text-rose-600 text-sm py-8">
        {error ?? "Erreur de chargement des statistiques."}
      </div>
    );
  }

  const appsSeries = pivotApplicationsByStatus(jobStats.applications_over_time);
  const ghSeries = githubStats ? commitsSeries(githubStats.commits_over_time) : [];
  const hasGithub = !!githubStats;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                period === p.value
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {error && <span className="text-xs text-amber-600">{error}</span>}
      </div>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">
          KPIs comparatifs (vs pÃ©riode prÃ©cÃ©dente)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiBox label="Candidatures" metric={jobStats.applications_count} unit="" />
          <KpiBox label="Entretiens" metric={jobStats.interviews_count} unit="" />
          <KpiBox label="Taux rÃ©ponse" metric={jobStats.response_rate} unit="%" />
          {hasGithub ? (
            <KpiBox label="Commits" metric={githubStats.commits_count} unit="" />
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 flex items-center justify-center text-xs text-slate-500">
              GitHub indisponible
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">
          Ã‰volution temporelle
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="Candidatures par jour" empty={appsSeries.length === 0}>
            <ResponsiveContainer width="100%" height={288}>
              <AreaChart
                data={appsSeries}
                margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  stroke="#475569"
                  fontSize={11}
                  tickFormatter={formatShortDate}
                />
                <YAxis stroke="#475569" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelFormatter={(l) => formatShortDate(String(l))}
                />
                <Legend
                  wrapperStyle={{ fontSize: 12, color: "#94A3B8" }}
                  iconType="circle"
                />
                {Object.entries(STATUS_COLORS).map(([key, color]) => (
                  <Area
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stackId="1"
                    stroke={color}
                    fill={color}
                    fillOpacity={0.4}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Commits par jour"
            empty={!hasGithub || ghSeries.length === 0}
          >
            <ResponsiveContainer width="100%" height={288}>
              <AreaChart
                data={ghSeries}
                margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  stroke="#475569"
                  fontSize={11}
                  tickFormatter={formatShortDate}
                />
                <YAxis stroke="#475569" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelFormatter={(l) => formatShortDate(String(l))}
                />
                <Area
                  type="monotone"
                  dataKey="commits"
                  stroke="#059669"
                  fill="#059669"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">
          Distribution &amp; patterns
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ChartCard
            title="Candidatures par jour de la semaine"
            empty={jobStats.by_weekday.every((w) => w.count === 0)}
          >
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={jobStats.by_weekday}
                margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="weekday" stroke="#475569" fontSize={11} />
                <YAxis stroke="#475569" fontSize={11} allowDecimals={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Par type de contrat"
            empty={jobStats.by_contract_type.length === 0}
          >
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={jobStats.by_contract_type}
                  dataKey="count"
                  nameKey="category"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {jobStats.by_contract_type.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CONTRACT_COLORS[i % CONTRACT_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Legend
                  wrapperStyle={{ fontSize: 11, color: "#94A3B8" }}
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Top 5 repos GitHub"
            empty={!hasGithub || githubStats.top_repos.length === 0}
          >
            <ResponsiveContainer width="100%" height={240}>
              <BarChart
                data={hasGithub ? githubStats.top_repos : []}
                layout="vertical"
                margin={{ top: 8, right: 8, bottom: 0, left: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  stroke="#475569"
                  fontSize={11}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  stroke="#475569"
                  fontSize={11}
                  width={100}
                />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "#f1f5f9" }} />
                <Bar dataKey="count" fill="#059669" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">
          Insights &amp; recommandations
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {insights.insights.map((ins, i) => {
            const Icon = INSIGHT_ICONS[ins.type];
            const colors = INSIGHT_COLORS[ins.type];
            return (
              <div
                key={i}
                className={`flex items-start gap-3 p-4 rounded-2xl border ${colors}`}
              >
                <Icon className="h-5 w-5 shrink-0 mt-0.5" strokeWidth={2} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{ins.message}</p>
                  {ins.context && (
                    <p className="text-xs opacity-80 mt-1">{ins.context}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">
          Finances
        </h2>
        <FinanceStatsClient />
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide mb-4">
          ProductivitÃ©
        </h2>
        <ProductivityStatsClient />
      </section>
    </div>
  );
}
