# Vorschlag: Neue Website für die Abteilung Tennis

_Zur Vorlage beim Abteilungsvorstand – Stand November 2026_

## Warum eine neue Website?

Die bisherige Seite läuft auf einem alten Baukasten (Livepages) mit Tabellen-Layout aus den 2010er-Jahren. Auf dem Handy ist sie kaum bedienbar, das Forum ist schon abgeschaltet, und es gibt mehrere rechtliche Schwachstellen (siehe unten).

## Was die neue Seite kann

- **Alles, was die alte Seite hatte:** News (alle Beiträge seit 2012, die letzten 8 Jahre auf der News-Seite, ältere automatisch im Archiv), Termine, Vorstand, Fotoalbum (104 Fotos), Jugendabteilung, Satzung & Beiträge, Geschichte, Training & Platzbelegung, Kontaktformular, Gästebuch, Impressum, Datenschutz, Turnierberichte.
- **Für das Handy gemacht:** Die Seite passt sich jedem Bildschirm an, lädt schnell und hat einen Dunkelmodus.
- **„Heute auf der Anlage“:** Die Startseite zeigt das aktuelle Wetter an der Anlage mit Einschätzung („Gutes Tenniswetter“ / „Sandplätze evtl. nass“) und welche Trainingsgruppen heute auf dem Platz sind.
- **Kontaktkarten:** Vorstand und Trainer mit Anrufen-/E-Mail-Knopf und „Kontakt speichern“ fürs Handy – nur für Personen, die ihr Einverständnis gegeben haben.
- **Unterstützer & Spenden:** eigene Seite mit Dank an alle Sponsoren und vier Wegen, den Verein zu unterstützen (Klubkasse, Spende, Sponsoring, Arbeitseinsatz).
- **Häufige Fragen** für Einsteiger, Gästebuch und Satzungs-Hinweise jetzt gut sichtbar.
- **Fotos & PDFs:** moderne Vollbildansicht mit Zoom und Wischen; PDFs öffnen sich in einem Betrachter statt als unscharfes Vorschaubild.
- **Kalender-Abo:** Mitglieder können die Vereinstermine mit einem Klick in ihren Handykalender übernehmen. Neue Termine erscheinen dort automatisch.
- **Einfache Pflege:** News, Termine, Trainingszeiten, Fotos und Mitgliederzahlen werden in einer Redaktionsoberfläche im Browser bearbeitet – wie ein Formular. Es sind keine Programmierkenntnisse nötig.
- **Alte Links funktionieren weiter:** z. B. `bsg-tennis.de/news.html` leitet automatisch auf die neue Seite weiter.

## Wartungsaufwand: praktisch null

- Keine Datenbank, kein PHP, keine Plugins → **keine Sicherheitsupdates**, kein Hacker-Risiko wie bei WordPress.
- Hosting kostenlos möglich (GitHub Pages) oder auf jedem günstigen Webspace.
- Vergangene Termine wandern automatisch ins Archiv, Kalender und News-Feed aktualisieren sich selbst.
- Die Mitgliederzahl wird an genau einer Stelle gepflegt und überall angezeigt.

## Rechtliches – was verbessert wurde

| Thema | Alte Seite | Neue Seite |
|---|---|---|
| Impressum | nur als **Bild** (nicht maschinenlesbar, nicht barrierefrei), verweist auf das veraltete TMG | als Text, aktualisiert auf das **DDG** (gilt seit Mai 2024) |
| Datenschutzerklärung | allgemeiner Mustertext mit Verweis auf Social-Media-Profile und Reichweitenmessung, die es nicht gibt | auf die tatsächliche Nutzung zugeschnitten (Hosting, Formulare, Fotos, Rechte der Betroffenen, zuständige Aufsichtsbehörde Brandenburg) |
| Drittanbieter | Besucherzähler (livepages.de), Wetter-Einbettung (WetterOnline-iFrame) und Klubkasse-Banner laden beim **bloßen Aufruf** Daten von fremden Servern – ohne Einwilligung problematisch | **keine** Einbindungen Dritter, keine Cookies, keine Google-Schriften, kein Tracking → **kein Cookie-Banner nötig** |
| Zeitungsartikel | MOZ-Artikel **vollständig abgeschrieben** inkl. Pressefoto und Zeitungsausschnitten als Bild → Urheberrechtsverletzung, Abmahnrisiko | durch eigene Zusammenfassung mit Link zur MOZ ersetzt, Zeitungsausschnitte entfernt |
| Gästebuch | eingebettet von einem Fremdanbieter (yellabook) mit eigener Datenverarbeitung | eigenes Gästebuch; Einträge werden erst nach Prüfung veröffentlicht → kein Spam, keine Haftung für unzulässige Inhalte |
| E-Mail-Adresse | offen im Quelltext → Spam | wird erst auf Klick angezeigt |
| Wetter | WetterOnline-Einbettung lädt beim Aufruf von fremdem Server | Wetter wird vom Verein selbst abgerufen und vom eigenen Server ausgeliefert – Besucher übertragen nichts an Dritte |
| Alte Beiträge mit Kindernamen | über Google auffindbar | Beiträge älter als 8 Jahre und Turnierberichte sind für Suchmaschinen gesperrt |
| Kontaktdaten von Personen | – | werden nur mit dokumentiertem Einverständnis angezeigt (Schalter in der Redaktion) |
| Impressum | ohne Verantwortlichen für redaktionelle Inhalte | ergänzt um § 18 Abs. 2 MStV und Hinweis zur Verbraucherstreitbeilegung |
| Kontaktformular | Einwilligung vorhanden | Einwilligung mit Link zur Datenschutzerklärung und Hinweis auf Widerruf |

## Was der Vorstand noch klären sollte

Diese Punkte kann die Technik nicht lösen. Sie sollten aber vor dem Start erledigt werden:

1. **Hosting festlegen und in der Datenschutzerklärung eintragen** (Platzhalter ist markiert). Danach den gelben Hinweiskasten oben in der Datenschutzerklärung löschen.
2. **Auftragsverarbeitungsvertrag (AVV) mit form.taxi** abschließen (im Kundenkonto meist per Klick) – der Dienst leitet die Formulareingaben weiter.
3. **Fotos von Kindern und Jugendlichen:** Für alle Fotos, auf denen Minderjährige erkennbar sind, muss eine schriftliche Einwilligung der Eltern vorliegen. Empfehlung: Einwilligung zur Fotoveröffentlichung in den Mitgliedsantrag aufnehmen. Bei neuen Berichten über Kinder nur Vornamen nennen (wie im Kinderturnier 2026 schon gemacht). Das Archiv enthält viele vollständige Namen von damals Minderjährigen. Auf Anfrage sofort löschen; ein entsprechendes Anliegen „Foto entfernen“ ist im Kontaktformular vorbereitet.
4. **Zeitungsausschnitte als PDF:** Die alten Beiträge „10 Jahre Vereinsheim“ (2020) und „Dankeschön“ (2023) verlinken eingescannte Zeitungsartikel. Ohne Erlaubnis der Zeitung sollten diese PDFs entfernt werden.
5. **Impressum prüfen:** Stimmen Vorstand (Detlef Engel, Jörg Harwardt), Telefonnummer und Vereinsregisternummer noch? Laut Satzung vertritt evtl. der Gesamtvorstand der BSG den Verein. Dann gehören diese Personen ins Impressum.
6. **Wer pflegt die Seite?** Mindestens zwei Personen sollten Zugang zur Redaktion haben.
7. **Kontaktkarten:** Jede Person (Vorstand, Trainer) gibt kurz schriftlich (z. B. per E-Mail) ihr Einverständnis, bevor Telefon/E-Mail veröffentlicht werden. Für Detlef Engel ist die bisher im Impressum stehende Nummer eingetragen – bitte bestätigen.
8. **Verantwortlicher nach § 18 MStV** im Impressum: aktuell Detlef Engel eingetragen – bitte bestätigen.

## Mögliche Erweiterungen (optional)

- **Online-Platzbuchung** für Mitglieder (z. B. über einen spezialisierten Anbieter wie eBuSy oder CourtBooking) statt Platzbelegungsbuch
- **Mitgliedsantrag als Online-Formular** statt PDF zum Ausdrucken
- **Logos der Sponsoren** auf der Unterstützer-Seite (Feld ist vorbereitet, Logos müssen von den Firmen kommen)
- **Newsletter** per E-Mail für neue Beiträge
- **Ergebnisse der Herrenmannschaft** automatisch über einen Link zu nuLiga/TVBB
