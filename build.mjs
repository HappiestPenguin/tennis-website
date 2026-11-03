#!/usr/bin/env node
/**
 * build.mjs – baut die komplette Website aus content/ und data/ in den Ordner dist/.
 *
 *   node build.mjs                    → normaler Aufruf (npm run build)
 *   BASE_PATH=/repo node build.mjs    → wenn die Seite in einem Unterordner liegt (z. B. GitHub Pages ohne eigene Domain)
 *   VORSCHAU=1 SITE_URL=https://maik.bsg-tennis.de node build.mjs
 *                                     → Test-/Vorschauversion: Hinweisleiste „Vorschau“, für Suchmaschinen gesperrt,
 *                                       eigene Adresse (schreibt dazu eine CNAME-Datei für GitHub Pages)
 *
 * Ablauf:
 *   1. dist/ leeren, Dateien aus public/ (CSS, JS, Bilder …) hineinkopieren
 *   2. Inhalte und Daten einlesen (lib/content.mjs), Wetter abrufen (lib/weather.mjs)
 *   3. Alle Seiten mit den Vorlagen erzeugen (lib/pages.mjs + lib/layout.mjs)
 *   4. Bildadressen prüfen: lokal vorhanden → lokal, sonst von der alten Seite
 *   5. Kalender, RSS, Sitemap, Kontaktkarten und Weiterleitungen schreiben
 *
 * Es werden keine externen Pakete benötigt – nur Node.js ab Version 18.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createLoader, NEWS_JAHRE } from './lib/content.mjs';
import { ladeWetter } from './lib/weather.mjs';
import { buildAlbums } from './lib/albums.mjs';
import { layout, NAV } from './lib/layout.mjs';
import * as P from './lib/pages.mjs';
import * as F from './lib/feeds.mjs';
import { slugify, heuteIso } from './lib/helpers.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const PUBLIC = path.join(ROOT, 'public');
const BASE = (process.env.BASE_PATH || '').replace(/\/$/, '');
const ALTE_SEITE = 'https://www.bsg-tennis.de/'; // Bilder, die noch nicht lokal liegen, kommen von hier
const VORSCHAU = process.env.VORSCHAU === '1'; // Testversion: nicht in Suchmaschinen, mit Hinweisleiste
const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, ''); // abweichende Adresse, z. B. für die Vorschau

export async function build({ quiet = false } = {}) {
  const t0 = Date.now();

  // ---- 1. Ausgabeordner vorbereiten -------------------------------------
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  copyDir(PUBLIC, DIST);

  // ---- 2. Inhalte laden ---------------------------------------------------
  const heute = heuteIso();
  const heuteJahr = Number(heute.slice(0, 4));
  const load = createLoader(ROOT);

  const verein = load.readJson('verein');
  if (SITE_URL) verein.url = SITE_URL;
  verein.vorschau = VORSCHAU;
  const vorstand = load.readJson('vorstand');
  const training = load.readJson('training');
  const galerie = load.readJson('galerie');
  const faq = load.readJson('faq');
  const unterstuetzer = load.readJson('unterstuetzer');
  const gaestebuch = load.readJson('gaestebuch').eintraege || [];
  const termineData = load.readJson('termine');
  const termine = (termineData.termine || [])
    .filter((t) => t.datum)
    .map((t) => ({ ...t, id: `${t.datum}-${slugify(t.titel)}` }))
    .sort((a, b) => a.datum.localeCompare(b.datum));

  const posts = load.posts({ heuteJahr });
  const aktuell = posts.filter((p) => !p.archiv);
  const archivJahre = groupByYear(posts.filter((p) => p.archiv));
  const alben = buildAlbums({ galerie, posts });
  const wetter = await ladeWetter(path.join(ROOT, '.cache'));

  // ---- 3. Seiten erzeugen -------------------------------------------------
  const pages = [];
  /** Seite registrieren. meta = { title, description, image, type, noindex, bodyClass } */
  const add = (url, meta, body) => {
    const noindex = VORSCHAU || meta.noindex; // Vorschau: komplett für Suchmaschinen gesperrt
    pages.push({ url, html: layout(verein, { url, body, ...meta, noindex }), noindex });
  };

  add('/', { title: `${verein.kurzname} – ${verein.ort}`, description: verein.beschreibung, bodyClass: 'is-home' },
    P.home({ verein, start: load.page('startseite'), posts: aktuell.slice(0, 3), termine, heute, training, wetter, gaestebuch, unterstuetzer, alben }));

  // News: Übersicht, Einzelbeiträge, Archiv
  add('/news/', { title: 'News', description: `Neuigkeiten, Turnierberichte und Infos der ${verein.kurzname}.` }, P.newsList({ aktuell, archivJahre }));
  posts.forEach((post, i) => {
    add(post.url, {
      title: post.title,
      description: post.teaser,
      image: post.bild,
      type: 'article',
      noindex: post.archiv, // alte Beiträge (oft mit Namen damals Minderjähriger) nicht in Suchmaschinen
    }, P.newsPost({ post, prev: posts[i + 1], next: posts[i - 1] }));
  });
  for (const a of archivJahre) {
    add(`/news/archiv/${a.jahr}/`, { title: `News-Archiv ${a.jahr}`, description: `Neuigkeiten der ${verein.kurzname} aus dem Jahr ${a.jahr}.`, noindex: true },
      P.archivJahr({ jahr: a.jahr, posts: a.posts, archivJahre }));
  }
  if (archivJahre.length) pages.push({ url: '/news/archiv/', html: F.redirect(`${BASE}/news/archiv/${archivJahre[0].jahr}/`), raw: true });

  add('/termine/', { title: 'Termine', description: `Turniere, Feste und Veranstaltungen der ${verein.kurzname}.` },
    P.termine({ termine, heute, hinweis: termineData.hinweis, verein }));

  // Seiten mit Text aus content/seiten/
  const textseiten = [
    ['/angebote/', 'angebote', (s) => P.angebote({ s, training, faq })],
    ['/vorstand/', 'vorstand', (s) => P.vorstand({ s, vorstand })],
    ['/jugend/', 'jugend', (s) => P.jugend({ s, vorstand, training })],
    ['/satzung/', 'satzung', (s) => P.contentPage({ s, eyebrow: 'Verein' })],
    ['/geschichte/', 'geschichte', (s) => P.contentPage({ s, eyebrow: 'Seit 1952', cls: 'prose--timeline' })],
    ['/turnierberichte/', 'turnierberichte', (s) => P.contentPage({ s, eyebrow: 'Archiv', toc: true }), { noindex: true }],
    ['/fotoalbum/', 'fotoalbum', (s) => P.fotoalbum({ s, alben })],
    ['/kontakt/', 'kontakt', (s) => P.kontakt({ s, verein, vorstand })],
    ['/gaestebuch/', 'gaestebuch', (s) => P.gaestebuch({ s, verein, eintraege: gaestebuch })],
    ['/impressum/', 'impressum', (s) => P.contentPage({ s, eyebrow: 'Rechtliches' })],
    ['/datenschutz/', 'datenschutz', (s) => P.contentPage({ s, eyebrow: 'Rechtliches' })],
  ];
  for (const [url, name, render, extra = {}] of textseiten) {
    const s = load.page(name);
    add(url, { title: s.title, description: s.beschreibung, ...extra }, render(s));
  }
  // Einzelne Fotoalben
  alben.forEach((a, i) => {
    add(a.url, { title: `Fotos: ${a.titel}`, description: `${a.bilder.length} Fotos – ${a.titel}`, image: a.cover, noindex: Number(a.jahr) <= heuteJahr - NEWS_JAHRE },
      P.albumSeite({ a, prev: alben[i - 1], next: alben[i + 1] }));
  });
  add('/unterstuetzen/', { title: 'Unterstützer & Spenden', description: `So können Sie die ${verein.kurzname} unterstützen – und wem wir danken.` }, P.unterstuetzen({ u: unterstuetzer }));
  add('/danke/', { title: 'Vielen Dank!', noindex: true }, P.danke());
  add('/404.html', { title: 'Seite nicht gefunden', noindex: true }, P.notFound());

  // ---- 4. Schreiben (inkl. Bildadressen prüfen) ---------------------------
  const stats = { lokal: 0, extern: 0 };
  for (const p of pages) {
    const file = p.url.endsWith('/') ? path.join(DIST, p.url, 'index.html') : path.join(DIST, p.url);
    write(file, p.raw ? p.html : finalize(p.html, stats));
  }

  // ---- 5. Zusatzdateien ---------------------------------------------------
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
  // Mögliche Link-Ziele für die Redaktion (z. B. Link im Hinweis-Banner) – nur öffentliche Seiten
  const linkziele = [
    ...NAV.flatMap((n) => (n.children ? n.children : [n])).map((n) => ({ gruppe: 'Seiten', url: n.url, titel: n.label })),
    { gruppe: 'Abschnitte', url: '/angebote/#training', titel: 'Trainingszeiten (Wochenplan)' },
    { gruppe: 'Abschnitte', url: '/angebote/#mitglied-werden', titel: 'Mitglied werden' },
    { gruppe: 'Abschnitte', url: '/termine/#abo', titel: 'Kalender abonnieren' },
    { gruppe: 'Abschnitte', url: '/kontakt/?anliegen=probetraining', titel: 'Kontakt: Probetraining anfragen' },
    ...aktuell.slice(0, 40).map((p) => ({ gruppe: 'News', url: p.url, titel: `${p.title} (${p.date.slice(0, 4)})` })),
  ];
  write(path.join(DIST, 'linkziele.json'), JSON.stringify(linkziele));
  if (wetter) write(path.join(DIST, 'wetter.json'), JSON.stringify(wetter));
  for (const p of [...vorstand.personen, ...vorstand.trainer]) {
    if (p.kontakt_freigegeben && (p.telefon || p.email)) write(path.join(DIST, 'kontakte', `${slugify(p.name)}.vcf`), F.vcard(p, verein));
  }

  if (!quiet) {
    console.log(`✔ ${pages.length} Seiten gebaut in ${Date.now() - t0} ms  (${aktuell.length} aktuelle News, ${posts.length - aktuell.length} im Archiv, ${alben.length} Fotoalben, ${termine.length} Termine, Wetter: ${wetter ? 'ja' : 'nicht verfügbar'})`);
    if (stats.extern) console.log(`ℹ ${stats.extern} Bild-/PDF-Verweise zeigen noch auf die alte Seite → „npm run medien“ lädt sie herunter.`);
  }
  return pages.length;

  /**
   * Letzter Schliff an jeder Seite:
   *  • „/media/…“ → lokale Datei, falls vorhanden – sonst Original auf der alten Seite
   *  • bei BASE_PATH alle internen Links um den Unterordner ergänzen
   */
  function finalize(html, stats) {
    html = html.replace(/(["'(])\/media\/([^"')\s]+)/g, (m, pre, rest) => {
      if (rest.startsWith('uploads/') || fs.existsSync(path.join(PUBLIC, 'media', safeDecode(rest)))) {
        stats.lokal++;
        return `${pre}${BASE}/media/${rest}`;
      }
      stats.extern++;
      return `${pre}${ALTE_SEITE}${rest}`;
    });
    // Links ergänzen – aber nicht doppelt (Bilder haben den Unterordner oben schon bekommen)
    if (BASE) html = html.replace(new RegExp(`(href|src|action)="/(?!/|${BASE.slice(1)}/)`, 'g'), `$1="${BASE}/`);
    return html;
  }
}

// ---------------------------------------------------------------------------
// Hilfsfunktionen
// ---------------------------------------------------------------------------

/** Beiträge nach Jahr gruppieren (neuestes Jahr zuerst). */
function groupByYear(posts) {
  const map = new Map();
  for (const p of posts) {
    if (!map.has(p.year)) map.set(p.year, []);
    map.get(p.year).push(p);
  }
  return [...map.entries()].sort((a, b) => b[0] - a[0]).map(([jahr, list]) => ({ jahr, posts: list }));
}

function safeDecode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

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
