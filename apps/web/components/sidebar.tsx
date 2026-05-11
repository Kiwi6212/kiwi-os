"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Zap, Wallet, Target, Code2, BarChart3 } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/productivity", label: "Productivité", icon: Zap },
  { href: "/finances", label: "Finances", icon: Wallet },
  { href: "/job-search", label: "Job Search", icon: Target },
  { href: "/portfolio", label: "Portfolio", icon: Code2 },
  { href: "/stats", label: "Stats", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <aside className="glass-strong fixed left-0 top-0 h-screen w-60 border-r border-slate-200">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-slate-200 px-6 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
            <span className="text-xl">🥝</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-900 font-display">
              Kiwi OS
            </span>
            <span className="text-xs text-slate-500">v0.1.0</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                className={
                  active
                    ? "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 bg-emerald-50 text-emerald-700"
                    : "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }
              >
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r-full bg-emerald-600" />
                )}
                <Icon
                  className={
                    active
                      ? "h-5 w-5 text-emerald-600"
                      : "h-5 w-5 text-slate-500 group-hover:text-slate-700"
                  }
                  strokeWidth={1.5}
                />
                <span className="font-medium">{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-200 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-xs font-semibold text-emerald-700">
                KC
              </span>
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium text-slate-900 truncate">
                Mathias
              </span>
              <span className="text-xs text-slate-500 truncate">
                Personal cockpit
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
