"use client";

import Image from "next/image";
import { useState } from "react";
import { Save, User } from "lucide-react";
import type { UserPreference } from "@/lib/types/settings";

interface Props {
  preferences: UserPreference;
  onUpdate: (updates: Partial<UserPreference>) => Promise<void>;
}

export function AccountTab({ preferences, onUpdate }: Props) {
  const [displayName, setDisplayName] = useState(
    preferences.display_name ?? "",
  );
  const [avatarUrl, setAvatarUrl] = useState(preferences.avatar_url ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges =
    displayName !== (preferences.display_name ?? "") ||
    avatarUrl !== (preferences.avatar_url ?? "");

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await onUpdate({
        display_name: displayName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
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
          Compte
        </h2>
        <p className="text-sm text-slate-600">
          Tes informations personnelles affichées dans l&apos;app.
        </p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">
            Photo de profil
          </label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200 relative">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Avatar"
                  fill
                  sizes="64px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <User
                  className="h-8 w-8 text-slate-400"
                  strokeWidth={1.5}
                />
              )}
            </div>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            URL d&apos;une image (upload local au prochain commit)
          </p>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">
            Nom d&apos;affichage
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Mathias"
            className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          />
          <p className="text-xs text-slate-500 mt-2">
            Affiché dans la sidebar et le header
          </p>
        </div>

        {error && (
          <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          {saved && (
            <span className="text-sm text-emerald-600">✓ Enregistré</span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Save className="h-4 w-4" strokeWidth={2} />
            {saving ? "Sauvegarde..." : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
