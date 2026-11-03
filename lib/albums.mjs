/**
 * albums.mjs – stellt das Fotoalbum zusammen.
 *
 * Zwei Quellen, damit möglichst wenig Pflege nötig ist:
 *   1. data/galerie.json  – von Hand gepflegte Alben (z. B. die alten Fotos von 2012–2023)
 *   2. News-Beiträge      – jeder Beitrag mit mindestens 3 Fotos wird AUTOMATISCH ein Album.
 *                           Wer also einen Turnierbericht mit Fotos schreibt, hat gleich ein Album.
 *                           Abschalten pro Beitrag mit „album: false“ im Kopf.
 */

import { slugify } from './helpers.mjs';

export const MIN_FOTOS_FUER_ALBUM = 3;

export function buildAlbums({ galerie, posts }) {
  const alben = [];

  for (const p of posts) {
    if (!p.album || p.bilder.length < MIN_FOTOS_FUER_ALBUM) continue;
    alben.push({
      titel: p.title,
      datum: p.date,
      jahr: String(p.year),
      bilder: p.bilder.map((b) => ({ bild: b.bild, text: b.text || p.title })),
      beitrag: p.url, // Link „Zum Bericht“
    });
  }

  for (const a of galerie.alben || []) {
    if (!a.bilder?.length) continue;
    alben.push({ titel: a.titel, datum: a.datum || `${a.jahr || '2000'}-07-01`, jahr: String(a.jahr || ''), bilder: a.bilder, beitrag: a.beitrag || '' });
  }

  alben.sort((a, b) => b.datum.localeCompare(a.datum));

  // Eindeutige Adressen /fotoalbum/<titel>/
  const seen = new Set();
  for (const a of alben) {
    let s = slugify(a.titel) || 'album';
    for (let n = 2; seen.has(s); n++) s = `${slugify(a.titel)}-${n}`;
    seen.add(s);
    a.slug = s;
    a.url = `/fotoalbum/${s}/`;
    a.cover = a.bilder[0].bild;
  }
  return alben;
}
