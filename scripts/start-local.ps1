$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js 24+ wurde nicht gefunden."
}

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  Write-Host "Eine .env wurde erstellt. Bitte Discord-Daten eintragen." -ForegroundColor Yellow
}

if (-not (Test-Path "node_modules")) {
  Write-Host "Installiere Abhängigkeiten..." -ForegroundColor Cyan
  npm install
}

Write-Host "Starte Crazy_Bot im lokalen Testmodus..." -ForegroundColor Green
npm run dev
