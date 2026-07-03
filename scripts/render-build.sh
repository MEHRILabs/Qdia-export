#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

corepack enable
corepack prepare pnpm@9.15.9 --activate

# Installe aussi les devDependencies (esbuild, vite, drizzle-kit…)
export NODE_ENV=development
pnpm install --no-frozen-lockfile

pnpm -C artifacts/api-server build

export BASE_PATH=/
export PORT=10000
export VITE_API_URL=
export VITE_GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}"

pnpm -C artifacts/qdia-export build

echo "Build Render terminé."
