"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { Sidebar } from "@/components/sidebar";
import { useAuth } from "@/lib/auth-context";

// Routes accessible without authentication.
const PUBLIC_PREFIXES = ["/login", "/portfolio-public"];
// Routes rendered without the Kiwi-OS sidebar (currently mirrors PUBLIC,
// but kept separate so a future "authed standalone" page can opt out
// without becoming public).
const STANDALONE_PREFIXES = ["/login", "/portfolio-public"];

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();

  const isPublic = startsWithAny(pathname, PUBLIC_PREFIXES);
  const isStandalone = startsWithAny(pathname, STANDALONE_PREFIXES);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && !isPublic) {
      const next = encodeURIComponent(pathname);
      router.replace(`/login?next=${next}`);
    }
  }, [isLoading, isAuthenticated, isPublic, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-slate-400 text-sm">Chargement…</div>
      </div>
    );
  }

  // Redirect in flight — render nothing rather than flash protected content.
  if (!isAuthenticated && !isPublic) {
    return null;
  }

  if (isStandalone) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-60">{children}</main>
    </div>
  );
}
