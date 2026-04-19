function StatusBadge({
  label,
  status,
  value,
}: {
  label: string;
  status?: string;
  value?: string;
}) {
  const isUp = status === "up" || status === "ok";
  const color = isUp ? "bg-kiwi-500" : value ? "bg-slate-500" : "bg-rose-500";

  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-800/50 px-4 py-3">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      <div className="flex flex-col">
        <span className="text-xs text-slate-400 uppercase tracking-wide">
          {label}
        </span>
        <span className="text-sm font-mono text-slate-200">
          {value || status || "unknown"}
        </span>
      </div>
    </div>
  );
}

type HealthResponse = {
  status: string;
  version: string;
  postgres: string;
  redis: string;
};

async function getApiHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch("http://localhost:8000/health", {
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as HealthResponse;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const health = await getApiHealth();

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-kiwi-500 mb-2">🥝 Accueil</h1>
        <p className="text-slate-400 mb-8">Phase 1 — scaffolding</p>

        <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-200 mb-4">
            API Status
          </h2>
          {health ? (
            <div className="grid grid-cols-2 gap-4">
              <StatusBadge label="API" status="up" />
              <StatusBadge label="Version" value={health.version} />
              <StatusBadge label="Postgres" status={health.postgres} />
              <StatusBadge label="Redis" status={health.redis} />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-500" />
              <span>Backend unreachable on localhost:8000</span>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-8">
          <p className="text-slate-300">
            Bienvenue sur Kiwi OS. L&apos;Accueil agrégera bientôt les KPIs
            des 4 autres espaces, plus des widgets Vie &amp; Bien-être.
          </p>
        </div>
      </div>
    </div>
  );
}
