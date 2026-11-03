/**
 * markdown.mjs – wandelt die Texte aus content/ (Markdown) in HTML um.
 *
 * Unterstützt wird alles, was Redakteure typischerweise brauchen:
 *   # Überschriften, **fett**, _kursiv_, [Links](…), Listen, Tabellen, > Zitate, --- Trennlinien
 *
 * Vereins-Extras:
 *   • Ein einfacher Zeilenumbruch bleibt ein Zeilenumbruch (wie in einer E-Mail).
 *   • Mehrere Bilder hintereinander (ohne Text dazwischen) → Bildergalerie mit Vollbildansicht.
 *   • Ein Bild, das auf ein PDF verlinkt → Dokument-Karte mit „Ansehen“ und „Herunterladen“.
 *   • Hinweisboxen:   > [!WICHTIG]   > [!HINWEIS]   > [!TIPP]   > [!ACHTUNG]
 *       > [!WICHTIG]
 *       > Nach Spielschluss bitte im Anwesenheitsbuch austragen.
 */

import { esc, slugify, icon } from './helpers.mjs';

export { slugify };

// Bild:  ![Beschreibung](adresse "optionaler Titel")
const IMG = String.raw`!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"([^"]*)")?\s*\)`;
const IMG_RE = new RegExp(IMG, 'g');
// Bild mit Link:  [![Beschreibung](vorschau)](ziel)
const LINKED_IMG_RE = new RegExp(String.raw`\[${IMG}\]\(\s*<?([^)\s>]+)>?\s*\)`, 'g');

const isImage = (url = '') => /\.(jpe?g|png|gif|webp|avif)(\?|#|$)/i.test(url);
const isDocument = (url = '') => /\.(pdf|docx?|xlsx?|pptx?)(\?|#|$)/i.test(url);

// ---------------------------------------------------------------------------
// Frontmatter: der Kopfbereich zwischen den „---“-Zeilen am Dateianfang
// ---------------------------------------------------------------------------

/**
 * Liest einfache „schlüssel: wert“-Paare aus dem Dateikopf.
 * Gibt { data, body } zurück – data sind die Angaben, body der eigentliche Text.
 */
export function parseFrontmatter(src) {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: src };
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([A-Za-z0-9_äöüÄÖÜß-]+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1).replace(/\\"/g, '"');
    }
    if (v === 'true') v = true;
    else if (v === 'false') v = false;
    data[kv[1]] = v;
  }
  return { data, body: src.slice(m[0].length) };
}

// ---------------------------------------------------------------------------
// Inline-Formatierung (innerhalb eines Absatzes)
// ---------------------------------------------------------------------------

function renderInline(text) {
  // Bereits erzeugtes HTML wird in „Platzhaltern“ geparkt, damit es nicht doppelt umgewandelt wird.
  const stash = [];
  const keep = (html) => `\u0000${stash.push(html) - 1}\u0000`;
  let s = text;

  // `Code`
  s = s.replace(/`([^`]+)`/g, (_, c) => keep(`<code>${esc(c)}</code>`));

  // Bilder im Fließtext
  s = s.replace(IMG_RE, (_, alt, src, title) =>
    keep(`<img src="${esc(src)}" alt="${esc(alt)}"${title ? ` title="${esc(title)}"` : ''} loading="lazy" decoding="async">`)
  );

  // Links – PDFs bekommen ein Kennzeichen und öffnen den Dokument-Betrachter
  s = s.replace(/\[([^\]]*(?:\u0000\d+\u0000)?[^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"([^"]*)")?\s*\)/g, (_, label, href) => {
    const external = /^https?:\/\//.test(href) && !href.includes('bsg-tennis.de');
    let attrs = external ? ' target="_blank" rel="noopener"' : '';
    if (isDocument(href)) attrs = ` class="file-link" data-doc target="_blank" rel="noopener"`;
    return keep(`<a href="${esc(href)}"${attrs}>${renderInline(label)}</a>`);
  });

  // Nackte Webadressen klickbar machen
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_, pre, url) =>
    pre + keep(`<a href="${esc(url)}" target="_blank" rel="noopener">${esc(url)}</a>`)
  );

  s = esc(s);

  // **fett**, *kursiv*, _kursiv_
  s = s.replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^\w*])\*(?=\S)([^*\n]*?\S)\*(?!\w)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^\w])_(?=\S)([\s\S]*?\S)_(?!\w)/g, '$1<em>$2</em>');

  // Platzhalter zurücksetzen (mehrfach, da sie verschachtelt sein können)
  for (let i = 0; i < 3; i++) s = s.replace(/\u0000(\d+)\u0000/g, (_, n) => stash[+n]);
  return s;
}

// ---------------------------------------------------------------------------
// Bilder-Absätze → Galerie und Dokument-Karten
// ---------------------------------------------------------------------------

/** true, wenn ein Absatz nur aus Bildern (ggf. verlinkt) besteht. */
function isOnlyImages(text) {
  const rest = text.replace(LINKED_IMG_RE, '').replace(IMG_RE, '').replace(/\s+/g, '');
  return rest === '' && /!\[/.test(text);
}

/** Dokument-Karte für ein PDF (Vorschaubild klein und scharf + Aktionen). */
export function docCard({ href, thumb, title }) {
  const name = title || decodeURIComponent(href.split('/').pop()).replace(/\.\w+$/, '');
  const ext = (href.match(/\.(\w+)(?:\?|#|$)/) || [, 'pdf'])[1].toUpperCase();
  return `<div class="doc-card">
  <a class="doc-thumb" href="${esc(href)}" data-doc target="_blank" rel="noopener" aria-label="${esc(name)} ansehen">${
    thumb ? `<img src="${esc(thumb)}" alt="" loading="lazy" decoding="async">` : icon('file')
  }</a>
  <div class="doc-body">
    <span class="doc-type">${esc(ext)}-Dokument</span>
    <strong class="doc-title">${esc(name)}</strong>
    <span class="doc-actions">
      <a class="btn btn-small btn-primary" href="${esc(href)}" data-doc target="_blank" rel="noopener">${icon('zoom', 'icon icon-sm')} Ansehen</a>
      <a class="btn btn-small btn-secondary" href="${esc(href)}" download>${icon('download', 'icon icon-sm')} Herunterladen</a>
    </span>
  </div>
</div>`;
}

function renderImageBlock(text) {
  const items = [];
  const docs = [];
  const re = new RegExp(String.raw`(?:\[)?${IMG}(?:\]\(\s*<?([^)\s>]+)>?\s*\))?`, 'g');
  let m;
  while ((m = re.exec(text))) {
    const [, alt, src, , link] = m;
    if (link && isDocument(link)) {
      docs.push(docCard({ href: link, thumb: src, title: alt }));
      continue;
    }
    // Für die Anzeige immer die große Version nehmen – sonst wirken Bilder unscharf.
    const full = link && isImage(link) ? link : src;
    if (link && !isImage(link)) {
      items.push(`<a class="g-item" href="${esc(link)}"><img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async"></a>`);
    } else {
      items.push(
        `<a class="g-item" href="${esc(full)}" data-lightbox data-caption="${esc(alt)}"><img src="${esc(full)}" alt="${esc(alt)}" loading="lazy" decoding="async"></a>`
      );
    }
  }
  let html = docs.join('\n');
  if (items.length) {
    const cls = items.length === 1 ? 'gallery gallery--single' : items.length === 2 ? 'gallery gallery--pair' : 'gallery';
    html += `<div class="${cls}">${items.join('')}</div>`;
  }
  return html;
}

// ---------------------------------------------------------------------------
// Block-Elemente
// ---------------------------------------------------------------------------

const ALERTS = {
  WICHTIG: { cls: 'important', icon: 'alert', label: 'Wichtig' },
  ACHTUNG: { cls: 'warning', icon: 'alert', label: 'Achtung' },
  HINWEIS: { cls: 'note', icon: 'info', label: 'Hinweis' },
  TIPP: { cls: 'tip', icon: 'bulb', label: 'Tipp' },
};

function splitRow(line) {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
}

/** Hauptfunktion: Markdown-Text → HTML. */
export function renderMarkdown(src = '') {
  const lines = src.replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let i = 0;

  const isBlank = (l) => /^\s*$/.test(l);
  const RAW_HTML = /^\s*<(div|section|figure|table|iframe|details|aside|p|ul|ol|h\d)\b/i;
  const startsBlock = (l) =>
    /^#{1,6}\s/.test(l) ||
    /^\s*([-*_])\s*\1\s*\1[\s\1]*$/.test(l) ||
    /^\s*[-*+]\s+/.test(l) ||
    /^\s*\d+[.)]\s+/.test(l) ||
    /^\s*>/.test(l) ||
    /^\s*\|.*\|\s*$/.test(l) ||
    RAW_HTML.test(l);

  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) {
      i++;
      continue;
    }

    // Rohes HTML (für Fortgeschrittene) wird unverändert übernommen
    if (RAW_HTML.test(line)) {
      const buf = [];
      while (i < lines.length && !isBlank(lines[i])) buf.push(lines[i++]);
      out.push(buf.join('\n'));
      continue;
    }

    // Überschrift
    const h = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
    if (h) {
      const level = h[1].length;
      const id = slugify(h[2].replace(/[*_`]/g, ''));
      out.push(`<h${level} id="${id}">${renderInline(h[2])}</h${level}>`);
      i++;
      continue;
    }

    // Trennlinie
    if (/^\s*([-*_])\s*\1\s*\1[\s\1]*$/.test(line)) {
      out.push('<hr>');
      i++;
      continue;
    }

    // Tabelle
    if (/^\s*\|.*\|\s*$/.test(line)) {
      const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) rows.push(lines[i++]);
      let head = null;
      let body = rows;
      if (rows.length > 1 && /^\s*\|?\s*:?-{2,}/.test(rows[1])) {
        head = splitRow(rows[0]);
        body = rows.slice(2);
      }
      let html = '<div class="table-wrap"><table>';
      if (head) html += `<thead><tr>${head.map((c) => `<th scope="col">${renderInline(c)}</th>`).join('')}</tr></thead>`;
      html += `<tbody>${body.map((r) => `<tr>${splitRow(r).map((c) => `<td>${renderInline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      out.push(html);
      continue;
    }

    // Zitat oder Hinweisbox
    if (/^\s*>/.test(line)) {
      const buf = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) buf.push(lines[i++].replace(/^\s*>\s?/, ''));
      const alert = buf[0].match(/^\[!(WICHTIG|ACHTUNG|HINWEIS|TIPP)\]\s*(.*)$/i);
      if (alert) {
        const a = ALERTS[alert[1].toUpperCase()];
        const title = alert[2] || a.label;
        out.push(
          `<aside class="alert alert--${a.cls}" role="note">${icon(a.icon, 'icon alert-icon')}<div><p class="alert-title">${renderInline(title)}</p>${renderMarkdown(
            buf.slice(1).join('\n')
          )}</div></aside>`
        );
      } else {
        out.push(`<blockquote>${renderMarkdown(buf.join('\n'))}</blockquote>`);
      }
      continue;
    }

    // Aufzählung oder nummerierte Liste
    const ul = /^\s*[-*+]\s+/;
    const ol = /^\s*\d+[.)]\s+/;
    if (ul.test(line) || ol.test(line)) {
      const ordered = ol.test(line);
      const re = ordered ? ol : ul;
      const items = [];
      const startNum = ordered ? parseInt(line, 10) : 1;
      while (i < lines.length && (re.test(lines[i]) || (!isBlank(lines[i]) && /^\s{2,}\S/.test(lines[i])))) {
        if (re.test(lines[i])) items.push(lines[i].replace(re, ''));
        else items[items.length - 1] += '\n' + lines[i].trim();
        i++;
      }
      // Liste, die nur aus Dokument-Links besteht (z. B. Satzung, Antrag) → Dokument-Karten
      const docLinks = items.map((it) => it.trim().match(/^\[([^\]]+)\]\(\s*<?([^)\s>]+)>?\s*\)$/));
      if (!ordered && docLinks.every((d) => d && isDocument(d[2]))) {
        out.push(`<div class="doc-list">${docLinks.map((d) => docCard({ href: d[2], title: d[1] })).join('')}</div>`);
        continue;
      }
      const tag = ordered ? 'ol' : 'ul';
      const start = ordered && startNum !== 1 ? ` start="${startNum}"` : '';
      out.push(`<${tag}${start}>${items.map((it) => `<li>${renderInline(it).replace(/\n/g, '<br>')}</li>`).join('')}</${tag}>`);
      continue;
    }

    // Normaler Absatz
    const buf = [];
    while (i < lines.length && !isBlank(lines[i]) && (buf.length === 0 || !startsBlock(lines[i]))) buf.push(lines[i++]);
    const text = buf.join('\n');
    out.push(isOnlyImages(text) ? renderImageBlock(text) : `<p>${renderInline(text).replace(/\n/g, '<br>\n')}</p>`);
  }
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// Hilfen für Übersichten (Teaser, Vorschaubilder)
// ---------------------------------------------------------------------------

/** Reiner Text ohne Formatierung – für Teaser, Meta-Beschreibungen und RSS. */
export function plainText(md = '') {
  return md
    .replace(LINKED_IMG_RE, '')
    .replace(IMG_RE, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*>\s*\[![A-Z]+\]/gim, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[#>*_`|]/g, '')
    .replace(/^\s*[-+]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Erstes Bild eines Beitrags (bevorzugt die große, verlinkte Version) – für Vorschaukarten. */
export function firstImage(md = '') {
  LINKED_IMG_RE.lastIndex = 0;
  const linked = LINKED_IMG_RE.exec(md);
  const plain = md.match(new RegExp(IMG));
  if (linked && (!plain || linked.index <= md.indexOf(plain[0]))) return isImage(linked[4]) ? linked[4] : linked[2];
  return plain ? plain[2] : null;
}

/**
 * Alle Fotos eines Beitrags (für die automatischen Alben im Fotoalbum).
 * Bei verlinkten Bildern wird die große Version genommen; GIFs (Symbole) werden ignoriert.
 */
export function extractImages(md = '') {
  const out = [];
  const re = new RegExp(String.raw`(?:\[)?${IMG}(?:\]\(\s*<?([^)\s>]+)>?\s*\))?`, 'g');
  let m;
  while ((m = re.exec(md))) {
    const [, alt, src, , link] = m;
    if (link && isDocument(link)) continue; // Vorschaubild eines PDFs ist kein Foto
    const full = link && isImage(link) ? link : src;
    if (/\.gif(\?|$)/i.test(full)) continue;
    out.push({ bild: full, text: alt });
  }
  return out;
}
