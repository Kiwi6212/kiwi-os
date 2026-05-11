"use client";

import { useState } from "react";
import { X } from "lucide-react";

const STATUSES = [
  "New",
  "Applied",
  "Followed up",
  "Interview",
  "Accepted",
  "Rejected",
  "No response",
  "Dismissed",
];

const CONTRACT_TYPES = [
  "Alternance",
  "CDI",
  "CDD",
  "Stage",
  "Freelance",
  "Other",
];

export type ApplicationFormData = {
  company: string;
  position: string;
  url?: string;
  location?: string;
  contract_type?: string;
  salary_min?: number;
  salary_max?: number;
  status: string;
  cv_sent: boolean;
  follow_up_done: boolean;
  is_favorite: boolean;
  date_applied?: string;
  follow_up_date?: string;
  last_contact?: string;
  notes?: string;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ApplicationFormData) => Promise<void>;
}

const INITIAL_FORM: ApplicationFormData = {
  company: "",
  position: "",
  status: "New",
  cv_sent: false,
  follow_up_done: false,
  is_favorite: false,
};

export function ApplicationFormModal({ isOpen, onClose, onSubmit }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<ApplicationFormData>(INITIAL_FORM);

  if (!isOpen) return null;

  function handleChange<K extends keyof ApplicationFormData>(
    field: K,
    value: ApplicationFormData[K],
  ) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.company.trim() || !formData.position.trim()) {
      setError("Entreprise et poste sont obligatoires");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const cleaned: Record<string, unknown> = { ...formData };
      Object.keys(cleaned).forEach((key) => {
        if (cleaned[key] === "" || cleaned[key] === undefined) {
          delete cleaned[key];
        }
      });

      await onSubmit(cleaned as ApplicationFormData);

      setFormData(INITIAL_FORM);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la création");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-slate-900">
            Nouvelle candidature
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 p-1"
            disabled={submitting}
            aria-label="Fermer"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Entreprise *
              </label>
              <input
                type="text"
                required
                value={formData.company}
                onChange={(e) => handleChange("company", e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="ex: Anthropic"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Poste *
              </label>
              <input
                type="text"
                required
                value={formData.position}
                onChange={(e) => handleChange("position", e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="ex: Software Engineer Intern"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                URL de l&apos;offre
              </label>
              <input
                type="url"
                value={formData.url ?? ""}
                onChange={(e) => handleChange("url", e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="https://..."
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Lieu
              </label>
              <input
                type="text"
                value={formData.location ?? ""}
                onChange={(e) => handleChange("location", e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                placeholder="ex: Paris / Remote"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Type de contrat
              </label>
              <select
                value={formData.contract_type ?? ""}
                onChange={(e) =>
                  handleChange("contract_type", e.target.value || undefined)
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">—</option>
                {CONTRACT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Statut
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Salaire min (€)
              </label>
              <input
                type="number"
                min="0"
                value={formData.salary_min ?? ""}
                onChange={(e) =>
                  handleChange(
                    "salary_min",
                    e.target.value ? parseInt(e.target.value, 10) : undefined,
                  )
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Salaire max (€)
              </label>
              <input
                type="number"
                min="0"
                value={formData.salary_max ?? ""}
                onChange={(e) =>
                  handleChange(
                    "salary_max",
                    e.target.value ? parseInt(e.target.value, 10) : undefined,
                  )
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Date postulé
              </label>
              <input
                type="date"
                value={formData.date_applied ?? ""}
                onChange={(e) =>
                  handleChange("date_applied", e.target.value || undefined)
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Date relance
              </label>
              <input
                type="date"
                value={formData.follow_up_date ?? ""}
                onChange={(e) =>
                  handleChange("follow_up_date", e.target.value || undefined)
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Dernier contact
              </label>
              <input
                type="date"
                value={formData.last_contact ?? ""}
                onChange={(e) =>
                  handleChange("last_contact", e.target.value || undefined)
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
              Notes
            </label>
            <textarea
              rows={3}
              value={formData.notes ?? ""}
              onChange={(e) => handleChange("notes", e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none"
              placeholder="Contexte, contact, retours d'entretien..."
            />
          </div>

          <div className="flex gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.cv_sent}
                onChange={(e) => handleChange("cv_sent", e.target.checked)}
                className="rounded border-slate-200 bg-slate-50 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-700">CV envoyé</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.follow_up_done}
                onChange={(e) =>
                  handleChange("follow_up_done", e.target.checked)
                }
                className="rounded border-slate-200 bg-slate-50 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm text-slate-700">Relance faite</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_favorite}
                onChange={(e) =>
                  handleChange("is_favorite", e.target.checked)
                }
                className="rounded border-slate-200 bg-slate-50 text-amber-600 focus:ring-amber-400"
              />
              <span className="text-sm text-slate-700">Favori</span>
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
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-900 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting ? "Création..." : "Créer la candidature"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
