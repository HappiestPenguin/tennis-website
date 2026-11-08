<?php
/**
 * Wetter an der Tennisanlage – wird als /wetter.json ausgeliefert (siehe .htaccess).
 *
 * Der Server fragt höchstens einmal pro Stunde bei Open-Meteo nach und speichert das Ergebnis.
 * Besucher laden das Wetter also nur von unserem eigenen Server – keine Daten an Dritte.
 * Gleiche Aufbereitung wie lib/weather.mjs (dort ausführlich kommentiert).
 */

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: public, max-age=600');

const CACHE = __DIR__ . '/intern/wetter-cache.json';
const MAX_ALTER = 3600;
const API = 'https://api.open-meteo.com/v1/forecast?latitude=52.1456&longitude=14.6414'
    . '&current=temperature_2m,weather_code,wind_speed_10m,precipitation,is_day'
    . '&hourly=precipitation&past_hours=12&forecast_hours=1'
    . '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
    . '&timezone=Europe%2FBerlin&forecast_days=4';

function wetterText($code, $tag = 1): array
{
    $c = (int) $code;
    if ($c === 0) return ['text' => 'Klar', 'icon' => $tag ? 'sun' : 'moon'];
    if ($c <= 2) return ['text' => 'Leicht bewölkt', 'icon' => $tag ? 'cloudsun' : 'cloud'];
    if ($c === 3) return ['text' => 'Bewölkt', 'icon' => 'cloud'];
    if ($c <= 48) return ['text' => 'Nebel', 'icon' => 'fog'];
    if ($c <= 57) return ['text' => 'Nieselregen', 'icon' => 'rain'];
    if ($c <= 67) return ['text' => 'Regen', 'icon' => 'rain'];
    if ($c <= 77) return ['text' => 'Schnee', 'icon' => 'snow'];
    if ($c <= 82) return ['text' => 'Regenschauer', 'icon' => 'rain'];
    if ($c <= 86) return ['text' => 'Schneeschauer', 'icon' => 'snow'];
    return ['text' => 'Gewitter', 'icon' => 'storm'];
}

function platzHinweis(array $w): array
{
    $code = (int) $w['current']['weather_code'];
    $regen12h = array_sum(array_map('floatval', $w['hourly']['precipitation'] ?? []));
    $temp = (float) $w['current']['temperature_2m'];
    if ($code >= 95) return ['stufe' => 'schlecht', 'text' => 'Gewitter – bitte nicht spielen.'];
    if ((float) $w['current']['precipitation'] > 0.2 || ($code >= 61 && $code <= 82)) return ['stufe' => 'schlecht', 'text' => 'Es regnet – die Sandplätze sind gerade nicht bespielbar.'];
    if ($regen12h >= 3) return ['stufe' => 'mittel', 'text' => 'In den letzten Stunden hat es geregnet – Sandplätze können noch nass sein.'];
    if ($temp < 5) return ['stufe' => 'mittel', 'text' => 'Kalt – außerhalb der Saison sind die Sandplätze winterfest gemacht.'];
    return ['stufe' => 'gut', 'text' => 'Gutes Tenniswetter!'];
}

function aufbereiten(array $w): array
{
    $jetzt = wetterText($w['current']['weather_code'], $w['current']['is_day']);
    $tage = [];
    foreach ($w['daily']['time'] as $i => $d) {
        $tage[] = ['datum' => $d, 'max' => (int) round($w['daily']['temperature_2m_max'][$i]), 'min' => (int) round($w['daily']['temperature_2m_min'][$i]),
            'regen' => $w['daily']['precipitation_probability_max'][$i]] + wetterText($w['daily']['weather_code'][$i], 1);
    }
    return ['stand' => $w['current']['time'], 'temperatur' => (int) round($w['current']['temperature_2m']), 'wind' => (int) round($w['current']['wind_speed_10m']),
        'text' => $jetzt['text'], 'icon' => $jetzt['icon'], 'platz' => platzHinweis($w), 'tage' => $tage];
}

$roh = is_file(CACHE) ? json_decode((string) file_get_contents(CACHE), true) : null;
if (!$roh || time() - (int) ($roh['_abgerufen'] ?? 0) > MAX_ALTER) {
    $ctx = stream_context_create(['http' => ['timeout' => 5, 'header' => "User-Agent: BSG-Stahl-Tennis-Website\r\n"]]);
    $neu = @file_get_contents(API, false, $ctx);
    $daten = $neu ? json_decode($neu, true) : null;
    if (is_array($daten) && isset($daten['current'])) {
        $daten['_abgerufen'] = time();
        @file_put_contents(CACHE, json_encode($daten), LOCK_EX);
        $roh = $daten;
    }
}
// Ältere Daten (bis 6 Stunden) sind besser als gar keine
if (!$roh || time() - (int) ($roh['_abgerufen'] ?? 0) > 6 * 3600) {
    http_response_code(503);
    echo 'null';
    exit;
}
echo json_encode(aufbereiten($roh), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
