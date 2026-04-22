# Kiwi OS 🥝

> Personal life cockpit — aggregates productivity, finances, job search, and portfolio data into a single dashboard.

![Security](https://img.shields.io/github/actions/workflow/status/Kiwi6212/kiwi-os/docker-security.yml?branch=main&label=security)
![License](https://img.shields.io/badge/license-MIT-green)
![Python](https://img.shields.io/badge/python-3.12-3776AB?logo=python&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-5-3178C6?logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/next.js-16-black?logo=next.js)
![FastAPI](https://img.shields.io/badge/fastapi-0.136-009688?logo=fastapi&logoColor=white)

## Features

- 🏠 Unified dashboard with real-time KPIs
- 📊 GitHub integration (contribution heatmap, commit stats, repo breakdown)
- 🌤️ Weather widget with browser geolocation (Open-Meteo)
- 💼 Job application tracker with filters and stats
- 🎨 Dark-mode UI built with Tailwind CSS 4 + Framer Motion

## Stack

### Backend (`apps/api/`)
- FastAPI 0.136 async + Python 3.12
- SQLAlchemy 2 async + asyncpg + Alembic migrations
- Redis for cache (TTL-based on external API calls)
- Pydantic v2 for schemas validation

### Frontend (`apps/web/`)
- Next.js 16 + React 19 (Server Components)
- Tailwind CSS 4 (native `@theme` tokens)
- Framer Motion for staggered animations
- Lucide React for icons

### Infrastructure
- Docker Compose (Postgres 16, Redis 7)
- GitHub Actions CI with Docker Scout security scanning
- Dependabot for dependency updates

## Getting started

### Prerequisites
- Docker Desktop
- Node.js 20+
- Python 3.12+

### Setup

```bash
# Clone
git clone https://github.com/Kiwi6212/kiwi-os.git
cd kiwi-os

# Start infrastructure
docker compose up -d

# Backend
cd apps/api
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env  # Fill in GITHUB_TOKEN if desired
alembic upgrade head
python scripts/seed_applications.py  # Optional sample data
uvicorn app.main:app --host 127.0.0.1 --port 8000

# Frontend (in another terminal)
cd apps/web
npm install
npm run dev
```

Open <http://localhost:3000> to see the dashboard.

## Architecture

### Adapter pattern for external APIs

Each external data source follows the same layered architecture:

```
External API → Adapter (raw fetch) → Service (normalize + cache) → Router (REST endpoint) → Pydantic schema (contract)
```

Active adapters:
- GitHub (REST + GraphQL for contribution calendar)
- Weather (Open-Meteo, geolocation-based)

Redis caches normalized responses with configurable TTL per source (15 min for GitHub, 10 min for weather).

### Project structure

```
kiwi-os/
├── apps/
│   ├── api/              # FastAPI backend
│   │   ├── app/
│   │   │   ├── adapters/    # External API clients
│   │   │   ├── services/    # Business logic + cache
│   │   │   ├── routers/     # FastAPI endpoints
│   │   │   ├── schemas/     # Pydantic models
│   │   │   ├── models/      # SQLAlchemy models
│   │   │   └── core/        # Config, DB, Redis, cache
│   │   └── migrations/      # Alembic
│   └── web/              # Next.js frontend
│       ├── app/             # Pages (App Router)
│       └── components/      # Shared components
├── docker-compose.yml
├── .github/workflows/    # CI pipelines
└── CLAUDE.md             # Dev notes for Claude Code sessions
```

## Workspaces

The sidebar splits the app into 5 areas:

| Workspace    | Status           | Data sources                        |
| ------------ | ---------------- | ----------------------------------- |
| Home         | ✅ Live           | Aggregates KPIs from all spaces     |
| Productivity | 🚧 Placeholder    | WorkBoard integration planned       |
| Finances     | 🚧 Placeholder    | FinTrack integration planned        |
| Job Search   | ✅ Live           | Internal Postgres DB                |
| Portfolio    | ✅ Live           | GitHub API (REST + GraphQL)         |

## Security

See [SECURITY.md](./SECURITY.md) for the security posture, accepted risks, and reporting process.

Key measures:
- Secret Scanning + Push Protection on GitHub
- Dependabot weekly scans
- Docker Scout CVE scanning on PRs (fail on new critical)
- Branch Protection on `main` (no force-push, no deletion)
- No secrets committed (`.env` gitignored, `.env.example` as template)

## Contributing

This is a personal project, but contributions and suggestions are welcome. See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

## License

[MIT](./LICENSE) © 2026 Mathias Quillateau
