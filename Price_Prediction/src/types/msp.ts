// ─── MSP Tracker Types ────────────────────────────────────────

export type CropCategory = "All Crops" | "Cereals" | "Pulses" | "Oilseeds";
export type Season = "Winter" | "Summer" | "Kharif";
export type SortOption = "Highest Value" | "Lowest Value" | "Most Change" | "A-Z";

export interface MSPCrop {
    id: number;
    name: string;
    subLabel: string;
    category: Exclude<CropCategory, "All Crops">;
    season: Season;
    currentMSP: number;
    previousMSP: number;
    change: number;
    emoji: string;
    trendPoints: number[]; // sparkline y-values (6 points)
    trendColor: string;
}

export interface MSPGrowthPoint {
    year: string;
    value: number;
}

export interface MarketAlert {
    type: "warning" | "info" | "success";
    title: string;
    description: string;
}