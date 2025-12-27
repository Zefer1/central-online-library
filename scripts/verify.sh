#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

step() {
  echo
  echo "=== $1 ==="
}

step "Verify API (tests)"
(
  cd "$repo_root/desafio05-api"
  if [[ -z "${SKIP_INSTALL:-}" ]]; then
    npm ci
  fi
  npm test
)

step "Verify Frontend (lint/test/build)"
(
  cd "$repo_root/Desafio05-Front"
  if [[ -z "${SKIP_INSTALL:-}" ]]; then
    npm ci
  fi
  npm run lint
  npm test
  npm run build
)

echo
echo "All checks passed."
