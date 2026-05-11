"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  type BudgetCreate,
  type BudgetWithSpending,
  type Category,
} from "@/lib/types/finance";

interface Props {
  onClose: () => void;
  onSubmit: (data: BudgetCreate) => Promise<void>;
  categories: Category[];
  initialBudget?: BudgetWithSpending;
  existingRecurringCategoryIds: number[];
}

const MONTHS_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

type FormState = {
  category_id: number;
  monthly_limit: number;
  isRecurring: boolean;
  year: number;
  month: number;
};

function buildInitialForm(
  budget: BudgetWithSpending | undefined,
  categories: Category[],
): FormState {
  const today = new Date();
  if (budget) {
    return {
      category_id: budget.category_id,
      monthly_limit: budget.monthly_limit,
      isRecurring: budget.year === null && budget.month === null,
      year: budget.year ?? today.getFullYear(),
      month: budget.month ?? today.getMonth() + 1,
    };
  }
  return {
    category_id:
      categories.find((c) => c.type === "expense" || c.type === "both")?.id ??
      0,
    monthly_limit: 100,
    isRecurring: true,
    year: today.getFullYear(),
    month: today.getMonth() + 1,
  };
}

export function BudgetFormModal({
  onClose,
  onSubmit,
  categories,
  initialBudget,
  existingRecurringCategoryIds,
}: Props) {
  const [formData, setFormData] = useState<FormState>(() =>
    buildInitialForm(initialBudget, categories),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!initialBudget;

  const availableCategories = useMemo(() => {
    const expenseCats = categories.filter(
      (c) => c.type === "expense" || c.type === "both",
    );
    if (isEdit) return expenseCats;
    if (!formData.isRecurring) return expenseCats;
    return expenseCats.filter(
      (c) => !existingRecurringCategoryIds.includes(c.id),
    );
  }, [
    categories,
    isEdit,
    formData.isRecurring,
    existingRecurringCategoryIds,
  ]);

  const handleChange = <K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category_id) {
      setError("Catégorie obligatoire");
      return;
    }
    if (formData.monthly_limit <= 0) {
      setError("Limite doit être > 0");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        category_id: formData.category_id,
        monthly_limit: formData.monthly_limit,
        year: formData.isRecurring ? null : formData.year,
        month: formData.isRecurring ? null : formData.month,
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
            {isEdit ? "Modifier le budget" : "Nouveau budget"}
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
              Catégorie *
            </label>
            <select
              required
              value={formData.category_id || ""}
              onChange={(e) =>
                handleChange("category_id", parseInt(e.target.value, 10))
              }
              disabled={isEdit}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 disabled:opacity-60"
            >
              <option value="">Sélectionner...</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.icon ? `${c.icon} ` : ""}
                  {c.name}
                </option>
              ))}
            </select>
            {!isEdit &&
              formData.isRecurring &&
              availableCategories.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Toutes les catégories ont déjà un budget récurrent. Crée un
                  budget spécifique au mois.
                </p>
              )}
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
              Limite mensuelle *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={formData.monthly_limit}
              onChange={(e) =>
                handleChange(
                  "monthly_limit",
                  parseFloat(e.target.value) || 0,
                )
              }
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: true, label: "Récurrent" },
                { value: false, label: "Mois spécifique" },
              ] as const
            ).map((opt) => (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => handleChange("isRecurring", opt.value)}
                disabled={isEdit}
                className={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors disabled:opacity-60 ${
                  formData.isRecurring === opt.value
                    ? "bg-emerald-100 border-emerald-400 text-kiwi-300"
                    : "bg-slate-100 border-slate-300 text-slate-500 hover:text-slate-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {!formData.isRecurring && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                  Mois
                </label>
                <select
                  value={formData.month}
                  onChange={(e) =>
                    handleChange("month", parseInt(e.target.value, 10))
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900"
                >
                  {MONTHS_FR.map((label, i) => (
                    <option key={i + 1} value={i + 1}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                  Année
                </label>
                <input
                  type="number"
                  min={2000}
                  max={2100}
                  value={formData.year}
                  onChange={(e) =>
                    handleChange("year", parseInt(e.target.value, 10) || 0)
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono"
                />
              </div>
            </div>
          )}

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
