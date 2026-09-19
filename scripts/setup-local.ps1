$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

function Read-Required([string]$Prompt) {
  do { $value = Read-Host $Prompt } while ([string]::IsNullOrWhiteSpace($value))
  return $value.Trim()
}

Write-Host ""
Write-Host "Crazy Bot - lokale Ersteinrichtung" -ForegroundColor Magenta
Write-Host "Die Zugangsdaten werden nur in .env auf diesem PC gespeichert." -ForegroundColor DarkGray
Write-Host ""

$tokenSecure = Read-Host "Discord Bot Token" -AsSecureString
$token = [System.Net.NetworkCredential]::new("", $tokenSecure).Password
if ([string]::IsNullOrWhiteSpace($token)) { throw "Discord Bot Token darf nicht leer sein." }

$clientId = Read-Required "Discord Client ID"
$guildId = Read-Host "Discord Test-Server ID (optional, fuer sofortige Slash Commands)"
$port = Read-Host "Dashboard Port [3210]"
if ([string]::IsNullOrWhiteSpace($port)) { $port = "3210" }

$envText = @"
DISCORD_TOKEN=$token
DISCORD_CLIENT_ID=$clientId
DISCORD_GUILD_ID=$guildId

DASHBOARD_HOST=127.0.0.1
DASHBOARD_PORT=$port
DASHBOARD_ACCESS_KEY=

DATA_DIR=./data
LOG_LEVEL=info
"@

Set-Content -Path ".env" -Value $envText -Encoding UTF8
Write-Host ".env wurde lokal erstellt." -ForegroundColor Green

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Node.js 24+ fehlt. Bitte zuerst Node.js 24 installieren."
}

$version = [Version]((node -p "process.versions.node").Trim())
if ($version.Major -lt 24) {
  throw "Node.js 24+ ist erforderlich. Gefunden: $version"
}

if (-not (Test-Path "node_modules")) {
  Write-Host "Installiere Abhaengigkeiten..." -ForegroundColor Cyan
  npm install
}

Write-Host ""
Write-Host "Einrichtung abgeschlossen." -ForegroundColor Green
Write-Host "Start: npm run start:local"
Write-Host "Dashboard: http://127.0.0.1:$port"
Write-Host ""
Write-Host "Wichtig: .env niemals in GitHub hochladen." -ForegroundColor Yellow
