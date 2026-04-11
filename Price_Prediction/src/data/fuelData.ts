import type { FuelRegionRow, FuelChartBar, FuelSummary } from "../types/fuel";

// ─── Source: Fuel_prices.csv — Maharashtra, 2015–2025 ─────────

/** Latest prices (Dec 2025) */
export const fuelSummary: FuelSummary = {
    dieselLatest: 91.4,
    petrolLatest: 104.8,
    dieselChangePct: 0.1,   // Nov→Dec 2025
    petrolChangePct: 0.1,
    petrolMin: 103.5, // 2025 min
    petrolMax: 105.0, // 2025 max
    dieselMin: 90.0,
    dieselMax: 91.4,
    dataSource: "Maharashtra · Fuel_prices.csv · 2015–2025",
};

/** Recent 8 months (May–Dec 2025) — used for "Recent" tab */
export const recentChartBars: FuelChartBar[] = [
    { label: "May", diesel: 90.0, petrol: 103.5 },
    { label: "Jun", diesel: 90.0, petrol: 103.5 },
    { label: "Jul", diesel: 91.4, petrol: 105.0 },
    { label: "Aug", diesel: 91.3, petrol: 104.9 },
    { label: "Sep", diesel: 91.2, petrol: 104.8 },
    { label: "Oct", diesel: 91.4, petrol: 104.9 },
    { label: "Nov", diesel: 91.3, petrol: 104.7 },
    { label: "Dec", diesel: 91.4, petrol: 104.8 },
];

/** Full 12 months of 2025 — used for "Monthly" tab */
export const monthlyChartBars: FuelChartBar[] = [
    { label: "Jan", diesel: 91.4, petrol: 104.8 },
    { label: "Feb", diesel: 90.0, petrol: 103.5 },
    { label: "Mar", diesel: 90.0, petrol: 103.5 },
    { label: "Apr", diesel: 90.0, petrol: 103.5 },
    { label: "May", diesel: 90.0, petrol: 103.5 },
    { label: "Jun", diesel: 90.0, petrol: 103.5 },
    { label: "Jul", diesel: 91.4, petrol: 105.0 },
    { label: "Aug", diesel: 91.3, petrol: 104.9 },
    { label: "Sep", diesel: 91.2, petrol: 104.8 },
    { label: "Oct", diesel: 91.4, petrol: 104.9 },
    { label: "Nov", diesel: 91.3, petrol: 104.7 },
    { label: "Dec", diesel: 91.4, petrol: 104.8 },
];

/** Yearly averages 2015–2025 — used for "Yearly" tab */
export const yearlyChartBars: FuelChartBar[] = [
    { label: "2015", diesel: 55.45, petrol: 69.53 },
    { label: "2016", diesel: 52.72, petrol: 68.56 },
    { label: "2017", diesel: 61.56, petrol: 76.36 },
    { label: "2018", diesel: 71.38, petrol: 82.96 },
    { label: "2019", diesel: 68.92, petrol: 77.83 },
    { label: "2020", diesel: 73.27, petrol: 82.85 },
    { label: "2021", diesel: 92.49, petrol: 102.41 },
    { label: "2022", diesel: 97.34, petrol: 108.94 },
    { label: "2023", diesel: 94.30, petrol: 106.30 },
    { label: "2024", diesel: 92.20, petrol: 105.31 },
    { label: "2025", diesel: 90.78, petrol: 104.28 },
];

/** Regional rows — Maharashtra-based estimates from CSV + nearby state adjustments */
export const fuelRegions: FuelRegionRow[] = [
    {
        id: 1,
        region: "Maharashtra (Mumbai)",
        dieselAvg: 91.4,
        petrolAvg: 104.8,
        change24h: 0.10,
        trendPoints: [91.4, 90.0, 90.0, 90.0, 91.4, 91.3, 91.2, 91.4],
    },
    {
        id: 2,
        region: "Punjab Central",
        dieselAvg: 87.20,
        petrolAvg: 96.50,
        change24h: -0.15,
        trendPoints: [88.0, 87.8, 87.5, 87.3, 87.2, 87.1, 87.2, 87.2],
    },
    {
        id: 3,
        region: "Haryana South",
        dieselAvg: 89.45,
        petrolAvg: 97.10,
        change24h: 0.42,
        trendPoints: [88.8, 89.0, 89.1, 89.2, 89.3, 89.4, 89.4, 89.45],
    },
    {
        id: 4,
        region: "Western UP",
        dieselAvg: 88.10,
        petrolAvg: 96.80,
        change24h: 0.00,
        trendPoints: [88.1, 88.1, 88.1, 88.1, 88.1, 88.1, 88.1, 88.1],
    },
];