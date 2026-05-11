"use client";

import { useState } from "react";
import { Edit, Trash2 } from "lucide-react";
import {
  type BudgetWithSpending,
  formatCurrency,
} from "@/lib/types/finance";

interface Props {
  budgets: BudgetWithSpending[];
  onEdit: (budget: BudgetWithSpending) => void;
  onDelete: (budget: BudgetWithSpending) => Promise<void>;
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function periodLabel(b: BudgetWithSpending): string {
  if (b.year === null || b.month === null) return "Récurrent";
  return `${MONTHS_FR[b.month - 1]} ${b.year}`;
}

function barColor(b: BudgetWithSpending): string {
  if (b.is_overspent) return "#f43f5e";
  if (b.percentage_used >= 75) return "#f59e0b";
  return b.category_color || "#10b981";
}

export function BudgetsList({ budgets, onEdit, onDelete }: Props) {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  if (budgets.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-12 text-center">
        <p className="text-slate-500">Aucun budget défini.</p>
        <p className="text-sm text-slate-500 mt-1">
          Définis tes limites pour ne pas exploser tes dépenses.
        </p>
      </div>
    );
  }

  const sorted = [...budgets].sort((a, b) => {
    if (a.is_overspent !== b.is_overspent) return a.is_overspent ? -1 : 1;
    return b.percentage_used - a.percentage_used;
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <ul className="divide-y divide-slate-200">
        {sorted.map((b) => {
          const fillColor = barColor(b);
          const fillWidth = Math.min(100, b.percentage_used);
          const remainingColor = b.is_overspent
            ? "text-rose-600"
            : "text-slate-500";

          return (
            <li
              key={b.id}
              className="px-4 py-4 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">
                      {b.category_icon ?? "📊"}
                    </span>
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {b.category_name}
                    </p>
                    <span className="text-xs text-slate-500">
                      · {periodLabel(b)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span
                    className={`text-sm font-mono tabular-nums ${
                      b.is_overspent ? "text-rose-600" : "text-slate-700"
                    }`}
                  >
                    {b.percentage_used.toFixed(0)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => onEdit(b)}
                    title="Modifier"
                    className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm(`Supprimer le budget ${b.category_name} ?`))
                        return;
                      setDeletingId(b.id);
                      try {
                        await onDelete(b);
                      } finally {
                        setDeletingId(null);
                      }
                    }}
                    disabled={deletingId === b.id}
                    title="Supprimer"
                    className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="h-3 bg-slate-100 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full transition-all"
                  style={{
                    width: `${fillWidth}%`,
                    backgroundColor: fillColor,
                  }}
                />
              </div>

              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="font-mono text-slate-500 tabular-nums">
                  {formatCurrency(b.spent)}{" "}
                  <span className="text-slate-500">/</span>{" "}
                  {formatCurrency(b.monthly_limit)}
                </span>
                <span
                  className={`font-mono tabular-nums ${remainingColor}`}
                >
                  {b.is_overspent
                    ? `${formatCurrency(Math.abs(b.remaining))} dépassés`
                    : `${formatCurrency(b.remaining)} restants`}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
