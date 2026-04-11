// ─── Market Prices Types ──────────────────────────────────────

export type MarketCategory = "All" | "Vegetables" | "Cereals" | "Pulses";
export type PriceTrend = "up" | "down" | "stable";
export type SortOption = "price" | "arrival" | "change" | "name";

// ─── API Response Types ───────────────────────────────────────

/** Summary row returned by GET /api/commodities */
export interface CommoditySummary {
    id: string;
    name: string;
    category: string;
    emoji: string;
    unit: string;
    modal: number;
    min: number;
    max: number;
    change: number | null;
    trend: PriceTrend;
    trendPercent: number;
    arrivalQty: number | null;
    sparkline: number[];
    date: string;
}

/** One row from GET /api/commodities/:id/price */
export interface PricePoint {
    date: string;
    modal: number;
    min: number;
    max: number;
    change: number | null;
}

/** One row from GET /api/commodities/:id/arrival */
export interface ArrivalPoint {
    date: string;
    qty: number;
    change: number | null;
}

export interface PriceHistoryResponse {
    commodity: string;
    data: PricePoint[];
}

export interface ArrivalHistoryResponse {
    commodity: string;
    data: ArrivalPoint[];
}

export interface CategoryInfo {
    label: string;
    count: number;
}

export interface LiveFeedItem {
    commodity: string;
    market: string;
    price: string;
    change: string;
    positive: boolean;
}