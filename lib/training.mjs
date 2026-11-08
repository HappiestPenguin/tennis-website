/**
 * training.mjs – Platzbelegung aufbereiten.
 *
 * Zwei Ansichten, umschaltbar in der Redaktion (data/training.json → "anzeige"):
 *   "ausfuehrlich"  Gruppe, Verantwortliche/r und Plätze – wie auf der alten Website
 *   "anonym"        nur WANN WIE VIELE Plätze belegt sind (keine Gruppen, keine Namen).
 *                   Überschneidende Trainingszeiten eines Tages werden dafür zusammengerechnet.
 *
 * Datenformat (data/training.json → zeiten[]):
 *   tag           Wochentag („Montag“ …)
 *   von, bis      Uhrzeit „HH:MM“ – leer = ganztags
 *   art           Training | Freies Spiel | Turnier | Arbeitseinsatz | Veranstaltung | Belegt
 *   gruppe        z. B. „Kindertraining“ (nur in der ausführlichen Ansicht sichtbar)
 *   leitung       Name eines Trainers aus data/vorstand.json (Auswahlliste, nur ausführlich)
 *   leitung_frei  freier Name, falls die Person kein Trainer ist (nur ausführlich)
 *   plaetze       Zahl 0–4 belegter Plätze. 0 = ganze Anlage nicht verfügbar
 *   hinweis       optional, z. B. „ggf. anmelden“
 */

export const WOCHE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const PLAETZE = 4;

/** Sortiert nach Wochentag und Uhrzeit (ganztägige Einträge zuerst). */
export function sortiereZeiten(zeiten = []) {
  return [...zeiten].sort((a, b) => WOCHE.indexOf(a.tag) - WOCHE.indexOf(b.tag) || String(a.von || '').localeCompare(String(b.von || '')));
}

export const istAnonym = (training) => (training?.anzeige || 'anonym') !== 'ausfuehrlich';
const istFrei = (z) => (z.art || '') === 'Freies Spiel';
const istTraining = (z) => !z.art || z.art === 'Training';

/** Ausführlich: „1 Platz“, „2 Plätze“, „alle Plätze“. */
function plaetzeKurz(n) {
  const z = Number(n);
  if (!Number.isFinite(z) || z === 0) return '';
  if (z >= PLAETZE) return 'alle Plätze';
  return z === 1 ? '1 Platz' : `${z} Plätze`;
}

/** Anonym: „1 von 4 Plätzen belegt“. */
function plaetzeBelegt(n) {
  const z = Number(n);
  if (!Number.isFinite(z) || z === 0) return '';
  if (z >= PLAETZE) return 'alle Plätze belegt';
  return `${z} von ${PLAETZE} Plätzen belegt`;
}

/** Ein Eintrag in der ausführlichen Ansicht. */
function slotAusfuehrlich(z) {
  const belegt = Number(z.plaetze) === 0;
  const leitung = z.leitung || z.leitung_frei || '';
  return {
    tag: z.tag,
    zeit: z.von ? `${z.von}–${z.bis}` : 'ganztags',
    hatZeit: !!z.von,
    gruppe: z.gruppe || z.art || 'Training',
    meta: [leitung, istFrei(z) ? '' : plaetzeKurz(z.plaetze), z.hinweis].filter(Boolean).join(' · '),
    belegt,
  };
}

/** Ein Eintrag in der anonymen Ansicht. */
function slotAnonym(z) {
  const belegt = Number(z.plaetze) === 0;
  return {
    tag: z.tag,
    zeit: z.von ? `${z.von}–${z.bis}` : 'ganztags',
    hatZeit: !!z.von,
    gruppe: belegt && (!z.art || z.art === 'Belegt' || z.art === 'Training') ? 'Anlage nicht verfügbar' : z.art || 'Training',
    meta: istFrei(z) ? '' : plaetzeBelegt(z.plaetze),
    belegt,
  };
}

const minuten = (t) => {
  const [h, m] = String(t).split(':').map(Number);
  return h * 60 + (m || 0);
};
const uhrzeit = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/**
 * Anonym: Trainingszeiten eines Tages zusammenrechnen, damit man nicht an einzelnen
 * Zeitfenstern ablesen kann, welche Gruppe wann da ist. Beispiel:
 *   15:30–17:30 (1) + 16:00–18:00 (1) + 17:30–19:30 (1)
 *   → 15:30–16:00 (1) · 16:00–18:00 (2) · 18:00–19:30 (1)
 */
function zusammenrechnen(zeiten) {
  const mitZeit = zeiten.filter((z) => z.von && z.bis && Number(z.plaetze) > 0);
  const grenzen = [...new Set(mitZeit.flatMap((z) => [minuten(z.von), minuten(z.bis)]))].sort((a, b) => a - b);
  const stuecke = [];
  for (let i = 0; i < grenzen.length - 1; i++) {
    const [a, b] = [grenzen[i], grenzen[i + 1]];
    const n = mitZeit.filter((z) => minuten(z.von) <= a && minuten(z.bis) >= b).reduce((s, z) => s + Number(z.plaetze), 0);
    if (!n) continue;
    const letztes = stuecke[stuecke.length - 1];
    if (letztes && letztes.bis === a && letztes.n === Math.min(n, PLAETZE)) letztes.bis = b;
    else stuecke.push({ von: a, bis: b, n: Math.min(n, PLAETZE) });
  }
  const ohneZeit = zeiten.filter((z) => !(z.von && z.bis && Number(z.plaetze) > 0));
  return [...ohneZeit, ...stuecke.map((s) => ({ von: uhrzeit(s.von), bis: uhrzeit(s.bis), art: 'Training', plaetze: s.n }))];
}

/** Alle Einträge fertig für die Anzeige – je nach eingestellter Ansicht. */
export function belegung(training) {
  const zeiten = training?.zeiten || [];
  if (!istAnonym(training)) return sortiereZeiten(zeiten).map(slotAusfuehrlich);
  return WOCHE.flatMap((tag) => {
    const desTages = zeiten.filter((z) => z.tag === tag);
    const training_ = zusammenrechnen(desTages.filter(istTraining));
    const sonst = desTages.filter((z) => !istTraining(z));
    return sortiereZeiten([...training_, ...sonst].map((z) => ({ ...z, tag }))).map(slotAnonym);
  });
}

/** true, wenn es sich um eine Kinder-/Jugendgruppe handelt. */
export const istJugend = (z) => /kind|jugend|förder|junior/i.test(z.gruppe || '');
