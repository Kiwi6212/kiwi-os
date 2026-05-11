import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { LogStatsCards } from "@/components/log-stats-cards";
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

        <section className="space-y-4 mt-12">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2 font-display">
                <FileText
                  className="h-6 w-6 text-slate-700"
                  strokeWidth={1.5}
                />
                Système
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Logs HTTP et appels externes des dernières 24h.
              </p>
            </div>
            <Link
              href="/settings"
              className="inline-flex items-center gap-1 text-sm text-emerald-700 hover:text-emerald-800 font-medium shrink-0"
            >
              Voir tous les logs
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </div>

          <LogStatsCards />
        </section>
      </div>
    </div>
  );
}
