"use client";

import { useState } from "react";
import { FolderKanban, User } from "lucide-react";

export type PortfolioTab = "bio" | "projects";

interface Tab {
  id: PortfolioTab;
  label: string;
  icon: typeof User;
}

const TABS: Tab[] = [
  { id: "bio", label: "Bio & Identité", icon: User },
  { id: "projects", label: "Projets", icon: FolderKanban },
];

interface Props {
  children: (activeTab: PortfolioTab) => React.ReactNode;
}

export function PortfolioLayout({ children }: Props) {
  const [activeTab, setActiveTab] = useState<PortfolioTab>("bio");

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
      <aside className="space-y-1">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-emerald-600" />
              )}
              <Icon className="h-4 w-4" strokeWidth={1.5} />
              {tab.label}
            </button>
          );
        })}
      </aside>
      <div>{children(activeTab)}</div>
    </div>
  );
}
