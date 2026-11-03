/**
 * weather.mjs – aktuelles Wetter an der Tennisanlage.
 *
 * DATENSCHUTZ: Die Wetterdaten werden NICHT im Browser der Besucher von einem
 * fremden Server geladen. Stattdessen holt sie die Website beim Bauen selbst ab
 * (auf GitHub stündlich) und legt sie als /wetter.json auf dem eigenen Server ab.
 * Besucher übertragen dadurch keine Daten an Dritte – kein Cookie-Banner nötig.
 *
 * Quelle: Open-Meteo.com (kostenlos, ohne Anmeldung). Lizenz CC BY 4.0 →
 * Quellenangabe „Wetterdaten: Open-Meteo.com“ wird auf der Seite angezeigt.
 */

import fs from 'node:fs';
import path from 'node:path';

// Koordinaten der Tennisanlage (Waldstraße, Eisenhüttenstadt)
const LAT = 52.1456;
const LON = 14.6414;

const API =
  `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
  '&current=temperature_2m,weather_code,wind_speed_10m,precipitation,is_day' +
  '&hourly=precipitation&past_hours=12&forecast_hours=1' +
  '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max' +
  '&timezone=Europe%2FBerlin&forecast_days=4';

/** WMO-Wettercodes → deutscher Text + Symbolname (siehe helpers.mjs). */
export function wetterText(code, isDay = 1) {
  const c = Number(code);
  if (c === 0) return { text: 'Klar', icon: isDay ? 'sun' : 'moon' };
  if (c <= 2) return { text: 'Leicht bewölkt', icon: isDay ? 'cloudsun' : 'cloud' };
  if (c === 3) return { text: 'Bewölkt', icon: 'cloud' };
  if (c <= 48) return { text: 'Nebel', icon: 'fog' };
  if (c <= 57) return { text: 'Nieselregen', icon: 'rain' };
  if (c <= 67) return { text: 'Regen', icon: 'rain' };
  if (c <= 77) return { text: 'Schnee', icon: 'snow' };
  if (c <= 82) return { text: 'Regenschauer', icon: 'rain' };
  if (c <= 86) return { text: 'Schneeschauer', icon: 'snow' };
  return { text: 'Gewitter', icon: 'storm' };
}

/**
 * Einschätzung für die Plätze – bewusst vorsichtig formuliert.
 * Rückgabe: { stufe: 'gut' | 'mittel' | 'schlecht', text }
 */
export function platzHinweis(w) {
  const code = Number(w.current.weather_code);
  const regen12h = (w.hourly?.precipitation || []).reduce((a, b) => a + (b || 0), 0);
  const temp = w.current.temperature_2m;
  if (code >= 95) return { stufe: 'schlecht', text: 'Gewitter – bitte nicht spielen.' };
  if (w.current.precipitation > 0.2 || (code >= 61 && code <= 82)) return { stufe: 'schlecht', text: 'Es regnet – die Sandplätze sind gerade nicht bespielbar.' };
  if (regen12h >= 3) return { stufe: 'mittel', text: 'In den letzten Stunden hat es geregnet – Sandplätze können noch nass sein.' };
  if (temp < 5) return { stufe: 'mittel', text: 'Kalt – außerhalb der Saison sind die Sandplätze winterfest gemacht.' };
  return { stufe: 'gut', text: 'Gutes Tenniswetter!' };
}

/**
 * Holt die Wetterdaten (max. 5 Sekunden). Bei Fehlern (z. B. offline) wird die
 * zuletzt gespeicherte Version genutzt, wenn sie höchstens 6 Stunden alt ist.
 * Ohne Daten wird das Wetter-Modul auf der Seite einfach ausgeblendet.
 */
export async function ladeWetter(cacheDir) {
  const cacheFile = path.join(cacheDir, 'wetter.json');
  // Für Tests ohne Internet: WETTER_DATEI=/pfad/zu/beispiel.json
  if (process.env.WETTER_DATEI) return aufbereiten(JSON.parse(fs.readFileSync(process.env.WETTER_DATEI, 'utf8')));
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(API, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    raw._abgerufen = new Date().toISOString();
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(cacheFile, JSON.stringify(raw));
    return aufbereiten(raw);
  } catch {
    if (fs.existsSync(cacheFile)) {
      const raw = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      if (Date.now() - new Date(raw._abgerufen).getTime() < 6 * 3600 * 1000) return aufbereiten(raw);
    }
    return null;
  }
}

/** Bringt die Rohdaten in eine einfache Form für Vorlagen und /wetter.json. */
function aufbereiten(w) {
  const now = wetterText(w.current.weather_code, w.current.is_day);
  return {
    stand: w.current.time, // Ortszeit, z. B. „2026-11-02T23:15“
    temperatur: Math.round(w.current.temperature_2m),
    wind: Math.round(w.current.wind_speed_10m),
    text: now.text,
    icon: now.icon,
    platz: platzHinweis(w),
    tage: w.daily.time.map((d, i) => ({
      datum: d,
      max: Math.round(w.daily.temperature_2m_max[i]),
      min: Math.round(w.daily.temperature_2m_min[i]),
      regen: w.daily.precipitation_probability_max[i],
      ...wetterText(w.daily.weather_code[i], 1),
    })),
  };
}
