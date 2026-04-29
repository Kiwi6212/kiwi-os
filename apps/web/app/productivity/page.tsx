"use client";

import { StatsPlaceholder } from "@/components/stats-placeholder";
import { PRODUCTIVITY_SPEC } from "@/lib/placeholder-specs";

export default function ProductivityPage() {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Productivité</h1>
          <p className="text-slate-400 mt-1">
            Tes tâches, pointages et interventions, alimentés par WorkBoard.
          </p>
        </div>

        <StatsPlaceholder {...PRODUCTIVITY_SPEC} />

        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-2">
            À propos de cette page
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            WorkBoard est un dashboard intranet hébergé sur le VPS
            (port 8081), exposant un MCP server à mcp.myjobhunter.fr.
            Cette page sera connectée quand l&apos;adapter sera
            implémenté, permettant la centralisation de tes tâches,
            pointages et interventions IT.
          </p>
        </div>
      </div>
    </div>
  );
}
