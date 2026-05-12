export const API_BASE = "http://localhost:8000";

/**
 * Prefix a relative upload path (e.g. /uploads/portfolio/photos/x.jpg)
 * with the API base. Returns absolute URLs unchanged and null/empty
 * inputs as null so callers can short-circuit conditional rendering.
 */
export function asUploadUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE}${path}`;
}
