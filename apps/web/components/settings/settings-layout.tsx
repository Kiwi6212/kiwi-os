"use client";

import { useState } from "react";
import { Database, FileText, Plug, Sliders, User } from "lucide-react";

export type SettingsTab =
  | "account"
  | "preferences"
  | "integrations"
  | "data"
  | "logs";

interface Tab {
  id: SettingsTab;
  label: string;
  icon: typeof User;
  disabled?: boolean;
  badge?: string;
}

const TABS: Tab[] = [
  { id: "account", label: "Compte", icon: User },
  { id: "preferences", label: "Préférences", icon: Sliders },
  { id: "integrations", label: "Intégrations", icon: Plug },
  { id: "data", label: "Données", icon: Database },
  { id: "logs", label: "Logs", icon: FileText },
];

interface Props {
  children: (activeTab: SettingsTab) => React.ReactNode;
}

export function SettingsLayout({ children }: Props) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("account");

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
      <aside className="space-y-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          const base =
            "relative w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors";
          const tone = isActive
            ? "bg-emerald-50 text-emerald-700"
            : tab.disabled
              ? "text-slate-400 cursor-not-allowed"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100";

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
              className={`${base} ${tone}`}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-emerald-600" />
              )}
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" strokeWidth={1.5} />
                {tab.label}
              </span>
              {tab.badge && (
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </aside>

      <div>{children(activeTab)}</div>
    </div>
  );
}
