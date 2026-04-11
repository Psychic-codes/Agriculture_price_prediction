// frontend/services/mspService.ts

const BASE_URL = "http://localhost:5000"; // import.meta.env.VITE_API_URL ??

// ─── Types ────────────────────────────────────────────────────

export interface MSPMeta {
    id: string;
    category: string;
    emoji: string;
    unit: string;
    displayName: string;
}

export interface MSPRow {
    commodity: string;
    meta: MSPMeta | null;
    history: Record<string, number>; // { "2013-14": 1310, … }
}

export interface MSPLatest {
    commodity: string;
    currentMSP: number;
    previousMSP: number;
    change: number;
    changePct: string;
    year: string;
    prevYear: string;
    meta?: MSPMeta | null;
}

export interface MSPTrendPoint {
    year: string;
    msp: number;
}

export interface MSPTrend {
    commodity: string;
    trend: MSPTrendPoint[];
}

export interface MSPSummary {
    year: string;
    avgChangePct: number;
    highestMSP: { commodity: string; msp: number };
    lowestMSP: { commodity: string; msp: number };
    mostImproved: { commodity: string; changePct: number };
}

// ─── Internal fetch helper ────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`);
    if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error ?? "Unknown API error");
    return json as T;
}

// ─── API calls ────────────────────────────────────────────────

/** All MSP rows — all commodities × all years. Optionally filter by commodity or year. */
export async function fetchAllMSP(params?: {
    commodity?: string;
    year?: string;
}): Promise<MSPRow[]> {
    const qs = params ? new URLSearchParams(params as Record<string, string>).toString() : "";
    const json = await apiFetch<{ success: true; data: MSPRow[] }>(
        `/api/msp${qs ? `?${qs}` : ""}`
    );
    return json.data;
}

/** Sorted list of year strings, e.g. ["2013-14", …, "2024-25"] */
export async function fetchMSPYears(): Promise<string[]> {
    const json = await apiFetch<{ success: true; years: string[] }>("/api/msp/years");
    return json.years;
}

/** Each commodity's latest MSP vs previous, with absolute and % change */
export async function fetchLatestMSP(): Promise<{ data: MSPLatest[]; year: string }> {
    const json = await apiFetch<{ success: true; data: MSPLatest[]; year: string }>(
        "/api/msp/latest"
    );
    return { data: json.data, year: json.year };
}

/** Year-by-year trend for one commodity. Optional `from` year to slice history. */
export async function fetchMSPTrend(
    commodity: string,
    from?: string
): Promise<MSPTrend> {
    const qs = from ? `?from=${encodeURIComponent(from)}` : "";
    const json = await apiFetch<{ success: true; commodity: string; trend: MSPTrendPoint[] }>(
        `/api/msp/trend/${encodeURIComponent(commodity)}${qs}`
    );
    return { commodity: json.commodity, trend: json.trend };
}

/** Aggregate stats: avgChangePct, highestMSP, lowestMSP, mostImproved */
export async function fetchMSPSummary(): Promise<MSPSummary> {
    const json = await apiFetch<{ success: true } & MSPSummary>("/api/msp/summary");
    const { success: _dropped, ...summary } = json;
    return summary as MSPSummary;
}

// ─── Shape converter ──────────────────────────────────────────

const SEASON_MAP: Record<string, string> = {
    Rice: "Kharif",
    Wheat: "Winter",
    "Arhar (Tur Dal)": "Kharif",
};

const FALLBACK_EMOJI: Record<string, string> = {
    Rice: "🌾",
    Wheat: "🌿",
    "Arhar (Tur Dal)": "🫘",
};

const FALLBACK_CATEGORY: Record<string, string> = {
    Rice: "Cereals",
    Wheat: "Cereals",
    "Arhar (Tur Dal)": "Pulses",
};

/**
 * Converts fetchLatestMSP() output into the MSPCrop[] shape expected by MSPTrackerPage.
 * trendPoints is left empty — hydrate it separately with fetchMSPTrend().
 */
export function toMSPCrops(latestData: MSPLatest[]) {
    return latestData.map((item, idx) => ({
        id: String(idx + 1),
        name: item.commodity,
        subLabel: item.meta?.category ?? FALLBACK_CATEGORY[item.commodity] ?? "Other",
        emoji: item.meta?.emoji ?? FALLBACK_EMOJI[item.commodity] ?? "🌱",
        season: SEASON_MAP[item.commodity] ?? "Kharif",
        category: item.meta?.category ?? FALLBACK_CATEGORY[item.commodity] ?? "Other",
        currentMSP: item.currentMSP,
        previousMSP: item.previousMSP,
        change: item.change,
        trendPoints: [] as number[],
        trendColor: "#2e7d32",
    }));
}