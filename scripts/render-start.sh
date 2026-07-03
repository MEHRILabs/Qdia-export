#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== QDIA Export — préparation base de données ==="

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERREUR: DATABASE_URL non défini"
  exit 1
fi

echo "→ Création/vérification des tables…"
node ./scripts/ensure-app-tables.mjs

echo "→ Synchronisation schéma Drizzle…"
pnpm -C lib/db run push || echo "WARN: drizzle push (non bloquant)"

echo "→ Seed données initiales…"
node ./scripts/seed.mjs || echo "WARN: seed (non bloquant)"

echo "=== Démarrage serveur API + site ==="
export NODE_ENV=production
export SERVE_WEB=1
cd artifacts/api-server
exec node --enable-source-maps ./dist/index.mjs
