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
  medium: "text-blue-400",
  high: "text-amber-400",
  urgent: "text-rose-400",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: "bg-slate-700 text-slate-300",
  in_progress: "bg-blue-500/20 text-blue-300",
  done: "bg-emerald-500/20 text-emerald-300",
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
      color: "text-rose-400",
      icon: AlertCircle,
    };
  }
  if (diffDays === 0) {
    return { label: "Aujourd'hui", color: "text-amber-400", icon: Calendar };
  }
  if (diffDays === 1) {
    return { label: "Demain", color: "text-amber-300", icon: Calendar };
  }
  if (diffDays <= 7) {
    return { label: `Dans ${diffDays}j`, color: "text-slate-400", icon: Calendar };
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
      <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
        <p className="text-slate-500">Aucune tâche pour le moment.</p>
        <p className="text-sm text-slate-600 mt-1">
          Crée ta première tâche pour démarrer.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/30 overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-800 bg-slate-900/50">
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
                className={`border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors ${
                  task.status === "done" ? "opacity-60" : ""
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex flex-col min-w-0">
                    <p
                      className={`text-sm font-medium ${
                        task.status === "done"
                          ? "line-through text-slate-500"
                          : "text-slate-200"
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
                    <p className="text-slate-300">
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
                    className={`text-xs rounded-full px-2.5 py-1 border-0 cursor-pointer ${STATUS_COLORS[task.status]}`}
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
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {task.status !== "done" && (
                      <button
                        type="button"
                        onClick={() => onUpdate(task.id, { status: "done" })}
                        title="Marquer terminé"
                        className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 p-1.5 rounded transition-colors"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onEdit(task)}
                      title="Modifier"
                      className="text-slate-500 hover:text-slate-300 hover:bg-slate-700 p-1.5 rounded transition-colors"
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
                      className="text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 p-1.5 rounded transition-colors disabled:opacity-50"
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
