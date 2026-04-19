# Kiwi OS — API

FastAPI backend for Kiwi OS. Python 3.12 + SQLAlchemy 2 (async) + asyncpg + Redis + Alembic.

## Local setup

```bash
cd apps/api
py -3.12 -m venv .venv
./.venv/Scripts/Activate.ps1   # Windows
# source .venv/bin/activate    # macOS/Linux
pip install -e ".[dev]"
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

Requires Postgres 16 + Redis 7 running locally (from repo root: `docker compose up -d`).

## Endpoints

- `GET /health` — Postgres + Redis liveness. Returns 503 if any dep is down.
- `GET /docs` — Swagger UI.

## Migrations

```bash
alembic revision --autogenerate -m "message"
alembic upgrade head
```

## Tests

```bash
pytest
```
