/**
 * site.mjs – erzeugt alle Seiten der Website aus den Inhalten.
 *
 * Wird an zwei Stellen genutzt:
 *   • build.mjs (Node.js) schreibt das Ergebnis nach dist/
 *   • die Redaktion (Browser) zeigt damit die Live-Vorschau – mit noch nicht gespeicherten Änderungen
 * Deshalb kein Dateisystem hier: Inhalte kommen als Objekt { Pfad: Text }.
 */

import { createLoader, personenAufteilen, NEWS_JAHRE } from './content.mjs';
import { buildAlbums } from './albums.mjs';
import { layout, NAV } from './layout.mjs';
import * as P from './pages.mjs';
import * as F from './feeds.mjs';
import { slugify } from './helpers.mjs';

/**
 * @param {object} o
 * @param {Record<string,string>} o.files  Inhalte (data/*.json, content/seiten/*.md, content/news/*.md)
 * @param {string} o.heute                 Datum JJJJ-MM-TT
 * @param {object|null} o.wetter           aufbereitete Wetterdaten (oder null)
 * @param {string} [o.BASE]                Unterordner, z. B. /tennis-website
 * @param {string} [o.SITE_URL]            abweichende Adresse der Seite
 * @param {boolean} [o.VORSCHAU]           Testversion: alles für Suchmaschinen sperren
 * @param {string} [o.nurUrl]              nur diese eine Seite erzeugen (schnell, für die Live-Vorschau)
 * @param {(rel:string)=>boolean} [o.medienLokal]  liegt /media/<rel> lokal vor? (fehlt → ja)
 * @param {string} [o.alteSeite]           Herkunft fehlender Bilder
 */
export function renderSite({ files, heute, wetter = null, BASE = '', SITE_URL = '', VORSCHAU = false, nurUrl = '', medienLokal = () => true, alteSeite = 'https://www.bsg-tennis.de/' }) {
  const heuteJahr = Number(heute.slice(0, 4));
  const load = createLoader(files);

  const verein = load.readJson('verein');
  if (SITE_URL) verein.url = SITE_URL;
  verein.vorschau = VORSCHAU;
  const vorstand = personenAufteilen(load.readJson('vorstand'));
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

  // ---- Seiten erzeugen -----------------------------------------------------
  // Der Inhalt wird erst erzeugt, wenn die Seite gebraucht wird (body ist eine Funktion).
  const pages = [];
  const stats = { lokal: 0, extern: 0 };
  /** Seite registrieren. meta = { title, description, image, type, noindex, bodyClass } */
  const add = (url, meta, body) => {
    const noindex = VORSCHAU || !!meta.noindex; // Vorschau: komplett für Suchmaschinen gesperrt
    if (nurUrl && url !== nurUrl) return pages.push({ url, noindex });
    pages.push({ url, noindex, html: finalize(layout(verein, { url, body: body(), ...meta, noindex })) });
  };
  const roh = (url, html) => pages.push({ url, raw: true, html });

  add('/', { title: `${verein.kurzname} – ${verein.ort}`, description: verein.beschreibung, bodyClass: 'is-home' }, () =>
    P.home({ verein, start: load.page('startseite'), posts: aktuell.slice(0, 3), termine, heute, training, wetter, gaestebuch, unterstuetzer, alben }));

  // News: Übersicht, Einzelbeiträge, Archiv
  add('/news/', { title: 'News', description: `Neuigkeiten, Turnierberichte und Infos der ${verein.kurzname}.` }, () => P.newsList({ aktuell, archivJahre }));
  posts.forEach((post, i) => {
    add(post.url, {
      title: post.title,
      description: post.teaser,
      image: post.bild,
      type: 'article',
      noindex: post.archiv, // alte Beiträge (oft mit Namen damals Minderjähriger) nicht in Suchmaschinen
    }, () => P.newsPost({ post, prev: posts[i + 1], next: posts[i - 1] }));
  });
  for (const a of archivJahre) {
    add(`/news/archiv/${a.jahr}/`, { title: `News-Archiv ${a.jahr}`, description: `Neuigkeiten der ${verein.kurzname} aus dem Jahr ${a.jahr}.`, noindex: true },
      () => P.archivJahr({ jahr: a.jahr, posts: a.posts, archivJahre }));
  }
  if (archivJahre.length) roh('/news/archiv/', F.redirect(`${BASE}/news/archiv/${archivJahre[0].jahr}/`));

  add('/termine/', { title: 'Termine', description: `Turniere, Feste und Veranstaltungen der ${verein.kurzname}.` },
    () => P.termine({ termine, heute, hinweis: termineData.hinweis, verein }));

  // Seiten mit Text aus content/seiten/
  const textseiten = [
    ['/angebote/', 'angebote', (s) => P.angebote({ s, training, faq })],
    ['/vorstand/', 'vorstand', (s) => P.vorstand({ s, vorstand })],
    ['/jugend/', 'jugend', (s) => P.jugend({ s, vorstand, training })],
    ['/satzung/', 'satzung', (s) => P.contentPage({ s: { ...s, html: s.html.replace(/<p>\{\{beitraege\}\}<\/p>/, P.beitragsTabelle(verein)).replace(/<p>\{\{bankverbindung\}\}<\/p>/, P.bankverbindung(verein)) }, eyebrow: 'Verein' })],
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
    add(url, { title: s.title, description: s.beschreibung, ...extra }, () => render(s));
  }
  // Einzelne Fotoalben
  alben.forEach((a, i) => {
    add(a.url, { title: `Fotos: ${a.titel}`, description: `${a.bilder.length} Fotos – ${a.titel}`, image: a.cover, noindex: Number(a.jahr) <= heuteJahr - NEWS_JAHRE },
      () => P.albumSeite({ a, prev: alben[i - 1], next: alben[i + 1] }));
  });
  add('/unterstuetzen/', { title: 'Unterstützer & Spenden', description: `So können Sie die ${verein.kurzname} unterstützen – und wem wir danken.` }, () => P.unterstuetzen({ u: unterstuetzer }));
  add('/danke/', { title: 'Vielen Dank!', noindex: true }, () => P.danke());
  add('/404.html', { title: 'Seite nicht gefunden', noindex: true }, () => P.notFound());

  // Mögliche Link-Ziele für die Redaktion (z. B. Link im Hinweis-Banner) – nur öffentliche Seiten
  const linkziele = [
    ...NAV.flatMap((n) => (n.children ? n.children : [n])).map((n) => ({ gruppe: 'Seiten', url: n.url, titel: n.label })),
    { gruppe: 'Abschnitte', url: '/angebote/#training', titel: 'Trainingszeiten (Wochenplan)' },
    { gruppe: 'Abschnitte', url: '/angebote/#mitglied-werden', titel: 'Mitglied werden' },
    { gruppe: 'Abschnitte', url: '/termine/#abo', titel: 'Kalender abonnieren' },
    { gruppe: 'Abschnitte', url: '/kontakt/?anliegen=probetraining', titel: 'Kontakt: Probetraining anfragen' },
    ...aktuell.slice(0, 40).map((p) => ({ gruppe: 'News', url: p.url, titel: `${p.title} (${p.date.slice(0, 4)})` })),
  ];

  return { pages, stats, verein, vorstand, termine, posts, aktuell, alben, linkziele, dateien };

  /**
   * Alle Ausgabedateien der Website als { 'news/index.html': '…', 'feed.xml': '…', … }.
   * Genutzt vom Build (schreibt nach dist/) und von der Online-Redaktion (lädt geänderte Dateien hoch).
   */
  function dateien() {
    const out = {};
    for (const p of pages) if (p.html != null) out[p.url.endsWith('/') ? `${p.url.slice(1)}index.html` : p.url.slice(1)] = p.html;
    for (const [alt, neu] of Object.entries(F.ALTE_ADRESSEN)) out[alt.replace(/^\//, '')] = F.redirect(BASE + neu);
    out['termine.ics'] = F.ics({ termine, verein });
    out['feed.xml'] = F.rss({ posts: aktuell.slice(0, 20), verein, BASE });
    out['sitemap.xml'] = F.sitemap({ urls: pages.filter((p) => !p.noindex && !p.raw && p.url !== '/404.html').map((p) => p.url), verein, BASE });
    out['robots.txt'] = VORSCHAU ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nDisallow: /admin/\nSitemap: ${verein.url}${BASE}/sitemap.xml\n`;
    out['linkziele.json'] = JSON.stringify(linkziele);
    for (const p of vorstand.alle) {
      if (!p.kontakt_freigegeben || !(p.telefon || p.email)) continue;
      const funktion = [p.vorstand, p.trainer].filter(Boolean).join(', ') || p.funktion; // z. B. „Abteilungsleiter, Trainer“
      out[`kontakte/${slugify(p.name)}.vcf`] = F.vcard({ ...p, funktion }, verein);
    }
    return out;
  }

  /**
   * Letzter Schliff an jeder Seite:
   *  • „/media/…“ → lokale Datei, falls vorhanden – sonst Original auf der alten Seite
   *  • bei BASE alle internen Links um den Unterordner ergänzen
   */
  function finalize(html) {
    html = html.replace(/(["'(])\/media\/([^"')\s]+)/g, (m, pre, rest) => {
      if (rest.startsWith('uploads/') || medienLokal(safeDecode(rest))) {
        stats.lokal++;
        return `${pre}${BASE}/media/${rest}`;
      }
      stats.extern++;
      return `${pre}${alteSeite}${rest}`;
    });
    // Links ergänzen – aber nicht doppelt (Bilder haben den Unterordner oben schon bekommen)
    if (BASE) html = html.replace(new RegExp(`(href|src|action)="/(?!/|${BASE.slice(1)}/)`, 'g'), `$1="${BASE}/`);
    return html;
  }
}

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
