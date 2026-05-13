"use client";

import { useEffect, useState } from "react";
import {
  Clock,
  Coffee,
  Edit3,
  type LucideIcon,
  Timer,
  Trash2,
  Zap,
} from "lucide-react";
import type { TimeEntry, TimeEntryType } from "@/lib/types/pomodoro";
import type { Task } from "@/lib/types/task";
import { authFetch } from "@/lib/auth-fetch";

const API_BASE = "http://localhost:8000";

interface Props {
  tasks: Task[];
  refreshKey: number;
  onChange?: () => void;
}

const TYPE_CONFIG: Record<
  TimeEntryType,
  { label: string; color: string; icon: LucideIcon }
> = {
  pomodoro_focus: { label: "Focus", color: "text-emerald-600", icon: Zap },
  pomodoro_short_break: {
    label: "Pause courte",
    color: "text-blue-600",
    icon: Coffee,
  },
  pomodoro_long_break: {
    label: "Pause longue",
    color: "text-violet-600",
    icon: Coffee,
  },
  free_timer: { label: "Timer libre", color: "text-slate-700", icon: Timer },
};

function formatDuration(seconds: number | null): string {
  if (!seconds) return "—";
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}`;
  return `${m}min`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  const time = d.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isToday) return `Aujourd'hui ${time}`;
  if (isYesterday) return `Hier ${time}`;
  return (
    d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) +
    " " +
    time
  );
}

export function TimeEntriesHistory({ tasks, refreshKey, onChange }: Props) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [localBump, setLocalBump] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await authFetch(`/api/time/entries?limit=20`);
        if (!res.ok) return;
        const data = (await res.json()) as TimeEntry[];
        if (!cancelled) setEntries(data);
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, localBump]);

  const taskById = new Map(tasks.map((t) => [t.id, t]));

  const handleReassign = async (entryId: number, newTaskId: number | null) => {
    try {
      await authFetch(`/api/time/entries/${entryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task_id: newTaskId }),
      });
    } catch (e) {
      console.error(e);
    }
    setEditingId(null);
    setLocalBump((b) => b + 1);
    if (onChange) onChange();
  };

  const handleDelete = async (entryId: number) => {
    if (!confirm("Supprimer cette session ?")) return;
    try {
      await authFetch(`/api/time/entries/${entryId}`, {
        method: "DELETE",
      });
    } catch (e) {
      console.error(e);
    }
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
    if (onChange) onChange();
  };

  if (loading) {
    return (
      <div className="text-slate-500 text-sm py-6 text-center">
        Chargement...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-8 text-center">
        <p className="text-slate-500 text-sm">
          Aucune session enregistrée pour l&apos;instant.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 bg-white shadow-sm">
        <h3 className="text-sm font-medium text-slate-700">
          Historique des sessions
        </h3>
      </div>
      <ul className="divide-y divide-slate-200">
        {entries.map((entry) => {
          const config = TYPE_CONFIG[entry.type];
          const Icon = config.icon;
          const task = entry.task_id ? taskById.get(entry.task_id) : null;
          const isEditing = editingId === entry.id;
          const canReassign =
            entry.type === "pomodoro_focus" || entry.type === "free_timer";

          return (
            <li
              key={entry.id}
              className="px-4 py-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`h-4 w-4 ${config.color} shrink-0`}
                  strokeWidth={1.5}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-sm font-medium ${config.color}`}>
                      {config.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDateTime(entry.started_at)}
                    </span>
                  </div>

                  {isEditing ? (
                    <select
                      value={entry.task_id ?? ""}
                      onChange={(e) =>
                        handleReassign(
                          entry.id,
                          e.target.value ? parseInt(e.target.value, 10) : null,
                        )
                      }
                      className="mt-1 text-xs bg-white border border-slate-300 rounded px-2 py-1 text-slate-700"
                      autoFocus
                      onBlur={() => setEditingId(null)}
                    >
                      <option value="">Pas de tâche</option>
                      {tasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  ) : task ? (
                    <p className="text-xs text-slate-500 truncate">
                      {task.title}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      Pas de tâche associée
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-mono text-slate-700 tabular-nums inline-flex items-center gap-1">
                    <Clock className="h-3 w-3 text-slate-500" strokeWidth={2} />
                    {formatDuration(entry.duration_seconds)}
                  </span>

                  {canReassign && (
                    <button
                      type="button"
                      onClick={() => setEditingId(entry.id)}
                      className="text-slate-500 hover:text-slate-700 p-1 rounded hover:bg-slate-200/50"
                      title="Réassigner à une tâche"
                    >
                      <Edit3 className="h-3 w-3" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDelete(entry.id)}
                    className="text-slate-500 hover:text-rose-600 p-1 rounded hover:bg-rose-50"
                    title="Supprimer"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
