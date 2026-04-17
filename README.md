# Volicion Monorepo

This repository is organized as a single deployment root:

- `backend/` contains the Django API project.
- `frontend/` contains the Vite React app.
- `docker-compose.yml` runs both services plus PostgreSQL, Redis, and Nginx.

## Local deployment

1. Set the backend environment in `backend/.env`.
2. Set the frontend build-time environment if needed.
3. Run `docker-compose up --build` from this root.

## Layout

- `backend/` -> Django, DRF, JWT auth, tests, and production settings.
- `frontend/` -> React SPA, API client, and UI components.
- `deploy/` -> TLS certs and runtime assets for Nginx.
