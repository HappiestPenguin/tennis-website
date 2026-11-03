# BSG Stahl Tennis – Website

Website - Idee der Abteilung Tennis der BSG Stahl Eisenhüttenstadt e.V.

---

## Inhalte pflegen

### Möglichkeit 1 – Online-Redaktion
`https://www.bsg-tennis.de/admin/` → mit Zugangsdaten anmelden → News, Termine, Trainingszeiten, Vorstand, Fotos usw. bearbeiten → „Veröffentlichen“. Nach ca. 1 Minute ist die Änderung online. Funktioniert in allen aktuellen Browsern (Safari, Chrome, Firefox, Edge), am besten am Computer oder Tablet.

### Wie ein News-Beitrag aussieht
`content/news/2027-04-12-saisoneroeffnung.md`:
```markdown
---
title: "Saisoneröffnung 2027"
date: 2027-04-12
bild: /media/uploads/saisonstart.jpg
---
Am Samstag ist es so weit: **Saisoneröffnung** ab 13 Uhr!

> [!WICHTIG] Bitte mitbringen
> Sandplatzschuhe und gute Laune.

![Foto 1](/media/uploads/foto1.jpg) ![Foto 2](/media/uploads/foto2.jpg)

- [Einladung als PDF](/media/uploads/einladung.pdf)
```

**Besonderheiten im Text:**

| Eingabe | Ergebnis |
|---|---|
| Mehrere Bilder hintereinander | Bildergalerie mit Vollbildansicht (Zoom, Wischen, Vorschaubilder) |
| `[![Vorschau](bild.jpg)](datei.pdf)` | Dokument-Karte mit „Ansehen“ und „Herunterladen“ |
| Liste aus PDF-Links | Dokument-Karten (siehe Satzung) |
| `> [!WICHTIG]`, `> [!HINWEIS]`, `> [!TIPP]`, `> [!ACHTUNG]` | Farbige Hinweisbox |
| `ungefaehr: true` im Kopf | Datum wird nur als „Monat Jahr“ angezeigt |
| `entwurf: true` im Kopf | Beitrag wird nicht veröffentlicht |

---

## Was automatisch passiert

- **News-Archiv:** Die News-Seite zeigt die letzten **8 Jahre**. Ältere Beiträge wandern **jedes Jahr automatisch** ins Archiv (`/news/archiv/2018/` usw.) und werden für Suchmaschinen gesperrt. Einstellbar in `lib/content.mjs` (`NEWS_JAHRE`).
- **Termine:** Vergangene Termine rutschen von selbst nach unten in „Vergangene Termine“. Der Kalender zum Abonnieren (`/termine.ics`) wird automatisch erzeugt.
- **Wetter:** Wird beim Bauen von Open-Meteo abgerufen und als `/wetter.json` auf dem eigenen Server abgelegt (online stündlich). Besucher laden nichts von fremden Servern.
- **Startseite:** zeigt automatisch die 3 neuesten News, die nächsten Termine, das heutige Training und die neuesten Gästebucheinträge.
- **Kontaktkarten:** Für jede Person mit `kontakt_freigegeben: true` entsteht eine Karte mit Anrufen-/E-Mail-Knopf und „Kontakt speichern“ (vCard).
- **Alte Adressen:** `news.html`, `kontakt.html` usw. leiten auf die neuen Seiten weiter.

---

## Aufbau des Projekts

```
tennis-website/
├── content/
│   ├── news/              Ein News-Beitrag = eine Datei (JJJJ-MM-TT-titel.md)
│   └── seiten/            Seitentexte (Satzung, Geschichte, Impressum, Datenschutz …)
├── data/                  Strukturierte Daten (JSON)
│   ├── verein.json        Adresse, Kontakt, Mitgliederzahlen, Links
│   ├── termine.json       Termine
│   ├── training.json      Platzbelegung / Trainingszeiten
│   ├── vorstand.json      Vorstand & Trainer inkl. freigegebener Kontaktdaten
│   ├── galerie.json       Fotoalben
│   ├── gaestebuch.json    Freigegebene Gästebucheinträge
│   ├── unterstuetzer.json Sponsoren & Wege zu helfen
│   └── faq.json           Häufige Fragen
├── public/                Wird 1:1 veröffentlicht
│   ├── css/style.css      Gestaltung (gegliedert, kommentiert)
│   ├── js/main.js         Komfortfunktionen (Menü, Vollbildansicht, PDF-Betrachter, Kalender …)
│   ├── admin/             Online-Redaktion (Sveltia CMS, Einstellungen in config.yml)
│   └── media/             Bilder & PDFs (uploads/ = neue Dateien aus der Redaktion)
├── lib/                   Der Seitengenerator
│   ├── content.mjs        Inhalte einlesen, News-Archiv-Regel
│   ├── markdown.mjs       Markdown → HTML (Galerien, Dokument-Karten, Hinweisboxen)
│   ├── layout.mjs         Seitengerüst, Navigation, Fußbereich
│   ├── components.mjs     Bausteine (Karten, Terminliste, Kontaktkarte, Wetter …)
│   ├── pages.mjs          Vorlagen der einzelnen Seiten
│   ├── feeds.mjs          Kalender, RSS, Sitemap, vCards, Weiterleitungen
│   ├── weather.mjs        Wetter (datenschutzfreundlich beim Bauen)
│   └── helpers.mjs        Datum, Symbole, Hilfsfunktionen
├── tools/redaktion/       Lokale Redaktion (nur für npm run dev, wird nicht veröffentlicht)
├── scripts/medien-holen.mjs  Lädt Bilder/PDFs von der alten Seite
├── build.mjs              Baut alles nach dist/
└── serve.mjs              Vorschau-Server mit automatischem Neuladen
```
---

## Browser & Geräte

Getestet bzw. ausgelegt für: **Safari/iPhone/iPad ab iOS 15.4**, **Chrome, Edge, Samsung Internet, Firefox** in aktuellen Versionen – am Computer, Tablet und Handy. Ältere Browser bekommen einen Hinweis oben auf der Seite, die Inhalte bleiben lesbar.

---

## Befehle

| Befehl | Wirkung |
|---|---|
| `npm run dev` | Vorschau + lokale Redaktion |
| `npm run build` | Fertige Website nach `dist/` bauen |
| `npm run medien` | Bilder/PDFs von der alten Seite nach `public/media/` laden |
