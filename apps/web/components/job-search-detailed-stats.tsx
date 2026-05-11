"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Building2, CalendarClock, Clock } from "lucide-react";

type SalaryRange = { range: string; count: number };
type CompanyCount = { company: string; count: number };
type FollowUpReminder = {
  id: number;
  company: string;
  position: string;
  follow_up_date: string;
  days_until: number;
};

export type DetailedStats = {
  avg_response_time_days: number | null;
  by_salary_range: SalaryRange[];
  top_companies: CompanyCount[];
  upcoming_follow_ups: FollowUpReminder[];
};

interface Props {
  stats: DetailedStats;
}

const KIWI_COLOR = "#059669";

export function JobSearchDetailedStats({ stats }: Props) {
  const hasSalaryData = stats.by_salary_range.some((r) => r.count > 0);
  const hasCompanyData = stats.top_companies.length > 0;
  const hasFollowUps = stats.upcoming_follow_ups.length > 0;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">
        Stats détaillées
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-slate-500" strokeWidth={2} />
            <h3 className="text-sm font-medium text-slate-700">
              Temps moyen de réponse
            </h3>
          </div>
          {stats.avg_response_time_days !== null ? (
            <>
              <p className="text-3xl font-mono font-semibold text-slate-900 tabular-nums">
                {stats.avg_response_time_days.toFixed(1)}{" "}
                <span className="text-sm text-slate-500">jours</span>
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Délai moyen entre la date de candidature et le dernier contact
                pour les statuts Interview, Accepted ou Rejected.
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Pas encore assez de données. Renseigne <code>date_applied</code>{" "}
              et <code>last_contact</code> sur tes candidatures Interview /
              Accepted / Rejected pour activer cette stat.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-4 w-4 text-slate-500" strokeWidth={2} />
            <h3 className="text-sm font-medium text-slate-700">
              Top 5 entreprises
            </h3>
          </div>
          {hasCompanyData ? (
            <ul className="space-y-2">
              {stats.top_companies.map((c, i) => (
                <li
                  key={`${c.company}-${i}`}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-slate-700 truncate">
                    {c.company}
                  </span>
                  <span className="text-sm font-mono text-slate-500 tabular-nums">
                    {c.count}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">Aucune donnée</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <h3 className="text-sm font-medium text-slate-700 mb-4">
          Distribution par fourchette salariale
        </h3>
        {hasSalaryData ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={stats.by_salary_range}
              margin={{ top: 8, right: 8, bottom: 0, left: -16 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="range"
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                stroke="#94a3b8"
                tick={{ fontSize: 12 }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  background: "rgba(255, 255, 255, 0.95)",
                  border: "1px solid #e2e8f0",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "#0f172a",
                }}
                cursor={{ fill: "#f1f5f9" }}
              />
              <Bar dataKey="count" fill={KIWI_COLOR} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-500 py-8 text-center">
            Aucune donnée salariale (renseigne salary_min ou salary_max)
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock className="h-4 w-4 text-slate-500" strokeWidth={2} />
          <h3 className="text-sm font-medium text-slate-700">
            Relances prévues
          </h3>
        </div>
        {hasFollowUps ? (
          <ul className="space-y-2">
            {stats.upcoming_follow_ups.map((f) => {
              const isLate = f.days_until < 0;
              const isToday = f.days_until === 0;
              const dateStr = new Date(f.follow_up_date).toLocaleDateString(
                "fr-FR",
                { day: "numeric", month: "short" },
              );
              const rowClass = isLate
                ? "bg-rose-50 border border-rose-300"
                : "bg-slate-100";
              const badgeClass = isLate
                ? "bg-rose-100 text-rose-600"
                : isToday
                  ? "bg-amber-100 text-amber-700"
                  : "bg-slate-200 text-slate-700";
              const badgeText = isLate
                ? `${Math.abs(f.days_until)}j en retard`
                : isToday
                  ? "Aujourd'hui"
                  : `dans ${f.days_until}j`;
              return (
                <li
                  key={f.id}
                  className={`flex items-center justify-between py-2 px-3 rounded-lg ${rowClass}`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {f.company}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {f.position}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono text-slate-500">
                      {dateStr}
                    </span>
                    <span
                      className={`text-xs font-mono px-2 py-0.5 rounded-full ${badgeClass}`}
                    >
                      {badgeText}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-slate-500 py-4 text-center">
            Aucune relance prévue
          </p>
        )}
      </div>
    </div>
  );
}
