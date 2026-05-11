export type UIDensity = "compact" | "comfortable";
export type Locale = "fr" | "en";

export type UserPreference = {
  id: number;
  ui_density: UIDensity;
  locale: Locale;
  display_name: string | null;
  avatar_url: string | null;
  weather_location_lat: number | null;
  weather_location_lon: number | null;
  weather_location_name: string | null;
  github_username: string | null;
  updated_at: string;
};

export type UserPreferenceUpdate = Partial<
  Omit<UserPreference, "id" | "updated_at">
>;

export type IntegrationStatus = {
  name: string;
  healthy: boolean;
  last_check: string;
  message: string;
  details: Record<string, unknown> | null;
};

export type LogLevel = "debug" | "info" | "warning" | "error" | "critical";

export type SystemLog = {
  id: number;
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  context: Record<string, unknown> | null;
  http_method: string | null;
  http_path: string | null;
  http_status: number | null;
};

export const UI_DENSITY_LABELS: Record<UIDensity, string> = {
  compact: "Compact",
  comfortable: "Confortable",
};

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  en: "English",
};

export const LOG_LEVEL_LABELS: Record<LogLevel, string> = {
  debug: "Debug",
  info: "Info",
  warning: "Avertissement",
  error: "Erreur",
  critical: "Critique",
};

export const LOG_LEVEL_COLORS: Record<
  LogLevel,
  { bg: string; text: string }
> = {
  debug: { bg: "bg-slate-100", text: "text-slate-600" },
  info: { bg: "bg-blue-50", text: "text-blue-700" },
  warning: { bg: "bg-amber-50", text: "text-amber-700" },
  error: { bg: "bg-rose-50", text: "text-rose-700" },
  critical: { bg: "bg-red-100", text: "text-red-800" },
};
