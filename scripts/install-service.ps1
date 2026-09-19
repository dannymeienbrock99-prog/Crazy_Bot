$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not (Test-Path ".env")) {
  throw ".env fehlt. Erst konfigurieren und lokal testen."
}

npm install
npm run build

Write-Host "Installiere Windows-Dienst..." -ForegroundColor Cyan
node .\scripts\service.cjs install
Write-Host "Crazy Bot wurde als Windows-Dienst eingerichtet." -ForegroundColor Green
