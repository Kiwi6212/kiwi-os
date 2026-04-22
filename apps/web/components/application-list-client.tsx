"use client";

import { useEffect, useState } from "react";

import {
  ApplicationTable,
  type Application,
} from "./application-table";

async function loadApplications(): Promise<
  { ok: true; data: Application[] } | { ok: false; error: string }
> {
  try {
    const res = await fetch(
      "http://localhost:8000/api/applications?limit=200",
    );
    if (!res.ok) {
      return { ok: false, error: "Erreur chargement candidatures" };
    }
    const data = (await res.json()) as Application[];
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Backend injoignable" };
  }
}

export function ApplicationListClient() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const result = await loadApplications();
    if (result.ok) {
      setApplications(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      await Promise.resolve();
      if (cancelled) return;
      const result = await loadApplications();
      if (cancelled) return;
      if (result.ok) {
        setApplications(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleUpdate(id: number, patch: Partial<Application>) {
    try {
      const res = await fetch(
        `http://localhost:8000/api/applications/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        },
      );
      if (res.ok) {
        await refresh();
      }
    } catch {
      // silent fail
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch(
        `http://localhost:8000/api/applications/${id}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        setApplications((prev) => prev.filter((a) => a.id !== id));
      }
    } catch {
      // silent fail
    }
  }

  if (loading) {
    return <div className="text-sm text-slate-500 py-4">Chargement…</div>;
  }

  if (error) {
    return <div className="text-sm text-rose-400 py-4">{error}</div>;
  }

  return (
    <ApplicationTable
      applications={applications}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
    />
  );
}
