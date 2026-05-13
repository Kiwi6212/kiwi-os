"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronRight, Rss } from "lucide-react";

import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type RSSCategory,
  type RSSFeed,
} from "@/lib/rss-types";

export type SelectedSource =
  | { type: "all" }
  | { type: "category"; category: RSSCategory }
  | { type: "feed"; feedId: number };

type Props = {
  feeds: RSSFeed[];
  selected: SelectedSource;
  onSelect: (s: SelectedSource) => void;
};

function sameSource(a: SelectedSource, b: SelectedSource): boolean {
  if (a.type !== b.type) return false;
  if (a.type === "all") return true;
  if (a.type === "category" && b.type === "category")
    return a.category === b.category;
  if (a.type === "feed" && b.type === "feed") return a.feedId === b.feedId;
  return false;
}

export function FeedsSidebar({ feeds, selected, onSelect }: Props) {
  const [openCategories, setOpenCategories] = useState<Set<RSSCategory>>(
    () => new Set(CATEGORY_ORDER),
  );

  const toggleCategory = (cat: RSSCategory) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const totalUnread = feeds.reduce((sum, f) => sum + f.unread_count, 0);

  const feedsByCategory = (cat: RSSCategory) =>
    feeds
      .filter((f) => f.category === cat && f.is_active)
      .sort((a, b) => a.display_order - b.display_order);

  const unreadByCategory = (cat: RSSCategory) =>
    feedsByCategory(cat).reduce((sum, f) => sum + f.unread_count, 0);

  return (
    <aside className="w-[280px] flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
      <div className="p-3 border-b border-slate-200">
        <h2 className="flex items-center gap-2 font-display font-semibold text-slate-900 text-sm">
          <Rss className="w-4 h-4 text-emerald-600" strokeWidth={2} />
          Sources
        </h2>
      </div>

      <button
        type="button"
        onClick={() => onSelect({ type: "all" })}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm transition-colors ${
          sameSource(selected, { type: "all" })
            ? "bg-emerald-50 text-emerald-900 font-medium"
            : "text-slate-700 hover:bg-slate-50"
        }`}
      >
        <span>Tous les articles</span>
        {totalUnread > 0 && (
          <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full tabular-nums">
            {totalUnread}
          </span>
        )}
      </button>

      <div className="py-2">
        {CATEGORY_ORDER.map((cat) => {
          const feedsInCat = feedsByCategory(cat);
          if (feedsInCat.length === 0) return null;

          const isOpen = openCategories.has(cat);
          const unread = unreadByCategory(cat);

          return (
            <div key={cat}>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className="p-1 hover:bg-slate-100 rounded"
                  aria-label={`Toggle ${CATEGORY_LABELS[cat]}`}
                >
                  {isOpen ? (
                    <ChevronDown
                      className="w-3 h-3 text-slate-500"
                      strokeWidth={2}
                    />
                  ) : (
                    <ChevronRight
                      className="w-3 h-3 text-slate-500"
                      strokeWidth={2}
                    />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSelect({ type: "category", category: cat })
                  }
                  className={`flex-1 flex items-center justify-between px-2 py-1.5 text-sm transition-colors ${
                    sameSource(selected, { type: "category", category: cat })
                      ? "bg-emerald-50 text-emerald-900 font-medium"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="uppercase text-xs tracking-wide">
                    {CATEGORY_LABELS[cat]}
                  </span>
                  {unread > 0 && (
                    <span className="text-xs text-emerald-700 font-semibold tabular-nums">
                      {unread}
                    </span>
                  )}
                </button>
              </div>

              {isOpen && (
                <div className="ml-4 border-l border-slate-100">
                  {feedsInCat.map((feed) => (
                    <button
                      key={feed.id}
                      type="button"
                      onClick={() =>
                        onSelect({ type: "feed", feedId: feed.id })
                      }
                      className={`w-full flex items-center justify-between gap-2 pl-3 pr-2 py-1.5 text-sm transition-colors ${
                        sameSource(selected, {
                          type: "feed",
                          feedId: feed.id,
                        })
                          ? "bg-emerald-50 text-emerald-900 font-medium"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <span className="flex items-center gap-1.5 truncate min-w-0">
                        {feed.last_error && (
                          <AlertTriangle
                            className="w-3 h-3 text-amber-500 flex-shrink-0"
                            strokeWidth={2}
                            aria-label={`Erreur: ${feed.last_error}`}
                          />
                        )}
                        <span className="truncate">{feed.name}</span>
                      </span>
                      {feed.unread_count > 0 && (
                        <span className="text-xs text-emerald-700 font-semibold flex-shrink-0 tabular-nums">
                          {feed.unread_count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
