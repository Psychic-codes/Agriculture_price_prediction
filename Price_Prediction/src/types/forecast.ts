// ─── Market Forecast Types ────────────────────────────────────

export type ForecastCommodity = "wheat" | "paddy" | "tomatoes" | "soybeans" | "cotton";
export type ForecastView = "30-Day" | "90-Day";
export type TrainingStatus = "TRAINED" | "TRAINING" | "PENDING";

export interface CommodityTab {
    id: ForecastCommodity;
    label: string;
    emoji: string;
}

export interface ForecastPoint {
    label: string;          // "D-30", "D-15", "TODAY", "D+15", "D+30"
    historical: number | null;
    predicted: number | null;
}

export interface ForecastCommodityData {
    id: ForecastCommodity;
    name: string;
    unit: string;
    currentPrice: number;
    day30Estimate: number;
    changePct: number;
    confidence: number;
    volatility: "Low" | "Medium" | "High";
    volatilityNote: string;
    sampleSizeM: number;         // in millions
    shortTermAcc: number;         // %
    longTermAcc: number;         // %
    modelAccuracy: number;         // overall MAPE %
    points: ForecastPoint[];
    tag?: string;         // e.g. "PREMIUM"
}

export interface TrainingHistoryItem {
    id: number;
    commodity: string;
    image: string;          // emoji or icon key
    trainingMonths: number;
    status: TrainingStatus;
}

export interface KeyPredictor {
    icon: string;
    label: string;
    impact: "High" | "Moderate" | "Extreme" | "Low";
}

export interface OutlookRow {
    id: number;
    commodity: string;
    tag?: string;
    currentPrice: string;
    day30Est: string;
    trendPct: number;
    accuracy: number;   // 0–100
}