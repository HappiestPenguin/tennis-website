/**
 * content.mjs – liest alle Inhalte ein:
 *   data/*.json         → Vereinsdaten, Termine, Training, Vorstand, Fotos …
 *   content/seiten/*.md → Seitentexte
 *   content/news/*.md   → News-Beiträge (ein Beitrag = eine Datei)
 *
 * Kopfangaben eines News-Beitrags:
 *   title, date        Pflicht
 *   bild               Vorschaubild für Übersichten (optional, sonst erstes Foto)
 *   kurztext           Teaser für Übersichten (optional)
 *   entwurf: true      wird nicht veröffentlicht
 *   ungefaehr: true    nur „Monat Jahr“ anzeigen (für importierte Altbeiträge ohne genaues Datum)
 *   album: false       Fotos dieses Beitrags nicht als eigenes Album im Fotoalbum zeigen
 */

import fs from 'node:fs';
import path from 'node:path';
import { renderMarkdown, parseFrontmatter, plainText, extractImages } from './markdown.mjs';
import { slugify, truncate, datumLang, monatJahr } from './helpers.mjs';

/** Wie viele Jahre News auf der News-Seite stehen; ältere wandern automatisch ins Archiv. */
export const NEWS_JAHRE = 8;

export function createLoader(root) {
  const readJson = (name) => JSON.parse(fs.readFileSync(path.join(root, 'data', name + '.json'), 'utf8'));

  /** Eine Seite aus content/seiten/ lesen. */
  function page(name) {
    const { data, body } = parseFrontmatter(fs.readFileSync(path.join(root, 'content/seiten', name + '.md'), 'utf8'));
    return { ...data, body, html: renderMarkdown(body) };
  }

  /**
   * Alle News-Beiträge, neueste zuerst.
   * Dateiname: JJJJ-MM-TT-titel.md   Kopfangaben: title, date, bild, kurztext, entwurf, ungefaehr
   */
  function posts({ heuteJahr }) {
    const dir = path.join(root, 'content/news');
    const list = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => {
        const { data, body } = parseFrontmatter(fs.readFileSync(path.join(dir, f), 'utf8'));
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
      .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));

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
