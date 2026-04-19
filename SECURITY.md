# Security Policy

## Supported Versions

Kiwi OS is a personal project currently in Phase 0 (scoping).
There is no public release yet. Only `main` is actively maintained.

| Version | Supported          |
| ------- | ------------------ |
| main    | :white_check_mark: |
| others  | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please send an email to
**github.relight922@passmail.com**. Do NOT open a public issue.

Response time: best-effort, as this is a personal project maintained
by a single developer.

## Security Posture

### Automated Scanning

This repository is actively monitored by multiple automated tools:

- **Docker Scout** — CVE scanning on every push, PR, and weekly schedule
- **Dependabot Alerts** — dependency vulnerabilities monitoring
- **Dependabot Security Updates** — automated PRs for security patches
- **Secret Scanning + Push Protection** — prevents secrets from being committed
- **Branch Protection** — `main` branch protected against deletion and force-push
- **SARIF Upload** — all Scout scan results uploaded to the
  [Security tab](https://github.com/Kiwi6212/kiwi-os/security/code-scanning)

### CI/CD Security Policy

The Docker Scout workflow uses a **diff-only gate policy**:

- **Push on main / scheduled scans** — report-only mode. CVE alerts
  are uploaded to the Security tab but do not block the pipeline.
- **Pull Requests** — `scout-compare` mode. A PR is blocked if it
  introduces NEW Critical CVEs compared to the `main` baseline.

This approach is the industry standard for container security
(used by Google Container Security, AWS Inspector, GitLab, Snyk).
It prevents noise from upstream CVEs while maintaining strict
regression detection.

### Known Accepted Risks

The following CVE categories are **monitored but not actively fixed**
because they are not exploitable in the deployment context:

#### Go stdlib CVEs in Alpine base images

As of 2026-04-19:
- `postgres:16-alpine` — 1 Critical, 10 High
- `redis:7-alpine` — 5 Critical, 45 High

**Technical rationale**: these CVEs affect Go binaries embedded in
Alpine utility packages (healthchecks, SSL utilities). Neither
PostgreSQL nor Redis exposes a Go HTTP server, so these
vulnerabilities have no attack vector in our deployment context.

**Network isolation**: database ports (5432 for PostgreSQL, 6379
for Redis) are bound to `localhost` only on the VPS, never exposed
to the public internet. Nginx reverse proxy handles public traffic
on ports 80/443 only.

**Automated mitigation**: Dependabot will be configured to monitor
the Docker ecosystem in Phase 1 (once `Dockerfile` artifacts exist),
which will automatically propose tag bumps as upstream Docker Hub
rebuilds images with updated Go stdlib.

## Deployment Security

Production deployment (planned for Phase 5) will run on a personal
VPS (OVH Ubuntu 24.04) with:

- **SSH** — key-based authentication only, password auth disabled
- **Firewall** — UFW with restrictive rules (22/tcp + 80/tcp + 443/tcp only)
- **Reverse Proxy** — Nginx with Let's Encrypt TLS (HTTPS-only,
  HSTS enabled)
- **Fail2ban** — SSH brute-force protection
- **Backups** — automated daily encrypted backups to Proton Drive

## Last Updated

2026-04-19 — Initial security policy drafted during Phase 0.
