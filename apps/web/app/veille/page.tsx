"use client";

import { useCallback, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import { ItemPreview } from "@/components/veille/item-preview";
import { ItemsList } from "@/components/veille/items-list";
import {
  FeedsSidebar,
  type SelectedSource,
} from "@/components/veille/feeds-sidebar";
import {
  patchItem,
  syncAllFeeds,
  useFeeds,
  useItems,
} from "@/lib/rss-hooks";
import type { RSSItem, RSSItemFilter } from "@/lib/rss-types";

export default function VeillePage() {
  const { feeds, refetch: refetchFeeds } = useFeeds();

  const [source, setSource] = useState<SelectedSource>({ type: "all" });
  const [filter, setFilter] = useState<RSSItemFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<RSSItem | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const itemsParams = useMemo(() => {
    if (source.type === "feed") {
      return { feedId: source.feedId, filter };
    }
    if (source.type === "category") {
      return { category: source.category, filter };
    }
    return { filter };
  }, [source, filter]);

  const {
    items,
    loading: itemsLoading,
    loadingMore,
    hasMore,
    refetch: refetchItems,
    loadMore,
    patchItemLocal,
  } = useItems(itemsParams);

  const handleToggleRead = useCallback(async () => {
    if (!selectedItem) return;
    const newValue = !selectedItem.is_read;
    const prev = selectedItem;

    patchItemLocal(prev.id, { is_read: newValue });
    setSelectedItem({ ...prev, is_read: newValue });

    try {
      await patchItem(prev.id, { is_read: newValue });
      void refetchFeeds();
    } catch (e) {
      patchItemLocal(prev.id, { is_read: !newValue });
      setSelectedItem({ ...prev, is_read: !newValue });
      console.error("Toggle read failed:", e);
    }
  }, [selectedItem, patchItemLocal, refetchFeeds]);

  const handleToggleFavorite = useCallback(async () => {
    if (!selectedItem) return;
    const newValue = !selectedItem.is_favorited;
    const prev = selectedItem;

    patchItemLocal(prev.id, { is_favorited: newValue });
    setSelectedItem({ ...prev, is_favorited: newValue });

    try {
      await patchItem(prev.id, { is_favorited: newValue });
    } catch (e) {
      patchItemLocal(prev.id, { is_favorited: !newValue });
      setSelectedItem({ ...prev, is_favorited: !newValue });
      console.error("Toggle favorite failed:", e);
    }
  }, [selectedItem, patchItemLocal]);

  const handleSyncAll = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await syncAllFeeds();
      setSyncResult(
        `${result.total_created} nouveaux articles sur ${result.feeds_synced} feeds`,
      );
      await Promise.all([refetchFeeds(), refetchItems()]);
    } catch (e) {
      setSyncResult("Erreur lors de la synchronisation");
      console.error("Sync failed:", e);
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncResult(null), 5000);
    }
  }, [refetchFeeds, refetchItems]);

  const handleSelectSource = (s: SelectedSource) => {
    setSource(s);
    setSelectedItem(null);
  };

  const totalUnread = feeds.reduce((s, f) => s + f.unread_count, 0);

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between gap-3 px-6 py-3 border-b border-slate-200 bg-white flex-wrap">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-900">
            Veille
          </h1>
          <p className="text-xs text-slate-500">
            {feeds.length} source{feeds.length > 1 ? "s" : ""} · {totalUnread}{" "}
            non lu{totalUnread > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {syncResult && (
            <span className="text-xs text-emerald-700 font-medium">
              {syncResult}
            </span>
          )}
          <button
            type="button"
            onClick={handleSyncAll}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`}
              strokeWidth={2}
            />
            {syncing ? "Synchronisation..." : "Sync tous les feeds"}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <FeedsSidebar
          feeds={feeds}
          selected={source}
          onSelect={handleSelectSource}
        />
        <ItemsList
          items={items}
          selectedId={selectedItem?.id ?? null}
          loading={itemsLoading}
          loadingMore={loadingMore}
          hasMore={hasMore}
          filter={filter}
          onFilterChange={setFilter}
          search={search}
          onSearchChange={setSearch}
          onSelect={setSelectedItem}
          onLoadMore={loadMore}
        />
        <ItemPreview
          item={selectedItem}
          onToggleRead={handleToggleRead}
          onToggleFavorite={handleToggleFavorite}
        />
      </div>
    </div>
  );
}
