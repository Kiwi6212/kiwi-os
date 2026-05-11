"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import {
  LOCALE_LABELS,
  type Locale,
  type UIDensity,
  UI_DENSITY_LABELS,
  type UserPreference,
} from "@/lib/types/settings";

interface Props {
  preferences: UserPreference;
  onUpdate: (updates: Partial<UserPreference>) => Promise<void>;
}

const INPUT_CLASS =
  "w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export function PreferencesTab({ preferences, onUpdate }: Props) {
  const [uiDensity, setUiDensity] = useState<UIDensity>(preferences.ui_density);
  const [locale, setLocale] = useState<Locale>(preferences.locale);
  const [weatherLat, setWeatherLat] = useState(
    preferences.weather_location_lat?.toString() ?? "",
  );
  const [weatherLon, setWeatherLon] = useState(
    preferences.weather_location_lon?.toString() ?? "",
  );
  const [weatherName, setWeatherName] = useState(
    preferences.weather_location_name ?? "",
  );
  const [githubUser, setGithubUser] = useState(
    preferences.github_username ?? "",
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await onUpdate({
        ui_density: uiDensity,
        locale,
        weather_location_lat: weatherLat ? parseFloat(weatherLat) : null,
        weather_location_lon: weatherLon ? parseFloat(weatherLon) : null,
        weather_location_name: weatherName.trim() || null,
        github_username: githubUser.trim() || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1 font-display">
          Préférences
        </h2>
        <p className="text-sm text-slate-600">
          Personnalise l&apos;interface et les intégrations par défaut.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">Interface</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">
              Densité
            </label>
            <select
              value={uiDensity}
              onChange={(e) => setUiDensity(e.target.value as UIDensity)}
              className={INPUT_CLASS}
            >
              {Object.entries(UI_DENSITY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">
              Langue
            </label>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              className={INPUT_CLASS}
            >
              {Object.entries(LOCALE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">
          Météo par défaut
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">
              Latitude
            </label>
            <input
              type="number"
              step="0.0001"
              value={weatherLat}
              onChange={(e) => setWeatherLat(e.target.value)}
              placeholder="48.8566"
              className={`${INPUT_CLASS} font-mono`}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">
              Longitude
            </label>
            <input
              type="number"
              step="0.0001"
              value={weatherLon}
              onChange={(e) => setWeatherLon(e.target.value)}
              placeholder="2.3522"
              className={`${INPUT_CLASS} font-mono`}
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">
              Nom du lieu
            </label>
            <input
              type="text"
              value={weatherName}
              onChange={(e) => setWeatherName(e.target.value)}
              placeholder="Paris, France"
              className={INPUT_CLASS}
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">GitHub</h3>

        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">
            Username GitHub
          </label>
          <input
            type="text"
            value={githubUser}
            onChange={(e) => setGithubUser(e.target.value)}
            placeholder="Kiwi6212"
            className={`${INPUT_CLASS} font-mono`}
          />
          <p className="text-xs text-slate-500 mt-2">
            Utilisé pour la heatmap et la liste des repos sur /dev-activity
          </p>
        </div>
      </div>

      {error && (
        <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-emerald-600">✓ Enregistré</span>}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg disabled:opacity-50 transition-colors"
        >
          <Save className="h-4 w-4" strokeWidth={2} />
          {saving ? "Sauvegarde..." : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
