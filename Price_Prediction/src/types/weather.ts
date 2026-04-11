// ─── Weather Forecast Types ───────────────────────────────────

export type WeatherCondition =
    | "Sunny"
    | "Partly Cloudy"
    | "Light Rain"
    | "Showers"
    | "Mixed"
    | "Perfect";

export interface DayForecast {
    id: number;
    label: string;
    condition: WeatherCondition;
    temp: number;
    isHarvestDay?: boolean;
}

export interface SoilInsight {
    id: number;
    icon: string;
    label: string;
    value: string;
    status?: string;
    statusColor?: string;
}

export interface AgriAlert {
    id: number;
    type: "info" | "warning" | "success";
    category: string;
    message: string;
    bg: string;
    iconBg: string;
    textColor: string;
    icon: string;
}