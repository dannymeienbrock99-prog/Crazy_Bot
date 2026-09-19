param()

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

function Read-Required([string]$Prompt) {
    do { $value = Read-Host $Prompt } while ([string]::IsNullOrWhiteSpace($value))
    return $value.Trim()
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor DarkMagenta
Write-Host " Crazy Bot - Discord Einrichtung" -ForegroundColor Magenta
Write-Host "==============================================" -ForegroundColor DarkMagenta
Write-Host ""
Write-Host "Die Zugangsdaten bleiben lokal auf diesem PC." -ForegroundColor DarkGray
Write-Host ""

$existing = Join-Path $Root ".env"
if (Test-Path $existing) {
    $answer = Read-Host "Es existiert bereits eine Konfiguration. Neu einrichten? (j/N)"
    if ($answer -notin @("j","J","ja","JA","Ja")) {
        Write-Host "Vorhandene Konfiguration bleibt erhalten." -ForegroundColor Green
        Read-Host "Enter zum Schliessen"
        exit 0
    }
}

$tokenSecure = Read-Host "Discord Bot Token" -AsSecureString
$token = [System.Net.NetworkCredential]::new("", $tokenSecure).Password
if ([string]::IsNullOrWhiteSpace($token)) { throw "Discord Bot Token darf nicht leer sein." }

$clientId = Read-Required "Discord Application / Client ID"
$guildId = Read-Host "Discord Test-Server ID (optional)"
$port = Read-Host "Dashboard-Port [3210]"
if ([string]::IsNullOrWhiteSpace($port)) { $port = "3210" }

if ($port -notmatch '^\d+$' -or [int]$port -lt 1024 -or [int]$port -gt 65535) {
    throw "Der Port muss zwischen 1024 und 65535 liegen."
}

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

Set-Content -Path $existing -Value $envText -Encoding UTF8

Write-Host ""
Write-Host "Konfiguration gespeichert." -ForegroundColor Green
Write-Host "Dashboard nach dem Start: http://127.0.0.1:$port" -ForegroundColor Cyan
Write-Host ""
Read-Host "Enter zum Schliessen"
