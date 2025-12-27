#!/usr/bin/env sh
set -eu

# Writes a runtime config file for the SPA so we don't need to rebuild the image
# to change API endpoints.
#
# Usage:
#   - set env var API_URL (e.g. https://api.example.com)
#   - container serves /config.js with window.__APP_CONFIG__.API_URL

TARGET="/usr/share/nginx/html/config.js"

API_URL_VALUE="${API_URL:-}"

cat > "$TARGET" <<EOF
window.__APP_CONFIG__ = {
  API_URL: "${API_URL_VALUE}",
};
EOF
