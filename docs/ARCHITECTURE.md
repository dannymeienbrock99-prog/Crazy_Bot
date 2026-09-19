# Crazy_Bot Architektur

## Betriebsmodell

Crazy_Bot ist Windows-first. Entwicklung und Abnahme können auf einem normalen Windows-PC erfolgen; produktiv wird dieselbe Anwendung als Windows-Dienst auf Windows Server betrieben.

## Komponenten

1. **Discord Runtime** – discord.js, Slash Commands, Buttons, Events.
2. **Dashboard** – lokales bzw. abgesichertes Web-Dashboard.
3. **Konfiguration** – vollständig validierte Konfiguration über Zod.
4. **SQLite** – lokale persistente Datenbank mit WAL. Für einen einzelnen Bot-Prozess ist dies bewusst einfach und robust.
5. **Medienbibliothek** – frei hochladbare Bilder statt fest eingebauter Kundenmotive.
6. **Bildgenerator** – dynamische Welcome-Bilder über Sharp.
7. **TikTok Watcher** – tiktok-live-connector als austauschbarer Adapter.
8. **Windows Service** – node-windows.

## Sicherheitsprinzipien

- Secrets ausschließlich außerhalb von Git.
- Dashboard standardmäßig nur an 127.0.0.1.
- Bei Netzwerkfreigabe ist ein Access-Key Pflicht.
- Upload-Limit und Bild-MIME-Prüfung.
- Eingaben werden serverseitig validiert.
- Audit-Log für Dashboard-Aktionen.

## Embed-Design

Discord zeigt die Embed-Farbe als vertikalen Akzentbalken links an. Crazy_Bot erzwingt standardmäßig **#FFFFFF**, damit jede Einbettung den gewünschten weißen Balken besitzt. Diese Vorgabe kann zentral administriert werden.

## Erweiterbarkeit

Jedes Feature ist als separates Modul aufgebaut. Die sichtbare Bot-Identität ist unabhängig vom internen Projektnamen.
