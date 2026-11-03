/**
 * feeds.mjs – maschinenlesbare Dateien, die automatisch entstehen:
 *   termine.ics   Kalender-Abo für Handy/Outlook
 *   feed.xml      RSS-Feed der News
 *   sitemap.xml   Seitenverzeichnis für Suchmaschinen
 *   *.vcf         Kontaktkarten („Kontakt speichern“)
 *   Weiterleitungen von den alten Adressen (news.html → /news/)
 */

import { esc } from './helpers.mjs';

/** Text für Kalender-/vCard-Dateien maskieren. */
const icsText = (s = '') => String(s).replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n');

export function ics({ termine, verein }) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const anlage = `${verein.strasse}, ${verein.plz} ${verein.ort}`;
  const events = termine.map((t) => {
    const d = t.datum.replace(/-/g, '');
    let start;
    let end;
    if (t.uhrzeit && /^\d{1,2}:\d{2}/.test(t.uhrzeit)) {
      // Termin mit Uhrzeit: Dauer pauschal 3 Stunden
      const [h, m] = t.uhrzeit.split(':');
      start = `DTSTART;TZID=Europe/Berlin:${d}T${h.padStart(2, '0')}${m.slice(0, 2)}00`;
      end = `DTEND;TZID=Europe/Berlin:${d}T${String(Math.min(23, Number(h) + 3)).padStart(2, '0')}${m.slice(0, 2)}00`;
    } else {
      // Ganztägiger Termin
      const next = new Date(Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8) + 1)).toISOString().slice(0, 10).replace(/-/g, '');
      start = `DTSTART;VALUE=DATE:${d}`;
      end = `DTEND;VALUE=DATE:${next}`;
    }
    return [
      'BEGIN:VEVENT',
      `UID:${t.id}@bsg-tennis.de`,
      `DTSTAMP:${stamp}`,
      start,
      end,
      `SUMMARY:${icsText(t.titel)} (BSG Stahl Tennis)`,
      `LOCATION:${icsText(t.ort ? `${t.ort}, ${anlage}` : anlage)}`,
      t.beschreibung ? `DESCRIPTION:${icsText(t.beschreibung)}` : '',
      `URL:${verein.url}/termine/`,
      'END:VEVENT',
    ]
      .filter(Boolean)
      .join('\r\n');
  });
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//BSG Stahl Tennis//Termine//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:BSG Stahl Tennis',
    'X-WR-TIMEZONE:Europe/Berlin',
    'REFRESH-INTERVAL;VALUE=DURATION:P1D',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

/** Kontaktkarte im vCard-Format (öffnet sich am Handy direkt im Adressbuch). */
export function vcard(p, verein) {
  const [vor, ...nach] = p.name.split(' ');
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `N:${icsText(nach.join(' '))};${icsText(vor)};;;`,
    `FN:${icsText(p.name)}`,
    `ORG:${icsText(verein.name)};${icsText(verein.abteilung)}`,
    `TITLE:${icsText(p.funktion)}`,
    p.telefon ? `TEL;TYPE=CELL:${p.telefon}` : '',
    p.email ? `EMAIL;TYPE=INTERNET:${p.email}` : '',
    `URL:${verein.url}`,
    'END:VCARD',
  ]
    .filter(Boolean)
    .join('\r\n');
}

export function rss({ posts, verein, BASE }) {
  const u = (p) => `${verein.url}${BASE}${p}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
<title>${esc(verein.kurzname)} – News</title>
<link>${u('/news/')}</link>
<description>${esc(verein.beschreibung)}</description>
<language>de-de</language>
${posts
  .map(
    (p) =>
      `<item><title>${esc(p.title)}</title><link>${u(p.url)}</link><guid>${u(p.url)}</guid><pubDate>${new Date(p.date + 'T12:00:00Z').toUTCString()}</pubDate><description>${esc(p.teaser)}</description></item>`
  )
  .join('\n')}
</channel></rss>`;
}

export function sitemap({ urls, verein, BASE }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `<url><loc>${verein.url}${BASE}${u}</loc></url>`).join('\n')}
</urlset>`;
}

/** Kleine Seite, die sofort auf die neue Adresse weiterleitet. */
export const redirect = (to) =>
  `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><title>Weiterleitung …</title><meta name="robots" content="noindex"><link rel="canonical" href="${to}"><meta http-equiv="refresh" content="0; url=${to}"></head><body><p>Diese Seite ist umgezogen: <a href="${to}">${to}</a></p></body></html>`;

/** Alte Adressen der Livepages-Seite → neue Adressen (Links und Lesezeichen bleiben gültig). */
export const ALTE_ADRESSEN = {
  '/news.html': '/news/',
  '/termine.html': '/termine/',
  '/der-vorstand.html': '/vorstand/',
  '/fotoalbum.html': '/fotoalbum/',
  '/jugendabteilung.html': '/jugend/',
  '/satzung.html': '/satzung/',
  '/geschichte.html': '/geschichte/',
  '/angebote.html': '/angebote/',
  '/kontakt.html': '/kontakt/',
  '/impressum.html': '/impressum/',
  '/datenschutz.html': '/datenschutz/',
  '/forum.html': '/kontakt/',
  '/gaestebuch.html': '/gaestebuch/',
  '/turnierergebnisse.html': '/turnierberichte/',
};
