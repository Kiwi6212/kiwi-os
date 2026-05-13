"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, LogIn } from "lucide-react";

import { useAuth } from "@/lib/auth-context";

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(next);
    }
  }, [isAuthenticated, isLoading, next, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(password);
      router.replace(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de connexion");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-slate-900">
            Kiwi <span className="text-emerald-600">OS</span>
          </h1>
          <p className="mt-2 text-sm text-slate-500">Personal cockpit</p>
        </div>

        <div className="bg-white/80 backdrop-blur border border-slate-200 rounded-lg p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-700 mb-1.5"
              >
                Mot de passe
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  strokeWidth={2}
                />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  autoComplete="current-password"
                  className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            {error && (
              <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !password}
              className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white text-sm font-medium px-4 py-2.5 rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <LogIn className="w-4 h-4" strokeWidth={2} />
              {submitting ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <LoginForm />
    </Suspense>
  );
}
