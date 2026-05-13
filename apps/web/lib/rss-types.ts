export type RSSCategory =
  | "cyber"
  | "hardware"
  | "ia"
  | "tech"
  | "dev"
  | "devops"
  | "gaming"
  | "info";

export const CATEGORY_LABELS: Record<RSSCategory, string> = {
  cyber: "Cybersécurité",
  hardware: "Hardware & Tech",
  ia: "IA & ML",
  tech: "Actualité tech",
  dev: "Développement",
  devops: "DevOps & Cloud",
  gaming: "Gaming & Esport",
  info: "Informatique",
};

export const CATEGORY_ORDER: RSSCategory[] = [
  "cyber",
  "hardware",
  "ia",
  "tech",
  "dev",
  "devops",
  "gaming",
  "info",
];

export type RSSFeed = {
  id: number;
  name: string;
  url: string;
  category: RSSCategory | null;
  is_active: boolean;
  display_order: number;
  last_synced_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  unread_count: number;
};

export type RSSItem = {
  id: number;
  feed_id: number;
  title: string;
  link: string;
  description: string | null;
  author: string | null;
  guid: string | null;
  published_at: string | null;
  is_read: boolean;
  is_favorited: boolean;
  created_at: string;
  feed_name: string | null;
  feed_category: RSSCategory | null;
};

export type RSSItemFilter = "all" | "unread" | "favorited";
