"use client";

import { useState } from "react";
import { AlertCircle, Calendar, Check, Edit, Trash2 } from "lucide-react";
import {
  type Task,
  type TaskPriority,
  type TaskStatus,
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  STATUS_LABELS,
  SUBTYPE_LABELS,
} from "@/lib/types/task";

interface Props {
  tasks: Task[];
  onUpdate: (id: number, updates: Partial<Task>) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onEdit: (task: Task) => void;
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: "text-slate-500",
  medium: "text-blue-600",
  high: "text-amber-600",
  urgent: "text-rose-600",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: "bg-slate-100 text-slate-700",
  in_progress: "bg-blue-50 text-blue-700",
  done: "bg-emerald-50 text-emerald-700",
};

function formatDeadline(deadline: string | null) {
  if (!deadline) return null;
  const d = new Date(deadline);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffMs < 0) {
    return {
      label: `En retard de ${Math.abs(diffDays)}j`,
      color: "text-rose-600",
      icon: AlertCircle,
    };
  }
  if (diffDays === 0) {
    return { label: "Aujourd'hui", color: "text-amber-600", icon: Calendar };
  }
  if (diffDays === 1) {
    return { label: "Demain", color: "text-amber-600", icon: Calendar };
  }
  if (diffDays <= 7) {
    return {
      label: `Dans ${diffDays}j`,
      color: "text-slate-600",
      icon: Calendar,
    };
  }
  return {
    label: d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" }),
    color: "text-slate-500",
    icon: Calendar,
  };
}

export function TaskTable({ tasks, onUpdate, onDelete, onEdit }: Props) {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <p className="text-slate-600">Aucune tâche pour le moment.</p>
        <p className="text-sm text-slate-500 mt-1">
          Crée ta première tâche pour démarrer.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left text-xs uppercase tracking-wider text-slate-500 px-4 py-3 font-medium">
              Titre
            </th>
            <th className="text-left text-xs uppercase tracking-wider text-slate-500 px-4 py-3 font-medium">
              Catégorie
            </th>
            <th className="text-left text-xs uppercase tracking-wider text-slate-500 px-4 py-3 font-medium">
              Statut
            </th>
            <th className="text-left text-xs uppercase tracking-wider text-slate-500 px-4 py-3 font-medium">
              Priorité
            </th>
            <th className="text-left text-xs uppercase tracking-wider text-slate-500 px-4 py-3 font-medium">
              Deadline
            </th>
            <th className="w-32 px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const deadlineInfo = formatDeadline(task.deadline);
            const DeadlineIcon = deadlineInfo?.icon;

            return (
              <tr
                key={task.id}
                className={`border-b border-slate-100 hover:bg-slate-50 transition-colors last:border-b-0 ${
                  task.status === "done" ? "opacity-60" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex flex-col min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        task.status === "done"
                          ? "line-through text-slate-500"
                          : "text-slate-900"
                      } truncate`}
                    >
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {task.description}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-xs">
                    <p className="text-slate-700">
                      {CATEGORY_LABELS[task.category]}
                    </p>
                    <p className="text-slate-500">
                      {SUBTYPE_LABELS[task.subtype]}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={task.status}
                    onChange={(e) =>
                      onUpdate(task.id, {
                        status: e.target.value as TaskStatus,
                      })
                    }
                    className={`text-xs rounded-full px-2.5 py-1 border border-slate-200 cursor-pointer ${STATUS_COLORS[task.status]}`}
                  >
                    {Object.entries(STATUS_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs font-mono ${PRIORITY_COLORS[task.priority]}`}
                  >
                    {PRIORITY_LABELS[task.priority]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {deadlineInfo && DeadlineIcon ? (
                    <span
                      className={`inline-flex items-center gap-1 text-xs ${deadlineInfo.color}`}
                    >
                      <DeadlineIcon className="h-3 w-3" />
                      {deadlineInfo.label}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {task.status !== "done" && (
                      <button
                        type="button"
                        onClick={() => onUpdate(task.id, { status: "done" })}
                        title="Marquer terminé"
                        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 p-1.5 rounded transition-colors"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onEdit(task)}
                      title="Modifier"
                      className="text-slate-500 hover:text-slate-900 hover:bg-slate-100 p-1.5 rounded transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm(`Supprimer "${task.title}" ?`)) {
                          setDeletingId(task.id);
                          try {
                            await onDelete(task.id);
                          } finally {
                            setDeletingId(null);
                          }
                        }
                      }}
                      disabled={deletingId === task.id}
                      title="Supprimer"
                      className="text-slate-500 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
