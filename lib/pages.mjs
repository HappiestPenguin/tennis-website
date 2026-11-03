/**
 * pages.mjs – Vorlagen für die einzelnen Seiten.
 * Jede Funktion liefert den Inhalt von <main>; das Gerüst drumherum kommt aus layout.mjs.
 */

import { esc, icon, datumLang, datumMitTag, monatJahr, dateParts, MONATE_KURZ } from './helpers.mjs';
import { pageHead, eventList, newsCard, newsRow, personCard, todayCard, guestEntry, form, dayCard, albumCard, quickTiles } from './components.mjs';
import { NEWS_JAHRE } from './content.mjs';
import { WOCHE, sortiereZeiten, slot, istJugend } from './training.mjs';

const mapsQuery = (v) => encodeURIComponent(`${v.strasse}, ${v.plz} ${v.ort}`);

// ===========================================================================
// Startseite
// Aufbau nach Wichtigkeit: Was die meisten suchen, steht ganz oben.
// (Die meisten Besucher scrollen nur ein bis zwei Bildschirmhöhen.)
// ===========================================================================

export function home({ verein, start, posts, termine, heute, training, wetter, gaestebuch, unterstuetzer, alben }) {
  const kommende = termine.filter((t) => t.datum >= heute);
  const naechster = kommende[0];
  const wochentag = WOCHE[(dateParts(heute).wd + 6) % 7];
  const heuteGruppen = training.zeiten.filter((z) => z.tag === wochentag).length;

  // Optionaler Hinweis-Banner (in Vereinsdaten pflegbar, verschwindet nach dem „bis“-Datum)
  const b = verein.hinweis_banner || {};
  const banner =
    b.text && (!b.bis || b.bis >= heute)
      ? `<div class="banner">${icon('bell', 'icon icon-sm')}<span>${esc(b.text)}</span>${b.link ? `<a href="${esc(b.link)}">${esc(b.linktext || 'Mehr erfahren')} ${icon('arrow', 'icon icon-sm')}</a>` : ''}</div>`
      : '';

  return `${banner}
<!-- Titelbild -->
<section class="hero">
  <div class="hero-media" style="--hero:url('${esc(verein.titelbild)}')"></div>
  <div class="container hero-inner">
    <p class="eyebrow eyebrow--light">${esc(verein.name)} · ${esc(verein.abteilung)}</p>
    <h1 class="hero-title">Tennis für jedermann <span>in Eisenhüttenstadt.</span></h1>
    <p class="hero-lead">${esc(verein.plaetze)}, Flutlicht und ein Vereinsheim mit Terrasse – und eine Gemeinschaft, in der Kinder genauso spielen wie 80-Jährige.</p>
    <div class="hero-actions">
      <a class="btn btn-primary" href="/kontakt/?anliegen=probetraining">Probetraining anfragen ${icon('arrow', 'icon icon-sm')}</a>
      <a class="btn btn-ghost" href="/angebote/#mitglied-werden">Mitglied werden</a>
    </div>
    <!-- Schnellzugriff: kompakte Links direkt im Titelbild, sofort sichtbar -->
    ${quickTiles([
      { url: '/angebote/#training', icon: 'court', titel: 'Training', text: heuteGruppen ? `heute ${heuteGruppen} ${heuteGruppen === 1 ? 'Gruppe' : 'Gruppen'}` : '' },
      { url: '/termine/', icon: 'cal', titel: 'Termine', text: naechster ? `${dateParts(naechster.datum).d}. ${MONATE_KURZ[dateParts(naechster.datum).m - 1]}` : '' },
      { url: '/news/', icon: 'bell', titel: 'News', text: '' },
      { url: '/fotoalbum/', icon: 'camera', titel: 'Fotos', text: `${alben.length} Alben` },
      { url: '/gaestebuch/', icon: 'quote', titel: 'Gästebuch', text: '' },
    ])}
  </div>
  <svg class="hero-lines" viewBox="0 0 1200 120" preserveAspectRatio="none" aria-hidden="true"><path d="M0 119.5h1200M0 60h1200M300 0v120M900 0v120M600 60v60" stroke="currentColor" stroke-width="2" fill="none"/></svg>
</section>

<!-- Kennzahlen: groß direkt unter dem Titelbild (Zahlen in den Vereinsdaten pflegen) -->
<section class="facts" aria-label="Der Verein in Zahlen">
  <div class="container facts-grid">
    <div class="fact"><span class="fact-num">${esc(String(verein.mitglieder))}</span><span class="fact-label">Mitglieder</span></div>
    <div class="fact"><span class="fact-num">${esc(String(verein.mitglieder_jugend))}</span><span class="fact-label">Kinder & Jugendliche</span></div>
    <div class="fact"><span class="fact-num">4</span><span class="fact-label">Plätze – 3× Sand, 1× Hart</span></div>
    <div class="fact"><span class="fact-num">${esc(verein.gegruendet)}</span><span class="fact-label">Tennis an der Waldstraße</span></div>
  </div>
  <p class="container facts-note">Mitgliederzahlen Stand ${datumLang(verein.mitglieder_stand)}</p>
</section>

<!-- Begrüßung + Heute auf der Anlage -->
<section class="section">
  <div class="container split">
    <div class="prose">
      <p class="eyebrow">${esc(start.title)}</p>
      <h2 class="section-title">Haben Sie Spaß am Tennis?</h2>
      ${start.html}
      <p class="stack-actions"><a class="btn btn-primary" href="/kontakt/">Unverbindlich melden ${icon('arrow', 'icon icon-sm')}</a> <a class="link-arrow" href="/angebote/#faq">Häufige Fragen</a></p>
    </div>
    ${todayCard({ wetter, training })}
  </div>
</section>

<!-- Neueste News -->
<section class="section section--tint">
  <div class="container">
    <div class="section-head">
      <div><p class="eyebrow">Aktuelles</p><h2 class="section-title">Neues aus dem Verein</h2></div>
      <a class="link-arrow" href="/news/">Alle News ${icon('arrow', 'icon icon-sm')}</a>
    </div>
    <div class="news-grid news-grid--home">${posts.map((p, i) => newsCard(p, { large: i === 0 })).join('')}</div>
  </div>
</section>

<!-- Termine + Mitglied werden -->
<section class="section">
  <div class="container split split--events">
    <div>
      <p class="eyebrow">Kalender</p>
      <h2 class="section-title">Nächste Termine</h2>
      ${eventList(kommende.slice(0, 3))}
      <p class="stack-actions"><a class="link-arrow" href="/termine/">Alle Termine ${icon('arrow', 'icon icon-sm')}</a> <a class="link-arrow" href="/termine/#abo">${icon('cal', 'icon icon-sm')} Kalender abonnieren</a></p>
    </div>
    <div class="cta-card">
      <p class="eyebrow eyebrow--light">Mitglied werden</p>
      <h2>Spielen, so oft du willst.</h2>
      <p>Als Mitglied spielst du außerhalb der Trainingszeiten kostenfrei auf unserer Anlage. Einsteiger starten mit einem 10-stündigen Grundlehrgang.</p>
      <ul class="check-list">
        <li>Kinder & Schüler 138 € / Jahr</li>
        <li>Studierende & Azubis 110 € / Jahr</li>
        <li>Erwachsene 130 € / Jahr</li>
      </ul>
      <div class="hero-actions">
        <a class="btn btn-light" href="/angebote/#mitglied-werden">Alle Infos</a>
        <a class="btn btn-ghost-light" href="/media/mediapool/122/1226796/data/Mitgliedsantrag.pdf" data-doc target="_blank" rel="noopener">${icon('download', 'icon icon-sm')} Mitgliedsantrag</a>
      </div>
    </div>
  </div>
</section>

<!-- Gästebuch & Unterstützer kompakt nebeneinander -->
<section class="section section--tint">
  <div class="container duo">
    <div class="duo-card">
      <p class="eyebrow">Gästebuch</p>
      <h2 class="section-title section-title--sm section-title--first">Das sagen unsere Gäste</h2>
      ${gaestebuch[0] ? guestEntry(gaestebuch[0]) : ''}
      <p class="stack-actions"><a class="btn btn-secondary" href="/gaestebuch/#eintragen">${icon('quote', 'icon icon-sm')} Eintrag schreiben</a> <a class="link-arrow" href="/gaestebuch/">Alle ${gaestebuch.length} Einträge ${icon('arrow', 'icon icon-sm')}</a></p>
    </div>
    <div class="duo-card">
      <p class="eyebrow">Danke!</p>
      <h2 class="section-title section-title--sm section-title--first">Unsere Unterstützer</h2>
      <ul class="sponsor-cloud">${unterstuetzer.sponsoren.slice(0, 6).map((s) => `<li>${esc(s.name)}</li>`).join('')}</ul>
      <p class="stack-actions"><a class="btn btn-secondary" href="/unterstuetzen/">${icon('heart', 'icon icon-sm')} So können Sie helfen</a></p>
    </div>
  </div>
</section>

<!-- Anfahrt -->
<section class="section">
  <div class="container split">
    <div>
      <p class="eyebrow">Anfahrt</p>
      <h2 class="section-title">So finden Sie uns</h2>
      <p class="lead-sm">${esc(verein.anfahrt)}</p>
      <address class="address-block">${icon('pin')}<span><strong>${esc(verein.name)}</strong><br>${esc(verein.abteilung)} · ${esc(verein.zusatz)}<br>${esc(verein.strasse)}, ${esc(verein.plz)} ${esc(verein.ort)}</span></address>
      <p class="stack-actions">
        <a class="btn btn-secondary" href="https://www.openstreetmap.org/search?query=${mapsQuery(verein)}" target="_blank" rel="noopener">${icon('pin', 'icon icon-sm')} Karte öffnen</a>
        <a class="btn btn-secondary" href="https://maps.apple.com/?q=${mapsQuery(verein)}" target="_blank" rel="noopener">Route planen</a>
      </p>
    </div>
    <div class="link-tiles">
      ${(verein.links || []).map((l) => `<a class="link-tile" href="${esc(l.url)}" target="_blank" rel="noopener"><span>${esc(l.titel)}</span>${icon('external', 'icon icon-sm')}</a>`).join('')}
    </div>
  </div>
</section>`;
}

// ===========================================================================
// News
// ===========================================================================

/** News-Übersicht: die letzten NEWS_JAHRE Jahre als Karten, ältere Jahre im Archiv. */
export function newsList({ aktuell, archivJahre }) {
  const years = [...new Set(aktuell.map((p) => p.year))];
  const archivVon = archivJahre.length ? `${archivJahre[archivJahre.length - 1].jahr}–${archivJahre[0].jahr}` : '';
  return `${pageHead('News', 'Aktuelles', 'Turniere, Arbeitseinsätze, Vereinsleben – hier erfahren Sie, was bei uns los ist.')}
<section class="section section--flush">
  <div class="container">
    <nav class="year-filter" aria-label="Nach Jahr filtern">
      <button type="button" class="chip is-active" data-year="alle" aria-pressed="true">Alle</button>
      ${years.map((y) => `<button type="button" class="chip" data-year="${y}" aria-pressed="false">${y}</button>`).join('')}
      ${archivVon ? `<a class="chip chip--archive" href="#archiv">Archiv ${archivVon} ${icon('chevron', 'icon icon-sm')}</a>` : ''}
    </nav>
    <div class="news-grid">${aktuell.map((p) => newsCard(p)).join('')}</div>
    ${
      archivJahre.length
        ? `<div class="archive-box" id="archiv">
      <h2>News-Archiv ${archivVon}</h2>
      <p class="muted">Beiträge, die älter als ${NEWS_JAHRE} Jahre sind, wandern automatisch hierher.</p>
      <ul class="archive-years">${archivJahre.map((a) => `<li><a href="/news/archiv/${a.jahr}/"><strong>${a.jahr}</strong><span>${a.posts.length} Beiträge</span></a></li>`).join('')}</ul>
    </div>`
        : ''
    }
  </div>
</section>`;
}

export function newsPost({ post, prev, next }) {
  const back = post.archiv ? `/news/archiv/${post.year}/` : '/news/';
  return `<article class="post">
  <header class="post-head">
    <div class="container container--narrow">
      <a class="back-link" href="${back}">${icon('left', 'icon icon-sm')} ${post.archiv ? `Archiv ${post.year}` : 'Alle News'}</a>
      <time class="eyebrow" datetime="${post.date}">${post.ungefaehr ? post.dateLabel : datumMitTag(post.date)}</time>
      <h1>${esc(post.title)}</h1>
    </div>
  </header>
  <div class="container container--narrow prose">${post.html}</div>
  <nav class="container container--narrow post-nav" aria-label="Weitere Beiträge">
    ${prev ? `<a class="post-nav-link" href="${prev.url}"><span class="muted">${icon('left', 'icon icon-sm')} Älter</span><strong>${esc(prev.title)}</strong></a>` : '<span></span>'}
    ${next ? `<a class="post-nav-link post-nav-link--next" href="${next.url}"><span class="muted">Neuer ${icon('right', 'icon icon-sm')}</span><strong>${esc(next.title)}</strong></a>` : '<span></span>'}
  </nav>
</article>`;
}

/** Archivseite eines Jahres (kompakte Liste). */
export function archivJahr({ jahr, posts, archivJahre }) {
  return `${pageHead(`News-Archiv ${jahr}`, 'Archiv', `${posts.length} Beiträge aus dem Jahr ${jahr}.`)}
<section class="section section--flush">
  <div class="container archive-layout">
    <aside class="archive-side">
      <nav aria-label="Archivjahre"><ul class="archive-years archive-years--side">${archivJahre
        .map((a) => `<li><a href="/news/archiv/${a.jahr}/"${a.jahr === jahr ? ' aria-current="page"' : ''}><strong>${a.jahr}</strong></a></li>`)
        .join('')}</ul></nav>
      <a class="link-arrow" href="/news/">${icon('left', 'icon icon-sm')} Aktuelle News</a>
    </aside>
    <ul class="news-rows">${posts.map(newsRow).join('')}</ul>
  </div>
</section>`;
}

// ===========================================================================
// Termine
// ===========================================================================

export function termine({ termine, heute, hinweis, verein }) {
  const kommend = termine.filter((t) => t.datum >= heute);
  const vergangen = termine.filter((t) => t.datum < heute).reverse();
  return `${pageHead('Termine', 'Kalender', 'Turniere, Feste und Arbeitseinsätze. Tipp: Abonnieren Sie den Kalender – dann landen neue Termine automatisch auf Ihrem Handy.')}
<section class="section section--flush">
  <div class="container split split--wide">
    <div>
      <h2 class="section-title section-title--sm section-title--first">Kommende Termine</h2>
      ${eventList(kommend)}
      ${hinweis ? `<p class="note">${esc(hinweis)}</p>` : ''}
      ${vergangen.length ? `<details class="past-events"><summary>Vergangene Termine (${vergangen.length})</summary>${eventList(vergangen, { past: true })}</details>` : ''}
    </div>
    <aside class="side-card" id="abo">
      <h2>${icon('cal')} Kalender abonnieren</h2>
      <p>Alle Vereinstermine in Ihrem Kalender (iPhone, Android, Outlook) – Änderungen werden automatisch übernommen.</p>
      <p><a class="btn btn-primary btn-block" href="/termine.ics" data-subscribe>Kalender abonnieren</a></p>
      <p class="muted small">Oder diese Adresse in Ihrer Kalender-App als Abonnement hinzufügen:</p>
      <input class="copy-field" readonly value="${esc(verein.url)}/termine.ics" data-copy aria-label="Kalender-Adresse">
      <hr>
      <p class="small">Die Platzbelegung und Trainingszeiten finden Sie unter <a href="/angebote/#training">Training & Mitgliedschaft</a>.</p>
    </aside>
  </div>
</section>`;
}

// ===========================================================================
// Training & Mitgliedschaft
// ===========================================================================

export function angebote({ s, training, faq }) {
  return `${pageHead(s.title, 'Mitmachen', 'Freies Spiel für Mitglieder, Training für alle Altersklassen und ein Platz, der immer frei bleibt.')}
<section class="section section--flush" id="training">
  <div class="container">
    <div class="section-head"><div><p class="eyebrow">Wochenplan</p><h2 class="section-title">${esc(training.titel)}</h2></div></div>
    <div class="callouts">${training.hinweise.map((h) => `<p class="callout">${icon('court')}<span>${esc(h)}</span></p>`).join('')}</div>
    <div class="week-grid">${WOCHE.map((tag) => dayCard(tag, training.zeiten)).join('')}</div>
  </div>
</section>
<section class="section" id="mitglied-werden">
  <div class="container container--narrow prose">${s.html}</div>
</section>
<section class="section section--tint" id="faq">
  <div class="container container--narrow">
    <p class="eyebrow">Fragen & Antworten</p>
    <h2 class="section-title">Häufige Fragen</h2>
    <div class="faq">${faq.fragen.map((f) => `<details><summary>${esc(f.frage)}${icon('chevron', 'icon icon-sm')}</summary><p>${esc(f.antwort)}</p></details>`).join('')}</div>
    <p class="stack-actions"><a class="btn btn-primary" href="/kontakt/?anliegen=probetraining">Probetraining anfragen ${icon('arrow', 'icon icon-sm')}</a></p>
  </div>
</section>`;
}

// ===========================================================================
// Verein
// ===========================================================================

export function vorstand({ s, vorstand }) {
  return `${pageHead(s.title, 'Verein', 'Ehrenamtlich engagiert – damit Tennis in Eisenhüttenstadt weiter möglich ist.')}
<section class="section section--flush">
  <div class="container">
    <h2 class="section-title section-title--sm section-title--first">Abteilungsvorstand</h2>
    <div class="people-grid">${vorstand.personen.map(personCard).join('')}</div>
    <h2 class="section-title section-title--sm">Trainer</h2>
    <div class="people-grid">${vorstand.trainer.map(personCard).join('')}</div>
    <div class="split split--even mt">
      <div class="prose">${s.html}</div>
      <div class="side-card"><h2>${icon('mail')} Schreiben Sie uns</h2><p>Am schnellsten erreichen Sie den Vorstand über das Kontaktformular – wir leiten Ihre Nachricht an die richtige Person weiter.</p><p><a class="btn btn-primary" href="/kontakt/">Zum Kontaktformular</a></p></div>
    </div>
  </div>
</section>`;
}

/** Kinder & Jugend: Text + Trainer (aus vorstand.json) + Trainingszeiten der Jugendgruppen (aus training.json). */
export function jugend({ s, vorstand, training }) {
  const trainer = vorstand.trainer.filter((t) => t.kinder_jugend);
  const zeiten = sortiereZeiten(training.zeiten.filter(istJugend)).map(slot);
  // Text aufteilen: Einleitung (bis zur ersten Zwischenüberschrift) oben, Ergebnislisten unten
  const cut = s.html.indexOf('<h2');
  const intro = cut > -1 ? s.html.slice(0, cut) : s.html;
  const rest = cut > -1 ? s.html.slice(cut) : '';
  return `${pageHead(s.title, 'Verein', 'Training, Turniere und Erfolge unserer Kinder und Jugendlichen.')}
<section class="section section--flush">
  <div class="container">
    <div class="split">
      <div class="prose">${intro}</div>
      <aside class="side-card">
        <h2>${icon('clock')} Trainingszeiten</h2>
        <ul class="plain-list">${zeiten.map((z) => `<li><strong>${esc(z.tag)}, ${esc(z.zeit)}</strong><br>${esc(z.gruppe)}${z.meta ? `<br><span class="muted small">${esc(z.meta)}</span>` : ''}</li>`).join('')}</ul>
        <p><a class="link-arrow" href="/angebote/#training">Kompletter Wochenplan ${icon('arrow', 'icon icon-sm')}</a></p>
      </aside>
    </div>
    <h2 class="section-title section-title--sm">Unsere Trainer</h2>
    <div class="people-grid">${trainer.map(personCard).join('')}</div>
    ${rest ? `<div class="prose mt">${rest}</div>` : ''}
  </div>
</section>`;
}

export function unterstuetzen({ u }) {
  return `${pageHead('Unterstützer & Spenden', 'Danke!', esc(u.einleitung))}
<section class="section section--flush">
  <div class="container">
    <h2 class="section-title section-title--sm section-title--first">So können Sie helfen</h2>
    <div class="ways">${u.wege
      .map(
        (w) => `<article class="way">${icon(w.icon, 'icon way-icon')}<h3>${esc(w.titel)}</h3><p>${esc(w.text)}</p><a class="link-arrow" href="${esc(w.link)}"${
          /^https?:/.test(w.link) ? ' target="_blank" rel="noopener"' : ''
        }>${esc(w.linktext)} ${icon('arrow', 'icon icon-sm')}</a></article>`
      )
      .join('')}</div>
    <h2 class="section-title section-title--sm">Wir sagen Danke</h2>
    <ul class="sponsors">${u.sponsoren
      .map(
        (sp) => `<li class="sponsor">${sp.logo ? `<img src="${esc(sp.logo)}" alt="" loading="lazy">` : `<span class="sponsor-mark">${icon('heart', 'icon')}</span>`}<div><strong>${
          sp.url ? `<a href="${esc(sp.url)}" target="_blank" rel="noopener">${esc(sp.name)}</a>` : esc(sp.name)
        }</strong><span>${esc(sp.beitrag)}</span></div></li>`
      )
      .join('')}</ul>
  </div>
</section>`;
}

/** Normale Textseite (Satzung, Geschichte, Impressum …). Optional mit Inhaltsverzeichnis. */
export function contentPage({ s, eyebrow = '', cls = '', toc = false }) {
  let tocHtml = '';
  if (toc) {
    const heads = [...s.html.matchAll(/<h2 id="([^"]+)">(.*?)<\/h2>/g)];
    tocHtml = `<details class="toc"><summary>Inhalt (${heads.length} Berichte)</summary><ol>${heads.map((h) => `<li><a href="#${h[1]}">${h[2]}</a></li>`).join('')}</ol></details>`;
  }
  return `${pageHead(s.title, eyebrow)}
<section class="section section--flush">
  <div class="container container--narrow">${tocHtml}<div class="prose ${cls}">${s.html}</div></div>
</section>`;
}

// ===========================================================================
// Fotoalbum
// ===========================================================================

/** Übersicht: Albumkarten mit Titelbild, nach Jahr filterbar. */
export function fotoalbum({ s, alben }) {
  const jahre = [...new Set(alben.map((a) => a.jahr).filter(Boolean))];
  const fotos = alben.reduce((n, a) => n + a.bilder.length, 0);
  return `${pageHead(s.title, 'Galerie', `${alben.length} Alben mit ${fotos} Fotos – von Turnieren, Arbeitseinsätzen und gemütlichen Abenden.`)}
<section class="section section--flush">
  <div class="container">
    <nav class="year-filter" aria-label="Nach Jahr filtern" data-filter=".album-card">
      <button type="button" class="chip is-active" data-year="alle" aria-pressed="true">Alle</button>
      ${jahre.map((y) => `<button type="button" class="chip" data-year="${y}" aria-pressed="false">${y}</button>`).join('')}
    </nav>
    <div class="album-grid">${alben.map(albumCard).join('')}</div>
    <div class="prose small muted mt">${s.html}</div>
  </div>
</section>`;
}

/** Ein Album: alle Fotos im „Mauerwerk“-Raster (Fotos nicht beschnitten), Klick → Vollbild. */
export function albumSeite({ a, prev, next }) {
  return `<section class="page-head">
  <div class="container">
    <a class="back-link" href="/fotoalbum/">${icon('left', 'icon icon-sm')} Alle Alben</a>
    <p class="eyebrow">${a.beitrag ? monatJahr(a.datum) : esc(a.jahr)} · ${a.bilder.length} Fotos</p>
    <h1>${esc(a.titel)}</h1>
    <p class="stack-actions">
      <button class="btn btn-primary" type="button" data-slideshow>${icon('camera', 'icon icon-sm')} Als Diashow ansehen</button>
      ${a.beitrag ? `<a class="btn btn-secondary" href="${a.beitrag}">Zum Bericht ${icon('arrow', 'icon icon-sm')}</a>` : ''}
    </p>
  </div>
</section>
<section class="section section--flush">
  <div class="container">
    <div class="gallery gallery--masonry">${a.bilder
      .map((b) => `<a class="g-item" href="${esc(b.bild)}" data-lightbox data-caption="${esc(b.text || a.titel)}"><img src="${esc(b.bild)}" alt="${esc(b.text || a.titel)}" loading="lazy" decoding="async"></a>`)
      .join('')}</div>
    <nav class="post-nav" aria-label="Weitere Alben">
      ${next ? `<a class="post-nav-link" href="${next.url}"><span class="muted">${icon('left', 'icon icon-sm')} Älter</span><strong>${esc(next.titel)}</strong></a>` : '<span></span>'}
      ${prev ? `<a class="post-nav-link post-nav-link--next" href="${prev.url}"><span class="muted">Neuer ${icon('right', 'icon icon-sm')}</span><strong>${esc(prev.titel)}</strong></a>` : '<span></span>'}
    </nav>
  </div>
</section>`;
}

// ===========================================================================
// Kontakt & Gästebuch
// ===========================================================================

export function kontakt({ s, verein, vorstand }) {
  const felder = `
  <div class="form-row">
    <label>Name<input type="text" name="Name" required autocomplete="name" placeholder="Ihr Name"></label>
    <label>E-Mail-Adresse<input type="email" name="E-Mail" required autocomplete="email" inputmode="email" placeholder="name@beispiel.de"></label>
  </div>
  <label>Anliegen
    <select name="Anliegen" data-anliegen>
      <option value="allgemein">Allgemeine Frage</option>
      <option value="probetraining">Probetraining / Grundlehrgang</option>
      <option value="mitgliedschaft">Mitgliedschaft</option>
      <option value="kinder">Kinder- und Jugendtraining (Anfrage für einen Platz)</option>
      <option value="platz">Platznutzung als Gast</option>
      <option value="bespannung">Schlägerbespannung</option>
      <option value="unterstuetzen">Spende / Sponsoring</option>
      <option value="website">Hinweis zur Website / Foto entfernen</option>
    </select>
  </label>
  <label>Ihre Nachricht<textarea name="Nachricht" rows="6" required placeholder="Ihr Text an uns …"></textarea></label>`;
  const ansprechpartner = vorstand.personen.filter((p) => p.kontakt_freigegeben && (p.telefon || p.email));
  return `${pageHead(s.title, 'Wir freuen uns auf Sie', '')}
<section class="section section--flush">
  <div class="container split split--wide">
    <div>
      <div class="prose">${s.html}</div>
      ${form({ action: verein.kontaktformular, betreff: 'Neue Anfrage über bsg-tennis.de', felder, submit: 'Nachricht senden' })}
    </div>
    <aside class="side-stack">
      ${ansprechpartner.map(personCard).join('')}
      <div class="side-card">
        <h2>${icon('pin')} Anschrift</h2>
        <address>${esc(verein.name)}<br>${esc(verein.abteilung)}<br>${esc(verein.zusatz)}<br>${esc(verein.strasse)}<br>${esc(verein.plz)} ${esc(verein.ort)}</address>
        <p class="small">${esc(verein.anfahrt)}</p>
        <p class="small">${icon('mail', 'icon icon-sm')} <a href="#" data-mail="${esc(verein.email.split('').reverse().join(''))}">E-Mail-Adresse anzeigen</a></p>
        <p><a class="link-arrow" href="/vorstand/">Alle Ansprechpartner ${icon('arrow', 'icon icon-sm')}</a></p>
      </div>
    </aside>
  </div>
</section>`;
}

/**
 * Gästebuch: Das Formular öffnet sich als Fenster über der Seite („Eintrag schreiben“).
 * So ist der Absenden-Knopf immer sofort erreichbar – egal wie viele Einträge es gibt.
 */
export function gaestebuch({ s, verein, eintraege }) {
  const felder = `
  <input type="hidden" name="Formular" value="Gästebuch">
  <div class="form-row">
    <label>Name oder Spitzname<input type="text" name="Name" required placeholder="wird veröffentlicht"></label>
    <label>Wohnort <span class="muted">(optional)</span><input type="text" name="Ort" placeholder="wird veröffentlicht"></label>
  </div>
  <label>E-Mail-Adresse <span class="muted">(optional, wird nicht veröffentlicht)</span><input type="email" name="E-Mail" autocomplete="email" inputmode="email"></label>
  <label>Ihr Eintrag<textarea name="Nachricht" rows="5" required></textarea></label>`;
  return `${pageHead(s.title, 'Grüße & Feedback', '')}
<section class="section section--flush">
  <div class="container container--narrow">
    <div class="gb-intro">
      <div class="prose">${s.html}</div>
      <button class="btn btn-primary" type="button" data-open-dialog="gb-form">${icon('quote', 'icon icon-sm')} Eintrag schreiben</button>
    </div>
    <div class="guestbook">${eintraege.map(guestEntry).join('')}</div>
  </div>
</section>
<dialog class="form-dialog" id="gb-form" aria-labelledby="gb-form-title">
  <div class="form-dialog-head"><h2 id="gb-form-title">${icon('quote')} Ins Gästebuch eintragen</h2><button class="lb-btn lb-btn--light" type="button" data-close-dialog aria-label="Schließen">${icon('close')}</button></div>
  ${form({ action: verein.gaestebuchformular, betreff: 'Neuer Gästebucheintrag über bsg-tennis.de', felder, submit: 'Eintrag senden' })}
</dialog>`;
}

// ===========================================================================
// Sonstiges
// ===========================================================================

export const danke = () => `${pageHead('Vielen Dank!', 'Nachricht gesendet', 'Wir haben Ihre Nachricht erhalten und melden uns so schnell wie möglich.')}
<section class="section section--flush"><div class="container"><a class="btn btn-primary" href="/">Zur Startseite</a></div></section>`;

export const notFound = () => `${pageHead('Diese Seite gibt es nicht (mehr).', 'Fehler 404', 'Vielleicht hilft Ihnen einer dieser Links weiter:')}
<section class="section section--flush"><div class="container stack-actions">
<a class="btn btn-primary" href="/">Startseite</a><a class="btn btn-secondary" href="/news/">News</a><a class="btn btn-secondary" href="/termine/">Termine</a><a class="btn btn-secondary" href="/kontakt/">Kontakt</a>
</div></section>`;
