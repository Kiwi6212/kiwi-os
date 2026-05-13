"use client";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import { API_BASE } from "@/lib/api";

type User = {
  id: number;
  email: string;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
};

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  // Internal hooks used by authFetch via AuthHooksBridge.
  getAccessToken: () => string | null;
  setAccessToken: (token: string | null) => void;
  refreshAccessToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Module-level mutex so concurrent 401s coalesce into ONE /refresh call.
let refreshInFlight: Promise<string | null> | null = null;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const accessTokenRef = useRef<string | null>(null);
  const router = useRouter();

  const getAccessToken = useCallback(() => accessTokenRef.current, []);

  const setAccessToken = useCallback((token: string | null) => {
    accessTokenRef.current = token;
  }, []);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) {
          accessTokenRef.current = null;
          setUser(null);
          return null;
        }
        const data = (await res.json()) as { access_token: string };
        accessTokenRef.current = data.access_token;
        return data.access_token;
      } catch {
        accessTokenRef.current = null;
        setUser(null);
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();

    return refreshInFlight;
  }, []);

  // Bootstrap: try refresh-then-me on mount so a fresh F5 reuses the
  // httpOnly refresh cookie to restore the session.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await refreshAccessToken();
      if (cancelled) return;

      if (token) {
        try {
          const res = await fetch(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const me = (await res.json()) as User;
            if (!cancelled) setUser(me);
          }
        } catch {
          // stays unauthenticated
        }
      }
      if (!cancelled) setIsLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshAccessToken]);

  const login = useCallback(async (password: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      if (res.status === 429) {
        throw new Error("Trop de tentatives. Réessaie dans une minute.");
      }
      throw new Error("Mot de passe incorrect");
    }
    const data = (await res.json()) as { access_token: string };
    accessTokenRef.current = data.access_token;

    const meRes = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${data.access_token}` },
    });
    if (meRes.ok) {
      setUser((await meRes.json()) as User);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore network errors on logout
    }
    accessTokenRef.current = null;
    setUser(null);
    router.push("/login");
  }, [router]);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login,
    logout,
    getAccessToken,
    setAccessToken,
    refreshAccessToken,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
