# Crazy_Bot / Kori

Crazy_Bot ist die technische Projektbasis für einen vollständig konfigurierbaren Discord-Bot. Der sichtbare Botname ist **nicht fest verdrahtet** und kann im Dashboard geändert werden.

## Zielbild

- komplett deutschsprachiges Web-Dashboard
- Windows-PC zum Testen, später Windows Server
- Botname, Server-Nickname, Dashboard-Name, Profilbilder, Logos und Modulbilder frei einstellbar
- Welcome/Welcome-Log mit dynamischem Bildeditor und frei einstellbarer Breite/Höhe
- Rollenverwaltung mit Auto-Rollen und selbst zuweisbaren Rollen
- Regeln mit einmalig veröffentlichter, später aktualisierbarer Nachricht
- TikTok-Live-Benachrichtigungen
- Mod-Stempel mit Teilnahmebuttons
- Streamplan
- Server-Statistiken
- Hangman
- zentraler Embed-Editor
- **weißer Discord-Embed-Akzentbalken (#FFFFFF) standardmäßig global erzwungen**
- Backups, Audit-Logs und Diagnose

## Entwicklungsstand

Aktive Entwicklung: `feature/kori-v1`

## Schnellstart lokal unter Windows

1. Node.js 24+ installieren.
2. Repository klonen und Branch `feature/kori-v1` auschecken.
3. `.env.example` nach `.env` kopieren.
4. Discord-Werte in `.env` eintragen.
5. `npm install`
6. `npm run dev`
7. Dashboard: `http://127.0.0.1:3210`

Alternativ: `npm run start:local`

## Sicherheit

Discord-Tokens und andere Secrets niemals committen. Das Dashboard bindet standardmäßig nur an localhost. Für Netzwerkzugriff muss zusätzlich `DASHBOARD_ACCESS_KEY` gesetzt werden.

## Windows Server

Die produktive Installation ist als Windows-Dienst vorgesehen. Die PowerShell-Service-Skripte werden im Projekt mitgeführt und im weiteren Ausbau in einen Installer eingebunden.
