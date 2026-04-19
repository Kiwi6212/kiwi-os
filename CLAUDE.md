# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

Kiwi OS is a **personal cockpit** (single-user dashboard) for Mathias Quillateau — aggregates work, finances, job search, and side projects into one screen. Not a SaaS, not multi-tenant.

Currently **Phase 1 (scaffolding)**. `apps/api/` (FastAPI) and `apps/web/` (Next.js) are initialized with /health endpoint and 5 workspace pages respectively. See `docs/ROADMAP.md` for phase plan; phased setup prompts live in `docs/KIWI-OS-Phase1-Prompts.md`.

## Actual stack

Monorepo layout:

- `apps/web/` — **Next.js 16** (App Router) + **React 19** + TypeScript + **Tailwind CSS 4** + Framer Motion + shadcn/ui + Zustand + TanStack Query + Recharts
- `apps/api/` — FastAPI + Python 3.12 + SQLAlchemy 2 (async) + Alembic + APScheduler
- `packages/shared/` — shared TypeScript types
- PostgreSQL 16 + Redis 7 via `docker-compose.yml`

**Tailwind 4 nuance**: tokens are defined via `@theme` in `apps/web/app/globals.css`, NOT in a `tailwind.config.ts` (which does not exist). The Kiwi palette, fonts, and radius live there.

**Next.js 16 nuance**: `themeColor` must be exported via `export const viewport: Viewport`, not inside `metadata` (deprecated since Next 14). `npm run lint` now runs `eslint` directly (no more `next lint`). Consult `node_modules/next/dist/docs/` for any API since your training data predates Next 16.

The backend uses an **adapter pattern** for external sources (GitHub, MyJobHunter, weather, Gmail, etc.) — each adapter normalizes foreign data before it hits the internal API. Redis caches external calls with per-source TTLs (weather 1h, GitHub 15min, MyJobHunter 5min). The frontend never calls external APIs directly; it always goes through the FastAPI backend.

The product is organized into **5 "espaces" (workspaces)**: Accueil, Productivité, Finances, Job Search, Portfolio. Each is a top-level nav destination; the Accueil aggregates KPIs from the other four. Vie & Bien-être is **not** a dedicated espace — it lives as light widgets (humeur, streak sport, etc.) inside Accueil. When adding a feature, identify which espace it belongs to — it drives routing, data scope, and which adapter is involved.

Data migration note: WorkBoard and FinTrack (existing separate apps of the user) are being migrated **progressively, feature by feature**, not in one big bang. Both continue to run in parallel during migration.

## Design system is non-negotiable

`docs/DESIGN-BRIEF-Kiwi-OS-v1.md` is the **visual bible**. Any frontend work must conform to it. Key rules that are easy to violate:

- Kiwi Green `#10B981` is the only accent color — max ~20% of the screen. Contextual colors (cyan/violet/amber/rose/blue) classify semantically, never decorate.
- Backgrounds are bluish-black (`#0A0F1F`), never pure black. Cards use `rounded-2xl` (16px) — always, no variation.
- Important numbers render in **monospace** (Geist Mono) for vertical alignment. Labels are roughly 5× smaller than the number they describe.
- Hover = `translateY(-2px)` + subtle shadow. Never `scale`. Animations cap at 400ms.
- Dark-first; light mode is secondary but must be clean. The kiwi green stays identical in both.
- Icons are Lucide React, stroke-width 2, sized `w-5 h-5` by default.
- Prohibited: heavy gradients, extreme glassmorphism, serif fonts, `shadow-2xl`, parallax, decorative emojis, pure-flat surfaces, `font-black`.

When starting a frontend prompt, anchor it with "Follow Design Brief Kiwi OS v1" so tokens stay consistent.

## Language conventions

User-facing docs, commit messages, and product copy are in **French**. Code, identifiers, and technical comments stay in **English**. The PRD, roadmap, and design brief are all in French — don't translate them when referencing.

## Privacy constraints

`docs/` is **gitignored** (see `.gitignore` line 76). It contains the PRD, design brief, roadmap, and Phase 1 setup prompts — all considered personal/sensitive. Read them for context but do not copy their contents verbatim into tracked files (README, code comments, etc.). The `inspiration/` folder is also gitignored (local-only visual references).

Never commit `.env` files. `.env.example` is the only env file that ships.

The product is **self-hosted on a personal VPS** (`kiwi.myjobhunter.fr`). No third-party analytics, no Google/Microsoft SDKs. Auth is JWT + httponly cookies for a single user — do not introduce multi-user concepts, role systems, or signup flows.
