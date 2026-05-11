"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Cloud,
  GitBranch,
  RefreshCw,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { IntegrationStatus } from "@/lib/types/settings";

const API_BASE = "http://localhost:8000";

interface IntegrationCardProps {
  name: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

function IntegrationCard({
  name,
  label,
  icon: Icon,
  description,
}: IntegrationCardProps) {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setTesting(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/settings/integrations/${name}/status`,
      );
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as IntegrationStatus;
      setStatus(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau");
    } finally {
      setTesting(false);
    }
  }, [name]);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const healthy = status?.healthy;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <Icon className="h-5 w-5 text-slate-700" strokeWidth={1.5} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {status && (
            <div className="flex items-center gap-1.5">
              {healthy ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              ) : (
                <XCircle className="h-4 w-4 text-rose-600" />
              )}
              <span
                className={`text-xs font-medium ${
                  healthy ? "text-emerald-700" : "text-rose-700"
                }`}
              >
                {healthy ? "Connecté" : "Erreur"}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={fetchStatus}
            disabled={testing}
            className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
            title="Tester la connexion"
            aria-label="Tester la connexion"
          >
            <RefreshCw
              className={`h-4 w-4 ${testing ? "animate-spin" : ""}`}
              strokeWidth={2}
            />
          </button>
        </div>
      </div>

      {(status || error) && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          {error ? (
            <p className="text-xs text-rose-700">{error}</p>
          ) : status ? (
            <>
              <p className="text-xs text-slate-600">{status.message}</p>
              {status.last_check && (
                <p className="text-xs text-slate-400 mt-1">
                  Dernière vérification :{" "}
                  {new Date(status.last_check).toLocaleString("fr-FR")}
                </p>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

export function IntegrationsTab() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1 font-display">
          Intégrations
        </h2>
        <p className="text-sm text-slate-600">
          État des connexions aux services externes.
        </p>
      </div>

      <IntegrationCard
        name="github"
        label="GitHub"
        icon={GitBranch}
        description="Sync des contributions, repos et activité"
      />

      <IntegrationCard
        name="weather"
        label="Météo"
        icon={Cloud}
        description="API Open-Meteo (pas de clé requise)"
      />
    </div>
  );
}
