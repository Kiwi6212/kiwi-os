"use client";

import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/sidebar";

// Paths rendered without the Kiwi-OS chrome (sidebar). These are
// externally-visible pages — the public portfolio is the only one for
// now.
const STANDALONE_PREFIXES = ["/portfolio-public"];

function isStandalone(pathname: string): boolean {
  return STANDALONE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function AppFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isStandalone(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-60">{children}</main>
    </div>
  );
}
