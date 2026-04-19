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
  kiwi: "bg-kiwi-500/15 text-kiwi-400",
  cyan: "bg-cyan-500/15 text-cyan-400",
  violet: "bg-violet-500/15 text-violet-400",
  amber: "bg-amber-500/15 text-amber-400",
  rose: "bg-rose-500/15 text-rose-400",
  blue: "bg-blue-500/15 text-blue-400",
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
      ? "text-kiwi-400"
      : trend === "down"
        ? "text-rose-400"
        : "text-slate-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      whileHover={{ y: -2 }}
      className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 transition-shadow duration-200 hover:shadow-lg hover:shadow-slate-950/50"
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
          <span className="font-mono text-3xl font-semibold text-slate-100 tabular-nums">
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
