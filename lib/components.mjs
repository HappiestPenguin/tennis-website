/**
 * components.mjs – wiederverwendbare Bausteine, aus denen die Seiten
 * (siehe pages.mjs) zusammengesetzt werden.
 */

import { esc, icon, dateParts, datumLang, datumMitTag, monatJahr, MONATE_KURZ, WOCHENTAGE, slugify } from './helpers.mjs';
import { sortiereZeiten, slot } from './training.mjs';

// ---------------------------------------------------------------------------
// Seitenkopf
// ---------------------------------------------------------------------------

export const pageHead = (title, eyebrow = '', lead = '') => `<section class="page-head">
  <div class="container">
    ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
    <h1>${esc(title)}</h1>
    ${lead ? `<p class="lead">${lead}</p>` : ''}
  </div>
</section>`;

// ---------------------------------------------------------------------------
// Termine
// ---------------------------------------------------------------------------

const dateBadge = (iso) => {
  const { d, m } = dateParts(iso);
  return `<span class="date-badge" aria-hidden="true"><span class="db-day">${d}</span><span class="db-mon">${MONATE_KURZ[m - 1]}</span></span>`;
};

/** Terminliste. Bei kommenden Terminen gibt es einen „In den Kalender“-Knopf. */
export function eventList(list, { past = false } = {}) {
  if (!list.length) return '<p class="muted">Aktuell sind keine Termine eingetragen.</p>';
  return `<ul class="event-list${past ? ' is-past' : ''}">${list
    .map((t) => {
      const ev = { id: t.id, titel: t.titel, datum: t.datum, uhrzeit: t.uhrzeit || '', ort: t.ort || '', beschreibung: t.beschreibung || '' };
      const meta = [
        `${icon('cal', 'icon icon-sm')} ${datumMitTag(t.datum)}`,
        t.uhrzeit ? `${icon('clock', 'icon icon-sm')} ${esc(t.uhrzeit)} Uhr` : '',
        t.ort ? `${icon('pin', 'icon icon-sm')} ${esc(t.ort)}` : '',
      ].filter(Boolean);
      return `<li class="event" data-ev="${esc(JSON.stringify(ev))}">
        ${dateBadge(t.datum)}
        <div class="event-body">
          <h3>${esc(t.titel)}</h3>
          <p class="event-meta">${meta.join(' <span aria-hidden="true">·</span> ')}</p>
          ${t.beschreibung ? `<p>${esc(t.beschreibung)}</p>` : ''}
        </div>
        ${past ? '' : `<button class="event-ics" type="button" data-ics title="Termin in meinen Kalender übernehmen">${icon('download', 'icon icon-sm')}<span>Kalender</span></button>`}
      </li>`;
    })
    .join('')}</ul>`;
}

// ---------------------------------------------------------------------------
// News
// ---------------------------------------------------------------------------

/** Große Vorschaukarte mit Bild (Startseite, News-Übersicht). */
export function newsCard(p, { large = false } = {}) {
  return `<article class="news-card${large ? ' news-card--large' : ''}" data-year="${p.year}">
    <a class="news-card-link" href="${p.url}">
      <div class="news-card-media">${
        p.bild ? `<img src="${esc(p.bild)}" alt="" loading="lazy" decoding="async">` : `<div class="placeholder-court">${icon('court')}</div>`
      }</div>
      <div class="news-card-body">
        <time datetime="${p.date}">${p.dateLabel}</time>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.teaser)}</p>
        <span class="more">Weiterlesen ${icon('arrow', 'icon icon-sm')}</span>
      </div>
    </a>
  </article>`;
}

/** Kompakte Listenzeile (Archiv). */
export const newsRow = (p) => `<li class="news-row">
  <a href="${p.url}">
    <time datetime="${p.date}">${p.dateLabel}</time>
    <strong>${esc(p.title)}</strong>
    <span class="muted">${esc(p.teaser)}</span>
  </a>
</li>`;

// ---------------------------------------------------------------------------
// Personen / Kontaktkarten
// ---------------------------------------------------------------------------

const initials = (n) => n.split(' ').map((x) => x[0]).join('').slice(0, 2);

/**
 * Kontaktkarte. Telefon/E-Mail erscheinen nur, wenn „kontakt_freigegeben“ = true.
 * Die E-Mail-Adresse steht verschlüsselt im HTML (Schutz vor Spam-Robotern).
 */
export function personCard(p) {
  const frei = p.kontakt_freigegeben === true;
  const tel = frei && p.telefon ? p.telefon : '';
  const mail = frei && p.email ? p.email : '';
  const avatar = p.foto
    ? `<img class="avatar avatar--img" src="${esc(p.foto)}" alt="" loading="lazy">`
    : `<span class="avatar" aria-hidden="true">${esc(initials(p.name))}</span>`;
  const actions = [];
  if (tel) actions.push(`<a class="contact-btn" href="tel:${esc(tel.replace(/[^\d+]/g, ''))}">${icon('phone', 'icon icon-sm')}<span>${esc(tel)}</span></a>`);
  if (mail)
    actions.push(
      `<a class="contact-btn" href="#" data-mail="${esc(mail.split('').reverse().join(''))}">${icon('mail', 'icon icon-sm')}<span>E-Mail schreiben</span></a>`
    );
  if (tel || mail) actions.push(`<a class="contact-btn contact-btn--ghost" href="/kontakte/${slugify(p.name)}.vcf" download>${icon('user', 'icon icon-sm')}<span>Kontakt speichern</span></a>`);
  return `<article class="person">
    <div class="person-head">${avatar}<div><h3>${esc(p.name)}</h3><p class="person-role">${esc(p.funktion)}</p></div></div>
    ${p.zustaendig ? `<p class="person-for"><span class="muted">Ansprechpartner für</span> ${esc(p.zustaendig)}</p>` : ''}
    ${actions.length ? `<div class="person-actions">${actions.join('')}</div>` : `<p class="person-actions"><a class="contact-btn contact-btn--ghost" href="/kontakt/">${icon('mail', 'icon icon-sm')}<span>Über das Kontaktformular</span></a></p>`}
  </article>`;
}

// ---------------------------------------------------------------------------
// Wetter + „Heute auf der Anlage“
// ---------------------------------------------------------------------------

/**
 * Karte auf der Startseite: Wetter an der Anlage + heutige Trainingszeiten.
 * Das Training des aktuellen Wochentags setzt main.js im Browser ein (die Seite wird ja nicht täglich neu gebaut).
 */
export function todayCard({ wetter, training }) {
  const w = wetter;
  const weatherHtml = w
    ? `<div class="weather" data-weather>
      <div class="weather-now">
        ${icon(w.icon, 'icon weather-icon')}
        <div>
          <p class="weather-temp"><span data-w="temperatur">${w.temperatur}</span>°C</p>
          <p class="weather-text"><span data-w="text">${esc(w.text)}</span> · Wind <span data-w="wind">${w.wind}</span> km/h</p>
        </div>
      </div>
      <p class="court-status court-status--${w.platz.stufe}" data-w="platz">${esc(w.platz.text)}</p>
      <ul class="forecast">${w.tage
        .slice(1, 4)
        .map(
          (t) => `<li><span class="fc-day">${WOCHENTAGE[dateParts(t.datum).wd].slice(0, 2)}</span>${icon(t.icon, 'icon fc-icon')}<span class="fc-temp">${t.max}° <span class="muted">${t.min}°</span></span>${
            t.regen >= 30 ? `<span class="fc-rain">${t.regen} %</span>` : ''
          }</li>`
        )
        .join('')}</ul>
      <p class="weather-source">Wetter an der Anlage · Stand <span data-w="stand">${w.stand.slice(11, 16)}</span> Uhr · Daten: <a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo.com</a></p>
    </div>`
    : '';
  return `<aside class="today-card" data-today>
    <div class="today-head">${icon('court')}<div><p class="eyebrow">Heute auf der Anlage</p><p class="today-day" data-today-day>Trainingsplan</p></div></div>
    ${weatherHtml}
    <ul class="today-list" data-today-list><li class="muted">Die Platzbelegung finden Sie unter <a href="/angebote/#training">Trainingszeiten</a>.</li></ul>
    <p class="today-foot">Es steht immer ein Platz zum freien Spielen für Mitglieder zur Verfügung.</p>
    <script type="application/json" data-training>${JSON.stringify(sortiereZeiten(training.zeiten).map(slot)).replace(/</g, '\\u003c')}</script>
  </aside>`;
}

// ---------------------------------------------------------------------------
// Gästebuch
// ---------------------------------------------------------------------------

export const guestEntry = (e) => `<figure class="gb-entry">
  ${icon('quote', 'icon gb-quote')}
  <blockquote>${esc(e.text)}</blockquote>
  <figcaption><strong>${esc(e.name)}</strong>${e.ort ? ` aus ${esc(e.ort)}` : ''} · <time datetime="${esc(e.datum)}">${datumLang(e.datum)}</time></figcaption>
</figure>`;

// ---------------------------------------------------------------------------
// Formulare (Versand über form.taxi)
// ---------------------------------------------------------------------------

/**
 * Formular mit Einwilligung, Spamschutz (unsichtbares Feld „_gotcha“) und
 * Versand ohne Seitenwechsel (siehe main.js).
 */
export function form({ action, betreff, felder, submit }) {
  return `<form class="form" action="${esc(action)}" method="POST" data-form>
  <input type="hidden" name="_subject" value="${esc(betreff)}">
  ${felder}
  <label class="check"><input type="checkbox" name="Datenverarbeitung bestätigt" value="Ja" required><span>Ich bin einverstanden, dass meine Angaben zur Bearbeitung meiner Anfrage verarbeitet werden. Details in der <a href="/datenschutz/">Datenschutzerklärung</a>. Die Einwilligung kann ich jederzeit widerrufen.</span></label>
  <input type="text" name="_gotcha" value="" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">
  <button class="btn btn-primary" type="submit">${esc(submit)} ${icon('arrow', 'icon icon-sm')}</button>
  <p class="form-status" role="status" aria-live="polite"></p>
</form>`;
}

// ---------------------------------------------------------------------------
// Wochenplan (Platzbelegung)
// ---------------------------------------------------------------------------

/** Ein Wochentag mit allen Trainingszeiten. */
export function dayCard(tag, zeiten) {
  const slots = sortiereZeiten(zeiten.filter((z) => z.tag === tag)).map(slot);
  const inhalt = slots.length
    ? `<ul>${slots
        .map(
          (s) => `<li${s.belegt ? ' class="is-blocked"' : ''}>${s.hatZeit ? `<span class="slot-time">${esc(s.zeit)}</span>` : ''}<span class="slot-group">${esc(s.gruppe)}</span>${
            s.belegt ? '<span class="slot-badge">Anlage belegt</span>' : ''
          }${s.meta ? `<span class="slot-meta">${esc(s.meta)}</span>` : ''}</li>`
        )
        .join('')}</ul>`
    : '<p class="muted">Freies Spiel</p>';
  return `<div class="day-card" data-day="${tag}"><h3>${tag}</h3>${inhalt}</div>`;
}

// ---------------------------------------------------------------------------
// Fotoalbum
// ---------------------------------------------------------------------------

export const albumCard = (a) => `<a class="album-card" href="${a.url}" data-year="${esc(a.jahr)}">
  <span class="album-cover"><img src="${esc(a.cover)}" alt="" loading="lazy" decoding="async"><span class="album-count">${icon('camera', 'icon icon-sm')} ${a.bilder.length}</span></span>
  <span class="album-info"><strong>${esc(a.titel)}</strong><span class="muted">${a.beitrag ? monatJahr(a.datum) : esc(a.jahr)}</span></span>
</a>`;

// ---------------------------------------------------------------------------
// Schnellzugriff unter dem Titelbild
// ---------------------------------------------------------------------------

/** Schnellzugriff im Titelbild: kleine „Pillen“ mit Symbol, Titel und optionaler Zusatzinfo. */
export const quickTiles = (tiles) => `<nav class="hero-quick" aria-label="Schnellzugriff"><span class="hero-quick-label">Direkt zu</span>${tiles
  .map((t) => `<a class="hero-quick-link" href="${t.url}">${icon(t.icon, 'icon icon-sm')}<span>${esc(t.titel)}</span>${t.text ? `<small>${esc(t.text)}</small>` : ''}</a>`)
  .join('')}</nav>`;

