#!/usr/bin/env node
// Lädt alle Bilder und PDFs, auf die die Inhalte verweisen, von der alten Seite
// (www.bsg-tennis.de) herunter und legt sie unter public/media/ ab.
// Danach ist die neue Seite komplett unabhängig vom alten Baukasten.
//
//   npm run medien

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://www.bsg-tennis.de/';

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(md|json|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}

const files = [...walk(path.join(ROOT, 'content')), ...walk(path.join(ROOT, 'data')), ...walk(path.join(ROOT, 'lib'))];
const refs = new Set();
for (const f of files) {
  const txt = fs.readFileSync(f, 'utf8');
  for (const m of txt.matchAll(/\/media\/((?:mediapool|ci_)[^\s)"'<>]+)/g)) refs.add(m[1]);
}

const list = [...refs].filter((r) => !fs.existsSync(path.join(ROOT, 'public/media', decode(r))));
console.log(`${refs.size} Dateien referenziert, ${list.length} fehlen lokal – lade herunter …`);

let ok = 0;
const failed = [];
const queue = [...list];
async function worker() {
  while (queue.length) {
    const rel = queue.shift();
    const target = path.join(ROOT, 'public/media', decode(rel));
    try {
      const res = await fetch(ORIGIN + rel);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, buf);
      ok++;
      process.stdout.write(`\r  ${ok}/${list.length} geladen`);
    } catch (e) {
      failed.push(`${rel}  (${e.message})`);
    }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));
console.log(`\n✔ ${ok} Dateien gespeichert in public/media/`);
if (failed.length) {
  console.log(`⚠ ${failed.length} Dateien konnten nicht geladen werden (gibt es auf der alten Seite evtl. nicht mehr):`);
  failed.forEach((f) => console.log('   - ' + f));
}

function decode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
