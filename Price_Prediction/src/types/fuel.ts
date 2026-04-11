// ─── Fuel Prices Types ────────────────────────────────────────

export type FuelTrendTab = "Recent" | "Monthly" | "Yearly";

export interface FuelRegionRow {
    id: number;
    region: string;
    dieselAvg: number;
    petrolAvg: number;
    change24h: number;
    trendPoints: number[];
}

export interface FuelChartBar {
    label: string;
    diesel: number;
    petrol: number;
}

export interface FuelSummary {
    dieselLatest: number;
    petrolLatest: number;
    dieselChangePct: number;
    petrolChangePct: number;
    petrolMin: number;
    petrolMax: number;
    dieselMin: number;
    dieselMax: number;
    dataSource: string;
}