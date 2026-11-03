#!/usr/bin/env node
/**
 * build.mjs – baut die komplette Website aus content/ und data/ in den Ordner dist/.
 *
 *   node build.mjs                    → normaler Aufruf (npm run build)
 *   BASE_PATH=/repo node build.mjs    → wenn die Seite in einem Unterordner liegt (z. B. GitHub Pages ohne eigene Domain)
 *   VORSCHAU=1 SITE_URL=https://maik.bsg-tennis.de node build.mjs
 *                                     → Test-/Vorschauversion: für Suchmaschinen gesperrt,
 *                                       eigene Adresse (schreibt dazu eine CNAME-Datei für GitHub Pages)
 *
 * Ablauf:
 *   1. dist/ leeren, Dateien aus public/ (CSS, JS, Bilder …) hineinkopieren
 *   2. Inhalte einlesen, Wetter abrufen (lib/weather.mjs)
 *   3. Alle Seiten erzeugen (lib/site.mjs – derselbe Code wie die Live-Vorschau der Redaktion)
 *   4. Kalender, RSS, Sitemap, Kontaktkarten, Weiterleitungen und die Online-Redaktion schreiben
 *
 * Es werden keine externen Pakete benötigt – nur Node.js ab Version 18.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderSite } from './lib/site.mjs';
import { NEWS_JAHRE } from './lib/content.mjs';
import { ladeWetter } from './lib/weather.mjs';
import * as F from './lib/feeds.mjs';
import { slugify, heuteIso } from './lib/helpers.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const PUBLIC = path.join(ROOT, 'public');
const BASE = (process.env.BASE_PATH || '').replace(/\/$/, '');
const VORSCHAU = process.env.VORSCHAU === '1'; // Testversion: nicht in Suchmaschinen
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, ''); // abweichende Adresse, z. B. für die Vorschau

/** Ordner mit bearbeitbaren Inhalten – dieselben, die die Redaktion lesen und schreiben darf. */
export const INHALTS_ORDNER = ['content/news', 'content/seiten', 'data'];

/** Alle Inhalte als { 'data/verein.json': '…', … } einlesen. */
export function leseInhalte(root = ROOT) {
  const files = {};
  for (const dir of INHALTS_ORDNER) {
    for (const f of fs.readdirSync(path.join(root, dir))) {
      if (/\.(md|json)$/.test(f)) files[`${dir}/${f}`] = fs.readFileSync(path.join(root, dir, f), 'utf8');
    }
  }
  return files;
}

export async function build({ quiet = false } = {}) {
  const t0 = Date.now();

  // ---- 1. Ausgabeordner vorbereiten -------------------------------------
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  copyDir(PUBLIC, DIST);

  // ---- 2. Inhalte + Wetter ------------------------------------------------
  const files = leseInhalte();
  const wetter = await ladeWetter(path.join(ROOT, '.cache'));

  // ---- 3. Seiten erzeugen und schreiben -----------------------------------
  const site = renderSite({
    files,
    heute: heuteIso(),
    wetter,
    BASE,
    SITE_URL,
    VORSCHAU,
    medienLokal: (rel) => fs.existsSync(path.join(PUBLIC, 'media', rel)),
  });
  const { pages, stats, verein, vorstand, termine, posts, aktuell, alben } = site;
  for (const p of pages) {
    const file = p.url.endsWith('/') ? path.join(DIST, p.url, 'index.html') : path.join(DIST, p.url);
    write(file, p.html);
  }

  // ---- 4. Zusatzdateien ---------------------------------------------------
  for (const [alt, neu] of Object.entries(F.ALTE_ADRESSEN)) write(path.join(DIST, alt), F.redirect(BASE + neu));
  write(path.join(DIST, 'termine.ics'), F.ics({ termine, verein }));
  write(path.join(DIST, 'feed.xml'), F.rss({ posts: aktuell.slice(0, 20), verein, BASE }));
  write(path.join(DIST, 'sitemap.xml'), F.sitemap({ urls: pages.filter((p) => !p.noindex && !p.raw && p.url !== '/404.html').map((p) => p.url), verein, BASE }));
  write(
    path.join(DIST, 'robots.txt'),
    VORSCHAU ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${verein.url}${BASE}/sitemap.xml\n`
  );
  // Eigene Adresse für GitHub Pages (z. B. maik.bsg-tennis.de)
  if (SITE_URL && !BASE) write(path.join(DIST, 'CNAME'), new URL(SITE_URL).hostname + '\n');
  write(path.join(DIST, 'linkziele.json'), JSON.stringify(site.linkziele));
  if (wetter) write(path.join(DIST, 'wetter.json'), JSON.stringify(wetter));
  for (const p of vorstand.alle) {
    if (!p.kontakt_freigegeben || !(p.telefon || p.email)) continue;
    const funktion = [p.vorstand, p.trainer].filter(Boolean).join(', ') || p.funktion; // z. B. „Abteilungsleiter, Trainer“
    write(path.join(DIST, 'kontakte', `${slugify(p.name)}.vcf`), F.vcard({ ...p, funktion }, verein));
  }
  // Online-Redaktion als Testversion unter /admin/ (Anmeldung mit Test-Zugang, speichert nichts)
  baueAdminTest(files);

  if (!quiet) {
    console.log(`✔ ${pages.length} Seiten gebaut in ${Date.now() - t0} ms  (${aktuell.length} aktuelle News, ${posts.length - aktuell.length} im Archiv, ${alben.length} Fotoalben, ${termine.length} Termine, Wetter: ${wetter ? 'ja' : 'nicht verfügbar'})`);
    if (stats.extern) console.log(`ℹ ${stats.extern} Bild-/PDF-Verweise zeigen noch auf die alte Seite → „npm run medien“ lädt sie herunter.`);
  }
  return pages.length;
}

// ---------------------------------------------------------------------------
// Seitenbau-Module für den Browser (Live-Vorschau der Redaktion)
// ---------------------------------------------------------------------------

/** Module, die auch im Browser laufen (ohne Dateisystem). */
export const BROWSER_MODULE = ['site', 'content', 'pages', 'components', 'layout', 'helpers', 'markdown', 'training', 'albums', 'feeds'];

/** lib/<name>.mjs als .js für den Browser (Importe ebenfalls auf .js umgestellt – sicherer Dateityp auf jedem Server). */
export function browserModul(name, root = ROOT) {
  return fs.readFileSync(path.join(root, 'lib', `${name}.mjs`), 'utf8').replace(/from '\.\/([\w-]+)\.mjs'/g, "from './$1.js'");
}

// ---------------------------------------------------------------------------
// Online-Redaktion (Testversion)
// ---------------------------------------------------------------------------

/**
 * Legt die Redaktion unter dist/admin/ ab: dieselbe Oberfläche wie lokal (tools/redaktion/),
 * aber im Testmodus. Inhalte kommen aus einer Momentaufnahme (daten.json, ohne Entwürfe);
 * Änderungen bleiben nur im Browserfenster. Für echtes Speichern ist eine Server-Anmeldung
 * (PHP beim Webhoster) vorgesehen – siehe OFFENE-PUNKTE.md.
 */
function baueAdminTest(files) {
  const ziel = path.join(DIST, 'admin');
  const quelle = path.join(ROOT, 'tools/redaktion');
  fs.mkdirSync(path.join(ziel, 'lib'), { recursive: true });
  for (const f of ['redaktion.js', 'redaktion.css']) fs.copyFileSync(path.join(quelle, f), path.join(ziel, f));
  for (const m of BROWSER_MODULE) write(path.join(ziel, 'lib', `${m}.js`), browserModul(m));

  // Momentaufnahme aller bearbeitbaren Inhalte (Entwürfe bleiben draußen – die sind nicht öffentlich)
  const dateien = Object.fromEntries(Object.entries(files).filter(([p, text]) => !(p.startsWith('content/news/') && /^entwurf:\s*true/m.test(text.split(/\n---/)[0] || ''))));
  write(path.join(ziel, 'daten.json'), JSON.stringify({ stand: new Date().toISOString(), dateien }));

  const html = fs
    .readFileSync(path.join(quelle, 'index.html'), 'utf8')
    .replace('<title>Lokale Redaktion', '<title>Redaktion')
    .replace('href="/favicon.svg"', `href="${BASE}/favicon.svg"`)
    .replace('href="/css/style.css"', `href="${BASE}/css/style.css"`)
    .replace('href="/redaktion/redaktion.css"', `href="${BASE}/admin/redaktion.css"`)
    .replace('<script defer src="/redaktion/redaktion.js"></script>', `<script>window.REDAKTION_DEMO = true; window.REDAKTION_BASIS = '${BASE}'; window.REDAKTION_LIB = '${BASE}/admin/lib';</script>\n  <script defer src="${BASE}/admin/redaktion.js"></script>`)
    .replace('href="/redaktion/">Lokale Redaktion', `href="${BASE}/admin/">Redaktion`)
    .replace(/<span class="ed-hint">[^<]*<\/span>/, '<span class="ed-hint">Testversion zum Ausprobieren: Änderungen bleiben nur in diesem Browserfenster und werden nicht veröffentlicht.</span>')
    .replace('class="btn btn-small btn-secondary" href="/"', `class="btn btn-small btn-secondary" href="${BASE}/"`);
  write(path.join(ziel, 'index.html'), html);
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue;
    const s = path.join(src, entry.name);
    const d = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(d, { recursive: true });
      copyDir(s, d);
    } else fs.copyFileSync(s, d);
  }
}

// Direkt aufgerufen (node build.mjs)? → bauen
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  build().catch((e) => {
    console.error('✖ Fehler beim Bauen:', e);
    process.exit(1);
  });
}

export { NEWS_JAHRE };
