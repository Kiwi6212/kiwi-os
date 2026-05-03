"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  type Account,
  type Category,
  type Subscription,
  type SubscriptionCreate,
  type SubscriptionFrequency,
  SUBSCRIPTION_FREQUENCY_LABELS,
} from "@/lib/types/finance";

interface Props {
  onClose: () => void;
  onSubmit: (data: SubscriptionCreate) => Promise<void>;
  accounts: Account[];
  categories: Category[];
  initialSub?: Subscription;
}

const COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
];

function buildInitialForm(sub?: Subscription): SubscriptionCreate {
  return {
    name: sub?.name ?? "",
    amount: sub?.amount ?? 0,
    frequency: sub?.frequency ?? "monthly",
    started_at: sub?.started_at ?? new Date().toISOString().slice(0, 10),
    ended_at: sub?.ended_at ?? null,
    account_id: sub?.account_id ?? null,
    category_id: sub?.category_id ?? null,
    is_active: sub?.is_active ?? true,
    icon: sub?.icon ?? "",
    color: sub?.color ?? COLORS[0],
    notes: sub?.notes ?? "",
  };
}

export function SubscriptionFormModal({
  onClose,
  onSubmit,
  accounts,
  categories,
  initialSub,
}: Props) {
  const [formData, setFormData] = useState(() => buildInitialForm(initialSub));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!initialSub;

  const handleChange = <K extends keyof SubscriptionCreate>(
    field: K,
    value: SubscriptionCreate[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Nom obligatoire");
      return;
    }
    if (formData.amount <= 0) {
      setError("Montant doit être > 0");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        ...formData,
        icon: formData.icon?.trim() || null,
        notes: formData.notes?.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCategories = categories.filter(
    (c) => c.type === "expense" || c.type === "both",
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-800 sticky top-0 bg-slate-900">
          <h2 className="text-lg font-semibold text-slate-100">
            {isEdit ? "Modifier l'abonnement" : "Nouvel abonnement"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
              Nom *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-kiwi-500"
              placeholder="ex: Spotify"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Montant *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.amount}
                onChange={(e) =>
                  handleChange("amount", parseFloat(e.target.value) || 0)
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Fréquence
              </label>
              <select
                value={formData.frequency}
                onChange={(e) =>
                  handleChange(
                    "frequency",
                    e.target.value as SubscriptionFrequency,
                  )
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                {Object.entries(SUBSCRIPTION_FREQUENCY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Date de début *
              </label>
              <input
                type="date"
                required
                value={formData.started_at}
                onChange={(e) => handleChange("started_at", e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Date de fin
              </label>
              <input
                type="date"
                value={formData.ended_at ?? ""}
                onChange={(e) =>
                  handleChange("ended_at", e.target.value || null)
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Compte
              </label>
              <select
                value={formData.account_id ?? ""}
                onChange={(e) =>
                  handleChange(
                    "account_id",
                    e.target.value ? parseInt(e.target.value, 10) : null,
                  )
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                <option value="">Aucun</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Catégorie
              </label>
              <select
                value={formData.category_id ?? ""}
                onChange={(e) =>
                  handleChange(
                    "category_id",
                    e.target.value ? parseInt(e.target.value, 10) : null,
                  )
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                <option value="">Sans catégorie</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon ? `${c.icon} ` : ""}
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-[auto_1fr] gap-4 items-end">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Icône
              </label>
              <input
                type="text"
                maxLength={10}
                value={formData.icon ?? ""}
                onChange={(e) => handleChange("icon", e.target.value)}
                className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 text-center"
                placeholder="🎵"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">
                Couleur
              </label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleChange("color", c)}
                    aria-label={`Couleur ${c}`}
                    className={`w-7 h-7 rounded-lg ring-2 transition-all ${
                      formData.color === c
                        ? "ring-white scale-110"
                        : "ring-transparent"
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sub_active"
              checked={formData.is_active ?? true}
              onChange={(e) => handleChange("is_active", e.target.checked)}
              className="rounded border-slate-700 bg-slate-800"
            />
            <label htmlFor="sub_active" className="text-sm text-slate-300">
              Abonnement actif
            </label>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes ?? ""}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 resize-none"
            />
          </div>

          {error && (
            <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm bg-kiwi-500 hover:bg-kiwi-400 text-white font-medium rounded-lg disabled:opacity-50"
            >
              {submitting ? "..." : isEdit ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
