"use client";

import { ExternalLink, MapPin, Star, Trash2 } from "lucide-react";

export type Application = {
  id: number;
  company: string;
  position: string;
  url: string | null;
  location: string | null;
  contract_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  status: string;
  cv_sent: boolean;
  follow_up_done: boolean;
  is_favorite: boolean;
  date_applied: string | null;
  follow_up_date: string | null;
  last_contact: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const STATUS_OPTIONS = [
  "New",
  "Applied",
  "Followed up",
  "Interview",
  "Accepted",
  "Rejected",
  "No response",
  "Dismissed",
];

const STATUS_COLORS: Record<string, string> = {
  New: "bg-slate-100 text-slate-700",
  Applied: "bg-blue-50 text-blue-700",
  "Followed up": "bg-cyan-50 text-cyan-700",
  Interview: "bg-violet-50 text-violet-700",
  Accepted: "bg-emerald-50 text-emerald-700",
  Rejected: "bg-rose-50 text-rose-700",
  "No response": "bg-slate-100 text-slate-500",
  Dismissed: "bg-slate-100 text-slate-500",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

export function ApplicationTable({
  applications,
  onUpdate,
  onDelete,
}: {
  applications: Application[];
  onUpdate: (id: number, patch: Partial<Application>) => void;
  onDelete: (id: number) => void;
}) {
  if (applications.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        Aucune candidature. Utilise Claude in Chrome + MCP pour en ajouter.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-slate-50">
          <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-200">
            <th className="text-left py-3 px-2 w-8"></th>
            <th className="text-left py-3 px-2">Entreprise</th>
            <th className="text-left py-3 px-2">Poste</th>
            <th className="text-left py-3 px-2">Statut</th>
            <th className="text-left py-3 px-2">Postulé</th>
            <th className="text-left py-3 px-2">Relance</th>
            <th className="text-right py-3 px-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((app) => (
            <tr
              key={app.id}
              className="border-b border-slate-100 hover:bg-slate-50 last:border-b-0"
            >
              <td className="py-3 px-2">
                <button
                  type="button"
                  onClick={() =>
                    onUpdate(app.id, { is_favorite: !app.is_favorite })
                  }
                  className="text-slate-500 hover:text-amber-500"
                  aria-label={
                    app.is_favorite
                      ? "Retirer des favoris"
                      : "Ajouter aux favoris"
                  }
                >
                  <Star
                    className={`h-4 w-4 ${
                      app.is_favorite ? "fill-amber-500 text-amber-500" : ""
                    }`}
                    strokeWidth={2}
                  />
                </button>
              </td>
              <td className="py-3 px-2">
                <div className="font-medium text-slate-900">{app.company}</div>
                {app.location && (
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="h-3 w-3" strokeWidth={2} />
                    {app.location}
                  </div>
                )}
              </td>
              <td className="py-3 px-2">
                <div className="text-slate-700">{app.position}</div>
                {app.url && (
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-slate-500 hover:text-emerald-600 inline-flex items-center gap-1"
                  >
                    Voir l&apos;offre{" "}
                    <ExternalLink className="h-3 w-3" strokeWidth={2} />
                  </a>
                )}
              </td>
              <td className="py-3 px-2">
                <select
                  value={app.status}
                  onChange={(e) =>
                    onUpdate(app.id, { status: e.target.value })
                  }
                  className={`text-xs px-2 py-1 rounded-md border border-slate-200 cursor-pointer font-medium ${
                    STATUS_COLORS[app.status] ?? "bg-slate-100 text-slate-700"
                  }`}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option
                      key={s}
                      value={s}
                      className="bg-white text-slate-900"
                    >
                      {s}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-3 px-2 text-slate-500 font-mono text-xs">
                {formatDate(app.date_applied)}
              </td>
              <td className="py-3 px-2 text-slate-500 font-mono text-xs">
                {formatDate(app.follow_up_date)}
              </td>
              <td className="py-3 px-2 text-right">
                <button
                  type="button"
                  onClick={() => {
                    if (
                      confirm(
                        `Supprimer la candidature ${app.company} - ${app.position} ?`,
                      )
                    ) {
                      onDelete(app.id);
                    }
                  }}
                  className="text-slate-500 hover:text-rose-600 p-1"
                  aria-label="Supprimer la candidature"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={2} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
