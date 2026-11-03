#!/usr/bin/env node
/**
 * serve.mjs – lokale Vorschau mit automatischem Neuladen.
 *
 *   npm run dev   →  http://localhost:4321          Website
 *                    http://localhost:4321/redaktion/ Lokale Redaktion (jeder Browser, auch Safari)
 *
 * Jede Änderung in content/, data/, public/ oder lib/ baut die Seite neu
 * und lädt alle offenen Browserfenster automatisch neu.
 * Der Server ist nur auf diesem Rechner erreichbar (127.0.0.1).
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createApi } from './tools/redaktion/api.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const REDAKTION = path.join(ROOT, 'tools/redaktion');
const PORT = Number(process.env.PORT || 4321);
const api = createApi(ROOT);
const clients = new Set(); // offene Browserfenster (für automatisches Neuladen)

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.webp': 'image/webp', '.pdf': 'application/pdf', '.ics': 'text/calendar; charset=utf-8', '.vcf': 'text/vcard; charset=utf-8',
  '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.yml': 'text/yaml; charset=utf-8', '.webmanifest': 'application/manifest+json',
};

// ---------------------------------------------------------------------------
// Neu bauen (bei jedem Start und bei jeder Dateiänderung)
// ---------------------------------------------------------------------------
let version = 0;
let building = false;
let again = false;
async function rebuild() {
  if (building) return void (again = true); // läuft schon → danach noch einmal
  building = true;
  try {
    const mod = await import(pathToFileURL(path.join(ROOT, 'build.mjs')).href + `?v=${version++}`);
    await mod.build();
    for (const res of clients) res.write('data: reload\n\n');
  } catch (e) {
    console.error('✖ Fehler beim Bauen:', e.message);
  }
  building = false;
  if (again) {
    again = false;
    rebuild();
  }
}
await rebuild();

let timer;
const schedule = () => {
  clearTimeout(timer);
  timer = setTimeout(rebuild, 150);
};
for (const dir of ['content', 'data', 'public', 'lib']) fs.watch(path.join(ROOT, dir), { recursive: true }, schedule);
fs.watch(path.join(ROOT, 'build.mjs'), schedule);

// ---------------------------------------------------------------------------
// Webserver
// ---------------------------------------------------------------------------
const RELOAD = `<script>new EventSource('/__reload').onmessage=()=>location.reload()</script>`;

function sendFile(res, file, status = 200, inject = true) {
  const ext = path.extname(file).toLowerCase();
  let body = fs.readFileSync(file);
  if (ext === '.html' && inject) body = body.toString().replace('</body>', RELOAD + '</body>');
  res.writeHead(status, { 'Content-Type': TYPES[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(body);
}

http
  .createServer(async (req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);

    // Live-Reload-Verbindung
    if (url === '/__reload') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write('\n');
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }

    // Schnittstelle der lokalen Redaktion
    if (await api(req, res)) return;

    // Lokale Redaktion (Dateien aus tools/redaktion/)
    if (url === '/redaktion' || url.startsWith('/redaktion/')) {
      const rel = url.replace(/^\/redaktion\/?/, '') || 'index.html';
      const file = path.join(REDAKTION, rel);
      if (file.startsWith(REDAKTION) && fs.existsSync(file) && !file.endsWith('.mjs')) return sendFile(res, file, 200, false);
      return sendFile(res, path.join(REDAKTION, 'index.html'), 200, false);
    }

    // Website aus dist/
    let file = path.join(DIST, url);
    if (!file.startsWith(DIST)) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    if (!fs.existsSync(file)) return sendFile(res, path.join(DIST, '404.html'), 404);
    sendFile(res, file);
  })
  .listen(PORT, '127.0.0.1', () => {
    console.log(`
  Vorschau läuft:     http://localhost:${PORT}
  Lokale Redaktion:   http://localhost:${PORT}/redaktion/   (jeder Browser, auch Safari)
  (Beenden mit Ctrl+C)
`);
  });
