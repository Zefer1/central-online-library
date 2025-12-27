#  Central Online Library

A comprehensive library management system built with modern web technologies, providing complete book catalog administration through an intuitive interface and robust backend API.

## 🛠 Tech Stack

**Frontend:** React 18, Vite, React Router, Axios, SCSS  
**Backend:** Node.js, Express, REST API  

##  Features

-  View all books in responsive grid
-  Add new books with form validation
-  Edit existing book details
-  Delete books with confirmation
-  Clean, modern UI with hover effects
-  On-demand AI summaries (3–5 sentences) cached per book

##  Local Development

### Frontend
- cd Desafio05-Front
- npm install
- copy .env.example to .env and adjust `VITE_API_URL` if needed
- npm run dev

##  Backend

- cd desafio05-api
- npm install  
- copy .env.example to .env and adjust `DATABASE_URL`/`AUTH_TOKEN`/`CORS_ORIGIN` if needed
- npm run dev

### Backend details
- Postgres persistence (table `livros`) with optional DB auto-create (see `AUTO_CREATE_DB`).
- Env vars:
	- `PORT`, `DATABASE_URL`, `CORS_ORIGIN`
	- Auth: `AUTH_TOKEN` (legacy static Bearer token), `AUTH_USERNAME`, `AUTH_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRES_IN`
	- `AUTO_CREATE_DB` (set `true` to allow creating the configured database if missing)
- API:
	- `POST /auth/login` (returns JWT)
	- `GET /auth/me`
	- `GET /livros` supports `page`, `pageSize`, `q`, `sort`, `order`, `isbn`, `editora`
	- `POST/PUT/DELETE /livros` require Bearer auth
	- `POST /api/books/:id/ai-summary` generates and stores a short AI summary (Bearer auth required)

### Frontend details
- Configure API url/token via `.env` (`VITE_API_URL`, optional `VITE_API_TOKEN`).
- UI:
	- `/livros` is public (list/search/pagination/sort)
	- `/login` performs login and stores JWT
	- `/livros/cadastro` and `/livros/edicao/:livroId` require login

Notes:
- For local tests the backend test script enables `AUTO_CREATE_DB=true` so tests can auto-create the DB. For production, keep `AUTO_CREATE_DB=false`.

### Production safety

The backend fails fast in `NODE_ENV=production` if insecure defaults are used.

- Required: set `DATABASE_URL` (managed Postgres connection string)
- Required: set strong `JWT_SECRET`, set `AUTH_USERNAME`/`AUTH_PASSWORD`
- Required: set `CORS_ORIGIN` to an allowlist (not `*`)
- Required: keep `AUTO_CREATE_DB=false`
- Recommended: keep seeding disabled (only enable when `SEED=true`)

## Production (Docker)

For a concise portfolio-focused deployment walkthrough, see `DEPLOYMENT.md`.

This repo includes a production compose file that builds and runs:
- Postgres
- API
- Frontend (Nginx serving the Vite build)

The API **fails fast** in `NODE_ENV=production` if insecure defaults are used.

1) Create a production env file:

```powershell
Copy-Item .env.prod.example .env.prod
```

2) Edit `.env.prod` and set strong values for:
- `POSTGRES_PASSWORD`
- `DATABASE_URL`
- `AUTH_USERNAME`, `AUTH_PASSWORD`
- `JWT_SECRET`
- `CORS_ORIGIN` (your frontend origin)
- `WEB_API_URL` (your API base URL)

3) Build and run:

```powershell
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

- Frontend: http://localhost:8080
- API: http://localhost:3001 (healthcheck: `/health`)

### AI usage

- AI is only used on-demand (non-realtime) to generate a short summary for a book, and the result is cached in the database (`ai_summary`, `ai_summary_updated_at`).
- The summary is a contextual aid for quick understanding; it may be generic or imprecise.
- In tests the AI call is mocked; in production it uses OpenAI if `OPENAI_API_KEY` is set, otherwise a deterministic fallback summary is stored.
- Endpoint: `POST /api/books/:id/ai-summary` (set `force=true` to regenerate). The frontend displays the cached summary.

### Docker (dev / CI)

A small `docker-compose.yml` is included to run a Postgres instance for local development or CI.

- Start the DB (defaults work out-of-the-box):

```powershell
docker compose up -d
```

- Optionally, you can pass explicit values via an env file:

```powershell
docker compose --env-file .env.dev.example up -d
```

- The compose file exposes Postgres on port `5432`. The provided `.env.dev.example` contains a suggested `DATABASE_URL` and `AUTO_CREATE_DB=true` for local development/tests.

## Deploy (Railway)

For a portfolio-friendly production setup on Railway (API + managed Postgres, optional frontend), see `DEPLOYMENT.md`.

- To run backend tests against the docker DB:

```powershell
cd desafio05-api
npm install
npm test
```

Stop and remove containers when done:

```powershell
docker compose down -v
```

## Verification

Run a full local verification pass (API tests + frontend lint/tests/build):

```powershell
./scripts/verify.ps1
```

If dependencies are already installed, you can skip `npm ci`:

```powershell
$env:SKIP_INSTALL=1
./scripts/verify.ps1
```

