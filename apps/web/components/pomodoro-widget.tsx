"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Pause,
  Play,
  Settings,
  SkipForward,
  Square,
  Timer,
} from "lucide-react";
import { usePomodoro } from "@/lib/hooks/use-pomodoro";
import { PomodoroPreferencesModal } from "./pomodoro-preferences-modal";
import type { Task } from "@/lib/types/task";
import type { PomodoroPhase, TimeStats } from "@/lib/types/pomodoro";

const API_BASE = "http://localhost:8000";

interface Props {
  tasks: Task[];
  onSessionEnd?: () => void;
}

const PHASE_COLORS: Record<
  PomodoroPhase,
  { bg: string; text: string; ring: string; bar: string; label: string }
> = {
  idle: {
    bg: "bg-slate-50",
    text: "text-slate-600",
    ring: "ring-slate-200",
    bar: "bg-slate-300",
    label: "Prêt à démarrer",
  },
  focus: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-300",
    bar: "bg-emerald-600",
    label: "Focus",
  },
  short_break: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    ring: "ring-blue-300",
    bar: "bg-blue-600",
    label: "Pause courte",
  },
  long_break: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    ring: "ring-violet-300",
    bar: "bg-violet-600",
    label: "Pause longue",
  },
};

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}`;
  return `${m}min`;
}

export function PomodoroWidget({ tasks, onSessionEnd }: Props) {
  const pomodoro = usePomodoro();
  const [showSettings, setShowSettings] = useState(false);
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [statsRefreshKey, setStatsRefreshKey] = useState(0);
  const [pulseActive, setPulseActive] = useState(false);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      void Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      setPulseActive(true);
      setTimeout(() => setPulseActive(false), 2000);
      if (onSessionEnd) onSessionEnd();
      setStatsRefreshKey((k) => k + 1);
    };
    window.addEventListener("pomodoro-phase-end", handler);
    return () => window.removeEventListener("pomodoro-phase-end", handler);
  }, [onSessionEnd]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/time/stats`);
        if (!res.ok) return;
        const data = (await res.json()) as TimeStats;
        if (!cancelled) setTodaySeconds(data.total_seconds_today);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [statsRefreshKey, pomodoro.phase]);

  const colors = PHASE_COLORS[pomodoro.phase];

  const activeTask = useMemo(
    () => tasks.find((t) => t.id === pomodoro.activeTaskId) ?? null,
    [tasks, pomodoro.activeTaskId],
  );

  const totalDuration = useMemo(() => {
    if (!pomodoro.preferences) return 1;
    if (pomodoro.phase === "focus")
      return pomodoro.preferences.focus_duration_seconds;
    if (pomodoro.phase === "short_break")
      return pomodoro.preferences.short_break_seconds;
    if (pomodoro.phase === "long_break")
      return pomodoro.preferences.long_break_seconds;
    return 1;
  }, [pomodoro.phase, pomodoro.preferences]);

  const progress =
    pomodoro.phase === "idle"
      ? 0
      : ((totalDuration - pomodoro.remainingSeconds) / totalDuration) * 100;

  const cycleLabel =
    pomodoro.phase === "idle"
      ? "Pomodoro Timer"
      : `Cycle ${pomodoro.currentCycle}${
          pomodoro.preferences
            ? "/" + pomodoro.preferences.cycles_before_long_break
            : ""
        }`;

  return (
    <>
      {pulseActive && (
        <div className="fixed inset-0 z-40 pointer-events-none animate-pulse-once bg-emerald-100" />
      )}

      <div
        className={`glass-card rounded-2xl ${colors.bg} ring-1 ${colors.ring} p-6 transition-colors duration-500`}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-100">
              <Timer
                className={`h-5 w-5 ${colors.text}`}
                strokeWidth={1.5}
              />
            </div>
            <div>
              <p className={`text-sm font-medium ${colors.text}`}>
                {colors.label}
              </p>
              <p className="text-xs text-slate-500">{cycleLabel}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="text-slate-500 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-100"
            title="Paramètres"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

        <div className="text-center my-8">
          <p
            className={`font-mono text-7xl font-bold tabular-nums ${colors.text}`}
          >
            {pomodoro.phase === "idle"
              ? pomodoro.preferences
                ? formatTime(pomodoro.preferences.focus_duration_seconds)
                : "25:00"
              : formatTime(pomodoro.remainingSeconds)}
          </p>

          <div className="mt-4 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ${colors.bar}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
            Tâche en cours (optionnel)
          </label>
          <select
            value={pomodoro.activeTaskId ?? ""}
            onChange={(e) =>
              pomodoro.setActiveTask(
                e.target.value ? parseInt(e.target.value, 10) : null,
              )
            }
            disabled={pomodoro.phase !== "idle"}
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
          >
            <option value="">Pas de tâche (temps libre)</option>
            {tasks
              .filter((t) => t.status !== "done")
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
          </select>
          {activeTask && pomodoro.phase !== "idle" && (
            <p className="text-xs text-slate-500 mt-1">
              Tracking sur :{" "}
              <span className="text-slate-700">{activeTask.title}</span>
            </p>
          )}
        </div>

        <div className="flex items-center justify-center gap-3">
          {pomodoro.phase === "idle" ? (
            <button
              type="button"
              onClick={() => pomodoro.startFocus()}
              disabled={!pomodoro.preferences}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              <Play className="h-5 w-5" />
              Démarrer focus
            </button>
          ) : (
            <>
              {pomodoro.isRunning ? (
                <button
                  type="button"
                  onClick={pomodoro.pause}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-600 text-slate-900 rounded-lg"
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  onClick={pomodoro.resume}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                >
                  <Play className="h-4 w-4" />
                  Reprendre
                </button>
              )}
              <button
                type="button"
                onClick={pomodoro.skipToNext}
                className="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100"
                title="Passer à la phase suivante"
              >
                <SkipForward className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={pomodoro.stop}
                className="flex items-center gap-2 px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-300 rounded-lg"
              >
                <Square className="h-4 w-4" />
                Stop
              </button>
            </>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-500">
            Temps aujourd&apos;hui :{" "}
            <span className="text-slate-700 font-mono">
              {formatDuration(todaySeconds)}
            </span>
          </p>
        </div>
      </div>

      {pomodoro.preferences && showSettings && (
        <PomodoroPreferencesModal
          key={pomodoro.preferences.updated_at}
          onClose={() => setShowSettings(false)}
          preferences={pomodoro.preferences}
          onSaved={pomodoro.refreshPreferences}
        />
      )}
    </>
  );
}
