"use client";

import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import type { Account, TransferCreate } from "@/lib/types/finance";

interface Props {
  onClose: () => void;
  onSubmit: (data: TransferCreate) => Promise<void>;
  accounts: Account[];
}

function buildInitialForm(accounts: Account[]): TransferCreate {
  return {
    from_account_id: accounts[0]?.id ?? 0,
    to_account_id: accounts[1]?.id ?? 0,
    date: new Date().toISOString().slice(0, 10),
    amount: 0,
    description: "",
    notes: null,
  };
}

export function TransferModal({ onClose, onSubmit, accounts }: Props) {
  const [formData, setFormData] = useState(() => buildInitialForm(accounts));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = <K extends keyof TransferCreate>(
    field: K,
    value: TransferCreate[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.from_account_id || !formData.to_account_id) {
      setError("Sélectionne les deux comptes");
      return;
    }
    if (formData.from_account_id === formData.to_account_id) {
      setError("Les comptes source et destination doivent être différents");
      return;
    }
    if (formData.amount <= 0) {
      setError("Montant doit être > 0");
      return;
    }
    if (!formData.description.trim()) {
      setError("Description obligatoire");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        ...formData,
        notes: formData.notes?.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setSubmitting(false);
    }
  };

  const toAccounts = accounts.filter(
    (a) => a.id !== formData.from_account_id,
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-800 w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">
            Nouveau virement
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
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Depuis *
              </label>
              <select
                required
                value={formData.from_account_id}
                onChange={(e) =>
                  handleChange(
                    "from_account_id",
                    parseInt(e.target.value, 10),
                  )
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                <option value={0}>Sélectionner...</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-500 mb-2.5" />
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Vers *
              </label>
              <select
                required
                value={formData.to_account_id}
                onChange={(e) =>
                  handleChange("to_account_id", parseInt(e.target.value, 10))
                }
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                <option value={0}>Sélectionner...</option>
                {toAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
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
                Date *
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => handleChange("date", e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
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
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200"
              placeholder="ex: Virement épargne"
            />
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
              {submitting ? "..." : "Effectuer le virement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
