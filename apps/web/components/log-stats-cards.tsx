"use client";

import { useEffect, useState } from "react";
import {
  LOG_LEVEL_COLORS,
  LOG_LEVEL_LABELS,
  type LogLevel,
} from "@/lib/types/settings";

const API_BASE = "http://localhost:8000";

type LogStats = {
  total: number;
  by_level: Array<{ level: LogLevel; count_24h: number; count_7d: number }>;
  by_module: Record<string, number>;
  most_recent_error: string | null;
};

interface Props {
  refreshKey?: number;
}

export function LogStatsCards({ refreshKey = 0 }: Props) {
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/settings/logs/stats`);
        if (!res.ok) return;
        const data = (await res.json()) as LogStats;
        if (!cancelled) setStats(data);
      } catch {
        // silent — caller can show their own fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-slate-50 rounded-xl p-3 border border-slate-200 animate-pulse h-24"
          />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {stats.by_level.map((lvl) => {
        const colors = LOG_LEVEL_COLORS[lvl.level];
        return (
          <div
            key={lvl.level}
            className={`${colors.bg} rounded-xl p-3 border border-slate-200`}
          >
            <p
              className={`text-xs uppercase tracking-wider font-semibold ${colors.text}`}
            >
              {LOG_LEVEL_LABELS[lvl.level]}
            </p>
            <p
              className={`text-2xl font-bold font-mono ${colors.text} mt-1 tabular-nums`}
            >
              {lvl.count_24h}
            </p>
            <p className="text-xs text-slate-500">
              24h · {lvl.count_7d} en 7j
            </p>
          </div>
        );
      })}
    </div>
  );
}
