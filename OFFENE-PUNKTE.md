# Offene Punkte – Neue Website BSG Stahl Tennis

Checkliste für den Fall, dass der Vorstand die neue Seite annimmt. Abhaken mit `[x]`.
Stand: November 2026

---

## 1. Entscheidungen des Vorstands

- [ ] **Annahme** der neuen Website beschließen
- [ ] **Hosting bei STRATO** (alles bleibt dort, kein GitHub-Konto für den Verein): Tarif festlegen, z. B. „Hosting Starter“ (ca. 60 €/Jahr, mit PHP und SSH). Vorher auf der STRATO-Rechnung nachsehen, was der Verein heute zahlt.
- [x] **Technik entschieden:** Bei Annahme wird die Seite als **PHP-Version komplett bei STRATO** betrieben – alle Änderungen sind sofort online, kein GitHub, kein Bauen auf einem Rechner. Umsetzung siehe Abschnitt 3.
- [ ] **Wer pflegt die Seite?** Mindestens zwei Personen mit Redaktionszugang benennen.
- [x] **Anrede einheitlich „Sie“** – auf allen Seiten umgestellt (Gästebuch-Einträge und alte Berichte bleiben wie geschrieben)
- [ ] **Kontaktformular-Verteilung:** An welche Adresse gehen Anfragen, und wer bekommt sie weitergeleitet? (Vorschlag: `kontakt@bsg-tennis.de` mit Weiterleitung an Vorstand/Trainer; optional Kinder-Anfragen direkt an die Trainer)
- [ ] **WhatsApp-Community** auf der Website verlinken? Wenn ja: Einladungslink öffentlich oder nur für Mitglieder?

## 2. Rechtliches (vor dem Livegang)

- [ ] **Impressum prüfen** (am einfachsten bei der Geschäftsstelle der BSG Stahl erfragen, die hat die Registerunterlagen):
  - **Wer vertritt den Verein?** Rechtlich ist der Gesamtverein „BSG Stahl Eisenhüttenstadt e.V.“ der Betreiber, die Abteilung Tennis ist kein eigener Verein. Ins Impressum gehört der **vertretungsberechtigte Vorstand nach § 26 BGB** laut Satzung des Hauptvereins (z. B. Vorsitzende/r und Stellvertreter). Derzeit stehen dort Detlef Engel und Jörg Harwardt; das stimmt nur, wenn sie diesen Vorstand bilden oder laut Satzung die Abteilung nach außen vertreten.
  - **Vereinsregister:** Eingetragen ist „Amtsgericht Eisenhüttenstadt, Nr. 143“. Vereine aus Eisenhüttenstadt werden heute beim **Amtsgericht Frankfurt (Oder)** mit einer „VR …“-Nummer geführt. Vermutlich ist der Eintrag veraltet: Gericht und Nummer prüfen (Vereinsregisterauszug oder Geschäftsstelle).
  - **Kontakt:** Telefon (Mobilnummer von Detlef Engel, mit seinem Einverständnis?), Telefax (gibt es das noch?), E-Mail `webmaster@bsg-tennis.de` (existiert das Postfach und liest es jemand?)
  - **Verantwortlich nach § 18 MStV** (für die News): eine Person mit Namen und Anschrift, derzeit Detlef Engel – zustimmen lassen.
- [ ] **Verantwortlicher nach § 18 MStV** (derzeit Detlef Engel) bestätigen
- [ ] **Datenschutzerklärung:** tatsächlichen Hosting-Anbieter eintragen (Abschnitt „Hosting“ ist markiert), Absatz „Nur falls GitHub Pages …“ ggf. löschen, danach den roten Hinweiskasten oben entfernen
- [ ] **Auftragsverarbeitungsvertrag (AVV)** abschließen mit form.taxi (Kontaktformular/Gästebuch) und dem Hosting-Anbieter (bei STRATO im Kundenlogin)
- [ ] **Einverständnis für Kontaktkarten** schriftlich (E-Mail genügt) von jeder Person, deren Telefon/E-Mail erscheint. Derzeit nur Detlef Engel freigeschaltet – bitte bestätigen lassen.
- [ ] **Fotos von Kindern:** Einwilligung der Eltern für veröffentlichte Fotos (z. B. Kinderturnier 2026). Empfehlung: Foto-Einwilligung in den Mitgliedsantrag aufnehmen. Bei neuen Berichten über Kinder nur Vornamen nennen.
- [ ] **Zeitungsausschnitte** („10 Jahre Vereinsheim“ 2020, „Dankeschön“ 2023) nur mit Erlaubnis der Zeitung online lassen, sonst PDFs entfernen

## 3. Technische Einrichtung

- [ ] **GitHub nur für die Testphase** (Maiks Konto). Nach dem Umzug zu STRATO wird es nicht mehr gebraucht: Testprojekt dann auf „privat“ stellen oder löschen.
- [ ] **PHP-Version der Seite bauen** (nach Annahme, Hoster STRATO):
  - Gleiches Design, gleiche Inhaltsdateien (News als Textdateien, Daten als JSON) – die vorhandenen Inhalte werden 1:1 übernommen
  - Seiten werden beim Aufruf von PHP erzeugt (mit Zwischenspeicher, damit die Seite schnell bleibt)
  - Automatisch wie bisher: Archiv nach 8 Jahren, vergangene Termine, Fotoalben aus Berichten, Wetter (stündlich vom Server abgerufen, keine Daten der Besucher an Dritte)
  - Kontaktformular und Gästebuch direkt über STRATO verschicken (form.taxi entfällt)
  - Alte Adressen weiterleiten, Kalender-Abo, RSS, Sitemap, Kontaktkarten wie bisher
- [ ] **Online-Redaktion mit echter Anmeldung (PHP)** – ersetzt die Testversion unter `/admin/` (Zugang `Bearbeiter1` / `Test1234`):
  - Anmeldung mit **E-Mail + Passwort**, Liste der berechtigten Personen auf dem Server (Passwörter nur verschlüsselt/gehasht gespeichert, nie im Seitencode)
  - Sperre nach mehreren Fehlversuchen, nur über HTTPS, Schutz gegen untergeschobene Formulare (CSRF), automatische Abmeldung
  - Jede Person hat eigene Zugangsdaten (kein Sammelpasswort); Austritt = Eintrag löschen
  - Speichern direkt auf dem Webspace → Änderung sofort online; Bilder/PDFs hochladen; automatische Sicherung vor jeder Änderung
  - Bedienung wie jetzt: Menü wie die Website, Bausteine je Seite, Live-Vorschau der echten Seite (die Vorschau-Technik im Browser bleibt erhalten)
  - Datenschutz: unkritisch (nur E-Mail-Adressen der Redakteure, Server in Deutschland); kurz in der Datenschutzerklärung ergänzen
- [ ] Bis dahin: Test-Zugang vor dem echten Livegang entfernen oder durch die PHP-Anmeldung ersetzen
- [ ] **Formulare (form.taxi) – nur für die Testphase nötig**, mit der PHP-Version entfällt form.taxi. Bis dahin: Kontaktformular und Gästebuch schicken ihre Eingaben über form.taxi (Server in der EU) per E-Mail weiter. Die bisherige Formular-Adresse wurde von der alten Seite übernommen.
  1. Klären, **wem das bestehende form.taxi-Konto gehört** und an welche Adresse es weiterleitet. Ist kein Zugang da: neues Konto mit einer Vereinsadresse anlegen (kostenloser Tarif reicht: 3 Formulare, 40 Einsendungen/Monat).
  2. Zwei Formulare anlegen (Kontakt, Gästebuch), **Empfänger** eintragen und bestätigen (z. B. `kontakt@bsg-tennis.de`, bei STRATO an die zuständigen Personen weiterleiten).
  3. Die neuen Formular-Adressen in der Redaktion unter **Vereinsdaten** eintragen.
  4. Im form.taxi-Konto den **Auftragsverarbeitungsvertrag** (Art. 28 DSGVO) abschließen und einstellen, dass gespeicherte Einsendungen nach kurzer Zeit gelöscht werden.
  5. Einmal testen: Nachricht absenden → kommt an? Gästebuch-Eintrag → kommt an?
- [ ] Prüfen, ob **webmaster@bsg-tennis.de** (steht im Impressum) existiert und gelesen wird
- [x] **Alle Bilder lokal** (geprüft: keine Verweise mehr auf die alte Seite). Bei neuen Inhalten bleibt das automatisch so.
- [ ] **Vorschau-Modus aus:** Die echte Seite ohne `VORSCHAU` bauen (sonst bleibt sie für Google gesperrt)
- [ ] **Domain umstellen:** www.bsg-tennis.de und bsg-tennis.de auf den neuen Speicherort zeigen lassen. **Die E-Mail-Einträge (MX) dabei nicht anfassen**, sonst kommen keine Vereins-Mails mehr an. Bei STRATO: Domain auf das Hosting-Paket legen und das kostenlose SSL-Zertifikat (HTTPS) aktivieren.
- [ ] Nach der Umstellung testen: alte Adressen (z. B. `/index.html`, alte Unterseiten) leiten richtig weiter, Kontaktformular und Gästebuch kommen an, Kalender-Abo funktioniert
- [ ] **Alte Seite abschalten** bzw. STRATO-Tarif anpassen (damit verschwinden auch die Fremd-Skripte der alten Seite)
- [ ] Optional: Seite bei der Google Search Console anmelden, damit die neue Struktur schnell gefunden wird

## 4. Inhalte prüfen und aktualisieren

- [ ] **Vorstand & Ansprechpartner:** Namen und Funktionen aktuell? (Detlef Engel, Tom Fanter, Jörg Harwardt, Marius Schulz)
- [x] **Trainer:** Hans Dudek in die Trainerliste aufgenommen, Donnerstag (Herren) Detlef Engel zugeordnet
- [x] Schreibweise **Hans Dudek** bestätigt und in alten Berichten vereinheitlicht
- [ ] **Beiträge** (gültig seit 2023) noch aktuell? Pflege jetzt an einer Stelle: Redaktion → Vereinsdaten → Mitgliedsbeiträge
- [ ] **Mitgliedsantrag (PDF)**, Satzung und Abteilungsordnung: neueste Fassung?
- [ ] **Winterpause-Banner:** Enddatum (derzeit 31.03.2027) an den tatsächlichen Saisonstart anpassen
- [ ] **Termine 2027** eintragen, sobald bekannt
- [ ] **Unterstützer-Liste** aktuell? Optional Logos (nur mit Erlaubnis der Firmen)
- [ ] **Häufige Fragen** einmal durchlesen und Antworten bestätigen
- [ ] **Geschichte:** Fakten und Jahreszahlen gegenlesen

## 5. Jährliche Routine (für die Redaktion)

| Wann | Was | Wo in der Redaktion |
|---|---|---|
| Januar | Mitgliederzahlen + Stand-Datum | Vereinsdaten |
| Vor Saisonbeginn | Trainingszeiten und Titel „Platzbelegung 20xx“ | Trainingszeiten |
| Vor Saisonbeginn | Winterpause-Banner entfernen / neuen Hinweis setzen | Vereinsdaten → Hinweis-Banner |
| Laufend | Termine eintragen, Berichte schreiben | Termine, News |
| Bei Änderung | Beiträge, Vorstand, Trainer, Unterstützer | jeweiliger Bereich |
| Saisonende | Banner „Winterpause“ setzen | Vereinsdaten |

Automatisch, ohne Zutun: News älter als 8 Jahre wandern ins Archiv, vergangene Termine werden einsortiert, Fotoalben entstehen aus Berichten mit mindestens 3 Fotos, Wetter aktualisiert sich stündlich.

> Nur in der Testphase auf GitHub: GitHub pausiert die stündliche Aktualisierung nach 60 Tagen ohne Änderung (unter „Actions“ wieder einschalten). Bei der PHP-Version auf STRATO entfällt das.

## 6. Optionale Erweiterungen (später)


- [ ] Knopf „Der WhatsApp-Community beitreten“ (+ QR-Code) und in der Redaktion „Beitrag in WhatsApp teilen“
- [ ] Kontaktformular nach Anliegen an verschiedene Empfänger verteilen
- [ ] Sponsorenlogos
- [ ] Mitgliedsantrag als Online-Formular statt PDF
- [ ] Online-Platzbuchung (nur falls Plätze knapp werden)
- [ ] Ergebnisse der Herrenmannschaft per Link zu nuLiga/TVBB
