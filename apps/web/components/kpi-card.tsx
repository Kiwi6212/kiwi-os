"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ReactNode } from "react";

type Trend = "up" | "down" | "neutral";

interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  trend?: Trend;
  trendValue?: string;
  icon: ReactNode;
  accent?: "kiwi" | "cyan" | "violet" | "amber" | "rose" | "blue";
  delay?: number;
}

const ACCENT_CLASSES: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  kiwi: "bg-emerald-50 text-emerald-600",
  cyan: "bg-cyan-50 text-cyan-600",
  violet: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600",
  blue: "bg-blue-50 text-blue-600",
};

export function KpiCard({
  label,
  value,
  unit,
  trend,
  trendValue,
  icon,
  accent = "kiwi",
  delay = 0,
}: KpiCardProps) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-emerald-600"
      : trend === "down"
        ? "text-rose-600"
        : "text-slate-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className="glass-card rounded-2xl p-5 transition-shadow duration-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg ${ACCENT_CLASSES[accent]}`}
        >
          {icon}
        </div>
        {trend && trendValue && (
          <div
            className={`flex items-center gap-1 text-xs font-mono ${trendColor}`}
          >
            <TrendIcon className="h-3 w-3" strokeWidth={2.5} />
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      <div className="space-y-1">
        <div className="flex items-baseline gap-1">
          <span className="font-mono text-3xl font-semibold text-slate-900 tabular-nums">
            {value}
          </span>
          {unit && (
            <span className="text-sm text-slate-500 font-mono">{unit}</span>
          )}
        </div>
        <p className="text-xs uppercase tracking-wider text-slate-500">
          {label}
        </p>
      </div>
    </motion.div>
  );
}
