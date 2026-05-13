"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PomodoroPhase,
  PomodoroPreference,
  TimeEntry,
  TimeEntryType,
} from "@/lib/types/pomodoro";
import { authFetch } from "@/lib/auth-fetch";

const API_BASE = "http://localhost:8000";

export interface UsePomodoroReturn {
  phase: PomodoroPhase;
  isRunning: boolean;
  remainingSeconds: number;
  currentCycle: number;
  activeTaskId: number | null;
  activeEntry: TimeEntry | null;
  preferences: PomodoroPreference | null;

  startFocus: (taskId?: number) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<void>;
  skipToNext: () => void;
  setActiveTask: (taskId: number | null) => void;
  refreshPreferences: () => Promise<void>;
}

function notifyEndOfPhase(phase: PomodoroPhase) {
  if ("Notification" in window && Notification.permission === "granted") {
    const messages: Record<PomodoroPhase, { title: string; body: string }> = {
      focus: { title: "Focus terminé !", body: "Prends une pause." },
      short_break: { title: "Pause terminée", body: "Retour au travail !" },
      long_break: {
        title: "Longue pause terminée",
        body: "Nouveau cycle commence.",
      },
      idle: { title: "", body: "" },
    };
    const msg = messages[phase];
    if (msg.title) {
      new Notification(msg.title, { body: msg.body, icon: "/favicon.ico" });
    }
  }

  try {
    const AudioCtxCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtxCtor) return;
    const ctx = new AudioCtxCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = phase === "focus" ? 880 : 440;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1);
    osc.start();
    osc.stop(ctx.currentTime + 1);
  } catch (e) {
    console.error(e);
  }

  window.dispatchEvent(
    new CustomEvent("pomodoro-phase-end", { detail: { phase } }),
  );
}

export function usePomodoro(): UsePomodoroReturn {
  const [phase, setPhase] = useState<PomodoroPhase>("idle");
  const [isRunning, setIsRunning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [preferences, setPreferences] = useState<PomodoroPreference | null>(
    null,
  );

  const startEntry = useCallback(
    async (type: TimeEntryType): Promise<TimeEntry> => {
      const body: { type: TimeEntryType; task_id?: number } = { type };
      if (activeTaskId !== null && type === "pomodoro_focus") {
        body.task_id = activeTaskId;
      }
      const res = await authFetch(`/api/time/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return (await res.json()) as TimeEntry;
    },
    [activeTaskId],
  );

  const handlePhaseEnd = useCallback(async () => {
    if (!preferences) return;

    setIsRunning(false);

    if (activeEntry) {
      try {
        await authFetch(`/api/time/entries/${activeEntry.id}/stop`, {
          method: "PATCH",
        });
      } catch (e) {
        console.error(e);
      }
    }

    notifyEndOfPhase(phase);

    if (phase === "focus") {
      const isLongBreak =
        currentCycle >= preferences.cycles_before_long_break;
      const nextPhase: PomodoroPhase = isLongBreak
        ? "long_break"
        : "short_break";
      const nextDuration = isLongBreak
        ? preferences.long_break_seconds
        : preferences.short_break_seconds;

      const entryType: TimeEntryType = isLongBreak
        ? "pomodoro_long_break"
        : "pomodoro_short_break";
      const newEntry = await startEntry(entryType);
      setActiveEntry(newEntry);
      setPhase(nextPhase);
      setRemainingSeconds(nextDuration);
      setIsRunning(true);
    } else if (phase === "short_break" || phase === "long_break") {
      if (phase === "long_break") {
        setCurrentCycle(1);
      } else {
        setCurrentCycle((c) => c + 1);
      }
      setPhase("idle");
      setActiveEntry(null);
      setRemainingSeconds(0);
    }
  }, [phase, preferences, activeEntry, currentCycle, startEntry]);

  // Always-fresh ref so the interval doesn't capture a stale handlePhaseEnd
  const handlePhaseEndRef = useRef(handlePhaseEnd);
  useEffect(() => {
    handlePhaseEndRef.current = handlePhaseEnd;
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await authFetch(`/api/pomodoro/preferences`);
        if (!res.ok) return;
        const data = (await res.json()) as PomodoroPreference;
        if (!cancelled) setPreferences(data);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isRunning) return;

    const id = setInterval(() => {
      setRemainingSeconds((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          // Defer side effects so the state updater stays pure
          setTimeout(() => {
            void handlePhaseEndRef.current();
          }, 0);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [isRunning]);

  const startFocus = useCallback(
    async (taskId?: number) => {
      if (!preferences) return;
      if (taskId !== undefined) setActiveTaskId(taskId);

      const newEntry = await startEntry("pomodoro_focus");
      setActiveEntry(newEntry);
      setPhase("focus");
      setRemainingSeconds(preferences.focus_duration_seconds);
      setIsRunning(true);
    },
    [preferences, startEntry],
  );

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const resume = useCallback(() => {
    setIsRunning((wasRunning) => {
      if (wasRunning) return true;
      // Only resume if we have remaining time and a non-idle phase
      return true;
    });
  }, []);

  const stop = useCallback(async () => {
    setIsRunning(false);
    if (activeEntry) {
      try {
        await authFetch(`/api/time/entries/${activeEntry.id}/stop`, {
          method: "PATCH",
        });
      } catch (e) {
        console.error(e);
      }
    }
    setPhase("idle");
    setRemainingSeconds(0);
    setActiveEntry(null);
    setCurrentCycle(1);
  }, [activeEntry]);

  const skipToNext = useCallback(() => {
    setRemainingSeconds(0);
    setTimeout(() => {
      void handlePhaseEndRef.current();
    }, 0);
  }, []);

  const setActiveTask = useCallback((taskId: number | null) => {
    setActiveTaskId(taskId);
  }, []);

  const refreshPreferences = useCallback(async () => {
    try {
      const res = await authFetch(`/api/pomodoro/preferences`);
      if (!res.ok) return;
      const data = (await res.json()) as PomodoroPreference;
      setPreferences(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  return {
    phase,
    isRunning,
    remainingSeconds,
    currentCycle,
    activeTaskId,
    activeEntry,
    preferences,
    startFocus,
    pause,
    resume,
    stop,
    skipToNext,
    setActiveTask,
    refreshPreferences,
  };
}
