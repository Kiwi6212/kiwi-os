"use client";

import { useEffect, useState } from "react";
import {
  type LucideIcon,
  PiggyBank,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  type FinanceStats,
  formatCurrency,
  parseStats,
} from "@/lib/types/finance";

const API_BASE = "http://localhost:8000";

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  fontSize: 12,
};

type Comparison = {
  period: string;
  current_label: string;
  previous_label: string;
  current_income: number;
  previous_income: number;
  income_delta_pct: number | null;
  current_expense: number;
  previous_expense: number;
  expense_delta_pct: number | null;
  current_savings: number;
  previous_savings: number;
  savings_delta_pct: number | null;
};

type RawComparison = Omit<
  Comparison,
  | "current_income"
  | "previous_income"
  | "current_expense"
  | "previous_expense"
  | "current_savings"
  | "previous_savings"
> & {
  current_income: number | string;
  previous_income: number | string;
  current_expense: number | string;
  previous_expense: number | string;
  current_savings: number | string;
  previous_savings: number | string;
};

function num(v: unknown): number {
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function parseComparison(raw: RawComparison): Comparison {
  return {
    ...raw,
    current_income: num(raw.current_income),
    previous_income: num(raw.previous_income),
    current_expense: num(raw.current_expense),
    previous_expense: num(raw.previous_expense),
    current_savings: num(raw.current_savings),
    previous_savings: num(raw.previous_savings),
  };
}

export function FinanceStatsClient() {
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [period, setPeriod] = useState<"month" | "year">("month");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [sRes, cRes] = await Promise.all([
          fetch(`${API_BASE}/api/finances/stats`),
          fetch(
            `${API_BASE}/api/finances/stats/comparison?period=${period}`,
          ),
        ]);
        if (cancelled) return;
        if (!sRes.ok || !cRes.ok) throw new Error("Erreur de chargement");
        const sRaw = (await sRes.json()) as Parameters<typeof parseStats>[0];
        const cRaw = (await cRes.json()) as RawComparison;
        if (cancelled) return;
        setStats(parseStats(sRaw));
        setComparison(parseComparison(cRaw));
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Erreur");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period]);

  if (loading) {
    return <div className="text-slate-500 text-sm py-8">Chargement...</div>;
  }
  if (error || !stats || !comparison) {
    return (
      <div className="text-rose-600 text-sm py-8">
        {error ?? "Erreur de chargement."}
      </div>
    );
  }

  const evolutionData = stats.last_12_months.map((m) => ({
    label: m.label,
    Revenus: m.income,
    Dépenses: m.expense,
  }));
  const hasEvolution = stats.last_12_months.some(
    (m) => m.income > 0 || m.expense > 0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h3 className="text-sm font-medium text-slate-700">
          Comparaison{" "}
          {period === "month"
            ? "vs mois précédent"
            : "vs année précédente"}
        </h3>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {(["month", "year"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 text-xs rounded transition-colors ${
                period === p
                  ? "bg-emerald-600 text-white"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {p === "month" ? "Mois" : "Année"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ComparisonCard
          label="Revenus"
          icon={TrendingUp}
          current={comparison.current_income}
          previous={comparison.previous_income}
          delta={comparison.income_delta_pct}
          previousLabel={comparison.previous_label}
        />
        <ComparisonCard
          label="Dépenses"
          icon={TrendingDown}
          current={comparison.current_expense}
          previous={comparison.previous_expense}
          delta={comparison.expense_delta_pct}
          previousLabel={comparison.previous_label}
          invertedDelta
        />
        <ComparisonCard
          label="Économies"
          icon={PiggyBank}
          current={comparison.current_savings}
          previous={comparison.previous_savings}
          delta={comparison.savings_delta_pct}
          previousLabel={comparison.previous_label}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <h3 className="text-sm font-medium text-slate-700 mb-4">
          Évolution sur 12 mois
        </h3>
        {hasEvolution ? (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={evolutionData}>
              <defs>
                <linearGradient
                  id="colIncome2"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient
                  id="colExpense2"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor="#dc2626" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#dc2626" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                stroke="#94a3b8"
                tick={{ fontSize: 11 }}
              />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(v) => formatCurrency(Number(v ?? 0))}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="Revenus"
                stroke="#059669"
                fill="url(#colIncome2)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Dépenses"
                stroke="#dc2626"
                fill="url(#colExpense2)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-500 text-center py-8">
            Pas assez de données pour afficher l&apos;évolution.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-slate-700">Solde courant</h3>
          <Wallet className="h-4 w-4 text-slate-500" strokeWidth={1.5} />
        </div>
        <p
          className={`font-mono text-3xl font-semibold tabular-nums mb-4 ${
            stats.total_balance >= 0
              ? "text-emerald-600"
              : "text-rose-600"
          }`}
        >
          {formatCurrency(stats.total_balance)}
        </p>
        {stats.accounts.length > 0 ? (
          <ul className="space-y-2">
            {stats.accounts.map((a) => (
              <li
                key={a.account_id}
                className="flex items-center justify-between text-sm"
              >
                <span className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: a.account_color || "#94a3b8",
                    }}
                  />
                  <span className="text-slate-700">{a.account_name}</span>
                </span>
                <span
                  className={`font-mono tabular-nums ${
                    a.current_balance >= 0
                      ? "text-slate-700"
                      : "text-rose-600"
                  }`}
                >
                  {formatCurrency(a.current_balance)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Aucun compte enregistré.</p>
        )}
      </div>
    </div>
  );
}

function ComparisonCard({
  label,
  icon: Icon,
  current,
  previous,
  delta,
  previousLabel,
  invertedDelta = false,
}: {
  label: string;
  icon: LucideIcon;
  current: number;
  previous: number;
  delta: number | null;
  previousLabel: string;
  invertedDelta?: boolean;
}) {
  const sign = delta !== null && delta >= 0 ? "+" : "";
  const deltaText = delta !== null ? `${sign}${delta.toFixed(1)}%` : "—";

  let deltaColor = "text-slate-500";
  if (delta !== null) {
    const positive = delta >= 0;
    if (invertedDelta) {
      deltaColor = positive ? "text-rose-600" : "text-emerald-600";
    } else {
      deltaColor = positive ? "text-emerald-600" : "text-rose-600";
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-slate-500" strokeWidth={1.5} />
        <p className="text-xs uppercase tracking-wider text-slate-500">
          {label}
        </p>
      </div>
      <p className="font-mono text-2xl font-semibold tabular-nums text-slate-900 mb-1">
        {formatCurrency(current)}
      </p>
      <p className="text-xs text-slate-500">
        <span className={deltaColor}>{deltaText}</span> vs {previousLabel} (
        {formatCurrency(previous)})
      </p>
    </div>
  );
}
