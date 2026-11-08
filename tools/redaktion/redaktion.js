/**
 * Redaktion – Oberfläche (läuft im Browser, auch in Safari).
 *
 * Bedienidee: Das Menü links ist aufgebaut wie das Menü der Website. Wer auf der Website
 * etwas ändern möchte, findet es in der Redaktion unter demselben Namen – mit allen
 * Bausteinen dieser Seite in derselben Reihenfolge (Texte, Platzbelegung, Personen …).
 * Rechts zeigt eine Live-Vorschau die echte Seite inklusive der noch nicht gespeicherten
 * Änderungen; ein Klick in einen Baustein springt in der Vorschau an die passende Stelle.
 *
 * Komfort:
 *   • Warnung, wenn man ungespeicherte Änderungen hat und den Bereich wechselt
 *   • Listen-Einträge zum Aufklappen (Pfeil), Titel aktualisiert sich beim Tippen,
 *     Verschieben (↑ ↓) ändert nichts am Auf-/Zugeklappt-Zustand
 *   • Mehrzeilige Felder wachsen mit dem Text mit
 *   • Trainingszeiten: Uhrzeit-Auswahl, Plätze 0–4, Trainer aus der Personenliste
 *   • Termine und Trainingszeiten werden beim Speichern automatisch sortiert
 *
 * Drei Betriebsarten:
 *   • Lokal (npm start → /redaktion/): speichert über api.mjs direkt in die Projektdateien.
 *   • Server (Webspace, z. B. STRATO → /admin/): Anmeldung mit E-Mail/Kennung + Passwort über
 *     admin/api.php. Beim Speichern werden die Inhalte gesichert und die betroffenen Seiten sofort
 *     neu erzeugt (hier im Browser, mit demselben Code wie die Vorschau) und veröffentlicht.
 *   • Testversion (/admin/ auf der veröffentlichten Seite): Anmeldung mit Test-Zugang, Inhalte
 *     kommen aus einer Momentaufnahme (admin/daten.json). Änderungen bleiben nur in diesem
 *     Browserfenster (sessionStorage) und werden NICHT veröffentlicht – gedacht zum Vorführen.
 *     Der Test-Zugang ist bewusst einfach und KEIN Schutz: Es gibt dort nichts zu schützen,
 *     weil nichts gespeichert wird. Für den echten Betrieb ist eine Server-Anmeldung (PHP) geplant.
 *
 * Die Live-Vorschau nutzt denselben Seitenbau wie die Website (lib/site.mjs, im Browser als
 * /__lib/*.js bzw. admin/lib/*.js geladen) – sie sieht also exakt so aus wie das Ergebnis.
 */
(async () => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const main = $('#ed-main');
  const DEMO = !!window.REDAKTION_DEMO; // Online-Testversion (siehe Kopfkommentar)
  const SERVER = window.REDAKTION_MODUS === 'server'; // echte Online-Redaktion mit Anmeldung
  const BASIS = window.REDAKTION_BASIS || ''; // Unterordner der Seite, z. B. /tennis-website
  const LIB = window.REDAKTION_LIB || '/__lib'; // Seitenbau-Module für die Vorschau
  const DEMO_KEY = 'redaktion-demo-aenderungen';
  // Höhe der Kopfleiste merken (die Vorschau beginnt darunter)
  const kopfHoehe = () => document.documentElement.style.setProperty('--ed-top', `${$('.ed-top').offsetHeight}px`);
  kopfHoehe();
  addEventListener('resize', kopfHoehe);

  // =========================================================================
  // Testversion: Anmeldung (nur Vorführzweck, siehe Kopfkommentar)
  // =========================================================================
  const TEST_ZUGANG = 'aa7ab9c0ea0a844bc74269b7e4c05da99d7f0e361794f7a42064d6c9e5221b50'; // SHA-256 von „Benutzer:Passwort“
  const LOGIN_KEY = 'redaktion-angemeldet';
  const angemeldet = () => {
    try {
      return sessionStorage.getItem(LOGIN_KEY) === '1';
    } catch {
      return false;
    }
  };
  const sha256 = async (text) =>
    Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))).map((b) => b.toString(16).padStart(2, '0')).join('');

  // =========================================================================
  // Server: Anmeldung über admin/api.php
  // =========================================================================
  const API_URL = `${BASIS}/admin/api.php`;
  let csrf = '';
  let ich = null; // { name, kennung, stand }
  if (SERVER) {
    const st = await fetch(`${API_URL}?aktion=status`, { credentials: 'same-origin', cache: 'no-store' }).then((r) => r.json()).catch(() => null);
    if (!st) {
      main.innerHTML = '<p class="ed-handy-hinweis">Die Redaktion ist gerade nicht erreichbar. Bitte später erneut versuchen.</p>';
      return;
    }
    csrf = st.csrf;
    if (!st.angemeldet) {
      document.querySelector('.ed-layout').classList.add('ed-layout--login');
      main.innerHTML = `<form class="ed-login" autocomplete="on">
        <h1>Anmelden</h1>
        <p class="muted">Redaktion der BSG Stahl Tennis</p>
        <label class="ed-field"><span>E-Mail oder Benutzername</span><input name="user" autocomplete="username" autocapitalize="none" spellcheck="false" required autofocus></label>
        <label class="ed-field"><span>Passwort</span><input name="pass" type="password" autocomplete="current-password" required></label>
        <p class="ed-login-fehler" role="alert" hidden></p>
        <button class="btn btn-primary" type="submit">Anmelden</button>
      </form>`;
      const f = $('.ed-login', main);
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const knopf = $('button', f);
        knopf.disabled = true;
        const res = await fetch(`${API_URL}?aktion=anmelden`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-CSRF': csrf },
          body: JSON.stringify({ kennung: f.user.value.trim(), passwort: f.pass.value }),
        });
        const d = await res.json().catch(() => ({}));
        knopf.disabled = false;
        if (res.ok) {
          if (d.schwach) sessionStorage.setItem('redaktion-schwach', '1');
          location.reload();
          return;
        }
        const fehlerEl = $('.ed-login-fehler', f);
        fehlerEl.textContent = d.fehler || 'Anmeldung fehlgeschlagen.';
        fehlerEl.hidden = false;
        f.pass.select();
      });
      return;
    }
    ich = st;
    // Kopfleiste: Name, Passwort ändern, Abmelden
    const ab = $('[data-abmelden]');
    ab.hidden = false;
    ab.insertAdjacentHTML('beforebegin', `<span class="ed-ich">${String(st.name || st.kennung).replace(/[<>&]/g, '')}</span><button class="btn btn-small btn-secondary" type="button" data-passwort>Passwort ändern</button>`);
    ab.addEventListener('click', async () => {
      if (!(await fragen())) return;
      geaendert = false;
      await fetch(`${API_URL}?aktion=abmelden`, { method: 'POST', credentials: 'same-origin', headers: { 'X-CSRF': csrf } });
      location.reload();
    });
    $('[data-passwort]').addEventListener('click', () => passwortDialog());
  }

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
        try {
          sessionStorage.setItem(LOGIN_KEY, '1');
        } catch {}
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
        try {
          sessionStorage.removeItem(LOGIN_KEY);
          sessionStorage.removeItem(DEMO_KEY);
        } catch {}
        location.href = location.pathname;
      });
    }
  }

  // =========================================================================
  // Menü – aufgebaut wie das Menü der Website
  // =========================================================================
  const MENUE = [
    { gruppe: 'Website' },
    { id: 'startseite', label: 'Startseite' },
    { id: 'news', label: 'News' },
    { id: 'termine', label: 'Termine' },
    { id: 'angebote', label: 'Training & Mitgliedschaft' },
    { unter: 'Verein' },
    { id: 'vorstand', label: 'Vorstand & Ansprechpartner', ein: true },
    { id: 'jugend', label: 'Kinder & Jugend', ein: true },
    { id: 'satzung', label: 'Satzung & Beiträge', ein: true },
    { id: 'unterstuetzen', label: 'Unterstützer & Spenden', ein: true },
    { id: 'gaestebuch', label: 'Gästebuch', ein: true },
    { id: 'geschichte', label: 'Geschichte', ein: true },
    { id: 'turnierberichte', label: 'Turnierberichte', ein: true },
    { id: 'fotos', label: 'Fotos' },
    { id: 'kontakt', label: 'Kontakt' },
    { gruppe: 'Fußbereich & Allgemeines' },
    { id: 'impressum', label: 'Impressum' },
    { id: 'datenschutz', label: 'Datenschutz' },
    { id: 'allgemein', label: 'Alle Vereinsdaten & Links' },
  ];
  /**
   * Am Handy nur das, was man unterwegs schnell erledigt. Ganze Seiten umbauen geht am Tablet oder
   * Computer deutlich übersichtlicher – dort erscheint das vollständige Menü.
   */
  const HANDY = matchMedia('(max-width: 760px)');
  const MENUE_HANDY = [
    { gruppe: 'Schnell erledigt' },
    { id: 'news-neu', label: '＋ News schreiben', hash: '#news/neu' },
    { id: 'news', label: 'News' },
    { id: 'termine', label: 'Termine' },
    { id: 'schnell', label: 'Banner & Mitgliederzahlen' },
    { id: 'gaestebuch', label: 'Gästebuch' },
  ];
  const HANDY_SEITEN = new Set(MENUE_HANDY.map((m) => m.id).filter(Boolean));

  /** Alte Adressen (#training, #faq …) weiter verstehen */
  const ALIAS = { training: 'angebote', faq: 'angebote', verein: 'allgemein', galerie: 'fotos', unterstuetzer: 'unterstuetzen', seiten: 'startseite' };

  const V = 'data/verein.json';
  const md = (name) => `content/seiten/${name}.md`;

  /**
   * Bausteine jeder Seite – in der Reihenfolge, in der sie auf der Website erscheinen.
   *   datei + felder → Formular für diese Angaben (felder leer = ganze Datei)
   *   datei (.md)    → Text der Seite mit Werkzeugleiste
   *   verweis        → Knopf zu einer anderen Stelle der Redaktion
   *   ziel           → Stelle in der Vorschau (CSS-Selektor), zu der beim Bearbeiten gesprungen wird
   */
  const SEITEN = {
    startseite: {
      url: '/',
      info: 'Von oben nach unten so, wie die Startseite aufgebaut ist.',
      bloecke: [
        { titel: 'Hinweis-Banner (ganz oben)', hilfe: 'Für kurzfristige Hinweise, z. B. „Winterpause“ oder „Plätze wegen Regen gesperrt“. Text leer lassen = kein Banner. Mit „Anzeigen bis“ verschwindet er von selbst.', datei: V, felder: ['hinweis_banner'], ziel: '.banner' },
        { titel: 'Titelbild und Überschrift', datei: V, felder: ['titelbild', 'start_titel', 'start_titel_2', 'start_text'], ziel: '.hero' },
        { titel: 'Zahlen unter dem Titelbild', hilfe: 'Am besten jedes Jahr im Januar aktualisieren.', datei: V, felder: ['mitglieder', 'mitglieder_jugend', 'mitglieder_stand', 'gegruendet'], ziel: '.facts' },
        { titel: 'Begrüßung', datei: md('startseite'), kopf: [['title', 'Kleine Überschrift (rot)'], ['ueberschrift', 'Große Überschrift']], ziel: '#willkommen' },
        { titel: 'Neueste News (automatisch)', hilfe: 'Hier erscheinen von selbst die drei neuesten Beiträge.', verweis: 'news', verweisText: 'News bearbeiten', ziel: '.news-grid' },
        { titel: 'Nächste Termine (automatisch)', hilfe: 'Hier erscheinen von selbst die nächsten drei Termine.', verweis: 'termine', verweisText: 'Termine bearbeiten', ziel: '.split--events' },
        { titel: 'Kasten „Mitglied werden“', hilfe: 'Die Beiträge stehen auch auf „Satzung & Beiträge“ – beides wird hier gepflegt.', datei: V, felder: ['beitraege', 'beitraege_stand'], ziel: '.cta-card' },
        { titel: 'Gästebuch und Unterstützer (automatisch)', hilfe: 'Der neueste Gästebuch-Eintrag und die Unterstützer erscheinen von selbst.', verweis: 'gaestebuch', verweisText: 'Gästebuch bearbeiten', verweis2: 'unterstuetzen', verweisText2: 'Unterstützer bearbeiten', ziel: '.duo' },
        { titel: 'Anfahrt', datei: V, felder: ['anfahrt'], ziel: '#anfahrt' },
      ],
    },
    termine: {
      url: '/termine/',
      info: 'Vergangene Termine wandern automatisch nach unten. Beim Speichern wird nach Datum sortiert.',
      bloecke: [{ titel: 'Termine', datei: 'data/termine.json', felder: ['hinweis', 'termine'], ziel: 'main' }],
    },
    angebote: {
      url: '/angebote/',
      bloecke: [
        { titel: 'Platzbelegung & Trainingszeiten', hilfe: 'Oben stellen Sie ein, ob der Plan ausführlich (mit Gruppen und Verantwortlichen) oder anonym (nur belegte Plätze) erscheint. Beim Speichern wird nach Wochentag und Uhrzeit sortiert. Tage ohne Eintrag erscheinen als „Freies Spiel“.', datei: 'data/training.json', ziel: '#training' },
        { titel: 'Text der Seite (Mitgliedschaft, Schlägerbespannung …)', datei: md('angebote'), ziel: '#mitglied-werden' },
        { titel: 'Häufige Fragen', datei: 'data/faq.json', ziel: '#faq' },
      ],
    },
    vorstand: {
      url: '/vorstand/',
      bloecke: [
        { titel: 'Text der Seite', datei: md('vorstand'), ziel: 'main' },
        {
          titel: 'Personen (Vorstand und Trainer)',
          hilfe: 'Jede Person steht nur einmal hier. Wer eine Funktion im Vorstand hat, erscheint bei „Vorstand“; wer eine Trainer-Funktion hat, bei „Trainer“ – wer beides hat, an beiden Stellen. Telefon/E-Mail erscheinen nur mit Häkchen bei „veröffentlichen“ (Einverständnis der Person).',
          datei: 'data/vorstand.json',
          felder: ['personen'],
          ziel: '.people-grid',
        },
      ],
    },
    jugend: {
      url: '/jugend/',
      bloecke: [
        { titel: 'Text der Seite (inkl. Ergebnislisten)', datei: md('jugend'), ziel: 'main' },
        { titel: 'Trainer und Trainingszeiten (automatisch)', hilfe: 'Hier erscheinen alle Personen mit Häkchen „Im Kinder- und Jugendtraining tätig“. Die Trainingszeiten der Kinder erscheinen nur, wenn die Platzbelegung auf „Ausführlich“ steht – sonst ein Hinweis, sich beim Abteilungsleiter zu melden.', verweis: 'vorstand', verweisText: 'Personen bearbeiten', verweis2: 'angebote', verweisText2: 'Trainingszeiten bearbeiten', ziel: '.people-grid' },
      ],
    },
    satzung: {
      url: '/satzung/',
      bloecke: [
        { titel: 'Text der Seite', hilfe: 'Die Beitragstabelle steht im Text als Platzhalter {{beitraege}} und wird automatisch gefüllt.', datei: md('satzung'), ziel: 'main' },
        { titel: 'Mitgliedsbeiträge', datei: V, felder: ['beitraege', 'beitraege_stand'], ziel: '.table-wrap' },
        { titel: 'Bankverbindung für die Beitragsüberweisung', hilfe: 'Erscheint unter „Beitrag überweisen“ und im Aufnahmeantrag (PDF wird separat neu erzeugt).', datei: V, felder: ['bank'], ziel: '.bank' },
      ],
    },
    unterstuetzen: { url: '/unterstuetzen/', bloecke: [{ titel: 'Unterstützer & Spenden', datei: 'data/unterstuetzer.json', ziel: 'main' }] },
    gaestebuch: {
      url: '/gaestebuch/',
      bloecke: [
        { titel: 'Text der Seite', datei: md('gaestebuch'), ziel: 'main' },
        { titel: 'Einträge', hilfe: 'Neue Einträge kommen per E-Mail und werden hier von Hand übernommen (neueste oben).', datei: 'data/gaestebuch.json', ziel: '.guest-list, .guestbook, main' },
      ],
    },
    geschichte: { url: '/geschichte/', bloecke: [{ titel: 'Text der Seite', datei: md('geschichte'), ziel: 'main' }] },
    turnierberichte: { url: '/turnierberichte/', bloecke: [{ titel: 'Text der Seite', datei: md('turnierberichte'), ziel: 'main' }] },
    fotos: {
      url: '/fotoalbum/',
      bloecke: [
        { titel: 'Text der Seite', datei: md('fotoalbum'), ziel: 'main' },
        { titel: 'Von Hand angelegte Alben', hilfe: 'Zusätzlich wird jeder News-Beitrag mit mindestens 3 Fotos automatisch ein Album.', datei: 'data/galerie.json', ziel: '.album-grid' },
      ],
    },
    kontakt: {
      url: '/kontakt/',
      bloecke: [
        { titel: 'Text der Seite', datei: md('kontakt'), ziel: 'main' },
        { titel: 'Anschrift und Kontaktdaten', datei: V, felder: ['strasse', 'zusatz', 'plz', 'ort', 'telefon', 'telefax', 'email', 'anfahrt'], ziel: 'main' },
        { titel: 'Ansprechpartner (automatisch)', hilfe: 'Hier erscheinen alle Personen, deren Kontaktdaten veröffentlicht werden dürfen.', verweis: 'vorstand', verweisText: 'Personen bearbeiten', ziel: '.person-card' },
      ],
    },
    impressum: { url: '/impressum/', bloecke: [{ titel: 'Text der Seite', datei: md('impressum'), ziel: 'main' }] },
    datenschutz: { url: '/datenschutz/', bloecke: [{ titel: 'Text der Seite', datei: md('datenschutz'), ziel: 'main' }] },
    schnell: {
      label: 'Banner & Mitgliederzahlen',
      url: '/',
      info: 'Die zwei Dinge der Startseite, die sich am häufigsten ändern.',
      bloecke: [
        { titel: 'Hinweis-Banner (ganz oben)', hilfe: 'Text leer lassen = kein Banner. Mit „Anzeigen bis“ verschwindet er von selbst.', datei: V, felder: ['hinweis_banner'], ziel: '.banner' },
        { titel: 'Mitgliederzahlen', datei: V, felder: ['mitglieder', 'mitglieder_jugend', 'mitglieder_stand'], ziel: '.facts' },
      ],
    },
    allgemein: {
      url: '/',
      info: 'Alle Vereinsdaten an einem Ort – dieselben Angaben, die auch bei den einzelnen Seiten stehen.',
      bloecke: [{ titel: 'Vereinsdaten', datei: V, ziel: 'body' }],
    },
  };

  /** Verständliche Feldnamen für die JSON-Dateien. */
  const LABELS = {
    titel: 'Titel', datum: 'Datum', uhrzeit: 'Uhrzeit', ort: 'Ort', beschreibung: 'Beschreibung', hinweis: 'Hinweis', hinweise: 'Hinweise',
    termine: 'Termine', zeiten: 'Belegungszeiten', anzeige: 'Ansicht auf der Website', tag: 'Wochentag', von: 'Von', bis: 'Bis', art: 'Belegung', gruppe: 'Gruppe', leitung: 'Leitung', plaetze: 'Plätze',
    personen: 'Personen', name: 'Name', funktion: 'Funktion', zustaendig: 'Ansprechpartner für (im Vorstand)', telefon: 'Telefon', email: 'E-Mail', foto: 'Foto',
    vorstand: 'Funktion im Vorstand (leer = nicht im Vorstand)', trainer: 'Trainer-Funktion (leer = kein Trainer)', trainiert: 'Trainiert (Gruppen)',
    kontakt_freigegeben: 'Telefon/E-Mail veröffentlichen (Einverständnis der Person liegt vor)', kinder_jugend: 'Im Kinder- und Jugendtraining tätig (erscheint auf „Kinder & Jugend“)',
    eintraege: 'Einträge (neueste oben)', text: 'Text', alben: 'Alben', jahr: 'Jahr', bilder: 'Bilder', bild: 'Bild', fragen: 'Fragen', frage: 'Frage', antwort: 'Antwort',
    sponsoren: 'Sponsoren & Förderer', beitrag: 'Was wurde unterstützt?', url: 'Webseite', logo: 'Logo', wege: 'Wege zu helfen', icon: 'Symbol', link: 'Link', linktext: 'Linktext', einleitung: 'Einleitung',
    mitglieder: 'Mitglieder gesamt', mitglieder_jugend: 'davon Kinder & Jugendliche', mitglieder_stand: 'Stand der Mitgliederzahlen', beitraege: 'Mitgliedsbeiträge pro Jahr', betrag: 'Betrag in €', beitraege_stand: 'Beiträge gültig seit (Jahr)', bank: 'Bankverbindung', empfaenger: 'Empfänger (Kontoinhaber)', iban: 'IBAN', bic: 'BIC', kreditinstitut: 'Bank', verwendungszweck: 'Verwendungszweck',
    hinweis_banner: 'Hinweis-Banner', start_titel: 'Überschrift (erste Zeile)', start_titel_2: 'Überschrift (zweite Zeile, farbig)', start_text: 'Text unter der Überschrift',
    titelbild: 'Titelbild', links: 'Links im Fußbereich', kontaktformular: 'Formular-Adresse Kontakt (form.taxi)', gaestebuchformular: 'Formular-Adresse Gästebuch (form.taxi)',
    claim: 'Leitsatz', kurzname: 'Kurzname', abteilung: 'Abteilung', strasse: 'Straße', zusatz: 'Adresszusatz', plz: 'PLZ', telefax: 'Telefax', anfahrt: 'Anfahrt',
    gegruendet: 'Tennis seit (Jahr)', whatsapp_hinweis: 'WhatsApp-Hinweis', beschreibung_seo: 'Beschreibung', plaetze_text: 'Plätze',
  };
  const HILFE = {
    bis: 'Banner verschwindet nach diesem Datum automatisch.',
    vorstand: 'z. B. „Abteilungsleiter“ oder „Kassenwart“',
    trainer: 'z. B. „Trainer“ oder „Trainer (C-Lizenz)“',
  };
  const KOMPAKT = new Set(['beitraege', 'links']); // Listen, die als offene Zeilen ohne Aufklappen erscheinen
  const VERSTECKT = new Set(['leitung_frei']); // wird über das Feld „Leitung“ mit bearbeitet
  const LANG = /^(beschreibung|antwort|einleitung|anfahrt|beitrag|start_text)$/; // mehrzeilige Felder („text“ siehe unten)
  const BILD = /^(bild|foto|logo|titelbild|cover)$/;
  const DATUM = /^(datum|bis|mitglieder_stand)$/;
  const ARTEN = ['Training', 'Freies Spiel', 'Turnier', 'Arbeitseinsatz', 'Veranstaltung', 'Belegt'];
  const WOCHENTAGE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
  const PLAETZE = [
    [0, '0 – Anlage nicht verfügbar (z. B. Turnier oder Arbeitseinsatz)'],
    [1, '1 Platz'],
    [2, '2 Plätze'],
    [3, '3 Plätze'],
    [4, '4 – alle Plätze'],
  ];

  // =========================================================================
  // Schnittstelle zum lokalen Server (bzw. zur Momentaufnahme in der Testversion)
  // =========================================================================
  const api = async (pfad, opts = {}) => {
    if (DEMO) return demoApi(pfad, opts);
    if (SERVER) {
      // /__api/write?path=… → admin/api.php?aktion=write&path=…
      const u = new URL(pfad, location.href);
      const aktion = u.pathname.replace('/__api/', '');
      const res = await fetch(`${API_URL}?aktion=${aktion}${u.search ? '&' + u.search.slice(1) : ''}`, {
        ...opts,
        credentials: 'same-origin',
        headers: { ...(opts.headers || {}), 'X-CSRF': csrf },
      });
      const data = await res.json().catch(() => ({ fehler: 'Unerwartete Antwort vom Server' }));
      if (res.status === 401) {
        toast('Sie wurden abgemeldet (zu lange inaktiv). Bitte neu anmelden – ungespeicherte Änderungen vorher kopieren.', true);
        throw new Error(data.fehler || 'Bitte anmelden');
      }
      if (!res.ok) throw new Error(data.fehler || 'Fehler');
      return data;
    }
    const res = await fetch(pfad, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.fehler || 'Fehler');
    return data;
  };

  // Testversion: dieselben Aufrufe wie der lokale Server, aber aus der Momentaufnahme.
  // Änderungen landen nur im sessionStorage dieses Fensters (null = gelöscht).
  let demoDaten;
  async function demoApi(pfad, opts) {
    demoDaten ??= await fetch(`${BASIS}/admin/daten.json`, { cache: 'no-store' }).then((r) => r.json());
    let aend = {};
    try {
      aend = JSON.parse(sessionStorage.getItem(DEMO_KEY)) || {};
    } catch {}
    const datei = (p) => (p in aend ? aend[p] : demoDaten.dateien[p]);
    const merke = (p, text) => {
      aend[p] = text;
      try {
        sessionStorage.setItem(DEMO_KEY, JSON.stringify(aend));
      } catch {}
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
      case '/__api/alle': {
        const alle = { ...demoDaten.dateien, ...aend };
        for (const p of Object.keys(alle)) if (alle[p] == null) delete alle[p];
        return alle;
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
    }
    throw new Error('Unbekannte Anfrage');
  }
  let alleCache = null; // alle Inhalte für die Vorschau (wird nach dem Speichern neu geholt)
  const alleDateien = async () => (alleCache ??= await api('/__api/alle'));
  const lesen = (p) => api(`/__api/read?path=${encodeURIComponent(p)}`).then((d) => d.text);
  const schreiben = async (p, text, alt) => {
    const r = await api(`/__api/write?path=${encodeURIComponent(p)}${alt ? `&alt=${encodeURIComponent(alt)}` : ''}`, { method: 'POST', body: text });
    alleCache = null;
    return r;
  };
  const hochladen = (file) => api(`/__api/upload?name=${encodeURIComponent(file.name)}`, { method: 'POST', body: file }).then((d) => d.url);

  /**
   * Server: alle Seiten mit dem aktuellen Stand neu erzeugen und nur die geänderten hochladen.
   * (Gleicher Code wie Build und Vorschau – lib/site.mjs.) Gibt die Zahl der geänderten Dateien zurück.
   */
  async function veroeffentlichen() {
    if (!SERVER) return 0;
    alleCache = null;
    const site = await import(`${LIB}/site.js`);
    const wetter = await fetch(`${BASIS}/wetter.json`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    const erg = site.renderSite({ files: await alleDateien(), heute: heute(), wetter, BASE: BASIS });
    const neu = erg.dateien();
    const alt = await api('/__api/pruefsummen');
    const hash = async (t) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))).map((b) => b.toString(16).padStart(2, '0')).join('');
    const geaendert_ = [];
    for (const [rel, inhalt] of Object.entries(neu)) if (alt[rel] !== (await hash(inhalt))) geaendert_.push(rel);
    const loeschen = Object.keys(alt).filter((rel) => !(rel in neu));
    // In Paketen bis ca. 1,5 MB senden (große Erstveröffentlichung)
    let paket = {};
    let groesse = 0;
    const senden = async (letztes) =>
      api('/__api/veroeffentlichen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dateien: paket, loeschen: letztes ? loeschen : [] }) });
    for (const rel of geaendert_) {
      paket[rel] = neu[rel];
      groesse += neu[rel].length;
      if (groesse > 1.5e6) {
        await senden(false);
        paket = {};
        groesse = 0;
      }
    }
    if (Object.keys(paket).length || loeschen.length) await senden(true);
    return geaendert_.length + loeschen.length;
  }
  /** Nach dem Speichern: im Server-Modus gleich veröffentlichen und Bescheid geben. */
  async function nachDemSpeichern(text = 'Gespeichert ✓') {
    if (!SERVER) return toast(text);
    toast('Gespeichert – Seite wird aktualisiert …');
    try {
      const n = await veroeffentlichen();
      toast(`Gespeichert und veröffentlicht ✓ (${n} ${n === 1 ? 'Datei' : 'Dateien'} aktualisiert)`);
    } catch (e) {
      toast(`Gespeichert, aber die Seite konnte nicht aktualisiert werden: ${e.message}`, true);
    }
  }

  /** Passwort ändern (Server-Modus). */
  function passwortDialog() {
    let dlg = $('#ed-passwort');
    if (!dlg) {
      document.body.insertAdjacentHTML(
        'beforeend',
        `<dialog id="ed-passwort" class="form-dialog ed-dialog"><form method="dialog" class="ed-form">
          <h2>Passwort ändern</h2>
          <label class="ed-field"><span>Bisheriges Passwort</span><input name="alt" type="password" autocomplete="current-password" required></label>
          <label class="ed-field"><span>Neues Passwort</span><input name="neu" type="password" autocomplete="new-password" minlength="10" required><small>Mindestens 10 Zeichen – gern ein kurzer Satz, z. B. „Aufschlag-im-Sommer-2027“.</small></label>
          <label class="ed-field"><span>Neues Passwort wiederholen</span><input name="neu2" type="password" autocomplete="new-password" required></label>
          <p class="ed-login-fehler" role="alert" hidden></p>
          <div class="stack-actions"><button class="btn btn-primary" value="ok">Ändern</button><button class="btn btn-secondary" value="cancel" formnovalidate>Abbrechen</button></div>
        </form></dialog>`
      );
      dlg = $('#ed-passwort');
      const f = $('form', dlg);
      f.addEventListener('submit', async (e) => {
        if (e.submitter?.value !== 'ok') return;
        e.preventDefault();
        const fehlerEl = $('.ed-login-fehler', f);
        if (f.neu.value !== f.neu2.value) {
          fehlerEl.textContent = 'Die beiden neuen Passwörter stimmen nicht überein.';
          fehlerEl.hidden = false;
          return;
        }
        try {
          await api('/__api/passwort', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ alt: f.alt.value, neu: f.neu.value }) });
          sessionStorage.removeItem('redaktion-schwach');
          dlg.close();
          f.reset();
          toast('Passwort geändert ✓');
        } catch (err) {
          fehlerEl.textContent = err.message;
          fehlerEl.hidden = false;
        }
      });
    }
    $('.ed-login-fehler', dlg).hidden = true;
    dlg.showModal();
  }

  function toast(msg, fehler = false) {
    if (DEMO && /^Gespeichert|gelöscht/.test(msg)) msg = msg.replace(/ –.*$/, '') + ' (Testversion: nur in diesem Browserfenster, nicht veröffentlicht)';
    const t = $('.ed-toast');
    t.textContent = msg;
    t.classList.toggle('is-error', fehler);
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => (t.hidden = true), 3500);
  }
  /** Mehrzeilige Felder auf die Höhe ihres Inhalts bringen (mind. 3 Zeilen) – kein Scrollen im Feld. */
  function wachse(root) {
    const liste = root.matches?.('textarea.ed-auto') ? [root] : $$('textarea.ed-auto', root);
    for (const ta of liste) {
      if (!ta.offsetParent) continue; // unsichtbar (zugeklappt) → beim Aufklappen erneut
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight + 2}px`;
    }
  }
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const slug = (s) =>
    String(s).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
  const heute = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Berlin' }).format(new Date());

  // =========================================================================
  // Live-Vorschau (rechts): die echte Seite mit den noch nicht gespeicherten Änderungen
  // =========================================================================
  const vorschau = (() => {
    const box = $('.ed-vorschau');
    const layout = $('.ed-layout');
    const rahmen = $('.ed-vorschau-rahmen', box);
    const frame = $('iframe', box);
    const titelEl = $('[data-vorschau-titel]', box);
    const oeffnen = $('[data-vorschau-oeffnen]', box);
    const zeigenBtn = $('.ed-vorschau-zeigen');
    const BREITE = { computer: 1280, handy: 390 };
    let ziel = null; // { url, titel, dateien: () => ({ Pfad: Text|null }) }
    let modus = HANDY.matches ? 'handy' : 'computer';
    let aus = HANDY.matches; // am Handy erst auf Knopfdruck (dann als Vollbild)
    $$('[data-modus]', box).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.modus === modus)));
    let site;
    let wetter;
    let timer;
    let nr = 0;
    let stelle = null;
    let y = 0;
    let erste = true;

    function skaliere() {
      const w = rahmen.clientWidth;
      const h = rahmen.clientHeight;
      const b = BREITE[modus];
      const s = Math.min(1, w / b);
      frame.style.width = `${b}px`;
      frame.style.height = `${h / s}px`;
      frame.style.transform = `scale(${s})`;
      frame.style.left = `${Math.max(0, (w - b * s) / 2)}px`;
    }
    new ResizeObserver(skaliere).observe(rahmen);

    $$('[data-modus]', box).forEach((b) =>
      b.addEventListener('click', () => {
        modus = b.dataset.modus;
        $$('[data-modus]', box).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        skaliere();
      })
    );
    const sichtbar = (an) => {
      aus = !an;
      box.hidden = !an || !ziel;
      zeigenBtn.hidden = an || !ziel;
      layout.classList.toggle('mit-vorschau', !box.hidden);
      document.documentElement.classList.toggle('ed-vorschau-vollbild', HANDY.matches && !box.hidden);
      if (an) {
        skaliere();
        zeichne();
      }
    };
    $('[data-vorschau-zu]', box).addEventListener('click', () => sichtbar(false));
    zeigenBtn.addEventListener('click', () => sichtbar(true));

    async function zeichne() {
      if (!ziel || aus) return;
      const meine = ++nr;
      try {
        site ??= await import(`${LIB}/site.js`);
        if (wetter === undefined) wetter = await fetch(`${BASIS}/wetter.json`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
        const files = { ...(await alleDateien()) };
        for (const [p, t] of Object.entries(ziel.dateien?.() || {})) {
          if (t == null) delete files[p];
          else files[p] = t;
        }
        const url = typeof ziel.url === 'function' ? ziel.url() : ziel.url;
        const [pfad, anker] = url.split('#');
        const erg = site.renderSite({ files, heute: heute(), wetter, BASE: BASIS, nurUrl: pfad });
        const seite = erg.pages.find((p) => p.url === pfad && p.html);
        if (meine !== nr) return; // inzwischen neuere Vorschau unterwegs
        if (!seite) throw new Error('Diese Seite gibt es so (noch) nicht.');
        oeffnen.href = BASIS + url;
        anzeigen(seite.html, erste ? anker : null);
      } catch (e) {
        if (meine === nr) frame.srcdoc = `<p style="font:16px system-ui;padding:2rem;color:#8a3b2a">Vorschau nicht möglich: ${esc(e.message)}</p>`;
      }
    }
    function anzeigen(html, anker) {
      try {
        if (!erste) y = frame.contentWindow?.scrollY ?? y;
      } catch {}
      // Links in der Vorschau nicht öffnen (man soll hier nicht versehentlich wegnavigieren); Markierung der bearbeiteten Stelle
      const extra = `<style>.ed-markiert{outline:3px solid #c8553d!important;outline-offset:6px;border-radius:8px;transition:outline-color .4s}</style><script>addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a[href]');if(a&&!e.defaultPrevented)e.preventDefault()});addEventListener('submit',function(e){e.preventDefault()})<\/script>`;
      frame.onload = () => {
        const w = frame.contentWindow;
        if (stelle) markiere(stelle, false, erste);
        const ankerEl = anker && erste && w.document.getElementById(anker);
        if (ankerEl) w.scrollTo(0, Math.max(0, ankerEl.getBoundingClientRect().top + w.scrollY - 70));
        else if (!(stelle && erste)) w.scrollTo(0, y);
        erste = false;
      };
      frame.srcdoc = html.replace('</head>', `${extra}</head>`);
    }
    /** Stelle in der Vorschau markieren und (optional) dorthin scrollen. */
    function markiere(sel, weich = true, scrollen = true) {
      const d = frame.contentDocument;
      if (!d) return;
      d.querySelectorAll('.ed-markiert').forEach((x) => x.classList.remove('ed-markiert'));
      const el = sel.split(',').map((s) => d.querySelector(s.trim())).find(Boolean);
      if (!el) return;
      // Ganze Seite gemeint → nur nach oben, ohne Rahmen
      if (el.tagName === 'BODY' || el.tagName === 'MAIN') {
        if (scrollen) frame.contentWindow.scrollTo({ top: 0, behavior: weich ? 'smooth' : 'auto' });
        return;
      }
      el.classList.add('ed-markiert');
      // Nur die Vorschau selbst scrollen – scrollIntoView würde (v. a. in Safari) auch die Redaktionsseite
      // verschieben, sodass ein Klick nicht mehr dort ankommt, wo man hingetippt hat.
      if (scrollen) {
        const w = frame.contentWindow;
        w.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + w.scrollY - 70), behavior: weich ? 'smooth' : 'auto' });
      }
    }

    return {
      /** Vorschau für eine Seite einrichten. */
      zeige(neu) {
        ziel = neu;
        stelle = null;
        y = 0;
        erste = true;
        titelEl.textContent = neu.titel || '';
        sichtbar(!aus);
      },
      /** Vorschau einblenden (Knopf „Vorschau“ am Handy) */
      oeffnen() {
        sichtbar(true);
      },
      /** Ohne Vorschau (z. B. Anmeldeseite) */
      keine() {
        ziel = null;
        box.hidden = true;
        zeigenBtn.hidden = true;
        layout.classList.remove('mit-vorschau');
      },
      /** Nach einer Änderung: kurz warten, dann neu zeichnen. */
      aktualisieren() {
        clearTimeout(timer);
        timer = setTimeout(zeichne, 350);
      },
      /** Zur Stelle eines Bausteins springen. */
      stelle(sel) {
        if (sel === stelle) return;
        stelle = sel;
        markiere(sel);
      },
    };
  })();
  main.addEventListener('click', (e) => {
    if (e.target.closest('[data-vorschau-handy]')) vorschau.oeffnen();
  });
  /** Wird nach jeder Änderung aufgerufen → Vorschau aktualisieren. */
  const aenderung = () => vorschau.aktualisieren();

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
  const beiEingabe = () => {
    geaendert = true;
    aenderung();
  };
  main.addEventListener('input', beiEingabe);
  main.addEventListener('change', beiEingabe);
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
      history.replaceState(null, '', aktuellerHash || '#startseite');
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
  function zeichneMenue() {
    const liste = HANDY.matches ? MENUE_HANDY : MENUE;
    nav.innerHTML =
      liste
        .map((m) =>
          m.gruppe
            ? `<h2>${m.gruppe}</h2>`
            : m.unter
              ? `<span class="ed-nav-unter">${m.unter}</span>`
              : `<button type="button" data-id="${m.id}"${m.hash ? ` data-hash="${m.hash}"` : ''}${m.ein ? ' class="ed-nav-ein"' : ''}>${m.label}</button>`
        )
        .join('') + (HANDY.matches ? '<p class="ed-nav-hinweis">Alle weiteren Seiten bearbeiten Sie am besten am Tablet oder Computer – dort ist mehr Platz für die Vorschau.</p>' : '');
    markiereMenue();
  }
  function markiereMenue() {
    const [id, arg] = location.hash.slice(1).split('/');
    const aktiv = id === 'news' && arg === 'neu' ? 'news-neu' : ALIAS[id] || id || (HANDY.matches ? 'news' : 'startseite');
    nav.querySelectorAll('button').forEach((x) => x.setAttribute('aria-current', String(x.dataset.id === aktiv)));
  }
  zeichneMenue();
  HANDY.addEventListener?.('change', zeichneMenue);
  nav.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-id]');
    if (btn) geheZu(btn.dataset.hash || `#${btn.dataset.id}`);
  });
  document.body.insertAdjacentHTML(
    'beforeend',
    `<dialog id="ed-unsaved" class="form-dialog ed-dialog"><form method="dialog">
      <h2>Ungespeicherte Änderungen</h2>
      <p>Es gibt Änderungen, die noch nicht gespeichert sind. Was möchten Sie tun?</p>
      <div class="stack-actions"><button class="btn btn-primary" value="save">Speichern</button><button class="btn btn-danger" value="discard">Verwerfen</button><button class="btn btn-secondary" value="cancel">Abbrechen</button></div>
    </form></dialog>`
  );
  // Linkziele (für den Link im Hinweis-Banner) einmal laden
  let linkziele = [];
  fetch(`${BASIS}/linkziele.json`, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : []))
    .then((l) => (linkziele = l))
    .catch(() => {});

  function route() {
    aktuellerHash = location.hash;
    setzeSpeichern(null);
    let [id, ...rest] = location.hash.slice(1).split('/');
    id = ALIAS[id] || id || (HANDY.matches ? 'news' : 'startseite');
    if (id !== 'news' && !SEITEN[id]) id = 'startseite';
    markiereMenue();
    main.scrollTop = 0;
    window.scrollTo(0, 0);
    if (id === 'news') {
      const arg = decodeURIComponent(rest.join('/'));
      return arg ? newsEditor(arg === 'neu' ? null : arg) : newsListe();
    }
    return seiteEditor(id);
  }
  const menueLabel = (id) => MENUE.find((m) => m.id === id)?.label || SEITEN[id]?.label || id;
  /** Hinweis, wenn am Handy eine große Seite geöffnet wird */
  const handyHinweis = (id) =>
    HANDY.matches && !HANDY_SEITEN.has(id) ? '<p class="ed-handy-hinweis">Diese Seite ist am Handy unübersichtlich – am besten am Tablet oder Computer bearbeiten.</p>' : '';

  // =========================================================================
  // News
  // =========================================================================
  async function newsListe() {
    const files = await api('/__api/list?dir=content/news');
    main.innerHTML = `<p class="ed-pfad">Website › News</p><h1>News</h1><p class="muted">${files.length} Beiträge. Die News-Seite zeigt die letzten 8 Jahre, ältere Beiträge wandern automatisch ins Archiv.</p>
      <div class="ed-bar"><input class="ed-search" type="search" placeholder="Suchen …" aria-label="News durchsuchen"><a class="btn btn-primary" href="#news/neu">+ Neuer Beitrag</a><button class="btn btn-secondary ed-nur-handy" type="button" data-vorschau-handy>Vorschau</button></div>
      <ul class="ed-list">${files
        .map((f) => `<li><button type="button" data-p="${esc(f.path)}"><span class="d">${esc(f.date)}</span><span>${esc(f.title)}</span>${f.entwurf ? '<span class="ed-tag">Entwurf</span>' : '<span></span>'}</button></li>`)
        .join('')}</ul>`;
    main.querySelector('.ed-list').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-p]');
      if (b) geheZu(`#news/${encodeURIComponent(b.dataset.p)}`);
    });
    $('.ed-search', main).addEventListener('input', (e) => {
      e.stopPropagation();
      const q = e.target.value.toLowerCase();
      main.querySelectorAll('.ed-list li').forEach((li) => (li.hidden = !li.textContent.toLowerCase().includes(q)));
    });
    $('.ed-search', main).addEventListener('change', (e) => e.stopPropagation()); // Suchfeld zählt nicht als Änderung
    vorschau.zeige({ url: '/news/', titel: 'News' });
  }

  async function newsEditor(pfad) {
    const { data, body } = pfad ? parse(await lesen(pfad)) : { data: { title: '', date: heute() }, body: '' };
    main.innerHTML = `<p class="ed-pfad"><a href="#news">Website › News</a> › ${pfad ? 'Beitrag bearbeiten' : 'Neuer Beitrag'}</p><h1>${pfad ? 'Beitrag bearbeiten' : 'Neuer Beitrag'}</h1>
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
        <div class="ed-actions ed-actions--fest">
          <button class="btn btn-primary" type="submit">Speichern</button>
          <button class="btn btn-secondary ed-nur-handy" type="button" data-vorschau-handy>Vorschau</button>
          ${pfad ? '<button class="btn btn-danger" type="button" data-delete>Löschen</button>' : ''}
        </div>
      </form>`;
    const form = $('form', main);
    initTextEditor(form);
    form.querySelector('[data-upload]').addEventListener('click', () =>
      waehleDatei('image/*', (url) => {
        form.bild.value = url;
        aenderung();
      })
    );

    // Aktueller Stand des Formulars als Datei (Name ergibt sich aus Datum + Überschrift)
    const stand = () => {
      const neu = {
        title: form.title.value.trim(),
        date: form.date.value,
        bild: form.bild.value.trim(),
        kurztext: form.kurztext.value.trim(),
        entwurf: form.entwurf.checked,
        ungefaehr: !!form.ungefaehr?.checked,
      };
      if (!form.album.checked) neu.album = 'false';
      const ziel = `content/news/${neu.date || heute()}-${slug(neu.title) || 'beitrag'}.md`;
      return { neu, ziel, text: stringify(neu, $('[data-md]', form).value).replace('album: "false"', 'album: false') };
    };
    // Vorschau des Beitrags – auch als Entwurf (dafür in der Vorschau das Entwurf-Kennzeichen weglassen)
    vorschau.zeige({
      titel: 'Beitrag',
      url: () => `/news/${slug(form.title.value.trim()) || 'beitrag'}/`,
      dateien: () => {
        const { ziel, text } = stand();
        const d = { [ziel]: text.replace(/^entwurf: true\n/m, '') };
        if (pfad && pfad !== ziel) d[pfad] = null;
        return d;
      },
    });

    const save = async () => {
      if (!form.reportValidity()) return false;
      const { ziel, text } = stand();
      try {
        await schreiben(ziel, text, pfad);
        geaendert = false;
        await nachDemSpeichern();
        if (ziel !== pfad) {
          pfad = ziel;
          history.replaceState(null, '', `#news/${encodeURIComponent(ziel)}`);
          aktuellerHash = location.hash;
          if (!form.querySelector('[data-delete]')) form.querySelector('.ed-actions').insertAdjacentHTML('beforeend', '<button class="btn btn-danger" type="button" data-delete>Löschen</button>');
          bindeLoeschen();
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
    const bindeLoeschen = () =>
      form.querySelector('[data-delete]')?.addEventListener('click', async () => {
        if (!confirm(`„${form.title.value}“ wirklich löschen?`)) return;
        await api(`/__api/delete?path=${encodeURIComponent(pfad)}`, { method: 'POST' });
        alleCache = null;
        geaendert = false;
        await nachDemSpeichern('Beitrag gelöscht.');
        location.hash = 'news';
      });
    bindeLoeschen();
  }

  // =========================================================================
  // Seiten der Website: alle Bausteine einer Seite untereinander + Live-Vorschau
  // =========================================================================
  let trainerNamen = [];
  /** Namen aller Trainer (für das Feld „Leitung“ bei den Trainingszeiten). */
  async function ladeTrainerNamen() {
    const v = JSON.parse(await lesen('data/vorstand.json'));
    trainerNamen = (Array.isArray(v.trainer) ? v.trainer : (v.personen || []).filter((p) => p.trainer)).map((p) => p.name);
  }

  async function seiteEditor(id) {
    const def = SEITEN[id];
    const label = menueLabel(id);
    // Jede Datei nur einmal laden – mehrere Bausteine können dieselbe Datei bearbeiten (z. B. Vereinsdaten)
    const dateien = {};
    for (const b of def.bloecke) {
      if (!b.datei || dateien[b.datei]) continue;
      const text = await lesen(b.datei);
      dateien[b.datei] = b.datei.endsWith('.json') ? { art: 'json', original: text, daten: JSON.parse(text) } : { art: 'md', original: text, ...parse(text) };
    }
    if (dateien['data/training.json']) await ladeTrainerNamen();

    main.innerHTML = `${handyHinweis(id)}<p class="ed-pfad">Website › ${esc(label)}</p><h1>${esc(label)}</h1>${def.info ? `<p class="muted">${def.info}</p>` : ''}
      <form class="ed-form ed-seite"></form>`;
    const form = $('form', main);
    for (const b of def.bloecke) {
      const sec = document.createElement('section');
      sec.className = 'ed-block';
      if (b.ziel) sec.dataset.ziel = b.ziel;
      sec.innerHTML = `<h2 class="ed-block-titel">${esc(b.titel)}</h2>${b.hilfe ? `<p class="ed-block-hilfe">${esc(b.hilfe)}</p>` : ''}`;
      if (b.verweis) {
        sec.classList.add('ed-block--auto');
        sec.insertAdjacentHTML(
          'beforeend',
          `<p class="ed-block-links"><a class="btn btn-small btn-secondary" href="#${b.verweis}">${esc(b.verweisText)} →</a>${b.verweis2 ? ` <a class="btn btn-small btn-secondary" href="#${b.verweis2}">${esc(b.verweisText2)} →</a>` : ''}</p>`
        );
      } else if (dateien[b.datei].art === 'md') {
        sec.appendChild(textBlock(dateien[b.datei], b.kopf));
      } else {
        const d = dateien[b.datei].daten;
        const box = document.createElement('div');
        box.className = 'ed-form';
        if (b.felder) {
          for (const k of b.felder) {
            if (!(k in d)) d[k] = ''; // neues Feld (z. B. bei älteren Dateien) – wird beim Speichern ergänzt
            box.appendChild(feld(d[k], k, (v) => (d[k] = v), d));
          }
        } else box.appendChild(feld(d, null, (v) => Object.assign(d, v)));
        sec.appendChild(box);
      }
      form.appendChild(sec);
    }
    form.insertAdjacentHTML('beforeend', '<div class="ed-actions ed-actions--fest"><button class="btn btn-primary" type="submit">Speichern</button><button class="btn btn-secondary ed-nur-handy" type="button" data-vorschau-handy>Vorschau</button><span class="muted small ed-nur-gross">Änderungen sehen Sie sofort rechts in der Vorschau.</span></div>');
    requestAnimationFrame(() => wachse(form));

    // Klick/Fokus in einen Baustein → in der Vorschau an die passende Stelle springen
    form.addEventListener('focusin', (e) => {
      if (e.target.matches('a')) return;
      const blk = e.target.closest('[data-ziel]');
      if (blk) vorschau.stelle(blk.dataset.ziel);
    });
    form.addEventListener('pointerdown', (e) => {
      if (e.target.closest('a, button')) return; // Knöpfe (z. B. „News bearbeiten“) sollen sofort reagieren
      const blk = e.target.closest('[data-ziel]');
      if (blk) vorschau.stelle(blk.dataset.ziel);
    });

    // Aktueller Stand aller Dateien dieser Seite
    const inhalte = () =>
      Object.fromEntries(
        Object.entries(dateien).map(([p, d]) => [p, d.art === 'json' ? JSON.stringify(sortiert(p, d.daten), null, 2) + '\n' : stringify(d.data, d.body)])
      );
    vorschau.zeige({ url: def.url, titel: label, dateien: inhalte });

    const save = async () => {
      try {
        for (const [p, text] of Object.entries(inhalte())) {
          if (text === dateien[p].original) continue; // unverändert → nicht schreiben
          if (p.endsWith('.json')) JSON.parse(text);
          await schreiben(p, text);
          dateien[p].original = text;
        }
        geaendert = false;
        await nachDemSpeichern();
        // Sortierte Reihenfolge (Termine, Trainingszeiten) sofort anzeigen
        if (dateien['data/termine.json'] || dateien['data/training.json']) seiteEditor(id);
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

  /** Termine nach Datum, Trainingszeiten nach Wochentag + Uhrzeit sortieren. */
  function sortiert(pfad, daten) {
    if (pfad === 'data/termine.json' && Array.isArray(daten.termine)) daten.termine.sort((x, y) => String(x.datum).localeCompare(String(y.datum)));
    if (pfad === 'data/training.json' && Array.isArray(daten.zeiten))
      daten.zeiten.sort((x, y) => WOCHENTAGE.indexOf(x.tag) - WOCHENTAGE.indexOf(y.tag) || String(x.von).localeCompare(String(y.von)));
    return daten;
  }

  /** Textbaustein einer Seite: Überschrift(en) + Text mit Werkzeugleiste; Suchmaschinen-Beschreibung aufklappbar. */
  function textBlock(d, kopf = [['title', 'Seitentitel']]) {
    const box = document.createElement('div');
    box.className = 'ed-form';
    box.innerHTML = `${kopf.map(([k, l]) => `<label class="ed-field"><span>${esc(l)}</span><input data-kopf="${k}" value="${esc(d.data[k] || '')}"></label>`).join('')}
      ${textEditor(d.body)}
      <details class="ed-mehr"><summary>Weitere Angaben (für Suchmaschinen)</summary>
        <label class="ed-field"><span>Kurzbeschreibung der Seite</span><input data-kopf="beschreibung" value="${esc(d.data.beschreibung || '')}"><small>Erscheint z. B. bei Google unter dem Seitentitel.</small></label>
      </details>`;
    box.addEventListener('input', (e) => {
      const k = e.target.dataset.kopf;
      if (k) d.data[k] = e.target.value;
      if (e.target.matches('[data-md]')) d.body = e.target.value;
    });
    initTextEditor(box, (wert) => (d.body = wert));
    return box;
  }

  // =========================================================================
  // Texteditor mit Werkzeugleiste
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
      <textarea class="ed-text" data-md spellcheck="true" lang="de">${esc(text)}</textarea>
      <small>Tipp: Mehrere Bilder direkt hintereinander (ohne Text dazwischen) werden automatisch zur Bildergalerie – ab 3 Fotos auch zum Album im Fotoalbum.</small>
    </div>`;
  }

  /** Werkzeugleiste anbinden. nachher(wert) wird nach Einfügungen aufgerufen. */
  function initTextEditor(container, nachher = () => {}) {
    const ta = $('[data-md]', container);
    const insert = (before, after = '', placeholder = '') => {
      const { selectionStart: s, selectionEnd: e, value } = ta;
      const sel = value.slice(s, e) || placeholder;
      ta.setRangeText(before + sel + after, s, e, 'end');
      ta.focus();
      nachher(ta.value);
      beiEingabe();
    };
    container.querySelector('.ed-toolbar').addEventListener('click', (ev) => {
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
  // Formularfelder aus JSON-Daten
  // =========================================================================
  /** Überschrift einer Person in der Liste, z. B. „Marius Schulz · Vorstand + Trainer“. */
  function personTitel(p) {
    const rollen = [p.vorstand && `Vorstand (${p.vorstand})`, p.trainer && 'Trainer'].filter(Boolean);
    return `${p.name || 'Neue Person'} · ${rollen.join(' + ') || 'ohne Rolle'}`;
  }

  /** Überschrift eines Listeneintrags, z. B. „Montag 16:00–17:00 · Kindertraining“. */
  function eintragTitel(item, i) {
    if (typeof item !== 'object' || !item) return String(item || `Eintrag ${i + 1}`);
    if (item.tag) return `${item.tag} ${item.von ? `${item.von}–${item.bis}` : 'ganztags'} · ${item.gruppe || item.art || 'neue Belegung'}`;
    if ('datum' in item && 'titel' in item) return `${item.datum || 'ohne Datum'} · ${item.titel || 'neuer Termin'}`;
    if ('gruppe' in item && 'betrag' in item) return `${item.gruppe || 'neue Gruppe'} · ${item.betrag} €`;
    if ('name' in item && ('vorstand' in item || 'trainer' in item)) return personTitel(item);
    return item.titel || item.name || item.frage || (item.text ? String(item.text).slice(0, 60) : '') || `Eintrag ${i + 1} (neu)`;
  }

  /**
   * Baut rekursiv ein Formular für einen JSON-Wert.
   * set(neuerWert) schreibt Änderungen zurück ins Datenobjekt; parent ist das übergeordnete Objekt.
   */
  /** Beschriftung + Erklärung, wenn ein Feldname je nach Datei etwas anderes bedeutet. */
  function besonders(key, parent) {
    if (key === 'hinweis' && parent && Array.isArray(parent.termine))
      return ['Infobox oben auf der Seite „Termine“ (optional)', 'Erscheint als farbiger Kasten über der Terminliste, z. B. „Die Termine für 2027 folgen im Januar.“ Leer lassen = kein Kasten.'];
    if (key === 'hinweise' && parent && Array.isArray(parent.zeiten))
      return ['Hinweise (grüne Kästen über dem Wochenplan)', 'z. B. „Es steht immer ein Platz zum freien Spielen zur Verfügung.“'];
    if (key === 'hinweis' && parent && 'tag' in parent) return ['Zusatz (optional)', 'Kurzer Zusatz, z. B. „ggf. anmelden“ – nur in der ausführlichen Ansicht sichtbar.'];
    if (key === 'gruppe' && parent && 'tag' in parent) return ['Gruppe', 'z. B. „Kindertraining“ – nur in der ausführlichen Ansicht sichtbar.'];
    if (key === 'leitung' && parent && 'tag' in parent) return ['Verantwortlich', 'Nur in der ausführlichen Ansicht sichtbar.'];
    if (key === 'art' && parent && 'tag' in parent) return ['Art der Belegung', 'In der anonymen Ansicht steht nur dies (und die Zahl belegter Plätze).'];
    if (key === 'anzeige') return ['Ansicht auf der Website', 'Ausführlich: mit Gruppen und Verantwortlichen (wie früher). Anonym: nur, wann wie viele Plätze belegt sind – Trainingszeiten werden zusammengerechnet, die Kinder-Trainingszeiten verschwinden von „Kinder & Jugend“.'];
    if (key === 'verwendungszweck') return ['Verwendungszweck', 'Teile in geschweiften Klammern (z. B. {Jahr}, {Vorname Nachname}) erscheinen als Platzhalter zum Ausfüllen.'];
    if (key === 'hinweis' && parent && 'betrag' in parent) return ['Zusatz (optional)', 'Kurzer Hinweis zur Gruppe, z. B. „bis zu 50 € zurück für Arbeitsstunden“'];
    if (key === 'titel' && parent && Array.isArray(parent.zeiten)) return ['Überschrift des Wochenplans', 'z. B. „Platzbelegung 2027“ – zu Saisonbeginn anpassen.'];
    return null;
  }

  function feld(wert, key, set, parent) {
    const extra = key ? besonders(key, parent) : null;
    const label = extra ? extra[0] : key ? LABELS[key] || key.replace(/_/g, ' ') : '';
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
        if (istTraining && ['tag', 'von', 'bis', 'art', 'plaetze'].includes(k)) {
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
    //      Kurze Listen (z. B. Beiträge, Links, Hinweise) als immer offene Zeilen ohne Aufklappen
    if (Array.isArray(wert)) {
      const kompakt = KOMPAKT.has(key) || (wert.length > 0 && wert.every((x) => typeof x !== 'object'));
      wrap.className = 'ed-field';
      // Bei längeren Listen zusätzlich oben einen „Hinzufügen“-Knopf – man muss nicht bis ans Ende scrollen
      const obenKnopf = wert.length > 3 ? '<p class="ed-add-oben"><button type="button" class="btn btn-small btn-secondary" data-add>+ Hinzufügen</button></p>' : '';
      wrap.innerHTML = `<span>${esc(label)}</span>${extra ? `<small>${esc(extra[1])}</small>` : ''}${obenKnopf}<div class="ed-items${kompakt ? ' ed-items--kompakt' : ''}"></div><p><button type="button" class="btn btn-small btn-secondary" data-add>+ Hinzufügen</button></p>`;
      const items = $('.ed-items', wrap);
      // offen = Indizes der aufgeklappten Einträge – bleibt beim Verschieben erhalten
      let offen = new Set();
      const merkeOffen = () => {
        offen = new Set();
        [...items.children].forEach((d, i) => d.open && offen.add(i));
      };
      const tausche = (a, b) => {
        merkeOffen();
        [wert[a], wert[b]] = [wert[b], wert[a]];
        const oa = offen.has(a);
        const ob = offen.has(b);
        offen.delete(a);
        offen.delete(b);
        if (oa) offen.add(b);
        if (ob) offen.add(a);
        geaendert = true;
        render();
        aenderung();
      };
      const werkzeuge = '<span class="ed-item-tools"><button type="button" title="Nach oben" data-up>↑</button><button type="button" title="Nach unten" data-down>↓</button><button type="button" title="Entfernen" data-del>✕</button></span>';
      const render = () => {
        items.innerHTML = '';
        wert.forEach((item, i) => {
          let d;
          const inner = feld(item, null, (v) => (wert[i] = v), wert); // Einträge brauchen keine eigene Beschriftung
          if (kompakt) {
            d = document.createElement('div');
            d.className = 'ed-item ed-item--kompakt';
            inner.className = typeof item === 'object' ? 'ed-item-felder ed-row' : 'ed-item-felder';
            d.appendChild(inner);
            d.insertAdjacentHTML('beforeend', werkzeuge);
          } else {
            d = document.createElement('details');
            d.className = 'ed-item';
            d.open = offen.has(i);
            d.innerHTML = `<summary><span class="ed-item-title"><span class="ed-chevron" aria-hidden="true">›</span><span data-titel>${esc(eintragTitel(item, i))}</span></span>${werkzeuge}</summary>`;
            if (typeof item === 'object') inner.className = 'ed-group';
            d.appendChild(inner);
            // Titel beim Tippen aktualisieren; Textfelder beim Aufklappen auf Inhaltshöhe bringen
            const titel = () => ($('[data-titel]', d).textContent = eintragTitel(wert[i], i));
            d.addEventListener('input', titel);
            d.addEventListener('change', titel);
            d.addEventListener('toggle', () => d.open && wachse(d));
          }
          // Klick auf ↑ ↓ ✕ darf den Eintrag nicht auf- oder zuklappen
          $('[data-up]', d).onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (i > 0) tausche(i, i - 1);
          };
          $('[data-down]', d).onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (i < wert.length - 1) tausche(i, i + 1);
          };
          $('[data-del]', d).onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!confirm('Diesen Eintrag entfernen?')) return;
            merkeOffen();
            wert.splice(i, 1);
            offen = new Set([...offen].filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)));
            geaendert = true;
            render();
            aenderung();
          };
          items.appendChild(d);
        });
        requestAnimationFrame(() => wachse(items));
      };
      render();
      const hinzufuegen = (knopfOben) => {
        // Neuer Eintrag = leere Kopie des ersten Eintrags (gleiche Felder)
        const vorlage = wert[0];
        const leer = (v, k) =>
          Array.isArray(v) ? [] : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([kk, x]) => [kk, leer(x, kk)])) : typeof v === 'boolean' ? false : typeof v === 'number' ? (k === 'plaetze' ? 1 : 0) : k === 'tag' ? 'Montag' : '';
        // Gästebuch & Alben: neueste oben. Termine/Trainingszeiten (werden beim Speichern ohnehin sortiert):
        // dort einfügen, wo der Knopf ist. Sonst unten anhängen.
        const oben = ['eintraege', 'alben'].includes(key) || (knopfOben && ['termine', 'zeiten'].includes(key));
        const neu = vorlage !== undefined ? leer(vorlage) : '';
        merkeOffen();
        if (oben) {
          wert.unshift(neu);
          offen = new Set([0, ...[...offen].map((x) => x + 1)]);
        } else {
          wert.push(neu);
          offen.add(wert.length - 1);
        }
        geaendert = true;
        render();
        aenderung();
        const neuEl = items.children[oben ? 0 : wert.length - 1];
        neuEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        neuEl?.querySelector('input, textarea, select')?.focus({ preventScroll: true });
      };
      $$(':scope > p > [data-add]', wrap).forEach((b) => (b.onclick = () => hinzufuegen(!!b.closest('.ed-add-oben'))));
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
    const hilfeText = extra ? extra[1] : HILFE[key] && !(parent && 'von' in parent) ? HILFE[key] : '';
    const hilfe = hilfeText ? `<small>${esc(hilfeText)}</small>` : '';

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
    if (key === 'anzeige') input = `<select>${[['anonym', 'Anonym – nur belegte Plätze'], ['ausfuehrlich', 'Ausführlich – mit Gruppen und Verantwortlichen']].map(([v, t]) => `<option value="${v}"${v === wert ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
    else if (key === 'art' && parent && 'plaetze' in parent) input = `<select>${(ARTEN.includes(wert) ? ARTEN : [wert, ...ARTEN]).map((t) => `<option${t === wert ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
    else if (key === 'tag') input = `<select>${WOCHENTAGE.map((t) => `<option${t === wert ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
    // „von/bis“ bei Trainingszeiten = Uhrzeit, „bis“ beim Banner = Datum
    else if (key === 'uhrzeit' || ((key === 'von' || key === 'bis') && parent && 'von' in parent))
      input = `<input type="time" step="900" value="${esc(String(wert).replace('.', ':'))}">`;
    else if (DATUM.test(key || '')) input = `<input type="date" value="${esc(wert)}">`;
    else if (typeof wert === 'number') input = `<input type="number" min="0" value="${esc(wert)}">`;
    else if (LANG.test(key || '') || (key === 'text' && !(parent && 'bis' in parent)) || String(wert).length > 90) input = `<textarea class="ed-auto" rows="3">${esc(wert)}</textarea>`;
    else input = `<input value="${esc(wert)}">`;
    const upload = BILD.test(key || '') ? '<button type="button" class="btn btn-small btn-secondary" data-upload>Hochladen</button>' : '';
    const zusatz = key === 'von' ? '<small>leer = ganztags</small>' : '';
    wrap.innerHTML = `<span>${esc(label)}</span>${upload ? `<span class="ed-inline">${input}${upload}</span>` : input}${hilfe}${zusatz}`;
    const el = $('input, textarea, select', wrap);
    const update = () => set(typeof wert === 'number' ? Number(el.value) : el.value);
    el.addEventListener('input', update);
    el.addEventListener('change', update);
    if (el.classList.contains('ed-auto')) el.addEventListener('input', () => wachse(el));
    $('[data-upload]', wrap)?.addEventListener('click', () =>
      waehleDatei('image/*', (url) => {
        el.value = url;
        set(url);
      })
    );
    return wrap;
  }

  // Los geht's – erst jetzt, damit alle Funktionen und Einstellungen oben bereitstehen
  route();
  if (SERVER) {
    if (sessionStorage.getItem('redaktion-schwach')) setTimeout(() => toast('Tipp: Bitte oben über „Passwort ändern“ ein sicheres Passwort (mind. 10 Zeichen) wählen.'), 1500);
    // Einmal am Tag beim ersten Anmelden alles neu erzeugen (vergangene Termine, News-Archiv …)
    if (ich?.stand !== heute()) veroeffentlichen().catch(() => {});
  }
})();
