# Volicion Monorepo

This repository is organized as a single deployment root:

- `backend/` contains the Django API project.
- `frontend/` contains the Vite React app.
- `docker-compose.yml` runs both services plus PostgreSQL, Redis, and Nginx.

## Local deployment

1. Set backend secrets in `backend/.env`.
2. Optionally set infrastructure/runtime variables in root `.env` (database credentials, URLs, hosts, cookie settings).
3. Run `docker-compose up --build` from this root.

`docker-compose` now uses environment-variable substitution for DB credentials and service URLs (with safe defaults for local usage).
Migrations are executed by a dedicated one-shot service (`backend-migrate`) before backend startup.

For a production VPS checklist, see [deploy/VPS.md](deploy/VPS.md).

## Layout

- `backend/` -> Django, DRF, JWT auth, tests, and production settings.
- `frontend/` -> React SPA, API client, and UI components.
- `deploy/` -> TLS certs and runtime assets for Nginx.
