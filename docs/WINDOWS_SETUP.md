# Windows Test und Server Installation

## 1. Lokal testen - ohne eigenen Server

Voraussetzungen:

- Windows 10/11 oder Windows Server
- Node.js 24 oder neuer
- Ein Discord Bot im Discord Developer Portal
- Bot Token und Client ID
- Fuer schnelle Slash-Command-Tests optional die ID eines Testservers

PowerShell im Projektordner:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-local.ps1
npm run start:local
```

Danach:

```text
http://127.0.0.1:3210
```

Der Bot funktioniert im lokalen Test genauso wie spaeter auf dem Windows Server. Wenn der Test-PC ausgeschaltet wird, ist der Bot offline.

## 2. Benötigte Discord Intents

Im Developer Portal fuer den Bot aktivieren:

- Server Members Intent
- Message Content Intent

Guilds, Guild Messages und Voice States werden durch die Anwendung verwendet.

## 3. Empfohlene Discord Berechtigungen

Nur die Rechte vergeben, die fuer die aktivierten Module benoetigt werden:

- Kanaele ansehen
- Nachrichten senden
- Nachrichtenverlauf lesen
- Links einbetten
- Dateien anhaengen
- Rollen verwalten
- Nachrichten verwalten, falls spaeter benoetigt
- @everyone/@here erwaehnen, wenn TikTok Live @everyone nutzen soll

Die Bot-Rolle muss oberhalb der Rollen stehen, die Crazy Bot vergeben oder entfernen soll.

## 4. Windows Server

Nach erfolgreichem Test:

```powershell
npm install
npm run build
npm run service:install
```

Dadurch wird Crazy Bot als Windows-Dienst installiert. Der Bot kann anschliessend ohne angemeldeten Desktop-Benutzer laufen.

Dienst entfernen:

```powershell
npm run service:remove
```

## 5. Test-PC auf Server migrieren

Im Dashboard:

1. Backup & Migration oeffnen.
2. Backup herunterladen.
3. Die erzeugte `.koribackup` auf den Windows Server kopieren.
4. Crazy Bot dort installieren und starten.
5. Im Dashboard das Backup importieren.
6. Discord-Verbindung und Kanal-/Rollenrechte pruefen.

Das Backup enthaelt Konfiguration, hochgeladene Medien und persistente Modul-Daten. Secrets aus `.env` werden bewusst nicht exportiert.

## 6. Netzwerkzugriff auf das Dashboard

Standard:

```env
DASHBOARD_HOST=127.0.0.1
```

Damit ist das Dashboard nur auf dem Server selbst erreichbar.

Soll das Dashboard im LAN erreichbar sein, einen passenden Host setzen und unbedingt einen Zugriffsschluessel konfigurieren:

```env
DASHBOARD_HOST=0.0.0.0
DASHBOARD_ACCESS_KEY=EIN_LANGER_ZUFAELLIGER_SCHLUESSEL
```

Fuer einen spaeteren Internetzugriff wird ein Reverse Proxy mit HTTPS und zusaetzlicher Authentifizierung empfohlen.
