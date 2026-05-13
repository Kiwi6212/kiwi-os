"use client";

import { CheckCircle2, Circle, ExternalLink, Star } from "lucide-react";

import { CATEGORY_LABELS, type RSSItem } from "@/lib/rss-types";

type Props = {
  item: RSSItem | null;
  onToggleRead: () => void;
  onToggleFavorite: () => void;
};

function formatFullDate(iso: string | null): string {
  if (!iso) return "Date inconnue";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ItemPreview({ item, onToggleRead, onToggleFavorite }: Props) {
  if (!item) {
    return (
      <section className="flex-1 flex items-center justify-center bg-white text-slate-400 text-sm">
        Sélectionne un article pour le lire
      </section>
    );
  }

  return (
    <section className="flex-1 bg-white overflow-y-auto">
      <article className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-3 flex-wrap">
          <span className="font-medium text-emerald-700">{item.feed_name}</span>
          {item.feed_category && (
            <>
              <span>•</span>
              <span>{CATEGORY_LABELS[item.feed_category]}</span>
            </>
          )}
          <span>•</span>
          <span>{formatFullDate(item.published_at)}</span>
          {item.author && (
            <>
              <span>•</span>
              <span>par {item.author}</span>
            </>
          )}
        </div>

        <h1 className="font-display text-2xl font-bold text-slate-900 leading-tight mb-4">
          {item.title}
        </h1>

        <div className="flex items-center gap-2 mb-6 pb-6 border-b border-slate-200 flex-wrap">
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 transition-colors"
          >
            Lire l&apos;article
            <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
          </a>
          <button
            type="button"
            onClick={onToggleRead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-sm text-slate-700 rounded hover:bg-slate-50 transition-colors"
          >
            {item.is_read ? (
              <>
                <CheckCircle2
                  className="w-3.5 h-3.5 text-emerald-600"
                  strokeWidth={2}
                />
                Lu
              </>
            ) : (
              <>
                <Circle className="w-3.5 h-3.5" strokeWidth={2} />
                Marquer comme lu
              </>
            )}
          </button>
          <button
            type="button"
            onClick={onToggleFavorite}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-sm text-slate-700 rounded hover:bg-slate-50 transition-colors"
          >
            <Star
              className={`w-3.5 h-3.5 ${
                item.is_favorited ? "fill-amber-400 text-amber-400" : ""
              }`}
              strokeWidth={2}
            />
            {item.is_favorited ? "Favori" : "Ajouter aux favoris"}
          </button>
        </div>

        {item.description ? (
          <div className="text-slate-700 leading-relaxed whitespace-pre-wrap">
            {item.description}
          </div>
        ) : (
          <p className="text-sm text-slate-400 italic">
            Aucun aperçu disponible. Clique sur &ldquo;Lire l&apos;article&rdquo;
            pour ouvrir la source.
          </p>
        )}
      </article>
    </section>
  );
}
