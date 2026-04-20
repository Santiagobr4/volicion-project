# VOLICION Frontend

Frontend application for VOLICION built with React + Vite.

## Overview

This SPA consumes the Django API and provides:

- Authentication (login/register)
- HttpOnly-cookie refresh + in-memory access token auth flow
- Weekly habit tracking
- Historical analytics
- Leaderboard/ranking
- Profile management and avatar upload

## Stack

- React 19
- Vite
- Axios
- Recharts
- TailwindCSS utilities
- ESLint

## Requirements

- Node.js 20+
- pnpm 9+

## Environment Variables

Create `.env` in the frontend root:

```env
# Local backend URL for Vite dev server
VITE_API_BASE_URL=http://localhost:8000/api

# Optional: target used by Vite proxy when frontend uses /api
VITE_API_PROXY_TARGET=http://localhost:8000
```

If you switch to production Nginx/domain setup, set `VITE_API_BASE_URL=/api` (same-origin) or a full HTTPS API origin.

The frontend now resolves API base URL in this order:

1. `VITE_API_BASE_URL` when set
2. fallback to `/api`

In development, Vite proxies `/api` to `VITE_API_PROXY_TARGET` (or `http://localhost:8000` by default), which avoids CORS/cookie mismatches.

## Run in Development

```bash
pnpm install
pnpm dev
```

Default dev URL: `http://localhost:5173`

## Build for Production

```bash
pnpm lint
pnpm build
pnpm preview
pnpm test:run
```

## Folder Structure

```text
src/
	api/          # Axios client and API wrappers
	components/   # UI components and panels
	hooks/        # Shared logic hooks
	utils/        # Formatting and visual helpers
```

## API Integration

This app expects the following backend endpoints:

- `POST /api/register/`
- `POST /api/token/`
- `POST /api/token/refresh/`
- `POST /api/logout/`
- `GET/PATCH /api/profile/`
- `GET/POST/PATCH/DELETE /api/habits/`
- `GET /api/habits/weekly/`
- `GET /api/habits/tracker-metrics/`
- `GET /api/habits/history/`
- `GET /api/habits/leaderboard/`
- `POST /api/logs/`

## Deployment Notes

- Build static assets with `pnpm build`.
- In Docker deployment, frontend image uses Nginx (`nginx/default.conf`) to:
  - serve `dist`
  - proxy `/api/` requests to backend service
- Configure strict CSP and HTTPS in production.

## Authentication Notes

- Access token is kept in memory only (not localStorage/sessionStorage).
- Refresh token is managed by backend cookie (HttpOnly).
- On app bootstrap, frontend requests `/api/token/refresh/` to restore session.

## Quality and Standards

- Linting is enforced via ESLint.
- Code follows component + hook separation.
- Error/loading states are handled at panel level.
