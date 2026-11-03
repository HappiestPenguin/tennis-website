#!/usr/bin/env python3
"""
Erzeugt den Aufnahmeantrag als ausfüllbares PDF (am Computer ausfüllen oder ausdrucken).

    python3 scripts/mitgliedsantrag.py

Ergebnis: public/media/dokumente/Aufnahmeantrag-BSG-Stahl-Tennis.pdf
Beiträge, Anschrift und E-Mail kommen aus data/verein.json – nach einer Beitragsänderung
einfach neu erzeugen. Benötigt Python 3 und reportlab (pip install reportlab).

Seite 1: Antrag (persönliche Angaben, Beitragsgruppe, Einwilligungen, Unterschriften)
Seite 2: Datenschutzhinweise nach Art. 13 DSGVO – zum Verbleib beim Mitglied
"""

import json
from pathlib import Path

from reportlab.lib.colors import HexColor, white
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.fonts import addMapping
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle

ROOT = Path(__file__).resolve().parent.parent
ZIEL = ROOT / 'public/media/dokumente/Aufnahmeantrag-BSG-Stahl-Tennis.pdf'
verein = json.loads((ROOT / 'data/verein.json').read_text(encoding='utf-8'))

# ---------------------------------------------------------------------------
# Gestaltung (Farben wie auf der Website)
# ---------------------------------------------------------------------------
GRUEN = HexColor('#1d4a3a')
GRUEN_HELL = HexColor('#dfeae3')
SAND = HexColor('#c4553a')
SAND_HELL = HexColor('#f6e2da')
PAPIER = HexColor('#f7f4ee')
TINTE = HexColor('#18221d')
GRAU = HexColor('#66716a')
LINIE = HexColor('#c9c1b2')
FELD = HexColor('#fbfaf7')


def schrift(name, datei):
    for ordner in ('/usr/share/fonts/truetype/crosextra', '/usr/share/fonts/truetype/poppins', '/usr/share/fonts/truetype', '/usr/share/fonts'):
        for p in Path(ordner).rglob(datei) if Path(ordner).exists() else []:
            pdfmetrics.registerFont(TTFont(name, str(p)))
            return name
    return None


TEXT = schrift('Text', 'Carlito-Regular.ttf') or 'Helvetica'
TEXT_FETT = schrift('TextFett', 'Carlito-Bold.ttf') or 'Helvetica-Bold'
TITEL = schrift('Titel', 'Poppins-Bold.ttf') or 'Helvetica-Bold'
# <b> in Absätzen → fette Schrift
addMapping(TEXT, 0, 0, TEXT)
addMapping(TEXT, 1, 0, TEXT_FETT)

B, H = A4
RAND = 18 * mm
BREITE = B - 2 * RAND

klein = ParagraphStyle('klein', fontName=TEXT, fontSize=8.6, leading=11.2, textColor=TINTE)
normal = ParagraphStyle('normal', fontName=TEXT, fontSize=9.6, leading=12.8, textColor=TINTE)


def absatz(c, text, x, y, breite, stil=normal):
    """Absatz zeichnen, y = Oberkante. Gibt die neue Unterkante zurück."""
    p = Paragraph(text, stil)
    _, h = p.wrap(breite, 1000)
    p.drawOn(c, x, y - h)
    return y - h


def logo(c, x, y, d):
    """Vereinslogo (Tennisball) wie auf der Website, x/y = Mittelpunkt."""
    r = d / 2
    c.setFillColor(SAND)
    c.circle(x, y, r, stroke=0, fill=1)
    c.setStrokeColor(PAPIER)
    c.setLineWidth(d * 0.065)
    c.setLineCap(1)
    s = d / 40  # SVG-Koordinaten 0–40
    def P(px, py):
        return x + (px - 20) * s, y - (py - 20) * s
    p = c.beginPath()
    p.moveTo(*P(6.5, 11.5)); p.curveTo(*P(12.5, 13.8), *P(16.2, 19.9), *P(15.3, 26.8))
    p.moveTo(*P(33.5, 28.5)); p.curveTo(*P(27.5, 26.2), *P(23.8, 20.1), *P(24.7, 13.2))
    c.drawPath(p, stroke=1, fill=0)


def kopf(c, titel, untertitel):
    c.setFillColor(GRUEN)
    c.rect(0, H - 30 * mm, B, 30 * mm, stroke=0, fill=1)
    logo(c, RAND + 7 * mm, H - 15 * mm, 14 * mm)
    c.setFillColor(white)
    c.setFont(TITEL, 12.5)
    c.drawString(RAND + 18 * mm, H - 13.5 * mm, 'BSG Stahl Eisenhüttenstadt e.V.')
    c.setFont(TEXT, 10)
    c.setFillColor(HexColor('#cfe0d6'))
    c.drawString(RAND + 18 * mm, H - 19 * mm, 'Abteilung Tennis')
    c.setFillColor(white)
    c.setFont(TITEL, 19)
    c.drawRightString(B - RAND, H - 14 * mm, titel)
    c.setFont(TEXT, 9.5)
    c.setFillColor(HexColor('#f2b9a5'))
    c.drawRightString(B - RAND, H - 19.5 * mm, untertitel)


def fuss(c, links, seite):
    c.setStrokeColor(LINIE)
    c.setLineWidth(0.5)
    c.line(RAND, 13 * mm, B - RAND, 13 * mm)
    c.setFont(TEXT, 7.8)
    c.setFillColor(GRAU)
    c.drawString(RAND, 9 * mm, links)
    c.drawRightString(B - RAND, 9 * mm, f"Seite {seite} von 2")


def abschnitt(c, nr, titel, y):
    c.setFillColor(SAND)
    c.circle(RAND + 3 * mm, y - 1.4 * mm, 3 * mm, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFont(TEXT_FETT, 9)
    c.drawCentredString(RAND + 3 * mm, y - 2.5 * mm, str(nr))
    c.setFillColor(GRUEN)
    c.setFont(TITEL, 11.5)
    c.drawString(RAND + 8.5 * mm, y - 3 * mm, titel)
    return y - 7.5 * mm


def textfeld(c, name, beschriftung, x, y, breite, hilfe='', pflicht=True):
    """Beschriftung oben, ausfüllbares Feld darunter (auch zum handschriftlichen Ausfüllen). y = Oberkante."""
    c.setFillColor(GRAU)
    c.setFont(TEXT, 8)
    c.drawString(x, y - 2.8 * mm, beschriftung + (' *' if pflicht else ''))
    feld_y = y - 10.3 * mm
    c.setFillColor(FELD)
    c.setStrokeColor(LINIE)
    c.setLineWidth(0.6)
    c.roundRect(x, feld_y, breite, 7 * mm, 1.5 * mm, stroke=1, fill=1)
    c.acroForm.textfield(name=name, tooltip=beschriftung, x=x + 0.6 * mm, y=feld_y + 0.5 * mm, width=breite - 1.2 * mm, height=6 * mm,
                         borderWidth=0, fillColor=None, textColor=TINTE, fontName='Helvetica', fontSize=10, forceBorder=False)
    if hilfe:
        c.setFillColor(GRAU)
        c.setFont(TEXT, 7)
        c.drawRightString(x + breite, y - 2.8 * mm, hilfe)
    return feld_y - 2 * mm


def kaestchen(c, name, x, y, tooltip):
    """Ankreuzfeld (5 mm), y = Unterkante."""
    c.setFillColor(FELD)
    c.setStrokeColor(LINIE)
    c.setLineWidth(0.7)
    c.roundRect(x, y, 4.6 * mm, 4.6 * mm, 0.8 * mm, stroke=1, fill=1)
    c.acroForm.checkbox(name=name, tooltip=tooltip, x=x + 0.3 * mm, y=y + 0.3 * mm, size=4 * mm, buttonStyle='check',
                        borderWidth=0, fillColor=None, textColor=GRUEN, forceBorder=False)


def unterschrift(c, beschriftung, x, y, breite):
    c.setStrokeColor(TINTE)
    c.setLineWidth(0.6)
    c.line(x, y, x + breite, y)
    c.setFillColor(GRAU)
    c.setFont(TEXT, 7.8)
    c.drawString(x, y - 3.4 * mm, beschriftung)


# ---------------------------------------------------------------------------
# Seite 1 – Antrag
# ---------------------------------------------------------------------------
def seite1(c):
    kopf(c, 'Aufnahmeantrag', 'Bitte ausfüllen, unterschreiben, abgeben')
    y = H - 37 * mm
    y = absatz(c, (
        'Hiermit beantrage ich die Mitgliedschaft in der <b>BSG Stahl Eisenhüttenstadt e.V., Abteilung Tennis</b>. '
        'Ich erkenne die Satzung des Vereins, die Abteilungsordnung und die Beschlüsse der Abteilung Tennis an. '
        f"Satzung und Abteilungsordnung finden Sie unter <b>{verein['url'].replace('https://', '')}/satzung</b> oder erhalten sie beim Abteilungsvorstand."
    ), RAND, y, BREITE) - 4 * mm

    # 1 Persönliche Angaben ---------------------------------------------------
    y = abschnitt(c, 1, 'Persönliche Angaben', y)
    halb = (BREITE - 5 * mm) / 2
    x2 = RAND + halb + 5 * mm
    textfeld(c, 'name', 'Name', RAND, y, halb)
    y = textfeld(c, 'vorname', 'Vorname', x2, y, halb)
    textfeld(c, 'geburtsdatum', 'Geburtsdatum', RAND, y, halb, 'TT.MM.JJJJ')
    y = textfeld(c, 'mitglied_ab', 'Mitgliedschaft gewünscht ab', x2, y, halb, 'TT.MM.JJJJ')
    y = textfeld(c, 'strasse', 'Straße und Hausnummer', RAND, y, BREITE)
    plz_b = 30 * mm
    textfeld(c, 'plz', 'PLZ', RAND, y, plz_b)
    y = textfeld(c, 'ort', 'Wohnort', RAND + plz_b + 5 * mm, y, BREITE - plz_b - 5 * mm)
    textfeld(c, 'telefon', 'Telefon / Mobil', RAND, y, halb)
    y = textfeld(c, 'email', 'E-Mail', x2, y, halb) - 2 * mm

    # 2 Beitragsgruppe ---------------------------------------------------------
    y = abschnitt(c, 2, 'Beitragsgruppe', y)
    c.setFont(TEXT, 8.6)
    c.setFillColor(GRAU)
    c.drawString(RAND, y - 2.5 * mm, f"Jahresbeiträge laut Abteilungsordnung (gültig seit {verein.get('beitraege_stand', '')}) – bitte eine Gruppe ankreuzen:")
    y -= 5.5 * mm
    gruppen = verein.get('beitraege', [])
    spalte = BREITE / max(1, len(gruppen))
    for i, g in enumerate(gruppen):
        gx = RAND + i * spalte
        c.setFillColor(PAPIER)
        c.setStrokeColor(LINIE)
        c.setLineWidth(0.6)
        c.roundRect(gx, y - 13 * mm, spalte - 3 * mm, 12 * mm, 2 * mm, stroke=1, fill=1)
        kaestchen(c, f'beitrag_{i + 1}', gx + 3 * mm, y - 9.2 * mm, g['gruppe'])
        c.setFillColor(TINTE)
        c.setFont(TEXT_FETT, 10)
        c.drawString(gx + 10 * mm, y - 5.6 * mm, g['gruppe'])
        c.setFont(TEXT, 9)
        c.setFillColor(GRUEN)
        c.drawString(gx + 10 * mm, y - 10 * mm, f"{g['betrag']} € pro Jahr")
    y -= 16 * mm
    y = absatz(c, (
        '<b>Gut zu wissen:</b> Vor der Mitgliedschaft absolvieren Einsteiger einen Grundlehrgang (10 Stunden, kostenpflichtig). '
        'Hinzu kommt eine einmalige Aufnahmegebühr laut Satzung. Da die Mitglieder die Anlage selbst bewirtschaften, leisten Erwachsene '
        '10 Arbeitsstunden pro Jahr (Kinder und Schüler sind davon befreit). Für Studierende/Azubis bitte einen Nachweis beifügen.'
    ), RAND, y, BREITE, klein) - 3 * mm
    kaestchen(c, 'schluessel_anlage', RAND, y - 4.6 * mm, 'Schlüssel für die Tennisanlage')
    c.setFillColor(TINTE)
    c.setFont(TEXT, 9.4)
    c.drawString(RAND + 6.5 * mm, y - 3.6 * mm, 'Ich möchte einen Schlüssel für die Tennisanlage (gegen Kaution).')
    kaestchen(c, 'schluessel_schrank', RAND + BREITE * 0.62, y - 4.6 * mm, 'Umkleideschrank')
    c.setFillColor(TINTE)
    c.setFont(TEXT, 9.4)
    c.drawString(RAND + BREITE * 0.62 + 6.5 * mm, y - 3.6 * mm, 'Umkleideschrank (gegen Kaution)')
    y -= 11 * mm

    # 3 Datenschutz & Fotos ----------------------------------------------------
    y = abschnitt(c, 3, 'Datenschutz und Fotos', y)
    kaestchen(c, 'datenschutz', RAND, y - 4.6 * mm, 'Datenschutzhinweise zur Kenntnis genommen')
    y2 = absatz(c, 'Ich habe die <b>Datenschutzhinweise</b> (Seite 2 dieses Antrags) zur Kenntnis genommen. *', RAND + 6.5 * mm, y - 0.4 * mm, BREITE - 6.5 * mm)
    y = min(y2, y - 5 * mm) - 3 * mm
    c.setFillColor(PAPIER)
    c.setStrokeColor(LINIE)
    box_h = 25 * mm
    c.roundRect(RAND, y - box_h, BREITE, box_h, 2 * mm, stroke=1, fill=1)
    yy = absatz(c, (
        '<b>Einwilligung zur Veröffentlichung von Fotos</b> (freiwillig): Ich bin einverstanden, dass Fotos von Vereinsveranstaltungen, '
        'auf denen ich bzw. mein Kind zu erkennen bin/ist, auf der Website des Vereins, im Aushang und in vereinseigenen Medien '
        'veröffentlicht werden. Namen werden bei Minderjährigen höchstens mit Vornamen genannt. Die Einwilligung kann jederzeit ohne '
        'Angabe von Gründen widerrufen werden; aus einer Ablehnung entstehen keine Nachteile.'
    ), RAND + 3 * mm, y - 2.5 * mm, BREITE - 6 * mm, klein)
    kaestchen(c, 'fotos_ja', RAND + 3 * mm, yy - 6.5 * mm, 'Fotos: ja')
    c.setFillColor(TINTE)
    c.setFont(TEXT_FETT, 9.4)
    c.drawString(RAND + 9.5 * mm, yy - 5.5 * mm, 'Ja, ich bin einverstanden.')
    kaestchen(c, 'fotos_nein', RAND + 62 * mm, yy - 6.5 * mm, 'Fotos: nein')
    c.setFillColor(TINTE)
    c.setFont(TEXT_FETT, 9.4)
    c.drawString(RAND + 68.5 * mm, yy - 5.5 * mm, 'Nein, bitte keine Fotos von mir / meinem Kind.')
    y -= box_h + 5 * mm

    # 4 Unterschriften ---------------------------------------------------------
    y = abschnitt(c, 4, 'Unterschriften', y)
    y -= 12 * mm
    drittel = (BREITE - 10 * mm) / 3
    unterschrift(c, 'Ort, Datum', RAND, y, drittel)
    unterschrift(c, 'Unterschrift Antragsteller/in', RAND + drittel + 5 * mm, y, drittel)
    unterschrift(c, 'Bei Minderjährigen: Unterschrift der/des', RAND + 2 * (drittel + 5 * mm), y, drittel)
    c.drawString(RAND + 2 * (drittel + 5 * mm), y - 6.6 * mm, 'Erziehungsberechtigten')
    y -= 11 * mm

    # Vom Verein auszufüllen ---------------------------------------------------
    c.setStrokeColor(GRUEN)
    c.setDash(2, 2)
    c.setLineWidth(0.7)
    c.roundRect(RAND, y - 16 * mm, BREITE, 16 * mm, 2 * mm, stroke=1, fill=0)
    c.setDash()
    c.setFillColor(GRUEN)
    c.setFont(TEXT_FETT, 8.6)
    c.drawString(RAND + 3 * mm, y - 4.5 * mm, 'Vom Verein auszufüllen')
    unterschrift(c, 'Aufgenommen am', RAND + 3 * mm, y - 11 * mm, 40 * mm)
    unterschrift(c, 'Mitgliedsnummer', RAND + 50 * mm, y - 11 * mm, 35 * mm)
    unterschrift(c, 'Unterschrift Abteilungsvorstand', RAND + 92 * mm, y - 11 * mm, BREITE - 95 * mm)
    print(f'  Seite 1: Abstand zum Fuß {((y - 16 * mm) - 15 * mm) / mm:.1f} mm')

    fuss(c, f"Abgabe beim Abteilungsvorstand oder per Post: {verein['name']}, Abt. Tennis, {verein['strasse']}, {verein['plz']} {verein['ort']}", 1)


# ---------------------------------------------------------------------------
# Seite 2 – Datenschutzhinweise
# ---------------------------------------------------------------------------
def seite2(c):
    kopf(c, 'Datenschutzhinweise', 'nach Art. 13 DSGVO – bitte behalten')
    y = H - 40 * mm
    h = ParagraphStyle('h', fontName=TITEL, fontSize=10.5, leading=13, textColor=GRUEN, spaceBefore=0)
    teile = [
        ('Wer ist verantwortlich?',
         f"{verein['name']}, vertreten durch den Vorstand, {verein['zusatz']}, {verein['strasse']}, {verein['plz']} {verein['ort']}. "
         f"Ansprechpartner für die Abteilung Tennis ist der Abteilungsvorstand, E-Mail: {verein['email']}."),
        ('Welche Daten und wofür?',
         'Wir verarbeiten die Angaben aus diesem Antrag (Name, Anschrift, Geburtsdatum, Kontaktdaten, Beitragsgruppe) sowie Angaben zu Beitragszahlungen und '
         'Arbeitsstunden. Zweck ist die Begründung und Durchführung der Mitgliedschaft: Mitglieder- und Beitragsverwaltung, Organisation von Training, '
         'Turnieren und Spielbetrieb sowie Einladungen und Vereinsinformationen. Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Mitgliedschaft); '
         'für gesetzliche Aufbewahrungspflichten Art. 6 Abs. 1 lit. c DSGVO. Die Veröffentlichung von Fotos erfolgt nur mit Ihrer Einwilligung '
         '(Art. 6 Abs. 1 lit. a DSGVO).'),
        ('Wer erhält die Daten?',
         'Innerhalb des Vereins nur die Personen, die sie für ihre Aufgabe benötigen (Abteilungsvorstand, Kassenwart, Trainer, Geschäftsstelle des Hauptvereins). '
         'Soweit für Spielberechtigung, Wettkampfbetrieb oder Bestandsmeldungen erforderlich, werden notwendige Angaben an den zuständigen Tennisverband '
         'bzw. Sportbund übermittelt. Eine Weitergabe zu Werbezwecken findet nicht statt.'),
        ('Wie lange werden die Daten gespeichert?',
         'Für die Dauer der Mitgliedschaft. Nach dem Austritt werden die Daten gelöscht, soweit keine gesetzlichen Aufbewahrungsfristen bestehen '
         '(z. B. bis zu 10 Jahre für steuerlich relevante Unterlagen wie Beitragszahlungen).'),
        ('Muss ich die Daten angeben?',
         'Die mit * gekennzeichneten Angaben sind für die Mitgliedschaft erforderlich. Ohne sie können wir den Antrag nicht bearbeiten. '
         'Die Einwilligung zu Fotos ist freiwillig.'),
        ('Ihre Rechte',
         'Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung, auf Datenübertragbarkeit sowie auf Widerspruch. '
         'Eine erteilte Einwilligung können Sie jederzeit mit Wirkung für die Zukunft widerrufen – eine formlose Nachricht an den Abteilungsvorstand genügt. '
         'Sie können sich außerdem bei einer Datenschutz-Aufsichtsbehörde beschweren, in Brandenburg bei der Landesbeauftragten für den Datenschutz und für das '
         'Recht auf Akteneinsicht (LDA), Stahnsdorfer Damm 77, 14532 Kleinmachnow.'),
    ]
    for titel, text in teile:
        y = absatz(c, titel, RAND, y, BREITE, h) - 1.5 * mm
        y = absatz(c, text, RAND, y, BREITE, normal) - 5 * mm

    # Kontaktkasten
    c.setFillColor(GRUEN_HELL)
    c.roundRect(RAND, y - 22 * mm, BREITE, 22 * mm, 2.5 * mm, stroke=0, fill=1)
    logo(c, RAND + 11 * mm, y - 11 * mm, 12 * mm)
    c.setFillColor(GRUEN)
    c.setFont(TITEL, 11)
    c.drawString(RAND + 21 * mm, y - 8.5 * mm, 'Fragen zur Mitgliedschaft?')
    c.setFont(TEXT, 9.4)
    c.setFillColor(TINTE)
    c.drawString(RAND + 21 * mm, y - 13.5 * mm, f"Kontaktformular: {verein['url'].replace('https://', '')}/kontakt  ·  E-Mail: {verein['email']}")
    c.drawString(RAND + 21 * mm, y - 18 * mm, f"Trainingszeiten und Beiträge: {verein['url'].replace('https://', '')}/angebote")

    fuss(c, f"{verein['name']} · {verein['abteilung']} · {verein['url'].replace('https://', '')}", 2)


def main():
    ZIEL.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(ZIEL), pagesize=A4)
    c.setTitle('Aufnahmeantrag – BSG Stahl Eisenhüttenstadt e.V., Abteilung Tennis')
    c.setAuthor(verein['name'])
    c.setSubject('Aufnahmeantrag mit Datenschutzhinweisen')
    c.setCreator('scripts/mitgliedsantrag.py')
    seite1(c)
    c.showPage()
    seite2(c)
    c.showPage()
    c.save()
    print(f'✔ {ZIEL.relative_to(ROOT)}')


if __name__ == '__main__':
    main()
