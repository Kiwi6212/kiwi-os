"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  type Account,
  type Category,
  type Transaction,
  type TransactionCreate,
  TRANSACTION_TYPE_LABELS,
} from "@/lib/types/finance";

interface Props {
  onClose: () => void;
  onSubmit: (data: TransactionCreate) => Promise<void>;
  accounts: Account[];
  categories: Category[];
  initialTransaction?: Transaction;
  defaultAccountId?: number;
}

function buildInitialForm(
  tx: Transaction | undefined,
  defaultAccountId: number | undefined,
  accounts: Account[],
): TransactionCreate {
  const accountId =
    tx?.account_id ?? defaultAccountId ?? accounts[0]?.id ?? 0;
  return {
    account_id: accountId,
    category_id: tx?.category_id ?? null,
    date: tx?.date ?? new Date().toISOString().slice(0, 10),
    amount: tx ? Math.abs(tx.amount) : 0,
    description: tx?.description ?? "",
    merchant: tx?.merchant ?? "",
    type: tx?.type === "transfer" ? "expense" : (tx?.type ?? "expense"),
    tags: tx?.tags ?? null,
    notes: tx?.notes ?? null,
  };
}

export function TransactionFormModal({
  onClose,
  onSubmit,
  accounts,
  categories,
  initialTransaction,
  defaultAccountId,
}: Props) {
  const [formData, setFormData] = useState(() =>
    buildInitialForm(initialTransaction, defaultAccountId, accounts),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!initialTransaction;

  const handleChange = <K extends keyof TransactionCreate>(
    field: K,
    value: TransactionCreate[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      setError("Description obligatoire");
      return;
    }
    if (formData.amount <= 0) {
      setError("Montant doit être > 0");
      return;
    }
    if (!formData.account_id) {
      setError("Compte obligatoire");
      return;
    }

    setSubmitting(true);
    setError(null);

    const signedAmount =
      formData.type === "expense"
        ? -Math.abs(formData.amount)
        : Math.abs(formData.amount);

    try {
      await onSubmit({
        ...formData,
        amount: signedAmount,
        merchant: formData.merchant?.trim() || null,
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
    (c) =>
      c.type === "both" ||
      (formData.type === "expense" && c.type === "expense") ||
      (formData.type === "income" && c.type === "income"),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEdit ? "Modifier la transaction" : "Nouvelle transaction"}
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
          <div className="grid grid-cols-2 gap-2">
            {(["expense", "income"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => handleChange("type", t)}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  formData.type === t
                    ? t === "expense"
                      ? "bg-rose-100 border-rose-500/50 text-rose-600"
                      : "bg-emerald-100 border-emerald-500/50 text-emerald-700"
                    : "bg-slate-100 border-slate-300 text-slate-500 hover:text-slate-900"
                }`}
              >
                {TRANSACTION_TYPE_LABELS[t]}
              </button>
            ))}
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
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => handleChange("date", e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
              Description *
            </label>
            <input
              type="text"
              required
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900"
              placeholder="ex: Courses Carrefour"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
              Marchand
            </label>
            <input
              type="text"
              value={formData.merchant ?? ""}
              onChange={(e) => handleChange("merchant", e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900"
              placeholder="ex: Carrefour"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Compte *
              </label>
              <select
                required
                value={formData.account_id}
                onChange={(e) =>
                  handleChange("account_id", parseInt(e.target.value, 10))
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900"
              >
                <option value={0}>Sélectionner...</option>
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
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900"
              >
                <option value="">Sans catégorie</option>
                {filteredCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              value={formData.notes ?? ""}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 resize-none"
            />
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
