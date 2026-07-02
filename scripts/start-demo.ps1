# Démarre API + site web pour test admin (Windows)
# Usage: .\scripts\start-demo.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "=== QDIA Export — démarrage démo ===" -ForegroundColor Cyan
Write-Host "Comptes test:" -ForegroundColor Yellow
Write-Host "  Admin    : admin@qdiadz.com / demo1234"
Write-Host "  Fournisseur : supplier@qdiadz.com / demo1234"
Write-Host ""

# API
Write-Host "Build API..." -ForegroundColor Gray
Push-Location "$Root\artifacts\api-server"
pnpm run build
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }
Pop-Location

$apiJob = Start-Job -ScriptBlock {
  Set-Location $using:Root
  Set-Location "artifacts\api-server"
  $env:PORT = "8080"
  node --enable-source-maps ./dist/index.mjs
}

Start-Sleep -Seconds 3

# Site
$env:PORT = "25180"
$env:BASE_PATH = "/"
Push-Location "$Root\artifacts\qdia-export"
Write-Host "Site : http://localhost:25180" -ForegroundColor Green
Write-Host "API  : http://localhost:8080" -ForegroundColor Green
Write-Host "Admin: http://localhost:25180/admin" -ForegroundColor Green
Write-Host "Ctrl+C pour arreter" -ForegroundColor Gray
try {
  pnpm run dev
} finally {
  Stop-Job $apiJob -ErrorAction SilentlyContinue
  Remove-Job $apiJob -Force -ErrorAction SilentlyContinue
  Pop-Location
}
