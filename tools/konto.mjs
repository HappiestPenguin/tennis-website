#!/usr/bin/env node
/**
 * Konten für die Online-Redaktion anlegen, ändern oder entfernen.
 *
 *   node tools/konto.mjs anlegen <kennung> <passwort> ["Anzeigename"] [email]
 *   node tools/konto.mjs entfernen <kennung>
 *   node tools/konto.mjs liste
 *
 * Gespeichert wird in server-konten.json (NICHT im Git – steht in .gitignore), und zwar nur als
 * Hash (PBKDF2-SHA256), nie das Passwort selbst. „npm run strato“ übernimmt die Konten in das
 * Upload-Paket (intern/benutzer.php). Beim ersten Anmelden stellt der Server den Hash automatisch
 * auf das PHP-Standardverfahren um. Später kann jede Person ihr Passwort in der Redaktion ändern.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATEI = path.join(ROOT, 'server-konten.json');
const laden = () => (fs.existsSync(DATEI) ? JSON.parse(fs.readFileSync(DATEI, 'utf8')) : {});
const speichern = (k) => fs.writeFileSync(DATEI, JSON.stringify(k, null, 2) + '\n');

export function hashe(passwort) {
  const salz = crypto.randomBytes(16);
  const iterationen = 210000;
  const h = crypto.pbkdf2Sync(passwort, salz, iterationen, 32, 'sha256');
  return `pbkdf2_sha256$${iterationen}$${salz.toString('base64')}$${h.toString('base64')}`;
}

export function kontenAlsPhp(konten = laden()) {
  const q = (s) => `'${String(s ?? '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  const zeilen = Object.entries(konten).map(([k, b]) => `  ${q(k)} => ['name' => ${q(b.name)}, 'email' => ${q(b.email)}, 'hash' => ${q(b.hash)}],`);
  return `<?php\n// Konten der Redaktion – Passwörter nur als Hash. Neue Konten: siehe README (Abschnitt Redaktion).\nreturn [\n${zeilen.join('\n')}\n];\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const [befehl, kennung, passwort, name, email] = process.argv.slice(2);
  const konten = laden();
  if (befehl === 'anlegen' && kennung && passwort) {
    if (passwort.length < 8) {
      console.error('✖ Das Passwort braucht mindestens 8 Zeichen.');
      process.exit(1);
    }
    const k = kennung.toLowerCase();
    konten[k] = { name: name || kennung, email: (email || '').toLowerCase(), hash: hashe(passwort) };
    speichern(konten);
    console.log(`✔ Konto „${k}“ gespeichert. Mit „npm run strato“ ins Upload-Paket übernehmen.`);
  } else if (befehl === 'entfernen' && kennung) {
    delete konten[kennung.toLowerCase()];
    speichern(konten);
    console.log(`✔ Konto „${kennung}“ entfernt.`);
  } else if (befehl === 'liste') {
    for (const [k, b] of Object.entries(konten)) console.log(`• ${k}  (${b.name}${b.email ? ', ' + b.email : ''})`);
    if (!Object.keys(konten).length) console.log('Noch keine Konten.');
  } else {
    console.log('Aufruf:\n  node tools/konto.mjs anlegen <kennung> <passwort> ["Anzeigename"] [email]\n  node tools/konto.mjs entfernen <kennung>\n  node tools/konto.mjs liste');
  }
}
