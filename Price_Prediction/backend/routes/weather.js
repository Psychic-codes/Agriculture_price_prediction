import { Router } from "express";

const router = Router();
const FORECAST_BASE = "https://api.open-meteo.com/v1/forecast";

// ─── Mumbai mock fallback (used when Open-Meteo is down) ──────
function getMumbaiMockData() {
    const today = new Date();
    const fmt = (d) => d.toISOString().slice(0, 10);

    // Build 37 days of daily data (30 past + 7 future)
    const days = Array.from({ length: 37 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - 30 + i);
        const isPast = i < 30;
        // Mumbai April: hot & humid, occasional pre-monsoon showers
        const baseTemp = 32 + Math.sin(i * 0.4) * 3;
        return {
            time: fmt(d),
            temperature_2m_max: +(baseTemp + 2).toFixed(1),
            temperature_2m_min: +(baseTemp - 6).toFixed(1),
            precipitation_sum: isPast ? +(Math.random() * 2).toFixed(1) : 0,
            precipitation_probability_max: isPast ? null : Math.round(Math.random() * 20),
            windspeed_10m_max: +(12 + Math.random() * 8).toFixed(1),
            winddirection_10m_dominant: 220 + Math.round(Math.random() * 40), // SW wind
            weathercode: i % 7 === 3 ? 2 : i % 11 === 0 ? 61 : 1,
            shortwave_radiation_sum: +(15 + Math.random() * 8).toFixed(2),
        };
    });

    // Build hourly soil data for today (24 hours)
    const todayStr = fmt(today);
    const hourlyTimes = Array.from({ length: 24 }, (_, h) => `${todayStr}T${String(h).padStart(2, "0")}:00`);

    return {
        current: {
            temperature_2m: 34.2,
            apparent_temperature: 38.5,
            relative_humidity_2m: 68,
            windspeed_10m: 14.4,
            winddirection_10m: 230,
            weathercode: 1,
            is_day: new Date().getHours() >= 6 && new Date().getHours() < 19 ? 1 : 0,
            shortwave_radiation: +(600 + Math.random() * 200).toFixed(1),
        },
        daily: {
            time: days.map(d => d.time),
            temperature_2m_max: days.map(d => d.temperature_2m_max),
            temperature_2m_min: days.map(d => d.temperature_2m_min),
            precipitation_sum: days.map(d => d.precipitation_sum),
            precipitation_probability_max: days.map(d => d.precipitation_probability_max),
            windspeed_10m_max: days.map(d => d.windspeed_10m_max),
            winddirection_10m_dominant: days.map(d => d.winddirection_10m_dominant),
            weathercode: days.map(d => d.weathercode),
            shortwave_radiation_sum: days.map(d => d.shortwave_radiation_sum),
        },
        hourly: {
            time: hourlyTimes,
            soil_moisture_0_to_1cm: hourlyTimes.map(() => +(0.18 + Math.random() * 0.06).toFixed(3)),
            soil_temperature_0cm: hourlyTimes.map(() => +(29 + Math.random() * 3).toFixed(1)),
        },
        _isMock: true,
    };
}

// ─── Open-Meteo fetch with retries ───────────────────────────
const RETRY_DELAYS = [1000, 2500];   // only 2 retries — fail fast

async function fetchWithRetry(url, attempt = 0) {
    try {
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

        if (res.status >= 500) {
            if (attempt < RETRY_DELAYS.length) {
                console.warn(`[weather] Attempt ${attempt + 1} got ${res.status}, retrying in ${RETRY_DELAYS[attempt]}ms…`);
                await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
                return fetchWithRetry(url, attempt + 1);
            }
            throw { status: res.status, message: `Open-Meteo server error ${res.status}` };
        }

        if (!res.ok) {
            const body = await res.text().catch(() => "");
            throw { status: res.status, message: body.slice(0, 200) || `Error ${res.status}` };
        }

        return res.json();
    } catch (err) {
        if (err.status) throw err;
        if (attempt < RETRY_DELAYS.length) {
            console.warn(`[weather] Network error on attempt ${attempt + 1}, retrying…`);
            await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
            return fetchWithRetry(url, attempt + 1);
        }
        throw { status: 503, message: err.message ?? "Network error" };
    }
}

// ─── Route: GET /api/weather?lat=&lon= ───────────────────────
router.get("/", async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);

    if (isNaN(lat) || isNaN(lon)) {
        return res.status(400).json({ error: "lat and lon query params are required" });
    }

    const DAILY = [
        "temperature_2m_max", "temperature_2m_min", "precipitation_sum",
        "precipitation_probability_max", "windspeed_10m_max",
        "winddirection_10m_dominant", "weathercode", "shortwave_radiation_sum"
    ].join(",");

    const CURRENT = [
        "temperature_2m", "apparent_temperature", "relative_humidity_2m",
        "windspeed_10m", "winddirection_10m", "weathercode", "is_day", "shortwave_radiation"
    ].join(",");

    const buildUrl = (soil) =>
        `${FORECAST_BASE}?latitude=${lat}&longitude=${lon}`
        + `&daily=${DAILY}`
        + (soil ? "&hourly=soil_moisture_0_to_1cm,soil_temperature_0cm" : "")
        + `&current=${CURRENT}&forecast_days=7&past_days=30&timezone=auto`;

    try {
        let data;
        try {
            data = await fetchWithRetry(buildUrl(true));
        } catch (err) {
            if (err.status === 400 || err.status === 422) {
                console.warn("[weather] Soil vars rejected, retrying without them…");
                data = await fetchWithRetry(buildUrl(false));
            } else {
                throw err;
            }
        }

        res.json(data);
    } catch (err) {
        // Open-Meteo is down — serve mock data with a warning header
        console.warn(`[weather] Open-Meteo unavailable (${err.message}), serving mock data`);
        const mock = getMumbaiMockData();
        res
            .set("X-Data-Source", "mock-fallback")
            .json(mock);
    }
});

export default router;