/**
 * layout.mjs – das Grundgerüst jeder Seite:
 *   <head> mit Suchmaschinen-Angaben · Kopfzeile mit Navigation · Fußbereich
 *   Bild-Vollbildansicht und PDF-Betrachter (werden von public/js/main.js gesteuert)
 *
 * Die Navigation wird hier zentral gepflegt (NAV).
 */

import { esc, icon, logo } from './helpers.mjs';

/** Hauptmenü. Einträge mit „children“ werden zum Aufklappmenü. */
export const NAV = [
  { url: '/', label: 'Start' },
  { url: '/news/', label: 'News' },
  { url: '/termine/', label: 'Termine' },
  { url: '/angebote/', label: 'Training & Mitgliedschaft' },
  {
    label: 'Verein',
    children: [
      { url: '/vorstand/', label: 'Vorstand & Ansprechpartner' },
      { url: '/jugend/', label: 'Kinder & Jugend' },
      { url: '/satzung/', label: 'Satzung & Beiträge' },
      { url: '/unterstuetzen/', label: 'Unterstützer & Spenden' },
      { url: '/gaestebuch/', label: 'Gästebuch' },
      { url: '/geschichte/', label: 'Geschichte' },
      { url: '/turnierberichte/', label: 'Turnierberichte' },
    ],
  },
  { url: '/fotoalbum/', label: 'Fotos' },
  { url: '/kontakt/', label: 'Kontakt', cta: true },
];

const isActive = (current, url) => (url === '/' ? current === '/' : current.startsWith(url));

function navigation(current) {
  return NAV.map((item) => {
    if (item.children) {
      const active = item.children.some((c) => isActive(current, c.url));
      return `<li class="nav-group${active ? ' is-active' : ''}">
        <button class="nav-link nav-toggle" type="button" aria-expanded="false">${esc(item.label)} ${icon('chevron', 'icon icon-sm')}</button>
        <ul class="subnav">${item.children
          .map((c) => `<li><a href="${c.url}"${isActive(current, c.url) ? ' aria-current="page"' : ''}>${esc(c.label)}</a></li>`)
          .join('')}</ul>
      </li>`;
    }
    const cur = isActive(current, item.url) ? ' aria-current="page"' : '';
    return `<li><a class="nav-link${item.cta ? ' nav-cta' : ''}" href="${item.url}"${cur}>${esc(item.label)}</a></li>`;
  }).join('');
}

/**
 * Komplette HTML-Seite.
 * @param {object} verein   Inhalt von data/verein.json
 * @param {object} page     { url, title, description, body, image, type, noindex, bodyClass }
 */
export function layout(verein, { url, title, description = '', body, image, type = 'website', noindex = false, bodyClass = '' }) {
  const fullTitle = url === '/' ? title : `${title} | ${verein.kurzname}`;
  const ogImage = image || verein.titelbild;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsClub',
    name: `${verein.name} – ${verein.abteilung}`,
    sport: 'Tennis',
    url: verein.url,
    email: verein.email,
    telephone: verein.telefon,
    address: { '@type': 'PostalAddress', streetAddress: verein.strasse, postalCode: verein.plz, addressLocality: verein.ort, addressCountry: 'DE' },
  };

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex, follow">' : ''}
<link rel="canonical" href="${verein.url}${url}">
<!-- Vorschau beim Teilen (WhatsApp, Facebook, Signal …) -->
<meta property="og:type" content="${type}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:locale" content="de_DE">
<meta property="og:site_name" content="${esc(verein.kurzname)}">
${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">` : ''}
<meta name="theme-color" content="#1d4a3a" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0f1f19" media="(prefers-color-scheme: dark)">
<meta name="format-detection" content="telephone=no">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="alternate" type="application/rss+xml" title="${esc(verein.kurzname)} – News" href="/feed.xml">
<link rel="stylesheet" href="/css/style.css">
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
<script defer src="/js/main.js"></script>
</head>
<body class="${bodyClass}">
<a class="skip-link" href="#inhalt">Zum Inhalt springen</a>
${verein.vorschau ? '<div class="preview-ribbon">Vorschau der neuen Website – nicht die offizielle Seite des Vereins</div>' : ''}
${browserHinweis()}
<header class="site-header">
  <div class="container header-inner">
    <a class="brand" href="/" aria-label="${esc(verein.kurzname)} – Startseite">
      ${logo()}
      <span class="brand-text"><span class="brand-name">BSG Stahl</span><span class="brand-sub">Tennis · Eisenhüttenstadt</span></span>
    </a>
    <button class="menu-button" type="button" aria-expanded="false" aria-controls="hauptnavigation">
      <span class="menu-open">${icon('menu')}</span><span class="menu-close">${icon('close')}</span><span class="visually-hidden">Menü</span>
    </button>
    <nav id="hauptnavigation" class="main-nav" aria-label="Hauptnavigation"><ul>${navigation(url)}</ul></nav>
  </div>
</header>
<main id="inhalt">
${body}
</main>
${footer(verein)}
${viewer()}
</body>
</html>`;
}

/**
 * Hinweis für sehr alte Browser (z. B. iPhone vor iOS 15.4, Internet Explorer).
 * Die Seite bleibt trotzdem lesbar – nur Komfortfunktionen fehlen.
 */
function browserHinweis() {
  return `<div class="old-browser" hidden>Ihr Browser ist veraltet. Die Seite funktioniert, aber manche Funktionen fehlen. Bitte aktualisieren Sie Ihren Browser oder Ihr Gerät.</div>
<script>
  // Prüft drei moderne Funktionen. Fehlt eine, wird der Hinweis oben eingeblendet.
  (function () {
    var ok = window.CSS && CSS.supports && CSS.supports('display', 'grid') && CSS.supports('aspect-ratio', '1') && 'HTMLDialogElement' in window;
    if (!ok) document.currentScript.previousElementSibling.hidden = false;
  })();
</script>`;
}

function footer(v) {
  const adresse = `${v.strasse}, ${v.plz} ${v.ort}`;
  return `<footer class="site-footer">
  <div class="container footer-grid">
    <div class="footer-brand">
      <a class="brand brand--footer" href="/">${logo()}<span class="brand-text"><span class="brand-name">BSG Stahl</span><span class="brand-sub">Tennis · Eisenhüttenstadt</span></span></a>
      <p>${esc(v.claim)}</p>
      <a class="btn btn-small btn-ghost-light" href="/unterstuetzen/">${icon('heart', 'icon icon-sm')} Verein unterstützen</a>
    </div>
    <div>
      <h2 class="footer-title">Anschrift</h2>
      <address>${esc(v.name)}<br>${esc(v.abteilung)}<br>${esc(v.zusatz)}<br>${esc(v.strasse)}<br>${esc(v.plz)} ${esc(v.ort)}</address>
      <p><a href="https://www.openstreetmap.org/search?query=${encodeURIComponent(adresse)}" target="_blank" rel="noopener">${icon('pin', 'icon icon-sm')} Auf der Karte zeigen</a></p>
    </div>
    <div>
      <h2 class="footer-title">Schnellzugriff</h2>
      <ul class="footer-links">
        <li><a href="/angebote/#training">Trainingszeiten</a></li>
        <li><a href="/angebote/#mitglied-werden">Mitglied werden</a></li>
        <li><a href="/termine/">Termine & Kalender-Abo</a></li>
        <li><a href="/vorstand/">Ansprechpartner</a></li>
        <li><a href="/gaestebuch/">Gästebuch</a></li>
      </ul>
    </div>
    <div>
      <h2 class="footer-title">Links</h2>
      <ul class="footer-links">${(v.links || [])
        .map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.titel)} ${icon('external', 'icon icon-xs')}</a></li>`)
        .join('')}
        <li><a href="/feed.xml">${icon('rss', 'icon icon-sm')} News-Feed (RSS)</a></li>
      </ul>
    </div>
  </div>
  <div class="container footer-bottom">
    <span>© ${new Date().getFullYear()} ${esc(v.name)} – ${esc(v.abteilung)}</span>
    <span class="footer-legal"><a href="/impressum/">Impressum</a><a href="/datenschutz/">Datenschutz</a><a href="/admin/" rel="nofollow">Redaktion</a></span>
  </div>
</footer>`;
}

/** Vollbildansicht für Fotos und Betrachter für PDFs (gesteuert von main.js). */
function viewer() {
  return `<dialog class="lightbox" aria-label="Bildansicht">
  <div class="lb-top">
    <span class="lb-count" aria-live="polite"></span>
    <div class="lb-tools">
      <button class="lb-btn lb-zoom" type="button" aria-label="Vergrößern">${icon('zoom')}</button>
      <a class="lb-btn lb-original" href="#" target="_blank" rel="noopener" aria-label="Original öffnen">${icon('external')}</a>
      <button class="lb-btn lb-close" type="button" aria-label="Schließen">${icon('close')}</button>
    </div>
  </div>
  <div class="lb-stage">
    <button class="lb-nav lb-prev" type="button" aria-label="Vorheriges Bild">${icon('left')}</button>
    <figure class="lb-figure"><div class="lb-scroller"><img alt=""></div><figcaption></figcaption></figure>
    <button class="lb-nav lb-next" type="button" aria-label="Nächstes Bild">${icon('right')}</button>
  </div>
  <div class="lb-thumbs" role="listbox" aria-label="Alle Bilder"></div>
</dialog>
<dialog class="docviewer" aria-label="Dokument">
  <div class="dv-top">
    <strong class="dv-title"></strong>
    <div class="lb-tools">
      <a class="lb-btn dv-download" href="#" download aria-label="Herunterladen">${icon('download')}</a>
      <a class="lb-btn dv-open" href="#" target="_blank" rel="noopener" aria-label="In neuem Tab öffnen">${icon('external')}</a>
      <button class="lb-btn dv-close" type="button" aria-label="Schließen">${icon('close')}</button>
    </div>
  </div>
  <iframe title="Dokument" loading="lazy"></iframe>
</dialog>`;
}
