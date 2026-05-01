import { TaskListClient } from "@/components/task-list-client";

export default function ProductivityPage() {
  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Productivité</h1>
          <p className="text-slate-400 mt-1">
            Gère tes tâches école et perso, suis ton temps de travail.
          </p>
        </div>

        <TaskListClient />
      </div>
    </div>
  );
}
