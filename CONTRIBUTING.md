# Contributing to Kiwi OS

Thanks for considering a contribution. This is a personal project, so contributions stay small and focused — bug fixes, documentation, or discussions are the most welcome forms.

## Before you start

Open an issue describing what you want to do. This avoids duplicate work and helps align on scope.

## Dev setup

See the "Getting started" section in the [README](./README.md).

## Code style

### Backend (Python)
- Follow PEP 8
- Type hints on all function signatures
- Pydantic models for data contracts (not raw dicts)
- Async everywhere (SQLAlchemy async, httpx async, FastAPI async)
- Run `ruff check` before committing

### Frontend (TypeScript)
- Strict TypeScript (no `any` unless justified)
- Server Components by default, Client Components only when needed
- Tailwind utility classes (no inline styles, no CSS modules)
- Run `npm run lint` before committing

### Commits
- Use [Conventional Commits](https://www.conventionalcommits.org/)
  - `feat(scope): description`
  - `fix(scope): description`
  - `docs: description`
  - `ci: description`
- Sign commits with `--no-gpg-sign` (project convention, we rely on GitHub's verification UI for identity)

## Pull requests

1. Fork the repo and create a branch from `main`
2. Make your changes with tests if applicable
3. Ensure `npm run build` and `pytest` pass
4. Update `README.md` if you change user-facing behavior
5. Open a PR with a clear description of what and why

## Questions

Open a [Discussion](https://github.com/Kiwi6212/kiwi-os/discussions) or tag me on Twitter — I'll do my best to reply.
