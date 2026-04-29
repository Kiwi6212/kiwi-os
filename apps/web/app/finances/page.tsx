"use client";

import { StatsPlaceholder } from "@/components/stats-placeholder";
import { FINANCES_SPEC } from "@/lib/placeholder-specs";

export default function FinancesPage() {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Finances</h1>
          <p className="text-slate-400 mt-1">
            Vue d&apos;ensemble de tes finances, alimentée par FinTrack.
          </p>
        </div>

        <StatsPlaceholder {...FINANCES_SPEC} />

        <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-6">
          <h3 className="text-sm font-semibold text-slate-200 mb-2">
            À propos de cette page
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            FinTrack est une application web standalone (single file HTML)
            servie sur le port 9999 en local. Cette page sera connectée
            quand l&apos;adapter sera implémenté côté backend Kiwi OS,
            permettant l&apos;import et la synchronisation des données
            financières.
          </p>
        </div>
      </div>
    </div>
  );
}
