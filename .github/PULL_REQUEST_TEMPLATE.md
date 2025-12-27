<!-- Title suggestion: Production-ready: auth + ratings + docker/CI + register UX -->

## Summary

This PR prepares the project for production and portfolio presentation by:
- Adding authentication improvements, user registration and tests
- Adding book ratings backend + migrations and tests
- Improving frontend UX when registration is disabled (friendly banner + toast)
- Adding Dockerfiles, `docker-compose.prod.yml` and CI workflow
- Removing tracked `node_modules` and `.env*` files

## What to check

- [ ] API tests pass (`desafio05-api`)
- [ ] Frontend lint, tests and build pass (`Desafio05-Front`)
- [ ] CI workflow (GitHub Actions) is green after opening PR

## How to test locally

From repo root:

```powershell
PowerShell -ExecutionPolicy Bypass -File .\scripts\verify.ps1
```

Or per project:

```powershell
cd desafio05-api; npm ci; npm test
cd ..\Desafio05-Front; npm ci; npm test; npm run build
```

## Notes

- The repo was cleaned to avoid tracking `node_modules` and `.env*` accidentally.
- If you need me to open the PR for you, install/configure `gh` or provide a PAT and I can attempt an automated creation.
