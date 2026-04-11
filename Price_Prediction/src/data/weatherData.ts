import type { DayForecast, SoilInsight, AgriAlert } from "../types/weather";

export const sevenDayForecast: DayForecast[] = [
    { id: 1, label: "TODAY", condition: "Sunny", temp: 78 },
    { id: 2, label: "MON", condition: "Sunny", temp: 81 },
    { id: 3, label: "TUE", condition: "Partly Cloudy", temp: 74 },
    { id: 4, label: "HARVEST DAY", condition: "Perfect", temp: 79, isHarvestDay: true },
    { id: 5, label: "THU", condition: "Light Rain", temp: 68 },
    { id: 6, label: "FRI", condition: "Showers", temp: 62 },
    { id: 7, label: "SAT", condition: "Mixed", temp: 70 },
];

export const soilInsights: SoilInsight[] = [
    { id: 1, icon: "💧", label: "Soil Moisture", value: "42%", status: "OPTIMAL", statusColor: "#2E7D32" },
    { id: 2, icon: "🌧️", label: "Precipitation Prob.", value: "5%", status: "MINIMAL", statusColor: "#888" },
    { id: 3, icon: "🌡️", label: "Ground Temp", value: "68°F" },
];

export const agriAlerts: AgriAlert[] = [
    {
        id: 1,
        type: "info",
        category: "IRRIGATION ADVICE",
        message: "Skip irrigation for 24h",
        bg: "#2E7D32",
        iconBg: "rgba(255,255,255,0.18)",
        textColor: "#fff",
        icon: "💧",
    },
    {
        id: 2,
        type: "warning",
        category: "PEST ALERT",
        message: "High humidity: Risk of Mold",
        bg: "#F9A825",
        iconBg: "rgba(0,0,0,0.1)",
        textColor: "#3d2800",
        icon: "🐛",
    },
    {
        id: 3,
        type: "success",
        category: "FERTILIZER WINDOW",
        message: "Ideal window: Next 48h",
        bg: "#1B5E20",
        iconBg: "rgba(255,255,255,0.18)",
        textColor: "#fff",
        icon: "🌿",
    },
];