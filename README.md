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

##  Local Development

### Frontend
- cd Desafio05-Front
- npm install
- npm run dev

##  Backend

- cd desafio05-api
- npm install  
- copy .env.example to .env and adjust DATABASE_URL/AUTH_TOKEN/CORS_ORIGIN if needed
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

- Required: set strong `JWT_SECRET`, change `AUTH_USERNAME`/`AUTH_PASSWORD`
- Required: set `CORS_ORIGIN` to an allowlist (not `*`)
- Required: keep `AUTO_CREATE_DB=false`

### Docker (dev / CI)

A small `docker-compose.yml` is included to run a Postgres instance for local development or CI.

- Copy the example env and start the DB:

```powershell
copy .env.dev.example .env.dev
# edit .env.dev if needed
docker compose up -d
```

- The compose file exposes Postgres on port `5432`. The example `.env.dev` sets `DATABASE_URL` to `postgres://postgres:postgres@localhost:5432/central_library` and `AUTO_CREATE_DB=true` so the backend can initialize the DB when running tests.

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

