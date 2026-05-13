"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, RefreshCw } from "lucide-react";
import { authFetch } from "@/lib/auth-fetch";

import { BioTab } from "@/components/portfolio/bio-tab";
import {
  PortfolioLayout,
  type PortfolioTab,
} from "@/components/portfolio/portfolio-layout";
import { ProjectsTab } from "@/components/portfolio/projects-tab";
import { API_BASE } from "@/lib/api";
import type {
  PortfolioBio,
  PortfolioProject,
} from "@/lib/types/portfolio";

export default function PortfolioEditorPage() {
  const [bio, setBio] = useState<PortfolioBio | null>(null);
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshProjects = useCallback(
    () => setRefreshKey((k) => k + 1),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [bioRes, projectsRes] = await Promise.all([
          authFetch(`/api/portfolio/bio`),
          authFetch(`/api/portfolio/projects`),
        ]);
        if (!bioRes.ok || !projectsRes.ok) {
          throw new Error("Erreur de chargement");
        }
        const bioData = (await bioRes.json()) as PortfolioBio;
        const projectsData = (await projectsRes.json()) as PortfolioProject[];
        if (!cancelled) {
          setBio(bioData);
          setProjects(projectsData);
        }
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
  }, [refreshKey]);

  const handleSync = async () => {
    if (
      !confirm(
        "Lancer la sync depuis GitHub ? Les nouveaux repos seront ajoutés (cachés par défaut).",
      )
    ) {
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/portfolio/projects/sync-github`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        created: number;
        updated: number;
        total_repos: number;
      };
      alert(
        `Sync terminée : ${data.created} créés, ${data.updated} mis à jour (sur ${data.total_repos} repos).`,
      );
      refreshProjects();
    } catch (e) {
      alert(
        `Erreur sync : ${e instanceof Error ? e.message : "Erreur réseau"}`,
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 font-display">
              Portfolio
            </h1>
            <p className="text-slate-600 mt-1">
              Édite ta vitrine publique : bio, projets, compétences.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 disabled:opacity-50 transition-colors"
            >
              <RefreshCw
                className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`}
                strokeWidth={2}
              />
              {syncing ? "Sync..." : "Sync GitHub"}
            </button>
            <Link
              href="/portfolio-public"
              target="_blank"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
            >
              <ExternalLink className="h-4 w-4" strokeWidth={2} />
              Voir la version publique
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-slate-500 text-sm">Chargement...</div>
        ) : error || !bio ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Erreur de chargement
            {error ? ` : ${error}` : "."}
          </div>
        ) : (
          <PortfolioLayout>
            {(activeTab: PortfolioTab) => {
              if (activeTab === "bio") {
                return <BioTab bio={bio} onUpdate={setBio} />;
              }
              if (activeTab === "projects") {
                return (
                  <ProjectsTab
                    projects={projects}
                    onRefresh={refreshProjects}
                  />
                );
              }
              return null;
            }}
          </PortfolioLayout>
        )}
      </div>
    </div>
  );
}
