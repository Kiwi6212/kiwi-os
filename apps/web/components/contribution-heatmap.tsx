"use client";

type ContributionLevel =
  | "NONE"
  | "FIRST_QUARTILE"
  | "SECOND_QUARTILE"
  | "THIRD_QUARTILE"
  | "FOURTH_QUARTILE";

type ContributionDay = {
  date: string;
  count: number;
  level: ContributionLevel;
};

interface ContributionHeatmapProps {
  weeks: ContributionDay[][];
  totalContributions: number;
  compact?: boolean;
}

const LEVEL_CLASSES: Record<ContributionLevel, string> = {
  NONE: "bg-slate-800",
  FIRST_QUARTILE: "bg-green-900",
  SECOND_QUARTILE: "bg-green-700",
  THIRD_QUARTILE: "bg-green-500",
  FOURTH_QUARTILE: "bg-green-400",
};

const MONTHS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];
const DAYS = ["Lun", "", "Mer", "", "Ven", "", ""];

function formatDateFR(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function ContributionHeatmap({
  weeks,
  totalContributions,
  compact = false,
}: ContributionHeatmapProps) {
  const monthLabels: { month: string; weekIndex: number }[] = [];
  let lastMonth = -1;
  weeks.forEach((week, i) => {
    if (week.length === 0) return;
    const date = new Date(week[0].date);
    const month = date.getMonth();
    if (month !== lastMonth) {
      monthLabels.push({ month: MONTHS[month], weekIndex: i });
      lastMonth = month;
    }
  });

  return (
    <div className="w-full">
      {!compact && (
        <div className="mb-4">
          <p className="text-sm text-slate-400">
            <span className="font-mono text-slate-100 font-semibold">
              {totalContributions}
            </span>{" "}
            contributions cette année
          </p>
        </div>
      )}

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {!compact && (
            <div className="flex ml-6 mb-1 text-xs text-slate-500">
              {monthLabels.map((m, i) => (
                <div
                  key={`${m.month}-${i}`}
                  style={{
                    marginLeft:
                      i === 0
                        ? 0
                        : `${(m.weekIndex - (monthLabels[i - 1]?.weekIndex ?? 0)) * 12 - 8}px`,
                  }}
                >
                  {m.month}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-1">
            {!compact && (
              <div className="flex flex-col gap-1 mr-1 text-xs text-slate-500 justify-between pt-0.5">
                {DAYS.map((d, i) => (
                  <div key={i} className="h-2.5 leading-none">
                    {d}
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((day, di) => (
                    <div
                      key={`${wi}-${di}`}
                      title={`${day.count} contribution${day.count !== 1 ? "s" : ""} le ${formatDateFR(day.date)}`}
                      className={`h-2.5 w-2.5 rounded-sm ${LEVEL_CLASSES[day.level]} hover:ring-2 hover:ring-kiwi-500/50 transition-all cursor-pointer`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {!compact && (
            <div className="flex items-center justify-end gap-2 mt-3 text-xs text-slate-500">
              <span>Moins</span>
              <div className={`h-2.5 w-2.5 rounded-sm ${LEVEL_CLASSES.NONE}`} />
              <div
                className={`h-2.5 w-2.5 rounded-sm ${LEVEL_CLASSES.FIRST_QUARTILE}`}
              />
              <div
                className={`h-2.5 w-2.5 rounded-sm ${LEVEL_CLASSES.SECOND_QUARTILE}`}
              />
              <div
                className={`h-2.5 w-2.5 rounded-sm ${LEVEL_CLASSES.THIRD_QUARTILE}`}
              />
              <div
                className={`h-2.5 w-2.5 rounded-sm ${LEVEL_CLASSES.FOURTH_QUARTILE}`}
              />
              <span>Plus</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
