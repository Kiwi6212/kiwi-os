"use client";

import { useEffect } from "react";

import { useAuth } from "@/lib/auth-context";
import { setAuthHooks } from "@/lib/auth-fetch";

/**
 * Wires the AuthContext's getAccessToken/refreshAccessToken/logout into
 * the module-level authFetch hooks. Must live inside <AuthProvider>.
 */
export function AuthHooksBridge({ children }: { children: React.ReactNode }) {
  const { getAccessToken, refreshAccessToken, logout } = useAuth();

  useEffect(() => {
    setAuthHooks({
      getAccessToken,
      refreshAccessToken,
      onAuthFailure: () => {
        void logout();
      },
    });
  }, [getAccessToken, refreshAccessToken, logout]);

  return <>{children}</>;
}
