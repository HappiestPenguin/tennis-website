/**
 * BSG Stahl Tennis – Komfortfunktionen im Browser.
 *
 * Die Seite funktioniert auch komplett ohne JavaScript. Dieses Skript ergänzt:
 *   1. Mobiles Menü
 *   2. „Heute auf der Anlage“: Training des heutigen Tages + aktuelles Wetter
 *   3. News nach Jahr filtern
 *   4. Vollbildansicht für Fotos (Zoom, Wischen, Pfeiltasten, Vorschaubilder)
 *   5. PDF-Betrachter
 *   6. Termine in den eigenen Kalender übernehmen / Kalender abonnieren
 *   7. Formular-Fenster (Gästebuch)
 *   8. Kleinigkeiten: E-Mail-Schutz, Anliegen vorauswählen, Formulare ohne Seitenwechsel
 *
 * Keine Cookies, kein Tracking, keine externen Bibliotheken.
 */

/** Basis-Pfad der Seite (leer, außer die Seite liegt in einem Unterordner wie /tennis-website). */
const basis = () => (document.querySelector('link[rel="stylesheet"][href$="/css/style.css"]')?.getAttribute('href') || '/css/style.css').replace(/\/css\/style\.css$/, '');

(() => {
  'use strict';
  const $ = (sel, el = document) => el.querySelector(sel);
  const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

  // =========================================================================
  // 1. Mobiles Menü
  // =========================================================================
  const menuBtn = $('.menu-button');
  const nav = $('#hauptnavigation');
  const header = $('.site-header');
  // Menü immer direkt unter der Kopfzeile beginnen lassen – auch wenn darüber noch
  // eine Leiste steht (z. B. „Vorschau“) und die Kopfzeile dadurch tiefer sitzt.
  const menuPosition = () => nav && header && nav.style.setProperty('top', `${Math.max(0, header.getBoundingClientRect().bottom)}px`);
  const setMenu = (open) => {
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    if (open) menuPosition();
    nav.classList.toggle('is-open', open);
    document.documentElement.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  menuBtn?.addEventListener('click', () => setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'));
  window.addEventListener('resize', () => nav?.classList.contains('is-open') && menuPosition());
  // Mit der Escape-Taste schließen; beim Wechsel auf die breite Ansicht ebenfalls
  document.addEventListener('keydown', (e) => e.key === 'Escape' && nav?.classList.contains('is-open') && (setMenu(false), menuBtn.focus()));
  matchMedia('(min-width: 1061px)').addEventListener?.('change', (m) => m.matches && setMenu(false));
  // Untermenü „Verein“ per Klick/Tipp öffnen (wichtig für Touch-Geräte)
  $$('.nav-toggle').forEach((t) =>
    t.addEventListener('click', () => {
      const group = t.closest('.nav-group');
      const open = !group.classList.contains('is-open');
      group.classList.toggle('is-open', open);
      t.setAttribute('aria-expanded', String(open));
    })
  );
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-group')) $$('.nav-group.is-open').forEach((g) => g.classList.remove('is-open'));
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $$('.nav-group.is-open').forEach((g) => g.classList.remove('is-open'));
  });

  // =========================================================================
  // 2. Heute auf der Anlage
  // =========================================================================
  const TAGE = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const heute = TAGE[new Date().getDay()];
  $$(`.day-card[data-day="${heute}"]`).forEach((d) => d.classList.add('is-today'));

  const todayCard = $('[data-today]');
  if (todayCard) {
    try {
      // Die Daten sind beim Bauen schon aufbereitet (Uhrzeit, Gruppe, Leitung · Plätze)
      const zeiten = JSON.parse($('[data-training]', todayCard).textContent).filter((z) => z.tag === heute);
      $('[data-today-day]', todayCard).textContent = heute;
      const list = $('[data-today-list]', todayCard);
      list.innerHTML = zeiten.length
        ? zeiten
            .map((z) => `<li><span class="t">${escapeHtml(z.zeit)}</span><span class="g">${escapeHtml(z.gruppe)}${z.belegt ? ' <b class="slot-badge">Anlage belegt</b>' : ''}${z.meta ? `<small>${escapeHtml(z.meta)}</small>` : ''}</span></li>`)
            .join('')
        : '<li class="muted">Heute kein Training – alle Plätze frei für Mitglieder.</li>';
    } catch {
      /* Trainingsdaten fehlen → statischer Hinweis bleibt stehen */
    }

    // Wetter: aktuelle Werte von unserem eigenen Server nachladen (kein Fremdanbieter!)
    const weather = $('[data-weather]', todayCard);
    if (weather && window.fetch) {
      fetch(basis() + '/wetter.json', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((w) => {
          if (!w) return;
          const set = (k, v) => $$(`[data-w="${k}"]`, weather).forEach((el) => (el.textContent = v));
          set('temperatur', w.temperatur);
          set('text', w.text);
          set('wind', w.wind);
          set('stand', w.stand.slice(11, 16));
          const platz = $('[data-w="platz"]', weather);
          platz.textContent = w.platz.text;
          platz.className = `court-status court-status--${w.platz.stufe}`;
        })
        .catch(() => {});
    }
  }

  // =========================================================================
  // 3. Nach Jahr filtern (News und Fotoalbum)
  // =========================================================================
  $$('.year-filter').forEach((bar) => {
    const ziel = bar.dataset.filter || '.news-card'; // was gefiltert wird (News-Karten oder Albumkarten)
    const chips = $$('button.chip', bar);
    chips.forEach((chip) =>
      chip.addEventListener('click', () => {
        chips.forEach((c) => {
          c.classList.toggle('is-active', c === chip);
          c.setAttribute('aria-pressed', String(c === chip));
        });
        const y = chip.dataset.year;
        $$(`${ziel}[data-year]`).forEach((el) => (el.hidden = y !== 'alle' && el.dataset.year !== y));
      })
    );
  });

  // =========================================================================
  // 4. Vollbildansicht für Fotos
  //    Klick/Tipp auf ein Foto öffnet es groß. Bedienung:
  //    ← → oder Wischen = blättern · Klick aufs Bild oder Lupe = Zoom · Esc = schließen
  // =========================================================================
  const lb = $('dialog.lightbox');
  if (lb && typeof lb.showModal === 'function') {
    const img = $('.lb-scroller img', lb);
    const scroller = $('.lb-scroller', lb);
    const caption = $('figcaption', lb);
    const counter = $('.lb-count', lb);
    const thumbs = $('.lb-thumbs', lb);
    const zoomBtn = $('.lb-zoom', lb);
    const original = $('.lb-original', lb);
    let group = [];
    let index = 0;

    const setZoom = (on, x = 0.5, y = 0.5) => {
      lb.classList.toggle('is-zoomed', on);
      zoomBtn.classList.toggle('is-active', on);
      zoomBtn.setAttribute('aria-label', on ? 'Verkleinern' : 'Vergrößern');
      // beim Hineinzoomen an die angeklickte Stelle springen
      if (on) requestAnimationFrame(() => {
        scroller.scrollLeft = (scroller.scrollWidth - scroller.clientWidth) * x;
        scroller.scrollTop = (scroller.scrollHeight - scroller.clientHeight) * y;
      });
    };

    const show = (i) => {
      index = (i + group.length) % group.length;
      const a = group[index];
      setZoom(false);
      img.classList.add('is-loading');
      img.onload = () => img.classList.remove('is-loading');
      img.src = a.getAttribute('href');
      img.alt = a.dataset.caption || '';
      caption.textContent = a.dataset.caption || '';
      counter.textContent = `${index + 1} / ${group.length}`;
      original.href = a.getAttribute('href');
      $$('button', thumbs).forEach((b, n) => {
        b.setAttribute('aria-selected', String(n === index));
        if (n === index) b.scrollIntoView({ block: 'nearest', inline: 'center' });
      });
      // nächstes Bild schon vorladen
      const next = group[(index + 1) % group.length];
      if (next) new Image().src = next.getAttribute('href');
    };

    const open = (a) => {
      group = $$('a[data-lightbox]', a.closest('.gallery') || document);
      thumbs.innerHTML = group
        .map((g, n) => `<button type="button" role="option" aria-label="Bild ${n + 1}"><img src="${g.querySelector('img')?.getAttribute('src') || g.getAttribute('href')}" alt="" loading="lazy"></button>`)
        .join('');
      $$('button', thumbs).forEach((b, n) => b.addEventListener('click', () => show(n)));
      lb.showModal();
      document.body.style.overflow = 'hidden';
      show(group.indexOf(a));
    };

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-lightbox]');
      if (!a || e.metaKey || e.ctrlKey) return; // Strg/Cmd-Klick öffnet weiterhin in neuem Tab
      e.preventDefault();
      open(a);
    });
    lb.addEventListener('close', () => {
      document.body.style.overflow = '';
      setZoom(false);
    });
    // „Als Diashow ansehen“ auf Albumseiten → mit dem ersten Foto starten
    $('[data-slideshow]')?.addEventListener('click', () => {
      const first = $('a[data-lightbox]');
      if (first) open(first);
    });
    $('.lb-close', lb).addEventListener('click', () => lb.close());
    $('.lb-prev', lb).addEventListener('click', () => show(index - 1));
    $('.lb-next', lb).addEventListener('click', () => show(index + 1));
    zoomBtn.addEventListener('click', () => setZoom(!lb.classList.contains('is-zoomed')));
    img.addEventListener('click', (e) => {
      const r = img.getBoundingClientRect();
      setZoom(!lb.classList.contains('is-zoomed'), (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    });
    // Klick in den dunklen Bereich schließt
    $('.lb-stage', lb).addEventListener('click', (e) => {
      if (e.target.classList.contains('lb-stage') || e.target === scroller) lb.close();
    });
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') show(index - 1);
      if (e.key === 'ArrowRight') show(index + 1);
    });
    // Wischen auf Touch-Geräten (nur wenn nicht gezoomt)
    let x0 = null;
    scroller.addEventListener('touchstart', (e) => (x0 = e.touches.length === 1 ? e.touches[0].clientX : null), { passive: true });
    scroller.addEventListener('touchend', (e) => {
      if (x0 === null || lb.classList.contains('is-zoomed')) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
      x0 = null;
    });
    // Mit gedrückter Maus verschieben, wenn gezoomt
    let drag = null;
    scroller.addEventListener('mousedown', (e) => {
      if (!lb.classList.contains('is-zoomed')) return;
      drag = { x: e.clientX, y: e.clientY, l: scroller.scrollLeft, t: scroller.scrollTop, moved: false };
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => {
      if (!drag) return;
      drag.moved = true;
      scroller.scrollLeft = drag.l - (e.clientX - drag.x);
      scroller.scrollTop = drag.t - (e.clientY - drag.y);
    });
    window.addEventListener('mouseup', () => setTimeout(() => (drag = null)));
    img.addEventListener('click', (e) => drag?.moved && e.stopImmediatePropagation(), true);
  }

  // =========================================================================
  // 5. PDF-Betrachter
  //    Am Computer öffnet sich das PDF in einem Fenster über der Seite.
  //    Auf Handy/Tablet öffnet es der eingebaute PDF-Viewer des Geräts (neuer Tab) –
  //    dort ist das die bequemste und schärfste Ansicht.
  // =========================================================================
  const dv = $('dialog.docviewer');
  const touchDevice = window.matchMedia('(hover: none), (max-width: 760px)').matches;
  if (dv && typeof dv.showModal === 'function' && !touchDevice) {
    const frame = $('iframe', dv);
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[data-doc]');
      if (!a || e.metaKey || e.ctrlKey || !/\.pdf(\?|#|$)/i.test(a.href)) return;
      e.preventDefault();
      const title = a.closest('.doc-card')?.querySelector('.doc-title')?.textContent || a.textContent.trim() || 'Dokument';
      $('.dv-title', dv).textContent = title;
      $('.dv-open', dv).href = a.href;
      $('.dv-download', dv).href = a.href;
      frame.src = a.href;
      dv.showModal();
      document.body.style.overflow = 'hidden';
    });
    $('.dv-close', dv).addEventListener('click', () => dv.close());
    dv.addEventListener('close', () => {
      frame.src = 'about:blank';
      document.body.style.overflow = '';
    });
  }

  // =========================================================================
  // 6. Kalender
  // =========================================================================
  // Einzelnen Termin als .ics-Datei herunterladen
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-ics]');
    if (!btn) return;
    const ev = JSON.parse(btn.closest('[data-ev]').dataset.ev);
    const d = ev.datum.replace(/-/g, '');
    const icsEsc = (s) => s.replace(/[\\;,]/g, (c) => '\\' + c);
    let when;
    if (/^\d{1,2}:\d{2}/.test(ev.uhrzeit)) {
      const [h, m] = ev.uhrzeit.split(':');
      when = `DTSTART;TZID=Europe/Berlin:${d}T${h.padStart(2, '0')}${m.slice(0, 2)}00\r\nDURATION:PT3H`;
    } else {
      const next = new Date(ev.datum + 'T12:00:00');
      next.setDate(next.getDate() + 1);
      when = `DTSTART;VALUE=DATE:${d}\r\nDTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, '')}`;
    }
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//BSG Stahl Tennis//DE', 'BEGIN:VEVENT',
      `UID:${ev.id}@bsg-tennis.de`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
      when,
      `SUMMARY:${icsEsc(ev.titel)} (BSG Stahl Tennis)`,
      `LOCATION:${icsEsc(ev.ort || 'Tennisanlage BSG Stahl, Waldstraße 1a, 15890 Eisenhüttenstadt')}`,
      ev.beschreibung ? `DESCRIPTION:${icsEsc(ev.beschreibung)}` : '',
      'END:VEVENT', 'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    link.download = `${ev.id}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  });

  // „Kalender abonnieren“ → webcal:// öffnet direkt die Kalender-App
  $$('[data-subscribe]').forEach((a) => {
    const url = new URL(a.getAttribute('href'), location.href);
    if (url.protocol === 'https:') a.href = url.href.replace(/^https:/, 'webcal:');
  });
  // Abo-Adresse beim Antippen kopieren
  $$('[data-copy]').forEach((input) => {
    const sub = $('[data-subscribe]');
    if (sub && location.protocol === 'https:') input.value = new URL(sub.getAttribute('href').replace(/^webcal:/, 'https:'), location.href).href;
    input.addEventListener('focus', () => {
      input.select();
      navigator.clipboard?.writeText(input.value).then(() => input.classList.add('is-copied')).catch(() => {});
    });
  });

  // =========================================================================
  // 7. Formular-Fenster (Gästebuch „Eintrag schreiben“)
  // =========================================================================
  $$('[data-open-dialog]').forEach((btn) => {
    const dlg = document.getElementById(btn.dataset.openDialog);
    if (!dlg || typeof dlg.showModal !== 'function') return;
    btn.addEventListener('click', () => {
      dlg.showModal();
      $('input:not([type=hidden])', dlg)?.focus();
    });
    $('[data-close-dialog]', dlg)?.addEventListener('click', () => dlg.close());
    dlg.addEventListener('click', (e) => e.target === dlg && dlg.close()); // Klick daneben schließt
    // Aufruf über /gaestebuch/#eintragen (z. B. von der Startseite) öffnet das Formular sofort
    if (location.hash === '#eintragen') btn.click();
  });

  // =========================================================================
  // 8. Kleinigkeiten
  // =========================================================================
  // E-Mail-Adressen stehen rückwärts im HTML und werden erst beim Klick sichtbar (Spamschutz)
  $$('[data-mail]').forEach((a) =>
    a.addEventListener('click', (e) => {
      const mail = a.dataset.mail.split('').reverse().join('');
      if (a.dataset.shown) return;
      e.preventDefault();
      a.href = 'mailto:' + mail;
      const label = a.querySelector('span') || a;
      label.textContent = mail;
      a.dataset.shown = '1';
    })
  );

  // Anliegen im Kontaktformular aus der Adresse vorauswählen (z. B. /kontakt/?anliegen=probetraining)
  const select = $('[data-anliegen]');
  const anliegen = new URLSearchParams(location.search).get('anliegen');
  if (select && anliegen && Array.from(select.options).some((o) => o.value === anliegen)) select.value = anliegen;

  // Formulare im Hintergrund absenden (die Seite bleibt stehen, Rückmeldung erscheint darunter)
  $$('form[data-form]').forEach((form) =>
    form.addEventListener('submit', async (e) => {
      if (!window.fetch || !/^https?:/.test(form.action)) return;
      e.preventDefault();
      const status = $('.form-status', form);
      const button = $('button[type=submit]', form);
      button.disabled = true;
      status.className = 'form-status';
      status.textContent = 'Wird gesendet …';
      try {
        const res = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error(String(res.status));
        form.reset();
        status.classList.add('is-ok');
        status.textContent = 'Vielen Dank! Ihre Nachricht ist bei uns angekommen.';
      } catch {
        status.classList.add('is-error');
        status.textContent = 'Das hat leider nicht geklappt. Bitte versuchen Sie es erneut oder schreiben Sie direkt an webmaster@bsg-tennis.de.';
      } finally {
        button.disabled = false;
      }
    })
  );

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }
})();
