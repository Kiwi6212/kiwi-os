"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Briefcase,
  Home,
  Rss,
  Settings as SettingsIcon,
  Target,
  Wallet,
  Zap,
} from "lucide-react";
import type { UserPreference } from "@/lib/types/settings";

const NAV_ITEMS = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/productivity", label: "Productivité", icon: Zap },
  { href: "/finances", label: "Finances", icon: Wallet },
  { href: "/job-search", label: "Job Search", icon: Target },
  { href: "/dev-activity", label: "Dev Activity", icon: Activity },
  { href: "/portfolio", label: "Portfolio", icon: Briefcase },
  { href: "/stats", label: "Stats", icon: BarChart3 },
  { href: "/veille", label: "Veille", icon: Rss },
];

const API_BASE = "http://localhost:8000";
const FALLBACK_NAME = "Mathias";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Sidebar() {
  const pathname = usePathname();
  const [preferences, setPreferences] = useState<UserPreference | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/settings/preferences`);
        if (!res.ok) return;
        const data = (await res.json()) as UserPreference;
        if (!cancelled) setPreferences(data);
      } catch {
        // silent — fall back to defaults
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const displayName = preferences?.display_name?.trim() || FALLBACK_NAME;
  const avatarUrl = preferences?.avatar_url ?? null;
  const profileActive = pathname.startsWith("/settings");

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
          <Link
            href="/settings"
            className={`group flex items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
              profileActive
                ? "bg-emerald-50"
                : "bg-slate-50 hover:bg-slate-100"
            }`}
          >
            <div className="relative h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center overflow-hidden shrink-0">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={displayName}
                  fill
                  sizes="32px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <span className="text-xs font-semibold text-emerald-700">
                  {initials(displayName)}
                </span>
              )}
            </div>
            <div className="flex flex-col flex-1 min-w-0">
              <span className="text-sm font-medium text-slate-900 truncate">
                {displayName}
              </span>
              <span className="text-xs text-slate-500 truncate">
                Paramètres
              </span>
            </div>
            <SettingsIcon
              className="h-4 w-4 text-slate-400 group-hover:text-slate-700 shrink-0"
              strokeWidth={1.5}
            />
          </Link>
        </div>
      </div>
    </aside>
  );
}
