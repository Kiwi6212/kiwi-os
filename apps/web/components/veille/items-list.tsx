"use client";

import { useEffect, useRef } from "react";
import { Circle, Star } from "lucide-react";

import type { RSSItem, RSSItemFilter } from "@/lib/rss-types";

type Props = {
  items: RSSItem[];
  selectedId: number | null;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  filter: RSSItemFilter;
  onFilterChange: (f: RSSItemFilter) => void;
  search: string;
  onSearchChange: (s: string) => void;
  onSelect: (item: RSSItem) => void;
  onLoadMore: () => void;
};

function formatRelativeDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffH = Math.floor(diffMin / 60);
  const diffD = Math.floor(diffH / 24);

  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin} min`;
  if (diffH < 24) return `il y a ${diffH} h`;
  if (diffD < 7) return `il y a ${diffD} j`;
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: diffD > 365 ? "numeric" : undefined,
  });
}

const FILTER_LABELS: Record<RSSItemFilter, string> = {
  all: "Tous",
  unread: "Non lus",
  favorited: "Favoris",
};

export function ItemsList({
  items,
  selectedId,
  loading,
  loadingMore,
  hasMore,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  onSelect,
  onLoadMore,
}: Props) {
  const filtered = search.trim()
    ? items.filter((i) => {
        const q = search.toLowerCase();
        return (
          i.title.toLowerCase().includes(q) ||
          (i.description?.toLowerCase().includes(q) ?? false)
        );
      })
    : items;

  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!hasMore || loadingMore || loading) return;
    const el = sentinelRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoadMore();
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loadingMore, loading, onLoadMore]);

  return (
    <section className="w-[420px] flex-shrink-0 border-r border-slate-200 bg-slate-50 flex flex-col overflow-hidden">
      <div className="p-3 border-b border-slate-200 bg-white space-y-2">
        <div className="flex gap-1">
          {(["all", "unread", "favorited"] as RSSItemFilter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => onFilterChange(f)}
              className={`flex-1 text-xs px-2 py-1.5 rounded transition-colors ${
                filter === f
                  ? "bg-emerald-600 text-white font-medium"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {FILTER_LABELS[f]}
            </button>
          ))}
        </div>
        <input
          type="search"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full text-sm px-2 py-1.5 border border-slate-200 rounded focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">
            Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">
            <p>Aucun article</p>
            {search && (
              <p className="mt-1 text-xs">Essaie de modifier ta recherche</p>
            )}
          </div>
        ) : (
          <>
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                className={`w-full text-left p-3 border-b border-slate-200 transition-colors ${
                  selectedId === item.id
                    ? "bg-emerald-50"
                    : "bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start gap-2 mb-1">
                  {!item.is_read && (
                    <Circle
                      className="w-2 h-2 mt-1.5 fill-emerald-600 text-emerald-600 flex-shrink-0"
                      strokeWidth={2}
                    />
                  )}
                  {item.is_favorited && (
                    <Star
                      className="w-3 h-3 mt-1 fill-amber-400 text-amber-400 flex-shrink-0"
                      strokeWidth={2}
                    />
                  )}
                  <h3
                    className={`text-sm leading-snug flex-1 ${
                      item.is_read
                        ? "text-slate-600"
                        : "text-slate-900 font-medium"
                    }`}
                  >
                    {item.title}
                  </h3>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 ml-4">
                  <span className="truncate">
                    {item.feed_name ?? "Source inconnue"}
                  </span>
                  <span className="flex-shrink-0 ml-2">
                    {formatRelativeDate(item.published_at)}
                  </span>
                </div>
              </button>
            ))}
            <div ref={sentinelRef} className="h-4" />
            {loadingMore && (
              <div className="p-4 text-center text-xs text-slate-400">
                Chargement...
              </div>
            )}
            {!hasMore && filtered.length > 0 && (
              <div className="p-4 text-center text-xs text-slate-400">
                Fin de la liste
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
