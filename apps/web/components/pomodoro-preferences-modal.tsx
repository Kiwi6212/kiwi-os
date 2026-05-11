"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type {
  PomodoroPreference,
  PomodoroPreferenceUpdate,
} from "@/lib/types/pomodoro";

const API_BASE = "http://localhost:8000";

interface Props {
  onClose: () => void;
  preferences: PomodoroPreference;
  onSaved: () => Promise<void> | void;
}

export function PomodoroPreferencesModal({
  onClose,
  preferences,
  onSaved,
}: Props) {
  const [focusMinutes, setFocusMinutes] = useState(() =>
    Math.round(preferences.focus_duration_seconds / 60),
  );
  const [shortBreakMinutes, setShortBreakMinutes] = useState(() =>
    Math.round(preferences.short_break_seconds / 60),
  );
  const [longBreakMinutes, setLongBreakMinutes] = useState(() =>
    Math.round(preferences.long_break_seconds / 60),
  );
  const [cycles, setCycles] = useState(preferences.cycles_before_long_break);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const update: PomodoroPreferenceUpdate = {
        focus_duration_seconds: focusMinutes * 60,
        short_break_seconds: shortBreakMinutes * 60,
        long_break_seconds: longBreakMinutes * 60,
        cycles_before_long_break: cycles,
      };
      const res = await fetch(`${API_BASE}/api/pomodoro/preferences`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'enregistrement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            Paramètres Pomodoro
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <NumberField
            label="Durée focus (minutes)"
            value={focusMinutes}
            onChange={setFocusMinutes}
            min={1}
            max={240}
          />
          <NumberField
            label="Pause courte (minutes)"
            value={shortBreakMinutes}
            onChange={setShortBreakMinutes}
            min={1}
            max={60}
          />
          <NumberField
            label="Pause longue (minutes)"
            value={longBreakMinutes}
            onChange={setLongBreakMinutes}
            min={1}
            max={120}
          />
          <NumberField
            label="Cycles avant pause longue"
            value={cycles}
            onChange={setCycles}
            min={1}
            max={10}
          />

          {error && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-900 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg disabled:opacity-50"
            >
              {submitting ? "Enregistrement..." : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
        {label}
      </label>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10) || min)}
        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
      />
    </div>
  );
}
