"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  type Task,
  type TaskCategory,
  type TaskPriority,
  type TaskStatus,
  type TaskSubtype,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  SUBTYPE_LABELS,
  SUBTYPES_BY_CATEGORY,
} from "@/lib/types/task";

export type TaskFormData = {
  title: string;
  description?: string;
  category: TaskCategory;
  subtype: TaskSubtype;
  status: TaskStatus;
  priority: TaskPriority;
  deadline?: string;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TaskFormData) => Promise<void>;
  initialTask?: Task;
}

const INITIAL_FORM: TaskFormData = {
  title: "",
  description: "",
  category: "personal",
  subtype: "personal_todo",
  status: "todo",
  priority: "medium",
  deadline: "",
};

function buildInitialForm(initialTask: Task | undefined): TaskFormData {
  if (!initialTask) return INITIAL_FORM;
  return {
    title: initialTask.title,
    description: initialTask.description ?? "",
    category: initialTask.category,
    subtype: initialTask.subtype,
    status: initialTask.status,
    priority: initialTask.priority,
    deadline: initialTask.deadline ? initialTask.deadline.slice(0, 16) : "",
  };
}

export function TaskFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialTask,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<TaskFormData>(() =>
    buildInitialForm(initialTask),
  );

  if (!isOpen) return null;

  const handleChange = <K extends keyof TaskFormData>(
    field: K,
    value: TaskFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCategoryChange = (newCategory: TaskCategory) => {
    const validSubtypes = SUBTYPES_BY_CATEGORY[newCategory];
    setFormData((prev) => ({
      ...prev,
      category: newCategory,
      subtype: validSubtypes.includes(prev.subtype)
        ? prev.subtype
        : validSubtypes[0],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError("Le titre est obligatoire");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const cleaned: TaskFormData = { ...formData };
      if (cleaned.deadline) {
        cleaned.deadline = new Date(cleaned.deadline).toISOString();
      } else {
        delete cleaned.deadline;
      }
      if (!cleaned.description?.trim()) {
        delete cleaned.description;
      }

      await onSubmit(cleaned);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de la sauvegarde",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const availableSubtypes = SUBTYPES_BY_CATEGORY[formData.category];
  const isEdit = !!initialTask;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-slate-900">
            {isEdit ? "Modifier la tâche" : "Nouvelle tâche"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 p-1"
            disabled={submitting}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
              Titre *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder="ex: TP Cisco - sécurisation switch"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description ?? ""}
              onChange={(e) => handleChange("description", e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 resize-none"
              placeholder="Détails, ressources, liens..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Catégorie
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  handleCategoryChange(e.target.value as TaskCategory)
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Sous-type
              </label>
              <select
                value={formData.subtype}
                onChange={(e) =>
                  handleChange("subtype", e.target.value as TaskSubtype)
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                {availableSubtypes.map((s) => (
                  <option key={s} value={s}>
                    {SUBTYPE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Statut
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  handleChange("status", e.target.value as TaskStatus)
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                Priorité
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  handleChange("priority", e.target.value as TaskPriority)
                }
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
              Deadline
            </label>
            <input
              type="datetime-local"
              value={formData.deadline ?? ""}
              onChange={(e) => handleChange("deadline", e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
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
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-900 transition-colors disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {submitting
                ? isEdit
                  ? "Modification..."
                  : "Création..."
                : isEdit
                  ? "Enregistrer"
                  : "Créer la tâche"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
