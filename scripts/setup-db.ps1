# Initialise PostgreSQL pour QDIA Export (Windows)
# Usage : . .\scripts\setup-db.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"

Write-Host ""
Write-Host "=== QDIA Export - Configuration base de donnees ===" -ForegroundColor Cyan

if (-not (Test-Path $envFile)) {
  Copy-Item (Join-Path $root ".env.example") $envFile
  Write-Host "Fichier .env cree depuis .env.example" -ForegroundColor Yellow
}

$content = Get-Content $envFile -Raw
if ($content -match "VOTRE_MOT_DE_PASSE|sk-votre-cle") {
  Write-Host ""
  Write-Host "ATTENTION : Editez .env et remplacez :" -ForegroundColor Red
  Write-Host "  - VOTRE_MOT_DE_PASSE  (mot de passe PostgreSQL)" -ForegroundColor White
  Write-Host "  - sk-votre-cle-openai-ici  (cle OpenAI)" -ForegroundColor White
  Write-Host ""
  Write-Host "Fichier : $envFile" -ForegroundColor Gray
  Write-Host ""
  Write-Host "Puis relancez : . .\scripts\setup-db.ps1" -ForegroundColor Yellow
  Write-Host ""
  exit 1
}

. (Join-Path $root "env\load-env.ps1")

Set-Location $root
Write-Host "Creation des tables (drizzle push)..." -ForegroundColor Green
pnpm --filter @workspace/db run push
if ($LASTEXITCODE -ne 0) {
  Write-Host "Echec push - verifiez DATABASE_URL et PostgreSQL" -ForegroundColor Red
  exit 1
}

Write-Host "Insertion des donnees demo (seed)..." -ForegroundColor Green
pnpm run seed
if ($LASTEXITCODE -ne 0) {
  Write-Host "Echec seed" -ForegroundColor Red
  exit 1
}

Write-Host ""
Write-Host "Base qdia_export prete ! Lancez : pnpm dev" -ForegroundColor Green
Write-Host ""
