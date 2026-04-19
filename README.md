# 🥝 Kiwi OS

> Personal life cockpit — a unified dashboard to centralize work, finance, job search, and side projects.

[![Status](https://img.shields.io/badge/status-Phase%200%20(cadrage)-F59E0B)](./docs/ROADMAP.md)
[![License](https://img.shields.io/badge/license-MIT-10B981)](./LICENSE)
[![Stack](https://img.shields.io/badge/stack-Next.js%20%7C%20FastAPI-3B82F6)](#stack)

---

## 🎯 Vision

Kiwi OS is a personal cockpit that aggregates all my life metrics (work, finances, learning, job applications, digital health) into a single daily dashboard.

Built to replace the 8-12 tabs I open every morning to get a complete picture of my day.

**Audience:** me, and only me. Not a SaaS, not open for signups.

## 🗂 Status

Currently in **Phase 0 — Cadrage & inspiration**.

See [ROADMAP.md](./docs/ROADMAP.md) for full project timeline.

## 📁 Project structure

```
kiwi-os/
├── apps/
│   ├── web/              Next.js 14 frontend (not yet initialized)
│   └── api/              FastAPI backend (not yet initialized)
├── packages/
│   └── shared/           Shared TypeScript types
├── docs/
│   ├── PRD-Dashboard-OS.md          Product Requirements Document
│   ├── DESIGN-BRIEF-Kiwi-OS-v1.md   Visual direction
│   └── ROADMAP.md                    Project phases and progress
├── inspiration/          Design references (gitignored)
├── .github/
│   └── workflows/        CI/CD
└── docker-compose.yml    Local dev environment
```

## 🛠 Stack

### Frontend

- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS 3+
- Framer Motion
- shadcn/ui
- Zustand (state)
- TanStack Query
- Recharts

### Backend

- FastAPI 0.110+
- Python 3.12
- PostgreSQL 16+
- Redis 7+
- SQLAlchemy 2.0 (async)
- Alembic (migrations)
- APScheduler (background jobs)

### DevOps

- Docker Compose (local dev)
- VPS OVH Ubuntu 24.04 (prod)
- Nginx + Let's Encrypt
- Deployed at `kiwi.myjobhunter.fr`

## 📖 Documentation

- [Product Requirements Document](./docs/PRD-Dashboard-OS.md)
- [Design Brief](./docs/DESIGN-BRIEF-Kiwi-OS-v1.md)
- [Roadmap](./docs/ROADMAP.md)

## 🤝 Contributing

This is a personal project — not accepting contributions. But feel free to fork it and adapt for your own use.

## 📝 License

[MIT](./LICENSE)

---

Built with ♥ in Cergy by [Mathias Quillateau](https://github.com/Kiwi6212)
