@echo off
setlocal
cd /d "%~dp0"

if not exist ".env" (
  echo.
  echo Crazy Bot ist noch nicht eingerichtet.
  echo Die Konfiguration wird jetzt gestartet.
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Configure-Crazy-Bot.ps1"
)

if not exist ".env" (
  echo Keine Konfiguration vorhanden. Start abgebrochen.
  pause
  exit /b 1
)

echo.
echo ==============================================
echo  Crazy Bot
echo ==============================================
echo.
echo Dashboard: http://127.0.0.1:3210
echo Zum Beenden dieses Fensters Strg+C druecken.
echo.

start "" powershell.exe -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://127.0.0.1:3210'"

"%~dp0runtime\node.exe" "%~dp0dist\src\index.js"
set EXITCODE=%ERRORLEVEL%

echo.
echo Crazy Bot wurde beendet. Fehlercode: %EXITCODE%
pause
exit /b %EXITCODE%
