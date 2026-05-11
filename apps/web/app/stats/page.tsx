import { StatsClient } from "@/components/stats-client";

export default function StatsPage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Statistiques</h1>
          <p className="text-slate-500 mt-1">
            Analytics croisés sur Job Search et GitHub.
          </p>
        </div>
        <StatsClient />
      </div>
    </div>
  );
}
