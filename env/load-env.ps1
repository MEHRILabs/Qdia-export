# Charge les variables d'environnement QDIA Export dans la session PowerShell courante
# Usage : copiez d'abord .env.example vers .env, puis :
#   . .\env\load-env.ps1

$root = Split-Path -Parent $PSScriptRoot

function Import-DotEnv($path) {
  if (-not (Test-Path $path)) {
    Write-Warning "Fichier introuvable : $path"
    return
  }
  Get-Content $path | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    $parts = $_ -split '=', 2
    if ($parts.Count -eq 2) {
      [System.Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), 'Process')
    }
  }
}

Import-DotEnv (Join-Path $root ".env")
Import-DotEnv (Join-Path $root "artifacts\qdia-export\.env")

Write-Host "Variables chargees :" -ForegroundColor Green
Write-Host "  DATABASE_URL     = $(if ($env:DATABASE_URL) { 'OK' } else { 'MANQUANT' })"
Write-Host "  GOOGLE_CLIENT_ID = $(if ($env:GOOGLE_CLIENT_ID) { 'OK' } else { 'MANQUANT' })"
Write-Host "  GOOGLE_MAPS      = $(if ($env:GOOGLE_MAPS_API_KEY) { 'OK' } else { 'MANQUANT' })"
Write-Host "  FIREBASE         = $(if ($env:FIREBASE_PROJECT_ID) { 'OK' } else { 'MANQUANT' })"
Write-Host "  OPENAI_API_KEY   = $(if ($env:OPENAI_API_KEY) { 'OK' } else { 'MANQUANT' })"
Write-Host "  GROQ_API_KEY     = $(if ($env:GROQ_API_KEY) { 'OK' } else { 'MANQUANT' })"
Write-Host "  GEMINI_API_KEY   = $(if ($env:GEMINI_API_KEY) { 'OK' } else { 'MANQUANT' })"
Write-Host "  ANTHROPIC_API_KEY= $(if ($env:ANTHROPIC_API_KEY) { 'OK' } else { 'MANQUANT' })"
Write-Host "  REMOVEBG_API_KEY = $(if ($env:REMOVEBG_API_KEY) { 'OK' } else { 'optionnel' })"
Write-Host "  JWT_SECRET       = $(if ($env:JWT_SECRET) { 'OK' } else { 'MANQUANT' })"
Write-Host "  VITE_API_URL     = $env:VITE_API_URL"
Write-Host "  VITE_GOOGLE      = $(if ($env:VITE_GOOGLE_CLIENT_ID) { 'OK' } else { 'MANQUANT' })"
Write-Host "  VITE_MAPS        = $(if ($env:VITE_GOOGLE_MAPS_API_KEY) { 'OK' } else { 'MANQUANT' })"
Write-Host "  PORT (API)       = $env:PORT"
