/**
 * Lokale Redaktion – Server-Teil (nur für „npm run dev“, wird NICHT veröffentlicht).
 *
 * Warum? Die Online-Redaktion (/admin, Sveltia CMS) speichert über GitHub und
 * funktioniert dort in allen Browsern. Zum Bearbeiten direkt auf dem eigenen
 * Rechner kann Sveltia aber nur Chrome/Edge. Diese kleine Redaktion schließt die
 * Lücke: Sie läuft in jedem Browser (auch Safari) und schreibt direkt in die
 * Projektdateien.
 *
 * Sicherheit: Der Vorschau-Server lauscht nur auf diesem Rechner (127.0.0.1),
 * Schreibzugriffe sind auf content/, data/ und public/media/uploads/ beschränkt.
 */

import fs from 'node:fs';
import path from 'node:path';
import { renderMarkdown, parseFrontmatter } from '../../lib/markdown.mjs';
import { slugify } from '../../lib/helpers.mjs';

const ERLAUBT = ['content/', 'data/'];

export function createApi(root) {
  /** Pfad prüfen: nur Markdown/JSON in content/ und data/ */
  const sicher = (rel) => {
    const norm = path.posix.normalize(String(rel || '')).replace(/^\/+/, '');
    if (!ERLAUBT.some((p) => norm.startsWith(p)) || norm.includes('..') || !/\.(md|json)$/.test(norm)) throw new Error('Pfad nicht erlaubt');
    return path.join(root, norm);
  };

  const body = (req) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => resolve(Buffer.concat(chunks)));
      req.on('error', reject);
    });

  const json = (res, data, status = 200) => {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(data));
  };

  /** Liefert true, wenn die Anfrage bearbeitet wurde. */
  return async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith('/__api/')) return false;

    // Schutz vor Zugriffen fremder Webseiten (DNS-Rebinding / CSRF)
    const host = (req.headers.host || '').split(':')[0];
    const origin = req.headers.origin ? new URL(req.headers.origin).hostname : host;
    if (!['localhost', '127.0.0.1'].includes(host) || origin !== host) {
      json(res, { fehler: 'Nur lokal erlaubt' }, 403);
      return true;
    }

    try {
      const q = url.searchParams;
      switch (url.pathname) {
        // Liste aller Dateien eines Ordners (für News und Seiten)
        case '/__api/list': {
          const dir = q.get('dir');
          if (!['content/news', 'content/seiten'].includes(dir)) throw new Error('Ordner nicht erlaubt');
          const files = fs
            .readdirSync(path.join(root, dir))
            .filter((f) => f.endsWith('.md'))
            .map((f) => {
              const { data } = parseFrontmatter(fs.readFileSync(path.join(root, dir, f), 'utf8'));
              return { path: `${dir}/${f}`, title: data.title || f, date: data.date || '', entwurf: !!data.entwurf };
            })
            .sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.title.localeCompare(b.title));
          json(res, files);
          return true;
        }
        case '/__api/read':
          json(res, { text: fs.readFileSync(sicher(q.get('path')), 'utf8') });
          return true;

        case '/__api/write': {
          if (req.method !== 'POST') throw new Error('POST erwartet');
          const text = (await body(req)).toString('utf8');
          if (q.get('path').endsWith('.json')) JSON.parse(text); // ungültiges JSON gar nicht erst speichern
          const file = sicher(q.get('path'));
          fs.mkdirSync(path.dirname(file), { recursive: true });
          fs.writeFileSync(file, text);
          // Umbenennen (z. B. wenn bei einem News-Beitrag Datum/Titel geändert wurde)
          const alt = q.get('alt');
          if (alt && alt !== q.get('path') && fs.existsSync(sicher(alt))) fs.unlinkSync(sicher(alt));
          json(res, { ok: true });
          return true;
        }
        case '/__api/delete': {
          if (req.method !== 'POST') throw new Error('POST erwartet');
          const p = q.get('path');
          if (!p.startsWith('content/news/')) throw new Error('Nur News können gelöscht werden');
          fs.unlinkSync(sicher(p));
          json(res, { ok: true });
          return true;
        }
        // Bild/PDF hochladen → public/media/uploads/
        case '/__api/upload': {
          if (req.method !== 'POST') throw new Error('POST erwartet');
          const name = String(q.get('name') || 'datei');
          const ext = (name.match(/\.(jpe?g|png|gif|webp|pdf)$/i) || [])[0];
          if (!ext) throw new Error('Nur Bilder (JPG, PNG, GIF, WebP) und PDFs');
          const base = slugify(name.replace(/\.[^.]+$/, '')) || 'datei';
          const dir = path.join(root, 'public/media/uploads');
          fs.mkdirSync(dir, { recursive: true });
          let file = `${base}${ext.toLowerCase()}`;
          for (let n = 2; fs.existsSync(path.join(dir, file)); n++) file = `${base}-${n}${ext.toLowerCase()}`;
          fs.writeFileSync(path.join(dir, file), await body(req));
          json(res, { url: `/media/uploads/${file}` });
          return true;
        }
        // Live-Vorschau des Textes
        case '/__api/preview':
          json(res, { html: renderMarkdown((await body(req)).toString('utf8')) });
          return true;
        default:
          json(res, { fehler: 'Unbekannt' }, 404);
          return true;
      }
    } catch (e) {
      json(res, { fehler: e.message }, 400);
      return true;
    }
  };
}
