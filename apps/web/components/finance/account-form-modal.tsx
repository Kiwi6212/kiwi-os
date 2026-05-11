"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  type Account,
  type AccountCreate,
  type AccountType,
  ACCOUNT_TYPE_ICONS,
  ACCOUNT_TYPE_LABELS,
} from "@/lib/types/finance";

interface Props {
  onClose: () => void;
  onSubmit: (data: AccountCreate) => Promise<void>;
  initialAccount?: Account;
}

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
];

function buildInitialForm(account?: Account): AccountCreate {
  return {
    name: account?.name ?? "",
    type: account?.type ?? "checking",
    institution: account?.institution ?? "",
    currency: account?.currency ?? "EUR",
    initial_balance: account?.initial_balance ?? 0,
    color: account?.color ?? COLORS[0],
    is_active: account?.is_active ?? true,
  };
}

export function AccountFormModal({ onClose, onSubmit, initialAccount }: Props) {
  const [formData, setFormData] = useState(() =>
    buildInitialForm(initialAccount),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!initialAccount;

  const handleChange = <K extends keyof AccountCreate>(
    field: K,
    value: AccountCreate[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setError("Le nom est obligatoire");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        ...formData,
        institution: formData.institution?.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEdit ? "Modifier le compte" : "Nouveau compte"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 p-1"
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
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="ex: LCL Compte courant"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleChange("type", e.target.value as AccountType)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900"
            >
              {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {ACCOUNT_TYPE_ICONS[k as AccountType]} {v}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Banque
              </label>
              <input
                type="text"
                value={formData.institution ?? ""}
                onChange={(e) => handleChange("institution", e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900"
                placeholder="LCL, BNP, etc."
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Solde initial
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.initial_balance}
                onChange={(e) =>
                  handleChange(
                    "initial_balance",
                    parseFloat(e.target.value) || 0,
                  )
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono"
              />
            </div>
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
                  className={`w-8 h-8 rounded-lg ring-2 transition-all ${
                    formData.color === c
                      ? "ring-white scale-110"
                      : "ring-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleChange("is_active", e.target.checked)}
              className="rounded border-slate-200 bg-slate-50"
            />
            <label htmlFor="is_active" className="text-sm text-slate-700">
              Compte actif
            </label>
          </div>

          {error && (
            <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-900 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg disabled:opacity-50"
            >
              {submitting ? "..." : isEdit ? "Enregistrer" : "Créer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
