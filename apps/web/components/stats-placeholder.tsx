"use client";

import { LucideIcon } from "lucide-react";

type PlaceholderItem = {
  label: string;
  description: string;
  icon?: LucideIcon;
};

interface Props {
  title: string;
  source: string;
  sourceStatus: string;
  icon: LucideIcon;
  kpis: PlaceholderItem[];
  charts: PlaceholderItem[];
  details?: PlaceholderItem[];
}

export function StatsPlaceholder({
  title,
  source,
  sourceStatus,
  icon: HeaderIcon,
  kpis,
  charts,
  details,
}: Props) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 overflow-hidden">
      <div className="flex items-center gap-3 p-6 border-b border-slate-800">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-slate-800/50">
          <HeaderIcon className="h-5 w-5 text-slate-400" strokeWidth={1.5} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-200">{title}</h3>
          <p className="text-xs text-slate-500 font-mono">
            Source : {source} · {sourceStatus}
          </p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
          En attente
        </span>
      </div>

      <div className="p-6 space-y-6">
        <PlaceholderSection title="KPIs prévus" items={kpis} cols={4} />
        <PlaceholderSection title="Graphes prévus" items={charts} cols={2} />
        {details && details.length > 0 && (
          <PlaceholderSection title="Détails complémentaires" items={details} cols={2} />
        )}
      </div>
    </div>
  );
}

function PlaceholderSection({
  title,
  items,
  cols,
}: {
  title: string;
  items: PlaceholderItem[];
  cols: 2 | 4;
}) {
  const gridClass =
    cols === 4
      ? "grid grid-cols-2 md:grid-cols-4 gap-3"
      : "grid grid-cols-1 md:grid-cols-2 gap-3";

  return (
    <div>
      <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-3">
        {title}
      </h4>
      <div className={gridClass}>
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={i}
              className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-4"
            >
              <div className="flex items-start gap-2">
                {Icon && (
                  <Icon
                    className="h-4 w-4 text-slate-500 shrink-0 mt-0.5"
                    strokeWidth={1.5}
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-300">{item.label}</p>
                  <p className="text-xs text-slate-500 mt-1">{item.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
