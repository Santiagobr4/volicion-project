# VPS Deployment Guide

This guide assumes Ubuntu 22.04/24.04, Docker Engine, and Docker Compose plugin installed on the VPS.

## 1. Server prerequisites

Install Docker and Compose on the VPS, then verify:

```bash
docker --version
docker compose version
```

Open ports `80` and `443` in your firewall/security group.

## 2. Domain and DNS

Point a domain or subdomain to the VPS public IP, for example:

- `app.example.com`

Use that exact hostname in production variables.

## 3. Clone the project

```bash
git clone <repo-url> volicion-project
cd volicion-project
```

## 4. Create production environment files

Create a root `.env` file with production values. A safe starting point:

```env
POSTGRES_DB=habit_tracker
POSTGRES_USER=habit_user
POSTGRES_PASSWORD=replace-with-strong-password

DATABASE_URL=postgresql://habit_user:replace-with-strong-password@db:5432/habit_tracker
REDIS_URL=redis://redis:6379/1

ALLOWED_HOSTS=app.example.com
CORS_ALLOWED_ORIGINS=https://app.example.com
CSRF_TRUSTED_ORIGINS=https://app.example.com

AUTH_REFRESH_COOKIE_SECURE=true
AUTH_REFRESH_COOKIE_SAMESITE=Strict
```

Create `backend/.env` with at least:

```env
SECRET_KEY=replace-with-a-long-random-secret
DEBUG=false
ENV=production
TIME_ZONE=America/Bogota
```

Use a different, strong `SECRET_KEY` than any local/dev environment.

## 5. TLS certificates

The frontend Nginx container expects:

- `deploy/certs/fullchain.pem`
- `deploy/certs/privkey.pem`

Place your certificate files there before starting the stack.

If you use Let’s Encrypt, copy the issued certs into that folder or mount them from the host.

## 6. Frontend API settings

For production with the same Nginx host, keep:

```env
VITE_API_BASE_URL=/api
```

The frontend will talk to the same origin, which avoids CORS and cookie issues.

## 7. Start the stack

From the project root:

```bash
docker compose up -d --build
```

What happens:

- `backend-migrate` runs Django migrations once
- `backend` starts Gunicorn
- `frontend` serves the SPA and proxies `/api` to Django

## 8. Verify the deployment

Check these URLs:

- `https://app.example.com`
- `https://app.example.com/api/token/`
- `https://app.example.com/api/profile/`

Then verify the app flow:

1. Register a user.
2. Log in.
3. Refresh the page and confirm session restoration.
4. Log out.
5. Confirm `/api/token/refresh/` fails after logout.

## 9. Updating the deployment

When you deploy a new version:

```bash
git pull
docker compose up -d --build
```

If migrations were added, the `backend-migrate` service will run them before backend starts.

## 10. Avatar media in production

Profile images are served by Nginx from `/media/avatars/` using a shared Docker volume.

Checklist:

- `backend` writes uploads to `/app/media/avatars/`
- `frontend` mounts the same volume as `/mediafiles`
- Nginx serves `location ^~ /media/avatars/` with `alias /mediafiles/avatars/`

Quick verification commands:

```bash
docker compose exec backend ls -lah /app/media/avatars
docker compose exec frontend ls -lah /mediafiles/avatars
curl -I https://app.example.com/media/avatars/<filename>.jpg
```

Expected result: the image URL returns `HTTP/2 200`.
