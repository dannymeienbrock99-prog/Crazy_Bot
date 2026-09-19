import test from 'node:test';
import assert from 'node:assert/strict';
import { appConfigSchema } from '../src/config/schema.js';
import { renderTemplate } from '../src/utils/template.js';

test('Standardkonfiguration ist vollstaendig und erzwingt weissen Embed-Akzent', () => {
  const config = appConfigSchema.parse({});
  assert.equal(config.branding.lockEmbedAccentWhite, true);
  assert.equal(config.branding.embedAccentColor, '#FFFFFF');
  assert.equal(config.welcome.dynamicImage.width, 1200);
  assert.equal(config.welcome.dynamicImage.height, 500);
  assert.equal(config.backup.automaticEnabled, true);
});

test('Welcome-Bildgroesse akzeptiert frei konfigurierbare Werte im Schutzbereich', () => {
  const config = appConfigSchema.parse({
    welcome: { dynamicImage: { width: 1920, height: 720 } }
  });
  assert.equal(config.welcome.dynamicImage.width, 1920);
  assert.equal(config.welcome.dynamicImage.height, 720);
});

test('Template-Variablen werden ersetzt', () => {
  const result = renderTemplate(
    'Willkommen {username} auf {server} - Mitglied #{memberCount}',
    { username: 'TestUser', server: 'Community', memberCount: 42 }
  );
  assert.equal(result, 'Willkommen TestUser auf Community - Mitglied #42');
});

test('TikTok Live Button hat einen sicheren Standardwert', () => {
  const config = appConfigSchema.parse({});
  assert.equal(config.tiktokLive.buttonLabel, 'TikTok öffnen');
});

test('Ungueltige Bildgroessen werden abgelehnt', () => {
  assert.throws(() => appConfigSchema.parse({
    welcome: { dynamicImage: { width: 100, height: 100 } }
  }));
});
