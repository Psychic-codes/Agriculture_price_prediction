// src/services/weatherApi.ts
// Calls the backend proxy at /api/weather — avoids CORS issues.
// The backend (backend/src/routes/weather.js) fetches from Open-Meteo
// server-side where CORS doesn't apply.

const API_BASE = "http://localhost:5000/api";

// ─── Types ────────────────────────────────────────────────────

export interface GeoLocation {
    latitude: number;
    longitude: number;
    label: string;
}

export interface DailyWeather {
    date: string;
    tempMax: number;
    tempMin: number;
    precipitation: number;
    precipitationProb: number | null;
    solarRadiation: number;
    windspeedMax: number;
    windDirection: number;
    weatherCode: number;
}

export interface CurrentWeather {
    temp: number;
    feelsLike: number;
    humidity: number;
    solarRadiation: number;
    windspeed: number;
    windDirection: number;
    weatherCode: number;
    isDay: boolean;
}

export interface SoilData {
    moisture: number | null;
    tempC: number | null;
}

export interface WeatherApiResult {
    current: CurrentWeather;
    forecast7: DailyWeather[];
    history30: DailyWeather[];
    soil: SoilData;
    isMock: boolean;
}

// ─── WMO code decoder ─────────────────────────────────────────

export type ConditionKey =
    | "Sunny" | "Partly Cloudy" | "Cloudy" | "Foggy"
    | "Drizzle" | "Light Rain" | "Rain" | "Showers"
    | "Snow" | "Thunderstorm" | "Mixed";

export function decodeWeatherCode(code: number): { label: string; condition: ConditionKey } {
    if (code === 0) return { label: "Clear Sky", condition: "Sunny" };
    if (code === 1) return { label: "Mainly Clear", condition: "Sunny" };
    if (code === 2) return { label: "Partly Cloudy", condition: "Partly Cloudy" };
    if (code === 3) return { label: "Overcast", condition: "Cloudy" };
    if (code === 45 || code === 48) return { label: "Foggy", condition: "Foggy" };
    if (code >= 51 && code <= 57) return { label: "Drizzle", condition: "Drizzle" };
    if (code >= 61 && code <= 65) return { label: "Light Rain", condition: "Light Rain" };
    if (code >= 66 && code <= 67) return { label: "Freezing Rain", condition: "Mixed" };
    if (code >= 71 && code <= 77) return { label: "Snow", condition: "Snow" };
    if (code >= 80 && code <= 82) return { label: "Showers", condition: "Showers" };
    if (code >= 85 && code <= 86) return { label: "Snow Showers", condition: "Snow" };
    if (code === 95) return { label: "Thunderstorm", condition: "Thunderstorm" };
    if (code >= 96 && code <= 99) return { label: "Hail Storm", condition: "Thunderstorm" };
    return { label: "Mixed", condition: "Mixed" };
}

// ─── Main fetch ───────────────────────────────────────────────

export async function fetchWeather(location: GeoLocation): Promise<WeatherApiResult> {
    const { latitude, longitude } = location;

    // Hit our own backend — no CORS, backend handles Open-Meteo retries
    const url = `${API_BASE}/weather?lat=${latitude}&lon=${longitude}`;
    const res = await fetch(url);

    if (!res.ok) {
        const body = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(body.error ?? `Weather fetch failed (${res.status})`);
    }

    const raw = await res.json();

    // ── Daily split ───────────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10);

    const allDays: DailyWeather[] = (raw.daily.time as string[]).map((date: string, i: number) => ({
        date,
        tempMax: raw.daily.temperature_2m_max[i] ?? 0,
        tempMin: raw.daily.temperature_2m_min[i] ?? 0,
        precipitation: raw.daily.precipitation_sum[i] ?? 0,
        precipitationProb: raw.daily.precipitation_probability_max?.[i] ?? null,
        solarRadiation: raw.daily.shortwave_radiation_sum?.[i] ?? 0,
        windspeedMax: raw.daily.windspeed_10m_max[i] ?? 0,
        windDirection: raw.daily.winddirection_10m_dominant[i] ?? 0,
        weatherCode: raw.daily.weathercode[i] ?? 0,
    }));

    const history30 = allDays.filter(d => d.date < today);
    const forecast7 = allDays.filter(d => d.date >= today).slice(0, 7);

    // ── Current ───────────────────────────────────────────────
    const c = raw.current;
    const current: CurrentWeather = {
        temp: c.temperature_2m,
        feelsLike: c.apparent_temperature,
        humidity: c.relative_humidity_2m,
        solarRadiation: c.shortwave_radiation ?? 0,
        windspeed: c.windspeed_10m,
        windDirection: c.winddirection_10m,
        weatherCode: c.weathercode,
        isDay: c.is_day === 1,
    };

    // ── Soil (from hourly today noon) ─────────────────────────
    const hourlyTimes: string[] = raw.hourly?.time ?? [];
    const noonStr = `${today}T12:00`;
    let soilIdx = hourlyTimes.findIndex(t => t === noonStr);
    if (soilIdx < 0) soilIdx = hourlyTimes.findIndex(t => t.startsWith(today));
    if (soilIdx < 0) soilIdx = hourlyTimes.length - 1;

    const soil: SoilData = {
        moisture: raw.hourly?.soil_moisture_0_to_1cm?.[soilIdx] ?? null,
        tempC: raw.hourly?.soil_temperature_0cm?.[soilIdx] ?? null,
    };

    return { current, forecast7, history30, soil, isMock: raw._isMock === true };
}

// ─── Helpers ──────────────────────────────────────────────────

export function degreesToCompass(deg: number): string {
    const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    return dirs[Math.round(deg / 22.5) % 16];
}

export function soilMoistureLabel(val: number): { label: string; color: string } {
    if (val < 0.1) return { label: "DRY", color: "#dc3545" };
    if (val < 0.25) return { label: "LOW", color: "#F9A825" };
    if (val < 0.4) return { label: "OPTIMAL", color: "#2E7D32" };
    return { label: "WET", color: "#1565C0" };
}