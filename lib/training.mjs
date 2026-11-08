/**
 * training.mjs – Platzbelegung aufbereiten.
 *
 * Bewusst allgemein gehalten (Datenschutz, besonders bei Kindern): Öffentlich steht nur,
 * WANN WIE VIELE Plätze belegt sind – nicht welche Gruppe und nicht wer trainiert.
 *
 * Datenformat (data/training.json → zeiten[]):
 *   tag       Wochentag („Montag“ …)
 *   von, bis  Uhrzeit „HH:MM“ – leer = ganztags
 *   art       Training | Turnier | Arbeitseinsatz | Veranstaltung | Belegt
 *   plaetze   Zahl 0–4 belegter Plätze. 0 = ganze Anlage nicht verfügbar
 *   hinweis   optional, allgemeiner Zusatz (keine Namen)
 */

export const WOCHE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

/** Sortiert nach Wochentag und Uhrzeit (ganztägige Einträge zuerst). */
export function sortiereZeiten(zeiten = []) {
  return [...zeiten].sort((a, b) => WOCHE.indexOf(a.tag) - WOCHE.indexOf(b.tag) || String(a.von || '').localeCompare(String(b.von || '')));
}

/** „1 von 4 Plätzen belegt“ … – bei 0 leer (dann ist die ganze Anlage belegt). */
export function plaetzeText(n) {
  const z = Number(n);
  if (!Number.isFinite(z) || n === '' || n == null) return '';
  if (z === 0) return '';
  if (z >= 4) return 'alle Plätze belegt';
  return `${z} von 4 Plätzen belegt`;
}

/** Aufbereiteter Eintrag für die Anzeige (Website und „Heute auf der Anlage“). */
export function slot(z) {
  const belegt = Number(z.plaetze) === 0; // Anlage steht nicht zur Verfügung
  return {
    tag: z.tag,
    zeit: z.von ? `${z.von}–${z.bis}` : 'ganztags',
    hatZeit: !!z.von,
    gruppe: belegt && (!z.art || z.art === 'Belegt') ? 'Anlage nicht verfügbar' : z.art || 'Training',
    meta: [plaetzeText(z.plaetze), z.hinweis].filter(Boolean).join(' · '),
    belegt,
  };
}
