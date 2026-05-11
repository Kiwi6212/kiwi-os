"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { type FinanceStats, formatCurrency } from "@/lib/types/finance";

interface Props {
  stats: FinanceStats;
}

const CATEGORY_DEFAULT_COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
];

const TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: "rgba(255, 255, 255, 0.95)",
  border: "1px solid #e2e8f0",
  borderRadius: "12px",
  fontSize: 12,
};

export function FinancesCharts({ stats }: Props) {
  const evolutionData = stats.last_12_months.map((m) => ({
    label: m.label,
    Revenus: m.income,
    Dépenses: m.expense,
  }));

  const hasEvolutionData = stats.last_12_months.some(
    (m) => m.income > 0 || m.expense > 0,
  );

  const categoryData = stats.expense_by_category.map((c, i) => ({
    name: c.category_name,
    value: c.total_amount,
    icon: c.category_icon,
    color:
      c.category_color ||
      CATEGORY_DEFAULT_COLORS[i % CATEGORY_DEFAULT_COLORS.length],
    percentage: c.percentage,
  }));

  const merchantData = stats.top_merchants.map((m) => ({
    name:
      m.merchant.length > 25 ? m.merchant.slice(0, 25) + "…" : m.merchant,
    amount: m.total_amount,
    count: m.transaction_count,
  }));

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <h3 className="text-sm font-medium text-slate-700 mb-4">
          Évolution sur 12 mois
        </h3>
        {hasEvolutionData ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={evolutionData}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#059669" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#059669" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
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
                labelStyle={{ color: "#0f172a" }}
                formatter={(v) => formatCurrency(Number(v ?? 0))}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="Revenus"
                stroke="#059669"
                fill="url(#colorIncome)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="Dépenses"
                stroke="#dc2626"
                fill="url(#colorExpense)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-slate-500 text-center py-12">
            Pas assez de transactions pour afficher l&apos;évolution.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">
            Répartition des dépenses ce mois
          </h3>
          {categoryData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={90}
                    paddingAngle={2}
                    label={(props) => {
                      const pct =
                        typeof props.percent === "number"
                          ? props.percent * 100
                          : 0;
                      return pct > 5 ? `${pct.toFixed(0)}%` : "";
                    }}
                    labelLine={false}
                  >
                    {categoryData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    formatter={(v) => formatCurrency(Number(v ?? 0))}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-4 space-y-1 max-h-32 overflow-y-auto">
                {categoryData.map((c, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="text-slate-700 flex-1 truncate">
                      {c.icon ? `${c.icon} ` : ""}
                      {c.name}
                    </span>
                    <span className="text-slate-500 font-mono tabular-nums">
                      {formatCurrency(c.value)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-slate-500 text-center py-12">
              Aucune dépense ce mois.
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          <h3 className="text-sm font-medium text-slate-700 mb-4">
            Top 5 marchands ce mois
          </h3>
          {merchantData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={merchantData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  type="number"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  width={120}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => formatCurrency(Number(v ?? 0))}
                />
                <Bar
                  dataKey="amount"
                  fill="#2563eb"
                  radius={[0, 8, 8, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-slate-500 text-center py-12">
              Aucun marchand ce mois.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
