/**
 * content.mjs – liest alle Inhalte ein:
 *   data/*.json         → Vereinsdaten, Termine, Training, Personen, Fotos …
 *   content/seiten/*.md → Seitentexte
 *   content/news/*.md   → News-Beiträge (ein Beitrag = eine Datei)
 *
 * Läuft ohne Dateisystem: Die Inhalte kommen als Objekt { 'data/verein.json': '…', … }.
 * So nutzt der Build (Node.js) denselben Code wie die Live-Vorschau in der Redaktion (Browser).
 *
 * Kopfangaben eines News-Beitrags:
 *   title, date        Pflicht
 *   bild               Vorschaubild für Übersichten (optional, sonst erstes Foto)
 *   kurztext           Teaser für Übersichten (optional)
 *   entwurf: true      wird nicht veröffentlicht
 *   ungefaehr: true    nur „Monat Jahr“ anzeigen (für importierte Altbeiträge ohne genaues Datum)
 *   album: false       Fotos dieses Beitrags nicht als eigenes Album im Fotoalbum zeigen
 */

import { renderMarkdown, parseFrontmatter, plainText, extractImages } from './markdown.mjs';
import { slugify, truncate, datumLang, monatJahr } from './helpers.mjs';

/** Wie viele Jahre News auf der News-Seite stehen; ältere wandern automatisch ins Archiv. */
export const NEWS_JAHRE = 8;

/** @param {Record<string, string>} files  Pfad → Dateiinhalt */
export function createLoader(files) {
  const lies = (pfad) => {
    if (files[pfad] == null) throw new Error(`Datei fehlt: ${pfad}`);
    return files[pfad];
  };
  const readJson = (name) => JSON.parse(lies(`data/${name}.json`));

  /** Eine Seite aus content/seiten/ lesen. */
  function page(name) {
    const { data, body } = parseFrontmatter(lies(`content/seiten/${name}.md`));
    return { ...data, body, html: renderMarkdown(body) };
  }

  /**
   * Alle News-Beiträge, neueste zuerst.
   * Dateiname: JJJJ-MM-TT-titel.md   Kopfangaben: title, date, bild, kurztext, entwurf, ungefaehr
   */
  function posts({ heuteJahr }) {
    const list = Object.keys(files)
      .filter((p) => p.startsWith('content/news/') && p.endsWith('.md') && files[p] != null)
      .map((p) => {
        const f = p.slice('content/news/'.length);
        const { data, body } = parseFrontmatter(files[p]);
        if (data.entwurf === true) return null; // Entwürfe werden nicht veröffentlicht
        const date = String(data.date || f.slice(0, 10)).slice(0, 10);
        const year = Number(date.slice(0, 4));
        return {
          file: f,
          slug: f.replace(/\.md$/, '').replace(/^\d{4}-\d{2}-\d{2}-/, '') || slugify(data.title),
          title: data.title || f,
          date,
          year,
          // Bei älteren Beiträgen ist das genaue Datum oft unbekannt → nur „Monat Jahr“ anzeigen
          dateLabel: data.ungefaehr ? monatJahr(date) : datumLang(date),
          ungefaehr: !!data.ungefaehr,
          bild: data.bild || extractImages(body)[0]?.bild || null, // Vorschaubild: angegeben oder erstes Foto (keine PDF-Vorschauen)
          teaser: data.kurztext || truncate(plainText(body), 180),
          html: renderMarkdown(body),
          bilder: extractImages(body), // für automatische Fotoalben
          album: data.album !== false, // „album: false“ im Kopf → nicht im Fotoalbum zeigen
          // Älter als NEWS_JAHRE → Archiv (läuft jedes Jahr automatisch weiter)
          archiv: year <= heuteJahr - NEWS_JAHRE,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title) || a.file.localeCompare(b.file));

    // Eindeutige Adressen sicherstellen (falls zwei Beiträge gleich heißen)
    const seen = new Set();
    for (const p of list) {
      let s = p.slug;
      for (let n = 2; seen.has(s); n++) s = `${p.slug}-${n}`;
      seen.add(s);
      p.slug = s;
      p.url = `/news/${s}/`;
    }
    return list;
  }

  return { readJson, page, posts };
}

/**
 * Personen (data/vorstand.json) in Vorstand und Trainer aufteilen.
 * Jede Person steht nur einmal in der Datei; „vorstand“ und „trainer“ enthalten die jeweilige
 * Funktion (leer = nicht in dieser Rolle). Wer beides ist, erscheint in beiden Listen.
 */
export function personenAufteilen(daten) {
  // Altes Format (getrennte Listen) weiter verstehen
  if (Array.isArray(daten.trainer)) return { personen: daten.personen || [], trainer: daten.trainer, alle: [...(daten.personen || []), ...daten.trainer] };
  const alle = daten.personen || [];
  return {
    personen: alle.filter((p) => p.vorstand).map((p) => ({ ...p, funktion: p.vorstand })),
    trainer: alle.filter((p) => p.trainer).map((p) => ({ ...p, funktion: p.trainer, zustaendig: p.trainiert })),
    alle,
  };
}
