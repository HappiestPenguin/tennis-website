/**
 * helpers.mjs – kleine Werkzeuge, die überall gebraucht werden:
 *   • Text sicher in HTML einsetzen (esc)
 *   • Adressen/URL-Teile erzeugen (slugify)
 *   • Datumsangaben auf Deutsch formatieren
 *   • Symbole (Icons) und Vereinslogo als SVG
 */

// ---------------------------------------------------------------------------
// HTML & Text
// ---------------------------------------------------------------------------

/** Wandelt Sonderzeichen um, damit Text gefahrlos in HTML/Attributen steht. */
export function esc(s = '') {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** „Vereinsdoppelturnier 2026!“ → „vereinsdoppelturnier-2026“ (für Adressen und Anker). */
export function slugify(s = '') {
  return String(s)
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/** Kürzt Text an einer Wortgrenze und hängt „…“ an. */
export function truncate(s, n) {
  if (s.length <= n) return s;
  return s.slice(0, s.lastIndexOf(' ', n)).replace(/[,.;:–-]$/, '') + ' …';
}

// ---------------------------------------------------------------------------
// Datum (alle Datumsangaben werden intern als „JJJJ-MM-TT“ gespeichert)
// ---------------------------------------------------------------------------

export const MONATE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
export const MONATE_KURZ = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
export const WOCHENTAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

/** Zerlegt „2026-06-27“ in Jahr, Monat, Tag und Wochentag (0 = Sonntag). */
export function dateParts(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d, wd: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

/** „27. Juni 2026“ */
export const datumLang = (iso) => {
  const { y, m, d } = dateParts(iso);
  return `${d}. ${MONATE[m - 1]} ${y}`;
};

/** „Samstag, 27. Juni 2026“ */
export const datumMitTag = (iso) => `${WOCHENTAGE[dateParts(iso).wd]}, ${datumLang(iso)}`;

/** „Juni 2026“ – für ältere Beiträge, deren genaues Datum unbekannt ist. */
export const monatJahr = (iso) => {
  const { y, m } = dateParts(iso);
  return `${MONATE[m - 1]} ${y}`;
};

/** Heutiges Datum in deutscher Zeit als „JJJJ-MM-TT“. */
export function heuteIso() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());
}

// ---------------------------------------------------------------------------
// Symbole (Linien-Icons, 24×24) – werden direkt ins HTML geschrieben,
// es werden also keine Icon-Schriften von fremden Servern geladen.
// ---------------------------------------------------------------------------

const ICONS = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  cal: '<rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
  phone: '<path d="M5 3.5h3.5l2 5-2.5 1.5a11 11 0 0 0 6 6l1.5-2.5 5 2V19a2 2 0 0 1-2 2A17 17 0 0 1 3 5.5a2 2 0 0 1 2-2z"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  court: '<rect x="3" y="3" width="18" height="18" rx="1.5"/><path d="M3 12h18M7 3v18M17 3v18M7 7.5h10M7 16.5h10"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  left: '<path d="m15 6-6 6 6 6"/>',
  right: '<path d="m9 6 6 6-6 6"/>',
  rss: '<path d="M5 5a14 14 0 0 1 14 14M5 11a8 8 0 0 1 8 8"/><circle cx="6" cy="18" r="1.3"/>',
  quote: '<path d="M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
  zoom: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0"/>',
  heart: '<path d="M12 20s-7.5-4.6-9.3-9.2A5 5 0 0 1 12 6a5 5 0 0 1 9.3 4.8C19.5 15.4 12 20 12 20z"/>',
  gift: '<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13M12 8S10.5 3 8 3.5 7 8 12 8zM12 8s1.5-5 4-4.5S17 8 12 8z"/>',
  bag: '<path d="M5 8h14l-1.2 12.1a1 1 0 0 1-1 .9H7.2a1 1 0 0 1-1-.9z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3.5 17.5a1.4 1.4 0 0 0 2 2l5.8-5.8a4 4 0 0 0 5.4-5.4l-2.4 2.4-2-2z"/>',
  shirt: '<path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3a3 3 0 0 1-6 0z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  alert: '<path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v5M12 17.5v.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
  // Wetter
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  cloudsun: '<path d="M12 3v1.5M5.6 5.6l1 1M3 12h1.5M17.4 5.6l-1 1"/><path d="M8.5 11a3.5 3.5 0 0 1 6.8-1"/><path d="M7 20h10a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6 1A3 3 0 0 0 7 20z"/>',
  cloud: '<path d="M7 19h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.4 1.6A3.3 3.3 0 0 0 7 19z"/>',
  fog: '<path d="M4 10h16M3 14h18M6 18h12M7 6h10"/>',
  rain: '<path d="M7 15h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.4 1.6A3.3 3.3 0 0 0 7 15z"/><path d="m9 18-1 3M13 18l-1 3M17 18l-1 3"/>',
  snow: '<path d="M7 14h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.4 1.6A3.3 3.3 0 0 0 7 14z"/><path d="M8 18h.01M12 18h.01M16 18h.01M10 21h.01M14 21h.01"/>',
  storm: '<path d="M7 15h10a4 4 0 0 0 .5-8 6 6 0 0 0-11.4 1.6A3.3 3.3 0 0 0 7 15z"/><path d="m13 15-2 3.5h3L12 22"/>',
  wind: '<path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h7"/>',
};

/** Gibt ein SVG-Symbol zurück, z. B. icon('cal') oder icon('pin', 'icon icon-sm'). */
export function icon(name, cls = 'icon') {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${
    ICONS[name] || ''
  }</svg>`;
}

/** Vereinslogo: stilisierter Tennisball in Sandplatz-Rot. */
export const logo = () =>
  `<svg class="logo-mark" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="var(--clay)"/><path d="M6.5 11.5c6 2.3 9.7 8.4 8.8 15.3M33.5 28.5c-6-2.3-9.7-8.4-8.8-15.3" fill="none" stroke="var(--paper)" stroke-width="2.6" stroke-linecap="round"/></svg>`;
