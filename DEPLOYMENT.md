# Deployment Guide (Portfolio)

This project is designed to be easy to run locally and easy to deploy for a portfolio demo.

## Option A — Docker Compose (recommended for demos)

Prereqs: Docker Desktop.

1) Create the production env file:

```powershell
Copy-Item .env.prod.example .env.prod
```

2) Edit `.env.prod` (strong secrets + correct URLs/origins).

3) Build + run:

```powershell
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

- Frontend: http://localhost:8080
- API: http://localhost:3001
- API health: http://localhost:3001/health

## Option B — Deploy API + Frontend separately

This is a common portfolio setup.

### API (Node/Express)

Deploy to any Node-friendly platform (Render / Fly.io / Railway / a small VM).

Required env vars (production):
- `NODE_ENV=production`
- `DATABASE_URL` (managed Postgres connection string)
- `CORS_ORIGIN` (your frontend origin, e.g. `https://your-site.netlify.app`)
- `JWT_SECRET` (strong random string)
- Optional: `ENABLE_ENV_ADMIN=true` + `AUTH_USERNAME`/`AUTH_PASSWORD` (enable env-admin login)
- Optional: `DISABLE_REGISTRATION=true` (disable open self-signup)
- Optional: `JWT_EXPIRES_IN`, `PORT`
- Optional AI: `OPENAI_API_KEY`

Notes:
- The API fails fast in production if required env vars are missing.
- `/health` checks DB connectivity.

### Frontend (React/Vite built to static files)

Deploy the static frontend to Netlify / Vercel / Cloudflare Pages.

At runtime, configure the API URL (no rebuild needed in Docker):
- When running the provided Nginx image, set `API_URL` on the container.

If deploying to a pure static host (without the Docker image):
- Ensure `public/config.js` is served and set `window.__APP_CONFIG__.API_URL` to your API base URL.

Example:
```js
window.__APP_CONFIG__ = { API_URL: 'https://your-api.example.com' }
```

## Option C — Railway (minimal production)

This is a great “portfolio production” target: fast setup, managed Postgres, and easy logs.

### 1) Create services

1) Create a new Railway project from this GitHub repo.
2) Add **PostgreSQL** to the project (Railway plugin).
3) Add a **Service** for the API:
	- Root directory: `desafio05-api`
	- Build: use the included Dockerfile (Railway detects it)
4) (Optional) Add a **Service** for the frontend:
	- Root directory: `Desafio05-Front`
	- Build: use the included Dockerfile (Nginx serving the built SPA)

### 2) Configure required env vars (API)

Set these in the API service:
- `NODE_ENV=production`
- `DATABASE_URL` (use the value provided by the Railway Postgres plugin)
- `CORS_ORIGIN` (your frontend origin, e.g. `https://your-frontend.up.railway.app`)
- `JWT_SECRET` (strong random string)

Optional but recommended:
- `ENABLE_ENV_ADMIN=true` + `AUTH_USERNAME`/`AUTH_PASSWORD` (enable env-admin login)
- `DISABLE_REGISTRATION=true` (disable open self-signup)
- `JWT_EXPIRES_IN=1d`

Notes:
- In production the API requires `DATABASE_URL`.
- Seeding is **opt-in**: only happens when `SEED=true`.

### 3) Configure env vars (Frontend, if hosted on Railway)

Set this in the frontend service:
- `API_URL=https://<your-api-domain>`

This updates `public/config.js` at container start (no rebuild needed).

## Quick verification

Run all checks locally:

- PowerShell: `scripts/verify.ps1`
- Bash: `scripts/verify.sh`

Set `SKIP_INSTALL=1` if you already installed dependencies.
