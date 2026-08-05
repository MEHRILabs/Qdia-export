#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "=== QDIA Export — préparation base de données ==="

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERREUR: DATABASE_URL non défini"
  echo "Render → Service qdia-export → Environment → DATABASE_URL (External URL de la base Postgres)"
  exit 1
fi

# Diagnostic clair + retries (DB free cold-start / DNS)
echo "→ Attente / vérification PostgreSQL…"
node ./scripts/wait-for-db.mjs

echo "→ Création/vérification des tables…"
node ./scripts/ensure-app-tables.mjs
node ./scripts/ensure-product-export-fields.mjs || echo "WARN: ensure-product-export-fields"

if [ "${SKIP_DRIZZLE_PUSH:-}" != "1" ] && [ "${NODE_ENV:-}" != "production" ]; then
  echo "→ Synchronisation schéma Drizzle…"
  pnpm -C lib/db run push || echo "WARN: drizzle push (non bloquant)"
else
  echo "→ Drizzle push ignoré (production / SKIP_DRIZZLE_PUSH)"
fi

echo "→ Seed données initiales…"
node ./scripts/seed.mjs || echo "WARN: seed (non bloquant)"

echo "→ Compte administrateur…"
node ./scripts/ensure-admin.mjs || echo "WARN: ensure-admin"

CATALOG_XLS=""
for f in \
  "./data/listing_cahier_de_charge.xlsx" \
  "./data/base_de_donnees_finale.xlsx" \
  "./data/LISTING CAHIER DE CHARGE.xlsx"
do
  if [ -f "$f" ]; then
    CATALOG_XLS="$f"
    break
  fi
done

if [ -n "$CATALOG_XLS" ]; then
  if node ./scripts/should-import-catalog.mjs; then
    echo "→ Import Excel catalogue complet ($CATALOG_XLS)…"
    node ./scripts/import-catalog-variants.mjs "$CATALOG_XLS" || echo "WARN: import Excel"
  else
    echo "→ Catalogue déjà importé — skip import Excel"
  fi
fi

if node ./scripts/should-run-bootstrap.mjs; then
  echo "→ Publication catalogue marketplace…"
  node ./scripts/bootstrap-products.mjs
else
  echo "→ Catalogue déjà publié — skip bootstrap"
fi

echo "→ Correction catégories (marketplace)…"
node ./scripts/fix-product-categories.mjs || echo "WARN: fix catégories"

echo "=== Démarrage serveur API + site ==="
export NODE_ENV=production
export SERVE_WEB=1
cd artifacts/api-server
exec node --enable-source-maps ./dist/index.mjs
