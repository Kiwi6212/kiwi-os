"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, Check, Copy, FileJson, RefreshCw, Trash2 } from "lucide-react";
import {
  LOG_LEVEL_COLORS,
  LOG_LEVEL_LABELS,
  type LogLevel,
  type SystemLog,
} from "@/lib/types/settings";
import { LogStatsCards } from "@/components/log-stats-cards";
import { authFetch } from "@/lib/auth-fetch";

const API_BASE = "http://localhost:8000";

type LogStatsByLevel = {
  level: LogLevel;
  count_24h: number;
  count_7d: number;
};

type LogStats = {
  total: number;
  by_level: LogStatsByLevel[];
  by_module: Record<string, number>;
  most_recent_error: string | null;
};

export function LogsTab() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [filterLevel, setFilterLevel] = useState<LogLevel | "all">("all");
  const [filterModule, setFilterModule] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const triggerRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filterLevel !== "all") params.set("level", filterLevel);
        if (filterModule) params.set("module", filterModule);
        params.set("limit", "100");

        const [logsRes, statsRes] = await Promise.all([
          authFetch(`/api/settings/logs?${params}`),
          authFetch(`/api/settings/logs/stats`),
        ]);
        if (!logsRes.ok || !statsRes.ok) {
          throw new Error("Erreur de chargement");
        }
        const logsData = (await logsRes.json()) as SystemLog[];
        const statsData = (await statsRes.json()) as LogStats;
        if (!cancelled) {
          setLogs(logsData);
          setStats(statsData);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erreur réseau");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filterLevel, filterModule, refreshKey]);

  const handleCopyToClipboard = async () => {
    const header = "Date\tNiveau\tModule\tMessage\tHTTP";
    const rows = logs.map((log) => {
      const date = new Date(log.timestamp).toLocaleString("fr-FR");
      const http = log.http_method
        ? `${log.http_method} ${log.http_path ?? ""} (${log.http_status ?? ""})`
        : "";
      return `${date}\t${log.level}\t${log.module}\t${log.message}\t${http}`;
    });
    const text = [header, ...rows].join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Erreur de copie dans le clipboard");
    }
  };

  const handleExportJSON = () => {
    const exportData = {
      exported_at: new Date().toISOString(),
      count: logs.length,
      filters: {
        level: filterLevel === "all" ? null : filterLevel,
        module: filterModule || null,
      },
      logs,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kiwi-os-logs-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePurgeOld = async () => {
    if (!confirm("Supprimer tous les logs de plus de 30 jours ?")) return;
    await authFetch(`/api/settings/logs?older_than_days=30`, {
      method: "DELETE",
    });
    triggerRefresh();
  };

  const handlePurgeAll = async () => {
    if (!confirm("Supprimer TOUS les logs ? Cette action est irréversible."))
      return;
    await authFetch(`/api/settings/logs`, { method: "DELETE" });
    triggerRefresh();
  };

  const modules = Object.keys(stats?.by_module ?? {}).sort();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1 font-display">
          Logs système
        </h2>
        <p className="text-sm text-slate-600">
          Historique des événements et erreurs (HTTP + appels externes).
        </p>
      </div>

      {stats && <LogStatsCards refreshKey={refreshKey} />}

      {stats?.most_recent_error && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle
            className="h-5 w-5 text-rose-600 shrink-0"
            strokeWidth={2}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-rose-900">Dernière erreur</p>
            <p className="text-xs text-rose-700">
              {new Date(stats.most_recent_error).toLocaleString("fr-FR")}
            </p>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-3 flex-wrap shadow-sm">
        <select
          value={filterLevel}
          onChange={(e) =>
            setFilterLevel(e.target.value as LogLevel | "all")
          }
          className="text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        >
          <option value="all">Tous niveaux</option>
          {Object.entries(LOG_LEVEL_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        <select
          value={filterModule}
          onChange={(e) => setFilterModule(e.target.value)}
          className="text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        >
          <option value="">Tous modules</option>
          {modules.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={triggerRefresh}
          className="ml-auto inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <RefreshCw className="h-4 w-4" strokeWidth={2} />
          Rafraîchir
        </button>

        <button
          type="button"
          onClick={handleCopyToClipboard}
          disabled={logs.length === 0}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {copied ? (
            <Check className="h-4 w-4 text-emerald-600" strokeWidth={2} />
          ) : (
            <Copy className="h-4 w-4" strokeWidth={2} />
          )}
          {copied ? "Copié !" : "Copier"}
        </button>

        <button
          type="button"
          onClick={handleExportJSON}
          disabled={logs.length === 0}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FileJson className="h-4 w-4" strokeWidth={2} />
          Exporter JSON
        </button>

        <button
          type="button"
          onClick={handlePurgeOld}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-amber-700 hover:bg-amber-50 rounded-lg border border-amber-200 transition-colors"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
          Purger &gt; 30j
        </button>

        <button
          type="button"
          onClick={handlePurgeAll}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
          Tout purger
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {error ? (
          <div className="p-8 text-center text-rose-700 text-sm">{error}</div>
        ) : loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            Chargement...
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-sm">
            Aucun log trouvé.
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left text-xs uppercase tracking-wider text-slate-500 px-4 py-3 font-medium">
                  Date
                </th>
                <th className="text-left text-xs uppercase tracking-wider text-slate-500 px-4 py-3 font-medium">
                  Niveau
                </th>
                <th className="text-left text-xs uppercase tracking-wider text-slate-500 px-4 py-3 font-medium">
                  Module
                </th>
                <th className="text-left text-xs uppercase tracking-wider text-slate-500 px-4 py-3 font-medium">
                  Message
                </th>
                <th className="text-left text-xs uppercase tracking-wider text-slate-500 px-4 py-3 font-medium">
                  HTTP
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const colors = LOG_LEVEL_COLORS[log.level];
                const statusClass = log.http_status
                  ? log.http_status >= 500
                    ? "text-rose-600"
                    : log.http_status >= 400
                      ? "text-amber-600"
                      : "text-emerald-600"
                  : "";
                return (
                  <tr
                    key={log.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-b-0"
                  >
                    <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${colors.bg} ${colors.text}`}
                      >
                        {LOG_LEVEL_LABELS[log.level]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700 font-mono">
                      {log.module}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-900">
                      {log.message}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 font-mono whitespace-nowrap">
                      {log.http_method ? (
                        <span>
                          {log.http_method} {log.http_path}
                          {log.http_status && (
                            <span className={statusClass}>
                              {" "}
                              ({log.http_status})
                            </span>
                          )}
                        </span>
                      ) : (
                        ""
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
