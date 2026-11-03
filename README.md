# BSG Stahl Tennis – Website

Website der Abteilung Tennis der BSG Stahl Eisenhüttenstadt e.V. – schnell, modern, datenschutzfreundlich und **ohne Wartungsaufwand** (keine Datenbank, kein PHP, keine Plugins, keine fremden Pakete).

Alle Inhalte der alten Seite sind übernommen: 115 News seit 2012, Fotoalbum, Turnierberichte, Gästebuch, Termine, Trainingsplan, Satzung, Geschichte.

---

## Schnellstart (Mac)

1. **Node.js installieren** (einmalig): <https://nodejs.org> → „LTS“.
2. Terminal öffnen:
   ```bash
   cd ~/Github/tennis-website
   npm run medien   # einmalig: Bilder & PDFs von der alten Seite holen
   npm run dev      # Vorschau starten
   ```
3. Im Browser öffnen:
   - **Website:** <http://localhost:4321>
   - **Lokale Redaktion:** <http://localhost:4321/redaktion/> – funktioniert in **jedem Browser, auch Safari**

`npm install` ist nicht nötig – es gibt keine Abhängigkeiten.

---

## Inhalte pflegen

### Möglichkeit 1 – Online-Redaktion (für den Vorstand, nach Veröffentlichung)
`https://www.bsg-tennis.de/admin/` → mit GitHub anmelden → News, Termine, Trainingszeiten, Vorstand, Fotos usw. bearbeiten → „Veröffentlichen“. Nach ca. 1 Minute ist die Änderung online. Funktioniert in allen aktuellen Browsern (Safari, Chrome, Firefox, Edge), am besten am Computer oder Tablet.

### Möglichkeit 2 – Lokale Redaktion (auf deinem Rechner)
`npm run dev` → <http://localhost:4321/redaktion/>. Gleiche Bereiche, speichert direkt in die Projektdateien, Vorschau aktualisiert sich sofort.
> Unter `localhost:4321/admin/` startet die Online-Redaktion im Chrome/Edge-Modus „lokales Repository“. Safari und Firefox können das technisch nicht (fehlende Dateisystem-Schnittstelle) und werden deshalb automatisch zur lokalen Redaktion umgeleitet.

### Möglichkeit 3 – Dateien direkt bearbeiten
Alles sind einfache Textdateien (siehe Aufbau unten).

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

## Veröffentlichen (Vorschlag)

1. Projekt in ein GitHub-Repository des Vereins hochladen (kostenlos).
2. In `public/admin/config.yml` bei `repo:` den Repository-Namen eintragen.
3. Repository → Settings → Pages → Source: „GitHub Actions“. Ab dann baut `.github/workflows/deploy.yml` die Seite bei jeder Änderung und stündlich (Wetter) neu.
4. Domain `bsg-tennis.de` beim bisherigen Anbieter per DNS auf GitHub Pages umstellen.
5. Vorstandsmitglieder als Mitarbeiter ins Repository einladen – sie melden sich dann unter `/admin/` an.

### Login für die Online-Redaktion (`/admin/`)

Auf einer statischen Website lässt sich kein Passwort sicher hinterlegen: Alles, was im Seitencode steht, kann jeder lesen. Die Anmeldung läuft deshalb über **GitHub-Konten**:

- Jede Person, die Inhalte pflegen soll, legt ein kostenloses GitHub-Konto an (Benutzername + Passwort + Bestätigung per App/SMS) und wird ins Repository eingeladen. Austritt = Einladung entfernen.
- Alternativ ein gemeinsames Vereinskonto (z. B. „bsg-tennis-redaktion“), dessen Zugangsdaten der Vorstand weitergibt. Einfacher, aber man sieht nicht, wer was geändert hat.
- Für den Knopf „Mit GitHub anmelden“ braucht es einmalig den kostenlosen [Sveltia CMS Authenticator](https://github.com/sveltia/sveltia-cms-auth) (ca. 15 Minuten Einrichtung, Adresse danach in `config.yml` unter `backend: base_url:` eintragen). Ohne ihn geht die Anmeldung auch per Zugangsschlüssel („Personal Access Token“) – das ist aber für Laien umständlicher.

Die **lokale Redaktion** (`npm start` → `/redaktion/`) braucht keinen Login: Sie läuft nur auf dem eigenen Rechner und ist von außen nicht erreichbar.

### Vorschau-/Testversion (z. B. `maik.bsg-tennis.de`)

1. Eigenes GitHub-Repository anlegen und den Projektordner hochladen (z. B. mit GitHub Desktop).
2. Settings → Pages → Source: „GitHub Actions“.
3. Settings → Secrets and variables → Actions → **Variables**: `VORSCHAU` = `1`.
   - Ohne eigene Adresse: `BASE_PATH` = `/tennis-website` → Seite unter `https://NAME.github.io/tennis-website/`.
   - Mit eigener Adresse: `SITE_URL` = `https://maik.bsg-tennis.de`, unter Settings → Pages bei „Custom domain“ `maik.bsg-tennis.de` eintragen und beim Domain-Anbieter (STRATO) einen DNS-Eintrag anlegen: Subdomain `maik`, Typ **CNAME**, Ziel `NAME.github.io`.
4. Im Vorschau-Modus zeigt jede Seite oben „Vorschau der neuen Website“, und Suchmaschinen werden komplett ausgesperrt (kein doppelter Inhalt neben der echten Seite).

> Hinweis: Das Repository muss für kostenloses GitHub Pages öffentlich sein. Darin stehen nur Inhalte, die ohnehin auf der Website sichtbar sind – Kontaktdaten deshalb weiterhin nur mit Einverständnis eintragen.

> Hinweis: GitHub pausiert zeitgesteuerte Abläufe, wenn ein Repository 60 Tage lang nicht geändert wurde. Jede Änderung (z. B. ein News-Beitrag) setzt das zurück; sonst unter „Actions“ einmal auf „Enable“ klicken.

Alternativ läuft der Ordner `dist/` (Ergebnis von `npm run build`) auf **jedem** Webspace (z. B. ein deutscher Anbieter per FTP) – ohne PHP und Datenbank. Dann wird das Wetter nur bei jedem Hochladen aktualisiert.

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
