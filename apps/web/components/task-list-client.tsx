"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ListChecks,
  type LucideIcon,
  Plus,
} from "lucide-react";
import { TaskTable } from "./task-table";
import { TaskFormModal, type TaskFormData } from "./task-form-modal";
import { PomodoroWidget } from "./pomodoro-widget";
import { TimeEntriesHistory } from "./time-entries-history";
import {
  type Task,
  type TaskCategory,
  type TaskStats,
  type TaskStatus,
  CATEGORY_LABELS,
  STATUS_LABELS,
} from "@/lib/types/task";

const API_BASE = "http://localhost:8000";

export function TaskListClient() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterCategory, setFilterCategory] = useState<TaskCategory | "all">(
    "all",
  );
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");

  const [refreshKey, setRefreshKey] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const params = new URLSearchParams();
        if (filterCategory !== "all") params.set("category", filterCategory);
        if (filterStatus !== "all") params.set("status", filterStatus);
        const url = `${API_BASE}/api/tasks${
          params.toString() ? "?" + params.toString() : ""
        }`;

        const [tasksRes, statsRes] = await Promise.all([
          fetch(url),
          fetch(`${API_BASE}/api/tasks/stats`),
        ]);

        if (cancelled) return;
        if (!tasksRes.ok) throw new Error(`Erreur ${tasksRes.status}`);

        const tasksData = (await tasksRes.json()) as Task[];
        const statsData = statsRes.ok
          ? ((await statsRes.json()) as TaskStats)
          : null;

        if (cancelled) return;

        setTasks(tasksData);
        if (statsData) setStats(statsData);
        setError(null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Erreur de chargement",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filterCategory, filterStatus, refreshKey]);

  const triggerRefresh = () => setRefreshKey((k) => k + 1);

  const handleCreate = async (data: TaskFormData) => {
    const res = await fetch(`${API_BASE}/api/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Erreur ${res.status}`);
    triggerRefresh();
  };

  const handleUpdate = async (id: number, updates: Partial<Task>) => {
    const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`Erreur ${res.status}`);
    triggerRefresh();
  };

  const handleEdit = async (data: TaskFormData) => {
    if (!editingTask) return;
    await handleUpdate(editingTask.id, data as Partial<Task>);
  };

  const handleDelete = async (id: number) => {
    const res = await fetch(`${API_BASE}/api/tasks/${id}`, {
      method: "DELETE",
    });
    if (!res.ok && res.status !== 204) throw new Error(`Erreur ${res.status}`);
    triggerRefresh();
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(null);
  };

  return (
    <div className="space-y-6">
      <PomodoroWidget
        tasks={tasks}
        onSessionEnd={() => setRefreshKey((k) => k + 1)}
      />

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Total"
            value={stats.total}
            icon={ListChecks}
            color="text-slate-700"
          />
          <KpiCard
            label="En cours"
            value={stats.by_status.in_progress + stats.by_status.todo}
            icon={Calendar}
            color="text-blue-600"
          />
          <KpiCard
            label="Faites cette semaine"
            value={stats.completed_this_week}
            icon={CheckCircle2}
            color="text-emerald-600"
          />
          <KpiCard
            label="En retard"
            value={stats.overdue}
            icon={AlertTriangle}
            color={stats.overdue > 0 ? "text-rose-600" : "text-slate-500"}
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterCategory}
            onChange={(e) =>
              setFilterCategory(e.target.value as TaskCategory | "all")
            }
            className="text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">Toutes catégories</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) =>
              setFilterStatus(e.target.value as TaskStatus | "all")
            }
            className="text-sm bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">Tous statuts</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <p className="text-sm text-slate-500 ml-2">
            {tasks.length} tâche{tasks.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingTask(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nouvelle tâche
        </button>
      </div>

      {loading ? (
        <div className="text-slate-500 text-sm py-8 text-center">
          Chargement des tâches...
        </div>
      ) : error ? (
        <div className="text-rose-600 text-sm py-8 text-center bg-rose-50 border border-rose-200 rounded-2xl">
          {error}
        </div>
      ) : (
        <TaskTable
          tasks={tasks}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onEdit={openEditModal}
        />
      )}

      <TimeEntriesHistory
        tasks={tasks}
        refreshKey={refreshKey}
        onChange={triggerRefresh}
      />

      {isModalOpen && (
        <TaskFormModal
          key={editingTask?.id ?? "new"}
          isOpen
          onClose={closeModal}
          onSubmit={editingTask ? handleEdit : handleCreate}
          initialTask={editingTask ?? undefined}
        />
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${color}`} strokeWidth={1.5} />
        <p className="text-xs uppercase tracking-wider text-slate-500">
          {label}
        </p>
      </div>
      <p className={`font-mono text-3xl font-semibold tabular-nums ${color}`}>
        {value}
      </p>
    </div>
  );
}
