import type { Metadata } from "next";

import { PublicPortfolioView } from "@/components/portfolio/public-portfolio-view";

export const metadata: Metadata = {
  title: "Portfolio — Mathias Quillateau",
  description: "Vitrine personnelle : bio, projets, parcours.",
};

export default function PortfolioPublicPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <PublicPortfolioView />
    </div>
  );
}
