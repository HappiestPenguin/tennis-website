/**
 * Lokale Redaktion – Oberfläche (läuft im Browser, auch in Safari).
 *
 * Bereiche:
 *   • News        – Beiträge anlegen, bearbeiten, löschen (mit Live-Vorschau)
 *   • Seiten      – Texte wie Satzung, Geschichte, Impressum
 *   • Daten       – Termine, Trainingszeiten, Vorstand, Gästebuch … (Formulare aus den JSON-Dateien)
 *
 * Komfort:
 *   • Warnung, wenn man ungespeicherte Änderungen hat und den Bereich wechselt
 *   • Listen-Einträge zum Aufklappen (Pfeil), Titel aktualisiert sich beim Tippen
 *   • Trainingszeiten: Uhrzeit-Auswahl, Plätze 0–4, Trainer aus der Trainerliste
 *   • Termine und Trainingszeiten werden beim Speichern automatisch sortiert
 *
 * Zwei Betriebsarten:
 *   • Lokal (npm start → /redaktion/): speichert über api.mjs direkt in die Projektdateien.
 *   • Testversion (/admin/ auf der veröffentlichten Seite): Anmeldung mit Test-Zugang, Inhalte
 *     kommen aus einer Momentaufnahme (admin/daten.json). Änderungen bleiben nur in diesem
 *     Browserfenster (sessionStorage) und werden NICHT veröffentlicht – gedacht zum Vorführen.
 *     Der Test-Zugang ist bewusst einfach und KEIN Schutz: Es gibt dort nichts zu schützen,
 *     weil nichts gespeichert wird. Für den echten Betrieb ist eine Server-Anmeldung (PHP) geplant.
 */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const main = $('#ed-main');
  const DEMO = !!window.REDAKTION_DEMO; // Online-Testversion (siehe Kopfkommentar)
  const BASIS = window.REDAKTION_BASIS || ''; // Unterordner der Seite, z. B. /tennis-website

  // =========================================================================
  // Testversion: Anmeldung (nur Vorführzweck, siehe Kopfkommentar)
  // =========================================================================
  const TEST_ZUGANG = 'aa7ab9c0ea0a844bc74269b7e4c05da99d7f0e361794f7a42064d6c9e5221b50'; // SHA-256 von „Benutzer:Passwort“
  const LOGIN_KEY = 'redaktion-angemeldet';
  const angemeldet = () => { try { return sessionStorage.getItem(LOGIN_KEY) === '1'; } catch { return false; } };
  const sha256 = async (text) =>
    Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))).map((b) => b.toString(16).padStart(2, '0')).join('');

  if (DEMO && !angemeldet()) {
    document.querySelector('.ed-layout').classList.add('ed-layout--login');
    main.innerHTML = `<form class="ed-login" autocomplete="on">
      <h1>Anmelden</h1>
      <p class="muted">Redaktion der BSG Stahl Tennis – Testversion</p>
      <label class="ed-field"><span>Benutzername</span><input name="user" autocomplete="username" required autofocus></label>
      <label class="ed-field"><span>Passwort</span><input name="pass" type="password" autocomplete="current-password" required></label>
      <p class="ed-login-fehler" role="alert" hidden>Benutzername oder Passwort stimmt nicht.</p>
      <button class="btn btn-primary" type="submit">Anmelden</button>
    </form>`;
    const f = $('.ed-login', main);
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      if ((await sha256(`${f.user.value.trim()}:${f.pass.value}`)) === TEST_ZUGANG) {
        try { sessionStorage.setItem(LOGIN_KEY, '1'); } catch {}
        location.reload();
      } else {
        $('.ed-login-fehler', f).hidden = false;
        f.pass.select();
      }
    });
    return;
  }
  if (DEMO) {
    const ab = $('[data-abmelden]');
    if (ab) {
      ab.hidden = false;
      ab.addEventListener('click', () => {
        try { sessionStorage.removeItem(LOGIN_KEY); sessionStorage.removeItem(DEMO_KEY); } catch {}
        location.href = location.pathname;
      });
    }
  }

  // =========================================================================
  // Bereiche (Menü links)
  // =========================================================================
  const BEREICHE = [
    { gruppe: 'Inhalte' },
    { id: 'news', label: 'News', typ: 'news' },
    { id: 'termine', label: 'Termine', typ: 'json', datei: 'data/termine.json' },
    { id: 'training', label: 'Trainingszeiten', typ: 'json', datei: 'data/training.json' },
    { id: 'gaestebuch', label: 'Gästebuch', typ: 'json', datei: 'data/gaestebuch.json' },
    { id: 'galerie', label: 'Fotoalbum', typ: 'json', datei: 'data/galerie.json', info: 'Hier stehen die von Hand angelegten Alben. Zusätzlich wird jeder News-Beitrag mit mindestens 3 Fotos automatisch ein Album.' },
    { gruppe: 'Verein' },
    { id: 'verein', label: 'Vereinsdaten & Mitglieder', typ: 'json', datei: 'data/verein.json' },
    { id: 'vorstand', label: 'Vorstand & Trainer', typ: 'json', datei: 'data/vorstand.json' },
    { id: 'unterstuetzer', label: 'Unterstützer', typ: 'json', datei: 'data/unterstuetzer.json' },
    { id: 'faq', label: 'Häufige Fragen', typ: 'json', datei: 'data/faq.json' },
    { gruppe: 'Seiten' },
    { id: 'seiten', label: 'Seitentexte', typ: 'seiten' },
  ];

  /** Verständliche Feldnamen für die JSON-Dateien. */
  const LABELS = {
    titel: 'Titel', datum: 'Datum', uhrzeit: 'Uhrzeit', ort: 'Ort', beschreibung: 'Beschreibung', hinweis: 'Hinweis', hinweise: 'Hinweise',
    termine: 'Termine', zeiten: 'Trainingszeiten', tag: 'Wochentag', von: 'Von', bis: 'Bis', gruppe: 'Gruppe', leitung: 'Leitung', plaetze: 'Plätze',
    personen: 'Vorstand', trainer: 'Trainer', name: 'Name', funktion: 'Funktion', zustaendig: 'Ansprechpartner für', telefon: 'Telefon', email: 'E-Mail', foto: 'Foto',
    kontakt_freigegeben: 'Telefon/E-Mail veröffentlichen (Einverständnis der Person liegt vor)', kinder_jugend: 'Im Kinder- und Jugendtraining tätig (erscheint auf der Seite „Kinder & Jugend“)',
    eintraege: 'Einträge (neueste oben)', text: 'Text', alben: 'Alben', jahr: 'Jahr', bilder: 'Bilder', bild: 'Bild', fragen: 'Fragen', frage: 'Frage', antwort: 'Antwort',
    sponsoren: 'Sponsoren & Förderer', beitrag: 'Was wurde unterstützt?', url: 'Webseite', logo: 'Logo', wege: 'Wege zu helfen', icon: 'Symbol', link: 'Link', linktext: 'Linktext', einleitung: 'Einleitung',
    mitglieder: 'Mitglieder gesamt', mitglieder_jugend: 'davon Kinder & Jugendliche', mitglieder_stand: 'Stand der Mitgliederzahlen', beitraege: 'Mitgliedsbeiträge pro Jahr (erscheinen auf Startseite und Satzungsseite)', betrag: 'Betrag in €', beitraege_stand: 'Beiträge gültig seit (Jahr)',
    hinweis_banner: 'Hinweis-Banner ganz oben auf der Startseite (leer lassen = kein Banner)',
    titelbild: 'Titelbild Startseite', links: 'Links im Fußbereich', kontaktformular: 'Formular-Adresse Kontakt (form.taxi)', gaestebuchformular: 'Formular-Adresse Gästebuch (form.taxi)',
    claim: 'Leitsatz', kurzname: 'Kurzname', abteilung: 'Abteilung', strasse: 'Straße', zusatz: 'Adresszusatz', plz: 'PLZ', telefax: 'Telefax', anfahrt: 'Anfahrt',
    gegruendet: 'Tennis seit', whatsapp_hinweis: 'WhatsApp-Hinweis', beschreibung_seo: 'Beschreibung',
  };
  const HILFE = {
    bis: 'Banner verschwindet nach diesem Datum automatisch.',
    hinweis_banner: '',
  };
  const VERSTECKT = new Set(['leitung_frei']); // wird über das Feld „Leitung“ mit bearbeitet
  const LANG = /^(beschreibung|antwort|einleitung|anfahrt|beitrag)$/; // „text“ ist nur bei langen Inhalten mehrzeilig (siehe unten) // mehrzeilige Felder
  const BILD = /^(bild|foto|logo|titelbild|cover)$/;
  const DATUM = /^(datum|bis|mitglieder_stand)$/;
  const WOCHENTAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const PLAETZE = [
    [0, '0 – Anlage nicht verfügbar (z. B. Ligaspiele)'],
    [1, '1 Platz'],
    [2, '2 Plätze'],
    [3, '3 Plätze'],
    [4, '4 – alle Plätze'],
  ];

  // =========================================================================
  // Schnittstelle zum lokalen Server
  // =========================================================================
  const api = async (pfad, opts = {}) => {
    if (DEMO) return demoApi(pfad, opts);
    const res = await fetch(pfad, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.fehler || 'Fehler');
    return data;
  };

  // Testversion: dieselben Aufrufe wie der lokale Server, aber aus der Momentaufnahme.
  // Änderungen landen nur im sessionStorage dieses Fensters (null = gelöscht).
  var DEMO_KEY = 'redaktion-demo-aenderungen';
  let demoDaten;
  async function demoApi(pfad, opts) {
    demoDaten ??= await fetch(`${BASIS}/admin/daten.json`, { cache: 'no-store' }).then((r) => r.json());
    let aend = {};
    try { aend = JSON.parse(sessionStorage.getItem(DEMO_KEY)) || {}; } catch {}
    const datei = (p) => (p in aend ? aend[p] : demoDaten.dateien[p]);
    const merke = (p, text) => {
      aend[p] = text;
      try { sessionStorage.setItem(DEMO_KEY, JSON.stringify(aend)); } catch {}
    };
    const u = new URL(pfad, location.href);
    const q = u.searchParams;
    switch (u.pathname) {
      case '/__api/list': {
        const dir = q.get('dir') + '/';
        const pfade = new Set([...Object.keys(demoDaten.dateien), ...Object.keys(aend)].filter((p) => p.startsWith(dir) && p.endsWith('.md')));
        return [...pfade]
          .filter((p) => datei(p) != null)
          .map((p) => {
            const { data } = parse(datei(p));
            return { path: p, title: data.title || p, date: data.date || '', entwurf: !!data.entwurf };
          })
          .sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.title.localeCompare(b.title));
      }
      case '/__api/read': {
        const t = datei(q.get('path'));
        if (t == null) throw new Error('Datei nicht gefunden');
        return { text: t };
      }
      case '/__api/write': {
        const p = q.get('path');
        if (p.endsWith('.json')) JSON.parse(opts.body);
        merke(p, opts.body);
        const alt = q.get('alt');
        if (alt && alt !== p) merke(alt, null);
        return { ok: true };
      }
      case '/__api/delete':
        merke(q.get('path'), null);
        return { ok: true };
      case '/__api/upload':
        throw new Error('In der Testversion können keine Bilder oder PDFs hochgeladen werden.');
      case '/__api/preview': {
        const { renderMarkdown } = await import(`${BASIS}/admin/lib/markdown.mjs`);
        return { html: renderMarkdown(opts.body).replace(/(src|href)="\/(?!\/)/g, `$1="${BASIS}/`) };
      }
    }
    throw new Error('Unbekannte Anfrage');
  }
  const lesen = (p) => api(`/__api/read?path=${encodeURIComponent(p)}`).then((d) => d.text);
  const schreiben = (p, text, alt) => api(`/__api/write?path=${encodeURIComponent(p)}${alt ? `&alt=${encodeURIComponent(alt)}` : ''}`, { method: 'POST', body: text });
  const hochladen = (file) => api(`/__api/upload?name=${encodeURIComponent(file.name)}`, { method: 'POST', body: file }).then((d) => d.url);

  function toast(msg, fehler = false) {
    if (DEMO && /^Gespeichert|gelöscht/.test(msg)) msg = msg.replace(/ –.*$/, '') + ' (Testversion: nur in diesem Browserfenster, nicht veröffentlicht)';
    const t = $('.ed-toast');
    t.textContent = msg;
    t.classList.toggle('is-error', fehler);
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => (t.hidden = true), 3500);
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const slug = (s) =>
    String(s).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);

  // =========================================================================
  // Ungespeicherte Änderungen
  // =========================================================================
  // Jede Ansicht meldet über setzeSpeichern(), wie sie speichert. Jede Eingabe setzt „geändert“.
  let geaendert = false;
  let speichern = null;
  let aktuellerHash = location.hash;
  const setzeSpeichern = (fn) => {
    speichern = fn;
    geaendert = false;
  };
  main.addEventListener('input', () => (geaendert = true));
  main.addEventListener('change', () => (geaendert = true));
  window.addEventListener('beforeunload', (e) => {
    if (geaendert) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  /** Fragt nach, wenn etwas ungespeichert ist. Gibt true zurück, wenn weitergemacht werden darf. */
  function fragen() {
    if (!geaendert) return Promise.resolve(true);
    const dlg = $('#ed-unsaved');
    return new Promise((resolve) => {
      dlg.returnValue = '';
      dlg.showModal();
      dlg.onclose = async () => {
        if (dlg.returnValue === 'save' && speichern) {
          const ok = await speichern();
          resolve(ok !== false);
        } else resolve(dlg.returnValue === 'discard');
      };
    });
  }
  /** Zu einem anderen Bereich wechseln – mit Nachfrage bei ungespeicherten Änderungen. */
  async function geheZu(hash) {
    if (hash === location.hash) return;
    if (await fragen()) {
      geaendert = false;
      location.hash = hash;
    }
  }
  // Alle internen Links (#…) über geheZu leiten
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    e.preventDefault();
    geheZu(a.getAttribute('href'));
  });
  // Zurück-Taste des Browsers: Wechsel zurücknehmen, fragen, dann ggf. erneut wechseln
  window.addEventListener('hashchange', async () => {
    if (geaendert) {
      const ziel = location.hash;
      history.replaceState(null, '', aktuellerHash || '#news');
      if (await fragen()) {
        geaendert = false;
        history.replaceState(null, '', ziel);
        route();
      }
      return;
    }
    route();
  });

  // =========================================================================
  // Frontmatter (Kopfbereich von Markdown-Dateien) lesen & schreiben
  // =========================================================================
  function parse(src) {
    const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    const data = {};
    if (!m) return { data, body: src };
    for (const line of m[1].split(/\r?\n/)) {
      const kv = line.match(/^([\w-]+):\s*(.*)$/);
      if (!kv) continue;
      let v = kv[2].trim();
      if (/^".*"$/.test(v)) v = v.slice(1, -1).replace(/\\"/g, '"');
      data[kv[1]] = v === 'true' ? true : v === 'false' ? false : v;
    }
    return { data, body: src.slice(m[0].length) };
  }
  function stringify(data, body) {
    const lines = Object.entries(data)
      .filter(([, v]) => v !== '' && v !== false && v != null)
      .map(([k, v]) => (v === true ? `${k}: true` : `${k}: "${String(v).replace(/"/g, '\\"')}"`).replace(/^date: "(.*)"$/, 'date: $1'));
    return `---\n${lines.join('\n')}\n---\n${body.replace(/^\n+/, '')}`;
  }

  // =========================================================================
  // Menü & Navigation
  // =========================================================================
  const nav = $('.ed-nav');
  nav.innerHTML = BEREICHE.map((b) => (b.gruppe ? `<h2>${b.gruppe}</h2>` : `<button type="button" data-id="${b.id}">${b.label}</button>`)).join('');
  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-id]');
    if (btn) geheZu(`#${btn.dataset.id}`);
  });
  document.body.insertAdjacentHTML(
    'beforeend',
    `<dialog id="ed-unsaved" class="form-dialog ed-dialog"><form method="dialog">
      <h2>Ungespeicherte Änderungen</h2>
      <p>Es gibt Änderungen, die noch nicht gespeichert sind. Was möchten Sie tun?</p>
      <div class="stack-actions"><button class="btn btn-primary" value="save">Speichern</button><button class="btn btn-danger" value="discard">Verwerfen</button><button class="btn btn-secondary" value="cancel">Abbrechen</button></div>
    </form></dialog>`
  );
  route();

  function route() {
    aktuellerHash = location.hash;
    setzeSpeichern(null);
    const [id, ...rest] = location.hash.slice(1).split('/');
    const b = BEREICHE.find((x) => x.id === (id || 'news')) || BEREICHE[1];
    nav.querySelectorAll('button').forEach((x) => x.setAttribute('aria-current', String(x.dataset.id === b.id)));
    const arg = decodeURIComponent(rest.join('/'));
    if (b.typ === 'news') return arg ? newsEditor(arg === 'neu' ? null : arg) : newsListe();
    if (b.typ === 'seiten') return arg ? seitenEditor(arg) : seitenListe();
    return jsonEditor(b);
  }

  // =========================================================================
  // News
  // =========================================================================
  async function newsListe() {
    const files = await api('/__api/list?dir=content/news');
    main.innerHTML = `<h1>News</h1><p class="muted">${files.length} Beiträge. Die News-Seite zeigt die letzten 8 Jahre, ältere Beiträge wandern automatisch ins Archiv.</p>
      <div class="ed-bar"><input class="ed-search" type="search" placeholder="Suchen …" aria-label="News durchsuchen"><a class="btn btn-primary" href="#news/neu">+ Neuer Beitrag</a></div>
      <ul class="ed-list">${files
        .map((f) => `<li><button type="button" data-p="${esc(f.path)}"><span class="d">${esc(f.date)}</span><span>${esc(f.title)}</span>${f.entwurf ? '<span class="ed-tag">Entwurf</span>' : '<span></span>'}</button></li>`)
        .join('')}</ul>`;
    main.querySelector('.ed-list').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-p]');
      if (b) geheZu(`#news/${encodeURIComponent(b.dataset.p)}`);
    });
    $('.ed-search', main).addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      main.querySelectorAll('.ed-list li').forEach((li) => (li.hidden = !li.textContent.toLowerCase().includes(q)));
    });
    setzeSpeichern(null); // Suchfeld zählt nicht als Änderung
  }

  async function newsEditor(pfad) {
    const heute = new Date().toISOString().slice(0, 10);
    const { data, body } = pfad ? parse(await lesen(pfad)) : { data: { title: '', date: heute }, body: '' };
    main.innerHTML = `<p><a href="#news">← Alle News</a></p><h1>${pfad ? 'Beitrag bearbeiten' : 'Neuer Beitrag'}</h1>
      <form class="ed-form">
        <label class="ed-field"><span>Überschrift</span><input name="title" required value="${esc(data.title)}"></label>
        <div class="ed-row">
          <label class="ed-field"><span>Datum</span><input type="date" name="date" required value="${esc(String(data.date).slice(0, 10))}"></label>
          <label class="ed-field"><span>Titelbild (optional)</span><span class="ed-inline"><input name="bild" value="${esc(data.bild || '')}" placeholder="leer = erstes Foto im Text"><button type="button" class="btn btn-small btn-secondary" data-upload="bild">Hochladen</button></span></label>
        </div>
        <label class="ed-field"><span>Kurztext für die Übersicht (optional)</span><input name="kurztext" value="${esc(data.kurztext || '')}"><small>Leer lassen = wird automatisch aus dem Text erzeugt.</small></label>
        <div class="ed-row">
          <label class="ed-check"><input type="checkbox" name="entwurf" ${data.entwurf ? 'checked' : ''}> Entwurf (noch nicht veröffentlichen)</label>
          <label class="ed-check"><input type="checkbox" name="album" ${data.album === false ? '' : 'checked'}> Fotos auch im Fotoalbum zeigen (ab 3 Fotos)</label>
          ${
            data.ungefaehr
              ? `<label class="ed-check"><input type="checkbox" name="ungefaehr" checked> Datum nur ungefähr bekannt <small class="muted">(übernommener Altbeitrag – es wird nur „Monat Jahr“ angezeigt)</small></label>`
              : ''
          }
        </div>
        ${textEditor(body)}
        <div class="ed-actions">
          <button class="btn btn-primary" type="submit">Speichern</button>
          ${pfad ? `<a class="btn btn-secondary" href="${BASIS}/news/${esc(pfad.split('/').pop().replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/\.md$/, ''))}/" target="_blank" data-extern>Ansehen ↗</a><button class="btn btn-danger" type="button" data-delete>Löschen</button>` : ''}
        </div>
      </form>`;
    const form = $('form', main);
    initTextEditor(form);
    form.querySelector('[data-upload]').addEventListener('click', () => waehleDatei('image/*', (url) => (form.bild.value = url)));

    const save = async () => {
      if (!form.reportValidity()) return false;
      const neu = {
        title: form.title.value.trim(),
        date: form.date.value,
        bild: form.bild.value.trim(),
        kurztext: form.kurztext.value.trim(),
        entwurf: form.entwurf.checked,
        ungefaehr: !!form.ungefaehr?.checked,
      };
      if (!form.album.checked) neu.album = 'false';
      const ziel = `content/news/${neu.date}-${slug(neu.title) || 'beitrag'}.md`;
      try {
        await schreiben(ziel, stringify(neu, form.text.value).replace('album: "false"', 'album: false'), pfad);
        geaendert = false;
        toast('Gespeichert ✓ – die Vorschau aktualisiert sich automatisch.');
        if (ziel !== pfad) {
          pfad = ziel;
          history.replaceState(null, '', `#news/${encodeURIComponent(ziel)}`);
          aktuellerHash = location.hash;
        }
        return true;
      } catch (err) {
        toast(err.message, true);
        return false;
      }
    };
    setzeSpeichern(save);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      save();
    });
    form.querySelector('[data-delete]')?.addEventListener('click', async () => {
      if (!confirm(`„${data.title}“ wirklich löschen?`)) return;
      await api(`/__api/delete?path=${encodeURIComponent(pfad)}`, { method: 'POST' });
      geaendert = false;
      toast('Beitrag gelöscht.');
      location.hash = 'news';
    });
  }

  // =========================================================================
  // Seiten
  // =========================================================================
  async function seitenListe() {
    const files = await api('/__api/list?dir=content/seiten');
    main.innerHTML = `<h1>Seitentexte</h1><p class="muted">Texte der festen Seiten. Termine, Training, Vorstand usw. finden Sie links unter eigenen Punkten.</p>
      <ul class="ed-list">${files.map((f) => `<li><button type="button" data-p="${esc(f.path)}"><span class="d">${esc(f.path.split('/').pop())}</span><span>${esc(f.title)}</span><span></span></button></li>`).join('')}</ul>`;
    main.querySelector('.ed-list').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-p]');
      if (b) geheZu(`#seiten/${encodeURIComponent(b.dataset.p)}`);
    });
  }

  async function seitenEditor(pfad) {
    const { data, body } = parse(await lesen(pfad));
    main.innerHTML = `<p><a href="#seiten">← Alle Seiten</a></p><h1>${esc(data.title)}</h1>
      <form class="ed-form">
        <label class="ed-field"><span>Titel</span><input name="title" value="${esc(data.title)}"></label>
        <label class="ed-field"><span>Beschreibung für Suchmaschinen</span><input name="beschreibung" value="${esc(data.beschreibung || '')}"></label>
        ${textEditor(body)}
        <div class="ed-actions"><button class="btn btn-primary" type="submit">Speichern</button></div>
      </form>`;
    const form = $('form', main);
    initTextEditor(form);
    const save = async () => {
      try {
        await schreiben(pfad, stringify({ title: form.title.value, beschreibung: form.beschreibung.value }, form.text.value));
        geaendert = false;
        toast('Gespeichert ✓');
        return true;
      } catch (err) {
        toast(err.message, true);
        return false;
      }
    };
    setzeSpeichern(save);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      save();
    });
  }

  // =========================================================================
  // Texteditor mit Werkzeugleiste und Live-Vorschau
  // =========================================================================
  function textEditor(text) {
    return `<div class="ed-field"><span>Text</span>
      <div class="ed-toolbar" role="toolbar" aria-label="Formatierung">
        <button type="button" data-fmt="bold" title="Fett"><b>B</b></button>
        <button type="button" data-fmt="italic" title="Kursiv"><i>I</i></button>
        <button type="button" data-fmt="h2" title="Zwischenüberschrift">Überschrift</button>
        <button type="button" data-fmt="list" title="Aufzählung">• Liste</button>
        <button type="button" data-fmt="link" title="Link">Link</button>
        <button type="button" data-fmt="img" title="Bild(er) hochladen und einfügen">Bilder</button>
        <button type="button" data-fmt="pdf" title="PDF hochladen und einfügen">PDF</button>
        <button type="button" data-fmt="alert" title="Hinweisbox">Hinweisbox</button>
      </div>
      <div class="ed-editor">
        <textarea name="text" spellcheck="true" lang="de">${esc(text)}</textarea>
        <div><div class="ed-preview-label">Vorschau</div><div class="ed-preview prose"></div></div>
      </div>
      <small>Tipp: Mehrere Bilder direkt hintereinander (ohne Text dazwischen) werden automatisch zur Bildergalerie – ab 3 Fotos auch zum Album im Fotoalbum.</small>
    </div>`;
  }

  function initTextEditor(form) {
    const ta = form.text;
    const preview = $('.ed-preview', form);
    let timer;
    const update = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        const { html } = await api('/__api/preview', { method: 'POST', body: ta.value });
        preview.innerHTML = html;
      }, 250);
    };
    ta.addEventListener('input', update);
    update();

    const insert = (before, after = '', placeholder = '') => {
      const { selectionStart: s, selectionEnd: e, value } = ta;
      const sel = value.slice(s, e) || placeholder;
      ta.setRangeText(before + sel + after, s, e, 'end');
      ta.focus();
      geaendert = true;
      update();
    };
    form.querySelector('.ed-toolbar').addEventListener('click', (ev) => {
      const fmt = ev.target.closest('[data-fmt]')?.dataset.fmt;
      if (fmt === 'bold') insert('**', '**', 'fetter Text');
      if (fmt === 'italic') insert('_', '_', 'kursiver Text');
      if (fmt === 'h2') insert('\n## ', '\n', 'Zwischenüberschrift');
      if (fmt === 'list') insert('\n- ', '\n- \n', 'Punkt');
      if (fmt === 'link') {
        const url = prompt('Adresse des Links (z. B. https://… oder /termine/):');
        if (url) insert('[', `](${url})`, 'Linktext');
      }
      if (fmt === 'alert') insert('\n> [!WICHTIG] ', '\n> Text der Hinweisbox\n', 'Überschrift');
      if (fmt === 'img') waehleDatei('image/*', (url, file) => insert(`![${file.name.replace(/\.[^.]+$/, '')}](${url}) `), true);
      if (fmt === 'pdf') waehleDatei('application/pdf', (url, file) => insert(`\n- [${file.name.replace(/\.[^.]+$/, '')}](${url})\n`));
    });
  }

  /** Datei(en) auswählen, hochladen und Adresse zurückgeben. */
  function waehleDatei(accept, fertig, mehrere = false) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = mehrere;
    input.onchange = async () => {
      for (const file of input.files) {
        try {
          fertig(await hochladen(file), file);
          geaendert = true;
          toast(`„${file.name}“ hochgeladen ✓`);
        } catch (err) {
          toast(err.message, true);
        }
      }
    };
    input.click();
  }

  // =========================================================================
  // Daten-Dateien (JSON) als Formular
  // =========================================================================
  let trainerNamen = [];
  let linkziele = []; // öffentliche Seiten + aktuelle News, erzeugt vom Build (dist/linkziele.json)

  async function jsonEditor(b) {
    const data = JSON.parse(await lesen(b.datei));
    if (b.id === 'training') trainerNamen = JSON.parse(await lesen('data/vorstand.json')).trainer.map((t) => t.name);
    if (b.id === 'verein') linkziele = await fetch(`${BASIS}/linkziele.json`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : [])).catch(() => []);
    main.innerHTML = `<h1>${b.label}</h1>${b.info ? `<p class="muted">${b.info}</p>` : ''}<form class="ed-form"><div class="ed-root"></div>
      <div class="ed-actions"><button class="btn btn-primary" type="submit">Speichern</button></div></form>`;
    $('.ed-root', main).appendChild(feld(data, null, (v) => Object.assign(data, v)));
    const save = async () => {
      // Automatisch sortieren: Termine nach Datum, Trainingszeiten nach Wochentag + Uhrzeit
      if (b.id === 'termine') data.termine.sort((x, y) => String(x.datum).localeCompare(String(y.datum)));
      if (b.id === 'training')
        data.zeiten.sort((x, y) => WOCHENTAGE.indexOf(x.tag) - WOCHENTAGE.indexOf(y.tag) || String(x.von).localeCompare(String(y.von)));
      try {
        await schreiben(b.datei, JSON.stringify(data, null, 2) + '\n');
        geaendert = false;
        toast('Gespeichert ✓ – die Vorschau aktualisiert sich automatisch.');
        if (b.id === 'termine' || b.id === 'training') jsonEditor(b); // sortierte Reihenfolge anzeigen
        return true;
      } catch (err) {
        toast(err.message, true);
        return false;
      }
    };
    setzeSpeichern(save);
    $('form', main).addEventListener('submit', (e) => {
      e.preventDefault();
      save();
    });
  }

  /** Überschrift eines Listeneintrags, z. B. „Montag 16:00–17:00 · Kindertraining“. */
  function eintragTitel(item, i) {
    if (typeof item !== 'object' || !item) return String(item || `Eintrag ${i + 1}`);
    if (item.tag) return `${item.tag} ${item.von ? `${item.von}–${item.bis}` : 'ganztags'} · ${item.gruppe || 'neue Trainingszeit'}`;
    if (item.datum && item.titel !== undefined) return `${item.datum || 'ohne Datum'} · ${item.titel || 'neuer Termin'}`;
    return item.titel || item.name || item.frage || (item.text ? String(item.text).slice(0, 60) : '') || `Eintrag ${i + 1} (neu)`;
  }

  /**
   * Baut rekursiv ein Formular für einen JSON-Wert.
   * set(neuerWert) schreibt Änderungen zurück ins Datenobjekt; parent ist das übergeordnete Objekt.
   */
  function feld(wert, key, set, parent) {
    const label = key ? LABELS[key] || key.replace(/_/g, ' ') : '';
    const wrap = document.createElement('div');

    // ---- Objekt → Felder untereinander
    if (wert && typeof wert === 'object' && !Array.isArray(wert)) {
      wrap.className = key ? 'ed-group' : 'ed-form';
      if (key) wrap.insertAdjacentHTML('afterbegin', `<span class="ed-group-label">${esc(label)}</span>`);
      // Trainingszeit: zusammengehörige Felder nebeneinander
      const istTraining = 'tag' in wert && 'plaetze' in wert;
      let row = null;
      for (const k of Object.keys(wert)) {
        if (VERSTECKT.has(k)) continue;
        const f = feld(wert[k], k, (v) => (wert[k] = v), wert);
        if (istTraining && ['tag', 'von', 'bis', 'plaetze'].includes(k)) {
          if (!row) {
            row = document.createElement('div');
            row.className = 'ed-row';
            wrap.appendChild(row);
          }
          row.appendChild(f);
        } else wrap.appendChild(f);
      }
      return wrap;
    }

    // ---- Liste → aufklappbare Einträge mit Hinzufügen / Entfernen / Verschieben
    if (Array.isArray(wert)) {
      wrap.className = 'ed-field';
      wrap.innerHTML = `<span>${esc(label)}</span><div class="ed-items"></div><p><button type="button" class="btn btn-small btn-secondary" data-add>+ Hinzufügen</button></p>`;
      const items = $('.ed-items', wrap);
      const render = (offen = -1) => {
        items.innerHTML = '';
        wert.forEach((item, i) => {
          const d = document.createElement('details');
          d.className = 'ed-item';
          if (i === offen) d.open = true;
          d.innerHTML = `<summary><span class="ed-item-title"><span class="ed-chevron" aria-hidden="true">›</span><span data-titel>${esc(eintragTitel(item, i))}</span></span><span class="ed-item-tools">
            <button type="button" title="Nach oben" data-up>↑</button><button type="button" title="Nach unten" data-down>↓</button><button type="button" title="Entfernen" data-del>✕</button></span></summary>`;
          const inner = feld(item, null, (v) => (wert[i] = v), wert); // Einträge brauchen keine eigene Beschriftung – die steht in der Zeile darüber
          if (typeof item === 'object') inner.className = 'ed-group';
          d.appendChild(inner);
          // Titel beim Tippen aktualisieren
          d.addEventListener('input', () => ($('[data-titel]', d).textContent = eintragTitel(wert[i], i)));
          d.addEventListener('change', () => ($('[data-titel]', d).textContent = eintragTitel(wert[i], i)));
          $('[data-up]', d).onclick = (e) => { e.preventDefault(); if (i > 0) { [wert[i - 1], wert[i]] = [wert[i], wert[i - 1]]; geaendert = true; render(i - 1); } };
          $('[data-down]', d).onclick = (e) => { e.preventDefault(); if (i < wert.length - 1) { [wert[i + 1], wert[i]] = [wert[i], wert[i + 1]]; geaendert = true; render(i + 1); } };
          $('[data-del]', d).onclick = (e) => { e.preventDefault(); if (confirm('Diesen Eintrag entfernen?')) { wert.splice(i, 1); geaendert = true; render(); } };
          items.appendChild(d);
        });
      };
      render();
      $('[data-add]', wrap).onclick = () => {
        // Neuer Eintrag = leere Kopie des ersten Eintrags (gleiche Felder) – wird unten angehängt und geöffnet
        const vorlage = wert[0];
        const leer = (v, k) =>
          Array.isArray(v) ? [] : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([kk, x]) => [kk, leer(x, kk)])) : typeof v === 'boolean' ? false : typeof v === 'number' ? (k === 'plaetze' ? 1 : 0) : k === 'tag' ? 'Montag' : '';
        // Gästebuch & Alben: neueste oben – sonst unten anhängen
        const oben = ['eintraege', 'alben'].includes(key);
        const neu = vorlage !== undefined ? leer(vorlage) : '';
        oben ? wert.unshift(neu) : wert.push(neu);
        geaendert = true;
        render(oben ? 0 : wert.length - 1);
        items.querySelector('details[open]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      };
      return wrap;
    }

    // ---- Ja/Nein
    if (typeof wert === 'boolean') {
      wrap.innerHTML = `<label class="ed-check"><input type="checkbox" ${wert ? 'checked' : ''}> ${esc(label)}</label>`;
      $('input', wrap).onchange = (e) => set(e.target.checked);
      return wrap;
    }

    wrap.className = 'ed-field';
    if (key) wrap.dataset.key = key; // zum gezielten Ansprechen (z. B. Linktext beim Banner automatisch füllen)
    const hilfe = HILFE[key] && !(parent && 'von' in parent) ? `<small>${esc(HILFE[key])}</small>` : '';

    // ---- Sonderfeld: Leitung (Trainerliste + „Andere Person“ als Freitext in leitung_frei)
    if (key === 'leitung' && parent && 'leitung_frei' in parent) {
      const anders = !wert && parent.leitung_frei;
      wrap.innerHTML = `<span>Leitung</span><select>
        <option value="">— keine —</option>
        ${trainerNamen.map((n) => `<option${n === wert ? ' selected' : ''}>${esc(n)}</option>`).join('')}
        <option value="__andere"${anders ? ' selected' : ''}>Andere Person …</option>
      </select><input placeholder="Name der Person" value="${esc(parent.leitung_frei || '')}"${anders ? '' : ' hidden'}>`;
      const sel = $('select', wrap);
      const frei = $('input', wrap);
      sel.onchange = () => {
        frei.hidden = sel.value !== '__andere';
        if (sel.value === '__andere') {
          set('');
          frei.focus();
        } else {
          set(sel.value);
          parent.leitung_frei = '';
        }
      };
      frei.oninput = () => (parent.leitung_frei = frei.value);
      return wrap;
    }

    // ---- Sonderfeld: Link im Hinweis-Banner – nur Auswahl aus vorhandenen Seiten, damit kein toter Link entsteht
    if (key === 'link' && parent && 'linktext' in parent && 'bis' in parent) {
      const gruppen = [...new Set(linkziele.map((z) => z.gruppe))];
      const bekannt = !wert || linkziele.some((z) => z.url === wert);
      wrap.innerHTML = `<span>Link (optional)</span><select>
        <option value="">— kein Link —</option>
        ${bekannt ? '' : `<option value="${esc(wert)}" selected>Bisher: ${esc(wert)}</option>`}
        ${gruppen
          .map((g) => `<optgroup label="${esc(g)}">${linkziele.filter((z) => z.gruppe === g).map((z) => `<option value="${esc(z.url)}"${z.url === wert ? ' selected' : ''}>${esc(z.titel)}</option>`).join('')}</optgroup>`)
          .join('')}
      </select><small>Nur vorhandene Seiten wählbar. Der Linktext wird automatisch vorgeschlagen.</small>`;
      $('select', wrap).onchange = (e) => {
        set(e.target.value);
        // Linktext vorschlagen (oder leeren, wenn kein Link)
        const ziel = linkziele.find((z) => z.url === e.target.value);
        const textFeld = wrap.parentElement?.querySelector('[data-key="linktext"] input');
        parent.linktext = ziel ? ziel.titel.replace(/ \(\d{4}\)$/, '') : '';
        if (textFeld) textFeld.value = parent.linktext;
      };
      return wrap;
    }

    // ---- Sonderfeld: Plätze 0–4
    if (key === 'plaetze') {
      wrap.innerHTML = `<span>Plätze</span><select>${PLAETZE.map(([n, t]) => `<option value="${n}"${Number(wert) === n ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
      $('select', wrap).onchange = (e) => set(Number(e.target.value));
      return wrap;
    }

    // ---- Text / Zahl / Datum / Uhrzeit / Bild / Wochentag
    let input;
    if (key === 'tag') input = `<select>${WOCHENTAGE.map((t) => `<option${t === wert ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
    // „von/bis“ bei Trainingszeiten = Uhrzeit, „bis“ beim Banner = Datum
    else if (key === 'uhrzeit' || ((key === 'von' || key === 'bis') && parent && 'von' in parent))
      input = `<input type="time" step="900" value="${esc(String(wert).replace('.', ':'))}">`;
    else if (DATUM.test(key || '')) input = `<input type="date" value="${esc(wert)}">`;
    else if (typeof wert === 'number') input = `<input type="number" min="0" value="${esc(wert)}">`;
    else if (LANG.test(key || '') || (key === 'text' && !(parent && 'bis' in parent)) || String(wert).length > 90) input = `<textarea rows="3">${esc(wert)}</textarea>`;
    else input = `<input value="${esc(wert)}">`;
    const upload = BILD.test(key || '') ? '<button type="button" class="btn btn-small btn-secondary" data-upload>Hochladen</button>' : '';
    const zusatz = key === 'von' ? '<small>leer = ganztags</small>' : '';
    wrap.innerHTML = `<span>${esc(label)}</span>${upload ? `<span class="ed-inline">${input}${upload}</span>` : input}${hilfe}${zusatz}`;
    const el = $('input, textarea, select', wrap);
    const update = () => set(typeof wert === 'number' ? Number(el.value) : el.value);
    el.addEventListener('input', update);
    el.addEventListener('change', update);
    $('[data-upload]', wrap)?.addEventListener('click', () =>
      waehleDatei('image/*', (url) => {
        el.value = url;
        set(url);
      })
    );
    return wrap;
  }
})();
