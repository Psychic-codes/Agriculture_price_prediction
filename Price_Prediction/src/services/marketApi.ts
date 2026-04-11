import type {
    CommoditySummary,
    PriceHistoryResponse,
    ArrivalHistoryResponse,
    CategoryInfo,
    MarketCategory,
} from "../types/market";

const BASE_URL = "http://localhost:5000/api"; // import.meta.env.VITE_API_URL ??

async function get<T>(path: string): Promise<T> {
    const res = await fetch(`${BASE_URL}${path}`);
    if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
    return res.json() as Promise<T>;
}

export const marketApi = {
    /** Fetch summary of all (or filtered) commodities */
    getCommodities(category?: MarketCategory): Promise<CommoditySummary[]> {
        const q = category && category !== "All" ? `?category=${encodeURIComponent(category)}` : "";
        return get<CommoditySummary[]>(`/commodities${q}`);
    },

    /** Fetch price history for one commodity */
    getPriceHistory(id: string, days = 90): Promise<PriceHistoryResponse> {
        return get<PriceHistoryResponse>(`/commodities/${id}/price?days=${days}`);
    },

    /** Fetch arrival history for one commodity */
    getArrivalHistory(id: string, days = 90): Promise<ArrivalHistoryResponse> {
        return get<ArrivalHistoryResponse>(`/commodities/${id}/arrival?days=${days}`);
    },

    /** Fetch category list */
    getCategories(): Promise<CategoryInfo[]> {
        return get<CategoryInfo[]>("/categories");
    },
};