/**
 * training.mjs – Trainingszeiten / Platzbelegung aufbereiten.
 *
 * Datenformat (data/training.json → zeiten[]):
 *   tag           Wochentag („Montag“ …)
 *   von, bis      Uhrzeit „HH:MM“ – leer = ganztags
 *   gruppe        z. B. „Kindertraining“
 *   leitung       Name eines Trainers aus data/vorstand.json (Auswahlliste)
 *   leitung_frei  freier Name, falls die Person kein Trainer ist (z. B. Seniorengruppe)
 *   plaetze       Zahl 0–4. 0 = Anlage nicht verfügbar (z. B. Ligaspiele)
 *   hinweis       optional, z. B. „ggf. anmelden“
 */

export const WOCHE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

/** Sortiert nach Wochentag und Uhrzeit (ganztägige Einträge zuerst). */
export function sortiereZeiten(zeiten = []) {
  return [...zeiten].sort((a, b) => WOCHE.indexOf(a.tag) - WOCHE.indexOf(b.tag) || String(a.von || '').localeCompare(String(b.von || '')));
}

/** „1 Platz“, „2 Plätze“, „alle Plätze“ – bei 0: Anlage belegt. */
export function plaetzeText(n) {
  const z = Number(n);
  if (!Number.isFinite(z) || n === '' || n == null) return String(n || '');
  if (z === 0) return '';
  if (z >= 4) return 'alle Plätze';
  return z === 1 ? '1 Platz' : `${z} Plätze`;
}

/** Aufbereiteter Eintrag für die Anzeige (Website und „Heute auf der Anlage“). */
export function slot(z) {
  const leitung = z.leitung || z.leitung_frei || '';
  const meta = [leitung, plaetzeText(z.plaetze), z.hinweis].filter(Boolean).join(' · ');
  return {
    tag: z.tag,
    zeit: z.von ? `${z.von}–${z.bis}` : 'ganztags',
    hatZeit: !!z.von,
    gruppe: z.gruppe,
    meta,
    belegt: Number(z.plaetze) === 0, // Anlage steht nicht zur Verfügung
  };
}

/** true, wenn es sich um eine Kinder-/Jugendgruppe handelt. */
export const istJugend = (z) => /kind|jugend|förder|junior/i.test(z.gruppe || '');
