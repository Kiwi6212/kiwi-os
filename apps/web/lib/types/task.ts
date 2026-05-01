export type TaskCategory = "school" | "personal";

export type TaskSubtype =
  | "tp"
  | "homework"
  | "school_project"
  | "exam"
  | "side_project"
  | "personal_todo"
  | "admin"
  | "learning"
  | "other";

export type TaskStatus = "todo" | "in_progress" | "done";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type Task = {
  id: number;
  title: string;
  description: string | null;
  category: TaskCategory;
  subtype: TaskSubtype;
  status: TaskStatus;
  priority: TaskPriority;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

export type TaskCreate = Omit<
  Task,
  "id" | "created_at" | "updated_at" | "completed_at"
>;

export type TaskUpdate = Partial<TaskCreate>;

export type TaskStats = {
  total: number;
  by_status: Record<TaskStatus, number>;
  by_category: Record<TaskCategory, number>;
  overdue: number;
  completed_this_week: number;
};

export const CATEGORY_LABELS: Record<TaskCategory, string> = {
  school: "École",
  personal: "Perso",
};

export const SUBTYPE_LABELS: Record<TaskSubtype, string> = {
  tp: "TP",
  homework: "Devoir",
  school_project: "Projet école",
  exam: "Examen",
  side_project: "Side project",
  personal_todo: "TODO",
  admin: "Admin",
  learning: "Apprentissage",
  other: "Autre",
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "À faire",
  in_progress: "En cours",
  done: "Terminé",
};

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

export const SUBTYPES_BY_CATEGORY: Record<TaskCategory, TaskSubtype[]> = {
  school: ["tp", "homework", "school_project", "exam", "other"],
  personal: ["side_project", "personal_todo", "admin", "learning", "other"],
};
