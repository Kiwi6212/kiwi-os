"use client";

import { useEffect, useState } from "react";
import { AccountTab } from "@/components/settings/account-tab";
import { DataTab } from "@/components/settings/data-tab";
import { IntegrationsTab } from "@/components/settings/integrations-tab";
import { LogsTab } from "@/components/settings/logs-tab";
import { PreferencesTab } from "@/components/settings/preferences-tab";
import { SettingsLayout } from "@/components/settings/settings-layout";
import type { UserPreference } from "@/lib/types/settings";

const API_BASE = "http://localhost:8000";

export default function SettingsPage() {
  const [preferences, setPreferences] = useState<UserPreference | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/settings/preferences`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as UserPreference;
        if (!cancelled) setPreferences(data);
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
  }, []);

  const handleUpdate = async (updates: Partial<UserPreference>) => {
    const res = await fetch(`${API_BASE}/api/settings/preferences`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = (await res.json()) as UserPreference;
    setPreferences(data);
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 font-display">
            Paramètres
          </h1>
          <p className="text-slate-600 mt-1">
            Configure ton compte et tes intégrations.
          </p>
        </div>

        {loading ? (
          <div className="text-slate-500 text-sm">Chargement...</div>
        ) : error || !preferences ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Erreur de chargement des préférences
            {error ? ` : ${error}` : "."}
          </div>
        ) : (
          <SettingsLayout>
            {(activeTab) => {
              if (activeTab === "account") {
                return (
                  <AccountTab
                    preferences={preferences}
                    onUpdate={handleUpdate}
                  />
                );
              }
              if (activeTab === "preferences") {
                return (
                  <PreferencesTab
                    preferences={preferences}
                    onUpdate={handleUpdate}
                  />
                );
              }
              if (activeTab === "integrations") {
                return <IntegrationsTab />;
              }
              if (activeTab === "data") {
                return <DataTab />;
              }
              if (activeTab === "logs") {
                return <LogsTab />;
              }
              return null;
            }}
          </SettingsLayout>
        )}
      </div>
    </div>
  );
}
