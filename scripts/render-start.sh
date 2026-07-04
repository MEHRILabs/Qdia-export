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

echo "→ Publication catalogue marketplace…"
node ./scripts/bootstrap-products.mjs

echo "→ Correction catégories non classées…"
node ./scripts/fix-product-categories.mjs || echo "WARN: fix catégories"

echo "=== Démarrage serveur API + site ==="
export NODE_ENV=production
export SERVE_WEB=1
cd artifacts/api-server
exec node --enable-source-maps ./dist/index.mjs
