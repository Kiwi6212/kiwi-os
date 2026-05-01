"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import type { TaskStats } from "@/lib/types/task";
import type { TimeStats } from "@/lib/types/pomodoro";

const API_BASE = "http://localhost:8000";

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "#0f172a",
  border: "1px solid #334155",
  borderRadius: "8px",
  fontSize: 12,
};

function formatHours(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}`;
  return `${m}min`;
}

export function ProductivityStatsClient() {
  const [taskStats, setTaskStats] = useState<TaskStats | null>(null);
  const [timeStats, setTimeStats] = useState<TimeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [tRes, tsRes] = await Promise.all([
          fetch(`${API_BASE}/api/tasks/stats`),
          fetch(`${API_BASE}/api/time/stats`),
        ]);
        if (!tRes.ok || !tsRes.ok) throw new Error("Erreur de chargement");
        const t = (await tRes.json()) as TaskStats;
        const ts = (await tsRes.json()) as TimeStats;
        if (!cancelled) {
          setTaskStats(t);
          setTimeStats(ts);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erreur");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <div className="text-slate-500 text-sm py-8">Chargement...</div>;
  }
  if (error || !taskStats || !timeStats) {
    return (
      <div className="text-rose-400 text-sm py-8">
        {error ?? "Erreur de chargement."}
      </div>
    );
  }

  const dailyData = timeStats.by_day_last_7_days.map((d) => ({
    date: new Date(d.date).toLocaleDateString("fr-FR", { weekday: "short" }),
    Focus: Math.round(d.focus_seconds / 60),
    "Timer libre": Math.round(d.free_seconds / 60),
    Pause: Math.round(d.break_seconds / 60),
  }));

  const hasDailyData = dailyData.some(
    (d) => d.Focus + d["Timer libre"] + d.Pause > 0,
  );

  const topTasksData = timeStats.by_task_this_week.slice(0, 5).map((t) => ({
    name:
      t.task_title.length > 30
        ? t.task_title.slice(0, 30) + "..."
        : t.task_title,
    minutes: Math.round(t.total_seconds / 60),
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Tâches actives"
          value={taskStats.by_status.todo + taskStats.by_status.in_progress}
          icon={ListChecks}
          color="text-blue-400"
        />
        <KpiCard
          label="Faites cette semaine"
          value={taskStats.completed_this_week}
          icon={CheckCircle2}
          color="text-emerald-400"
        />
        <KpiCard
          label="Temps aujourd'hui"
          value={formatHours(timeStats.total_seconds_today)}
          icon={Clock}
          color="text-kiwi-400"
        />
        <KpiCard
          label="En retard"
          value={taskStats.overdue}
          icon={AlertTriangle}
          color={taskStats.overdue > 0 ? "text-rose-400" : "text-slate-500"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-sm font-medium text-slate-300 mb-4">
            Temps tracké (7 derniers jours, en minutes)
          </h3>
          {hasDailyData ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  stroke="#94a3b8"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={{ color: "#cbd5e1" }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="Focus"
                  stackId="1"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="Timer libre"
                  stackId="1"
                  stroke="#94a3b8"
                  fill="#94a3b8"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="Pause"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.4}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">
              Aucune session sur les 7 derniers jours
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-sm font-medium text-slate-300 mb-4">
            Top 5 tâches cette semaine (en minutes)
          </h3>
          {topTasksData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={topTasksData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  width={150}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  labelStyle={{ color: "#cbd5e1" }}
                />
                <Bar dataKey="minutes" fill="#10b981" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">
              Aucune session liée à une tâche cette semaine
            </p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="text-sm font-medium text-slate-300 mb-4">
          Répartition des tâches par catégorie
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <CategoryStat
            label="École"
            count={taskStats.by_category.school}
            total={taskStats.total}
            textColor="text-blue-400"
            barColor="bg-blue-400"
          />
          <CategoryStat
            label="Perso"
            count={taskStats.by_category.personal}
            total={taskStats.total}
            textColor="text-violet-400"
            barColor="bg-violet-400"
          />
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${color}`} strokeWidth={1.5} />
        <p className="text-xs uppercase tracking-wider text-slate-500">
          {label}
        </p>
      </div>
      <p className={`font-mono text-3xl font-semibold tabular-nums ${color}`}>
        {value}
      </p>
    </div>
  );
}

function CategoryStat({
  label,
  count,
  total,
  textColor,
  barColor,
}: {
  label: string;
  count: number;
  total: number;
  textColor: string;
  barColor: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm text-slate-300">{label}</span>
        <span className={`text-sm font-mono ${textColor}`}>
          {count} ({pct}%)
        </span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
