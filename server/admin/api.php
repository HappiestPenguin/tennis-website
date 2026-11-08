<?php
/**
 * Redaktion – Server-Schnittstelle für den Webspace (z. B. STRATO).
 *
 * Die Oberfläche (admin/index.html + redaktion.js) baut die Seiten im Browser mit demselben Code
 * wie die Website und schickt nur geänderte Dateien hierher. Dieses Skript
 *   • prüft die Anmeldung (Kennung oder E-Mail + Passwort, Passwörter nur als Hash gespeichert),
 *   • sperrt nach mehreren Fehlversuchen, schützt alle Änderungen mit einem Sitzungs-Token (CSRF),
 *   • speichert die Inhalte (Texte, Termine, News …) im geschützten Ordner intern/inhalt/,
 *   • legt vor jeder Änderung eine Sicherung an und protokolliert, wer was geändert hat,
 *   • schreibt die fertigen Seiten in den Webspace („veröffentlichen“).
 *
 * Ordner auf dem Webspace:
 *   /admin/api.php            ← dieses Skript
 *   /intern/                  ← per .htaccess für Besucher gesperrt
 *       benutzer.php          ← Konten (Kennung, Name, E-Mail, Passwort-Hash)
 *       inhalt/               ← content/news, content/seiten, data
 *       sicherungen/ protokoll.log sperren/ veroeffentlicht.json
 *   /media/uploads/           ← hochgeladene Bilder und PDFs
 *
 * Benötigt PHP ab 8.0 (STRATO: 8.2–8.5 wählbar). Keine Datenbank.
 */

declare(strict_types=1);

const WEBROOT = __DIR__ . '/..';
const INTERN = WEBROOT . '/intern';
const INHALT = INTERN . '/inhalt';
const MAX_VERSUCHE = 5;            // Fehlversuche …
const SPERRZEIT = 15 * 60;         // … innerhalb von 15 Minuten → 15 Minuten Pause
const SITZUNG_MAX = 8 * 3600;      // nach 8 Stunden Untätigkeit abmelden
const MIN_PASSWORT = 10;
const INHALTS_ORDNER = ['content/news', 'content/seiten', 'data'];

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

// ---------------------------------------------------------------------------
// Sitzung
// ---------------------------------------------------------------------------
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
session_name('BSG_REDAKTION');
session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict']);
session_start();
if (!empty($_SESSION['zuletzt']) && time() - $_SESSION['zuletzt'] > SITZUNG_MAX) {
    $_SESSION = [];
    session_regenerate_id(true);
}

function antwort($daten, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($daten, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function fehler(string $text, int $status = 400): void
{
    antwort(['fehler' => $text], $status);
}

function benutzerLaden(): array
{
    $datei = INTERN . '/benutzer.php';
    return is_file($datei) ? (require $datei) : [];
}
function benutzerSpeichern(array $liste): void
{
    $php = "<?php\n// Konten der Redaktion – Passwörter nur als Hash. Neue Konten: siehe README (Abschnitt Redaktion).\nreturn " . var_export($liste, true) . ";\n";
    sicherSchreiben(INTERN . '/benutzer.php', $php);
}
/** Passwort prüfen – PHP-Standard (bcrypt/argon) oder PBKDF2 aus tools/konto.mjs. */
function passwortPasst(string $passwort, string $hash): bool
{
    if (str_starts_with($hash, 'pbkdf2_sha256$')) {
        [, $it, $salz, $soll] = array_pad(explode('$', $hash), 4, '');
        $ist = base64_encode(hash_pbkdf2('sha256', $passwort, (string) base64_decode($salz), (int) $it, 32, true));
        return hash_equals($soll, $ist);
    }
    return password_verify($passwort, $hash);
}
function angemeldet(): ?array
{
    $kennung = $_SESSION['kennung'] ?? null;
    if (!$kennung) return null;
    $liste = benutzerLaden();
    if (!isset($liste[$kennung])) return null;
    $_SESSION['zuletzt'] = time();
    return ['kennung' => $kennung] + $liste[$kennung];
}
function protokoll(string $aktion, string $was = ''): void
{
    $zeile = date('Y-m-d H:i:s') . "\t" . ($_SESSION['kennung'] ?? '-') . "\t" . $aktion . "\t" . $was . "\n";
    $datei = INTERN . '/protokoll.log';
    @file_put_contents($datei, $zeile, FILE_APPEND | LOCK_EX);
    // Protokoll klein halten: über 512 KB nur die neuere Hälfte behalten
    if (@filesize($datei) > 512 * 1024) {
        $alt = (string) @file_get_contents($datei);
        $rest = substr($alt, (int) (strlen($alt) / 2));
        @file_put_contents($datei, substr($rest, strpos($rest, "\n") + 1), LOCK_EX);
    }
}
/** Atomar schreiben (erst temporäre Datei, dann umbenennen) – nie halbe Dateien. */
function sicherSchreiben(string $datei, string $inhalt): void
{
    if (!is_dir(dirname($datei)) && !mkdir(dirname($datei), 0755, true)) fehler('Ordner kann nicht angelegt werden', 500);
    $tmp = $datei . '.tmp-' . bin2hex(random_bytes(4));
    if (file_put_contents($tmp, $inhalt, LOCK_EX) === false || !rename($tmp, $datei)) {
        @unlink($tmp);
        fehler('Speichern fehlgeschlagen', 500);
    }
}

// ---------------------------------------------------------------------------
// Schutz vor zu vielen Fehlversuchen (je IP-Adresse und je Konto)
// ---------------------------------------------------------------------------
function sperrDatei(string $schluessel): string
{
    return INTERN . '/sperren/' . hash('sha256', $schluessel) . '.json';
}
function gesperrt(string $schluessel): int
{
    $d = sperrDatei($schluessel);
    if (!is_file($d)) return 0;
    $versuche = array_filter(json_decode((string) file_get_contents($d), true) ?: [], fn($t) => $t > time() - SPERRZEIT);
    if (count($versuche) < MAX_VERSUCHE) return 0;
    return max(1, (int) ceil((min($versuche) + SPERRZEIT - time()) / 60));
}
function fehlversuch(string $schluessel): void
{
    $d = sperrDatei($schluessel);
    $versuche = is_file($d) ? (json_decode((string) file_get_contents($d), true) ?: []) : [];
    $versuche = array_values(array_filter($versuche, fn($t) => $t > time() - SPERRZEIT));
    $versuche[] = time();
    sicherSchreiben($d, json_encode($versuche));
}

// ---------------------------------------------------------------------------
// Pfade prüfen
// ---------------------------------------------------------------------------
/** Inhaltsdatei: nur Markdown/JSON in den freigegebenen Ordnern, keine Tricks mit „..“. */
function inhaltsPfad(?string $rel): string
{
    $rel = (string) $rel;
    if (!preg_match('#^(content/news|content/seiten|data)/[A-Za-z0-9][A-Za-z0-9._-]*\.(md|json)$#', $rel) || str_contains($rel, '..')) fehler('Pfad nicht erlaubt');
    return INHALT . '/' . $rel;
}
/** Veröffentlichte Datei: nur Seiten/Feeds im Webspace, nie Skripte, Redaktion, intern oder Medien. */
function ausgabePfad(string $rel): string
{
    if (
        !preg_match('#^[A-Za-z0-9][A-Za-z0-9/._-]*\.(html|xml|ics|txt|json|vcf)$#', $rel) ||
        str_contains($rel, '..') || str_contains($rel, '//') ||
        preg_match('#^(admin|intern|media|css|js)/#', $rel) || preg_match('#(^|/)\.#', $rel)
    ) fehler("Ausgabepfad nicht erlaubt: $rel");
    return WEBROOT . '/' . $rel;
}
function sicherung(string $datei, string $rel): void
{
    if (!is_file($datei)) return;
    $ziel = INTERN . '/sicherungen/' . date('Y-m') . '/' . date('Ymd-His') . '_' . str_replace('/', '__', $rel);
    if (!is_dir(dirname($ziel))) mkdir(dirname($ziel), 0755, true);
    copy($datei, $ziel);
}

// ---------------------------------------------------------------------------
// Anfrage
// ---------------------------------------------------------------------------
$aktion = $_GET['aktion'] ?? '';
$methode = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$roh = $methode === 'POST' ? (string) file_get_contents('php://input') : '';

// Änderungen nur von derselben Seite (kein Absenden aus fremden Webseiten heraus)
if ($methode === 'POST') {
    $herkunft = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($herkunft !== '' && parse_url($herkunft, PHP_URL_HOST) !== parse_url('//' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST)) fehler('Anfrage von fremder Seite abgelehnt', 403);
}

// ---- Ohne Anmeldung erlaubt ------------------------------------------------
if ($aktion === 'status') {
    $b = angemeldet();
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    $stand = is_file(INTERN . '/stand.txt') ? trim((string) file_get_contents(INTERN . '/stand.txt')) : '';
    antwort(['angemeldet' => (bool) $b, 'name' => $b['name'] ?? null, 'kennung' => $b['kennung'] ?? null, 'csrf' => $_SESSION['csrf'], 'stand' => $b ? $stand : null]);
}

if ($aktion === 'anmelden') {
    if ($methode !== 'POST') fehler('POST erwartet', 405);
    if (!hash_equals($_SESSION['csrf'] ?? '', $_SERVER['HTTP_X_CSRF'] ?? '')) fehler('Sitzung abgelaufen – bitte Seite neu laden', 403);
    $d = json_decode($roh, true) ?: [];
    $eingabe = mb_strtolower(trim((string) ($d['kennung'] ?? '')));
    $passwort = (string) ($d['passwort'] ?? '');
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    foreach (["ip:$ip", "konto:$eingabe"] as $s) {
        if ($min = gesperrt($s)) fehler("Zu viele Fehlversuche. Bitte in $min Minuten erneut versuchen.", 429);
    }
    $treffer = null;
    foreach (benutzerLaden() as $kennung => $b) {
        if ($eingabe !== '' && ($eingabe === mb_strtolower((string) $kennung) || $eingabe === mb_strtolower((string) ($b['email'] ?? '')))) $treffer = [$kennung, $b];
    }
    // Auch bei unbekanntem Konto einen Hash prüfen – so verrät die Antwortzeit nicht, ob es das Konto gibt
    $ok = passwortPasst($passwort, $treffer[1]['hash'] ?? '$2y$10$dImY.fsLERb11Es/.YXpL.TNH/pgY0Iz/qICao9FwFyDFHvai57wq');
    if (!$treffer || !$ok) {
        fehlversuch("ip:$ip");
        fehlversuch("konto:$eingabe");
        protokoll('anmeldung-fehlgeschlagen', $eingabe);
        usleep(400000);
        fehler('Benutzername/E-Mail oder Passwort stimmt nicht.', 401);
    }
    // Hash bei Bedarf auf das aktuelle PHP-Verfahren umstellen
    if (str_starts_with($treffer[1]['hash'], 'pbkdf2_sha256$') || password_needs_rehash($treffer[1]['hash'], PASSWORD_DEFAULT)) {
        $liste = benutzerLaden();
        $liste[$treffer[0]]['hash'] = password_hash($passwort, PASSWORD_DEFAULT);
        benutzerSpeichern($liste);
    }
    session_regenerate_id(true);
    $_SESSION['kennung'] = $treffer[0];
    $_SESSION['zuletzt'] = time();
    $_SESSION['csrf'] = bin2hex(random_bytes(32));
    protokoll('anmeldung');
    antwort(['ok' => true, 'name' => $treffer[1]['name'] ?? $treffer[0], 'kennung' => $treffer[0], 'csrf' => $_SESSION['csrf'], 'schwach' => strlen($passwort) < 12 || ctype_alpha($passwort) || mb_strtolower($passwort) === mb_strtolower($treffer[0])]);
}

// ---- Ab hier nur angemeldet ------------------------------------------------
$ich = angemeldet();
if (!$ich) fehler('Bitte anmelden', 401);
if ($methode === 'POST' && !hash_equals($_SESSION['csrf'] ?? '', $_SERVER['HTTP_X_CSRF'] ?? '')) fehler('Sitzung abgelaufen – bitte Seite neu laden', 403);

switch ($aktion) {
    case 'abmelden':
        protokoll('abmeldung');
        $_SESSION = [];
        session_destroy();
        antwort(['ok' => true]);

    case 'passwort': {
        $d = json_decode($roh, true) ?: [];
        $liste = benutzerLaden();
        if (!passwortPasst((string) ($d['alt'] ?? ''), $liste[$ich['kennung']]['hash'] ?? '')) fehler('Das bisherige Passwort stimmt nicht.');
        $neu = (string) ($d['neu'] ?? '');
        if (strlen($neu) < MIN_PASSWORT) fehler('Das neue Passwort braucht mindestens ' . MIN_PASSWORT . ' Zeichen.');
        $liste[$ich['kennung']]['hash'] = password_hash($neu, PASSWORD_DEFAULT);
        benutzerSpeichern($liste);
        protokoll('passwort-geaendert');
        antwort(['ok' => true]);
    }

    // Liste aller News bzw. Seiten
    case 'list': {
        $dir = (string) ($_GET['dir'] ?? '');
        if (!in_array($dir, ['content/news', 'content/seiten'], true)) fehler('Ordner nicht erlaubt');
        $liste = [];
        foreach (glob(INHALT . "/$dir/*.md") ?: [] as $f) {
            $kopf = [];
            if (preg_match('/^---\R(.*?)\R---/s', (string) file_get_contents($f), $m)) {
                foreach (preg_split('/\R/', $m[1]) as $z) if (preg_match('/^([\w-]+):\s*"?(.*?)"?\s*$/', $z, $kv)) $kopf[$kv[1]] = $kv[2];
            }
            $liste[] = ['path' => "$dir/" . basename($f), 'title' => $kopf['title'] ?? basename($f), 'date' => $kopf['date'] ?? '', 'entwurf' => ($kopf['entwurf'] ?? '') === 'true'];
        }
        usort($liste, fn($a, $b) => strcmp((string) $b['date'], (string) $a['date']) ?: strcmp($a['title'], $b['title']));
        antwort($liste);
    }

    // Alle Inhalte (für Vorschau und Veröffentlichen)
    case 'alle': {
        $alle = [];
        foreach (INHALTS_ORDNER as $dir) {
            foreach (glob(INHALT . "/$dir/*.{md,json}", GLOB_BRACE) ?: [] as $f) $alle["$dir/" . basename($f)] = file_get_contents($f);
        }
        antwort($alle);
    }

    case 'read': {
        $f = inhaltsPfad($_GET['path'] ?? '');
        if (!is_file($f)) fehler('Datei nicht gefunden', 404);
        antwort(['text' => file_get_contents($f)]);
    }

    case 'write': {
        $rel = (string) ($_GET['path'] ?? '');
        $f = inhaltsPfad($rel);
        if (strlen($roh) > 2 * 1024 * 1024) fehler('Text zu lang');
        if (str_ends_with($rel, '.json') && json_decode($roh) === null) fehler('Ungültige Daten – nichts gespeichert');
        sicherung($f, $rel);
        sicherSchreiben($f, $roh);
        // Umbenennen (z. B. wenn bei einem News-Beitrag Datum/Titel geändert wurde)
        $alt = (string) ($_GET['alt'] ?? '');
        if ($alt !== '' && $alt !== $rel) {
            $fa = inhaltsPfad($alt);
            if (is_file($fa)) {
                sicherung($fa, $alt);
                unlink($fa);
            }
        }
        protokoll('gespeichert', $rel);
        antwort(['ok' => true]);
    }

    case 'delete': {
        $rel = (string) ($_GET['path'] ?? '');
        if (!str_starts_with($rel, 'content/news/')) fehler('Nur News können gelöscht werden');
        $f = inhaltsPfad($rel);
        sicherung($f, $rel);
        if (is_file($f)) unlink($f);
        protokoll('geloescht', $rel);
        antwort(['ok' => true]);
    }

    // Bild/PDF hochladen → /media/uploads/
    case 'upload': {
        $name = (string) ($_GET['name'] ?? 'datei');
        if (!preg_match('/\.(jpe?g|png|gif|webp|pdf)$/i', $name, $m)) fehler('Nur Bilder (JPG, PNG, GIF, WebP) und PDFs');
        if (strlen($roh) > 15 * 1024 * 1024) fehler('Datei zu groß (höchstens 15 MB)');
        $erlaubt = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
        $typ = (new finfo(FILEINFO_MIME_TYPE))->buffer($roh);
        if (!in_array($typ, $erlaubt, true)) fehler('Dateityp nicht erlaubt');
        $endung = strtolower($m[1]) === 'jpeg' ? 'jpg' : strtolower($m[1]);
        $basis = trim(preg_replace('/[^a-z0-9]+/', '-', strtolower(strtr(pathinfo($name, PATHINFO_FILENAME), ['ä' => 'ae', 'ö' => 'oe', 'ü' => 'ue', 'ß' => 'ss', 'Ä' => 'ae', 'Ö' => 'oe', 'Ü' => 'ue']))), '-') ?: 'datei';
        $ordner = WEBROOT . '/media/uploads';
        $datei = "$basis.$endung";
        for ($n = 2; is_file("$ordner/$datei"); $n++) $datei = "$basis-$n.$endung";
        sicherSchreiben("$ordner/$datei", $roh);
        protokoll('hochgeladen', $datei);
        antwort(['url' => "/media/uploads/$datei"]);
    }

    // Prüfsummen der zuletzt veröffentlichten Dateien (damit nur Geändertes hochgeladen wird)
    case 'pruefsummen': {
        $d = INTERN . '/veroeffentlicht.json';
        antwort(is_file($d) ? (json_decode((string) file_get_contents($d), true) ?: new stdClass()) : new stdClass());
    }

    // Fertige Seiten in den Webspace schreiben: { dateien: {pfad: inhalt}, loeschen: [pfad] }
    case 'veroeffentlichen': {
        $d = json_decode($roh, true);
        if (!is_array($d)) fehler('Ungültige Daten');
        $manifest = is_file(INTERN . '/veroeffentlicht.json') ? (json_decode((string) file_get_contents(INTERN . '/veroeffentlicht.json'), true) ?: []) : [];
        $neu = $d['dateien'] ?? [];
        foreach ($neu as $rel => $inhalt) ausgabePfad((string) $rel); // erst alles prüfen, dann schreiben
        foreach ($neu as $rel => $inhalt) {
            sicherSchreiben(ausgabePfad((string) $rel), (string) $inhalt);
            $manifest[$rel] = hash('sha256', (string) $inhalt);
        }
        // Nicht mehr vorhandene Seiten entfernen (nur solche, die von hier veröffentlicht wurden)
        $weg = 0;
        foreach ($d['loeschen'] ?? [] as $rel) {
            if (!isset($manifest[$rel])) continue;
            $f = ausgabePfad((string) $rel);
            if (is_file($f)) unlink($f);
            unset($manifest[$rel]);
            $weg++;
        }
        sicherSchreiben(INTERN . '/veroeffentlicht.json', json_encode($manifest, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
        sicherSchreiben(INTERN . '/stand.txt', date('Y-m-d'));
        protokoll('veroeffentlicht', count($neu) . ' Dateien, ' . $weg . ' entfernt');
        antwort(['ok' => true, 'geschrieben' => count($neu), 'entfernt' => $weg]);
    }
}

fehler('Unbekannte Aktion', 404);
