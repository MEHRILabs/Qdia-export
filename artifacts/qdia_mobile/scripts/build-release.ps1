# Build release Android (APK + AAB) pour Google Play
# Usage: .\scripts\build-release.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$apiUrl = "https://qdia-export.onrender.com"

Write-Host ">> Build QDIA Export DZ — API: $apiUrl"

flutter pub get
flutter build apk --release --dart-define=API_URL=$apiUrl
flutter build appbundle --release --dart-define=API_URL=$apiUrl

Write-Host ""
Write-Host "APK : build\app\outputs\flutter-apk\app-release.apk"
Write-Host "AAB : build\app\outputs\bundle\release\app-release.aab"
