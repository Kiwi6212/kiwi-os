/**
 * Drop-in fetch() replacement that:
 *  - prepends API_BASE for relative paths starting with /api/
 *  - injects Authorization: Bearer <access_token>
 *  - sets credentials: "include" so the refresh cookie travels too
 *  - on 401, attempts ONE refresh + retry (deduplicated via the
 *    AuthContext mutex), falls through to onAuthFailure (logout) if
 *    the refresh fails.
 *
 * The auth hooks are injected at runtime from <AuthHooksBridge>. If
 * they're not yet installed (e.g. during the very first render before
 * the provider mounts), authFetch falls back to a plain credentialed
 * fetch — the request will likely fail with 401 and the caller's own
 * error handling kicks in.
 */

import { API_BASE } from "@/lib/api";

type AuthHooks = {
  getAccessToken: () => string | null;
  refreshAccessToken: () => Promise<string | null>;
  onAuthFailure: () => void;
};

let hooks: AuthHooks | null = null;

export function setAuthHooks(next: AuthHooks): void {
  hooks = next;
}

function resolveUrl(input: RequestInfo | URL): string | URL | Request {
  if (typeof input !== "string") return input;
  if (input.startsWith("http://") || input.startsWith("https://")) {
    return input;
  }
  if (input.startsWith("/")) {
    return `${API_BASE}${input}`;
  }
  return input;
}

export async function authFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const url = resolveUrl(input);

  const doFetch = async (token: string | null): Promise<Response> => {
    const headers = new Headers(init.headers);
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, {
      ...init,
      credentials: "include",
      headers,
    });
  };

  const token = hooks?.getAccessToken() ?? null;
  let res = await doFetch(token);

  if (res.status === 401 && hooks) {
    const newToken = await hooks.refreshAccessToken();
    if (newToken) {
      res = await doFetch(newToken);
      if (res.status === 401) {
        hooks.onAuthFailure();
      }
    } else {
      hooks.onAuthFailure();
    }
  }

  return res;
}
