export type TimeEntryType =
  | "pomodoro_focus"
  | "pomodoro_short_break"
  | "pomodoro_long_break"
  | "free_timer";

export type TimeEntry = {
  id: number;
  task_id: number | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  type: TimeEntryType;
  label: string | null;
  created_at: string;
};

export type TimeEntryStart = {
  task_id?: number | null;
  type: TimeEntryType;
  label?: string;
};

export type PomodoroPreference = {
  id: number;
  focus_duration_seconds: number;
  short_break_seconds: number;
  long_break_seconds: number;
  cycles_before_long_break: number;
  updated_at: string;
};

export type PomodoroPreferenceUpdate = Partial<
  Omit<PomodoroPreference, "id" | "updated_at">
>;

export type TimeStats = {
  total_seconds_today: number;
  total_seconds_this_week: number;
  by_day_last_7_days: Array<{
    date: string;
    total_seconds: number;
    focus_seconds: number;
    free_seconds: number;
    break_seconds: number;
  }>;
  by_task_this_week: Array<{
    task_id: number;
    task_title: string;
    total_seconds: number;
  }>;
};

export type PomodoroPhase = "focus" | "short_break" | "long_break" | "idle";
