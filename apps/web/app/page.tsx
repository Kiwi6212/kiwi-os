export default function HomePage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-kiwi-500 mb-2">🥝 Accueil</h1>
        <p className="text-slate-400 mb-8">Phase 1 — scaffolding</p>
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800 p-8">
          <p className="text-slate-300">
            Bienvenue sur Kiwi OS. L&apos;Accueil agrégera bientôt les KPIs
            des 4 autres espaces, plus des widgets Vie &amp; Bien-être.
          </p>
        </div>
      </div>
    </main>
  );
}
