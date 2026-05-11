"use client";

import { useState } from "react";
import { Edit, Power, Trash2 } from "lucide-react";
import {
  type Account,
  type Category,
  type Subscription,
  SUBSCRIPTION_FREQUENCY_LABELS,
  formatCurrency,
  formatDate,
} from "@/lib/types/finance";

interface Props {
  subscriptions: Subscription[];
  accounts: Account[];
  categories: Category[];
  onEdit: (sub: Subscription) => void;
  onToggle: (sub: Subscription) => Promise<void> | void;
  onDelete: (sub: Subscription) => Promise<void>;
}

export function SubscriptionsList({
  subscriptions,
  accounts,
  categories,
  onEdit,
  onToggle,
  onDelete,
}: Props) {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  if (subscriptions.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-12 text-center">
        <p className="text-slate-500">Aucun abonnement pour le moment.</p>
        <p className="text-sm text-slate-500 mt-1">
          Ajoute Spotify, Netflix, Free, etc.
        </p>
      </div>
    );
  }

  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {subscriptions.map((sub) => {
        const cat = sub.category_id ? categoryById.get(sub.category_id) : null;
        const account = sub.account_id
          ? accountById.get(sub.account_id)
          : null;
        const displayIcon = sub.icon || cat?.icon || "📺";
        const displayColor = sub.color || cat?.color || "#6366f1";
        const inactive = !sub.is_active;

        return (
          <div
            key={sub.id}
            className={`relative rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:-translate-y-0.5 hover:border-slate-300 ${
              inactive ? "opacity-50" : ""
            }`}
          >
            <div
              className="absolute left-0 top-0 bottom-0 w-1"
              style={{ backgroundColor: displayColor }}
            />
            <div className="p-5 pl-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-lg">{displayIcon}</span>
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {sub.name}
                    </p>
                    {inactive && (
                      <span className="text-[10px] uppercase tracking-wider text-slate-500 px-1.5 py-0.5 rounded bg-slate-100">
                        Inactif
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">
                    {SUBSCRIPTION_FREQUENCY_LABELS[sub.frequency]}
                    {account ? ` · ${account.name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onEdit(sub)}
                    title="Modifier"
                    className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded transition-colors"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggle(sub)}
                    title={inactive ? "Activer" : "Désactiver"}
                    className={`p-1.5 rounded transition-colors ${
                      inactive
                        ? "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                        : "text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                    }`}
                  >
                    <Power className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm(`Supprimer "${sub.name}" ?`)) return;
                      setDeletingId(sub.id);
                      try {
                        await onDelete(sub);
                      } finally {
                        setDeletingId(null);
                      }
                    }}
                    disabled={deletingId === sub.id}
                    title="Supprimer"
                    className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-baseline gap-2 mb-1">
                <p className="font-mono text-2xl font-semibold tabular-nums text-slate-900">
                  {formatCurrency(sub.amount)}
                </p>
                <span className="text-xs text-slate-500">
                  /{" "}
                  {sub.frequency === "weekly"
                    ? "sem."
                    : sub.frequency === "monthly"
                      ? "mois"
                      : sub.frequency === "quarterly"
                        ? "trim."
                        : "an"}
                </span>
              </div>
              {sub.frequency !== "monthly" && sub.is_active && (
                <p className="text-xs text-slate-500 font-mono">
                  ≈ {formatCurrency(sub.monthly_cost)}/mois
                </p>
              )}
              {sub.next_billing_date && sub.is_active && (
                <p className="text-xs text-slate-500 mt-2">
                  Prochaine échéance :{" "}
                  <span className="text-slate-700 font-mono">
                    {formatDate(sub.next_billing_date)}
                  </span>
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
