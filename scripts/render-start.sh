#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

export NODE_ENV=production

echo "Migration base de données…"
pnpm -C lib/db run push || echo "WARN: drizzle push ignoré"

echo "Seed (si nécessaire)…"
node ./scripts/seed.mjs || echo "WARN: seed ignoré"

cd artifacts/api-server
export SERVE_WEB=1
exec node --enable-source-maps ./dist/index.mjs
