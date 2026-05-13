"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { API_BASE } from "@/lib/api";
import type { RSSFeed, RSSItem, RSSItemFilter } from "@/lib/rss-types";

const PAGE_SIZE = 30;

// ---------- useFeeds ----------

export function useFeeds() {
  const [feeds, setFeeds] = useState<RSSFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/rss/feeds`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as RSSFeed[];
      setFeeds(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { feeds, loading, error, refetch };
}

// ---------- useItems (with infinite scroll) ----------

type UseItemsParams = {
  feedId?: number | null;
  category?: string | null;
  filter: RSSItemFilter;
};

export function useItems({ feedId, category, filter }: UseItemsParams) {
  const [items, setItems] = useState<RSSItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0);

  const buildUrl = useCallback(
    (offset: number) => {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));
      if (feedId != null) params.set("feed_id", String(feedId));
      if (category) params.set("category", category);
      if (filter === "unread") params.set("is_read", "false");
      if (filter === "favorited") params.set("is_favorited", "true");
      return `${API_BASE}/api/rss/items?${params.toString()}`;
    },
    [feedId, category, filter],
  );

  const refetch = useCallback(async () => {
    setLoading(true);
    offsetRef.current = 0;
    try {
      const res = await fetch(buildUrl(0));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as RSSItem[];
      setItems(data);
      setHasMore(data.length === PAGE_SIZE);
      offsetRef.current = data.length;
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [buildUrl]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(buildUrl(offsetRef.current));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as RSSItem[];
      setItems((prev) => [...prev, ...data]);
      setHasMore(data.length === PAGE_SIZE);
      offsetRef.current += data.length;
    } catch (e) {
      // Silent — caller can re-trigger via refetch.
      console.error("loadMore failed:", e);
    } finally {
      setLoadingMore(false);
    }
  }, [buildUrl, hasMore, loadingMore]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const patchItemLocal = useCallback(
    (id: number, patch: Partial<RSSItem>) => {
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, ...patch } : i)),
      );
    },
    [],
  );

  return {
    items,
    loading,
    loadingMore,
    hasMore,
    error,
    refetch,
    loadMore,
    patchItemLocal,
  };
}

// ---------- Mutations ----------

export async function patchItem(
  id: number,
  patch: { is_read?: boolean; is_favorited?: boolean },
): Promise<RSSItem> {
  const res = await fetch(`${API_BASE}/api/rss/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return (await res.json()) as RSSItem;
}

export async function syncAllFeeds(): Promise<{
  total_created: number;
  feeds_synced: number;
  feeds_failed?: number;
}> {
  const res = await fetch(`${API_BASE}/api/rss/sync-all`, { method: "POST" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
