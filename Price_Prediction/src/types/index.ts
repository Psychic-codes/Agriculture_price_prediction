// ─── Navigation ───────────────────────────────────────────────
export type PageId =
    | "dashboard"
    | "msp-tracker"
    | "fuel-prices"
    | "weather-forecast"
    | "market-prices"
    | "market-forecast";

export interface NavItem {
    id: PageId;
    label: string;
    Icon: React.FC;
}

// ─── Chart ────────────────────────────────────────────────────
export interface ChartDataPoint {
    month: string;
    value: number;
    predicted?: boolean;
}

// ─── Crops ────────────────────────────────────────────────────
export type CropTag = "BULLISH" | "STABLE" | "SHORTAGE" | "PEAK";

export interface Crop {
    id: number;
    icon: string;
    name: string;
    price: string;
    change: string;
    positive: boolean | null;
    tag: CropTag;
    tagColor: string;
    tagText: string;
    barColor: string;
    barWidth: string;
}

// ─── Weather ──────────────────────────────────────────────────
export interface WeatherData {
    temp: string;
    humidity: number;
    wind: string;
    harvestWindow: string;
}

// ─── Stat Widget ──────────────────────────────────────────────
export interface StatWidgetProps {
    icon: string;
    iconBg: string;
    title: string;
    subtitle: string;
    trailingIcon?: string;
    trailingColor?: string;
    onClick?: () => void;
}

// ─── Theme ────────────────────────────────────────────────────
export interface ThemeColors {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    primaryMuted: string;
    secondary: string;
    secondaryLight: string;
    secondaryDark: string;
    neutral: string;
    neutralLight: string;
    neutralBorder: string;
    white: string;
    text: {
        primary: string;
        secondary: string;
        muted: string;
    };
    status: {
        up: string;
        down: string;
    };
    chart: {
        bar1: string;
        bar2: string;
        bar4: string;
        barPredicted: string;
    };
}

export interface Theme {
    colors: ThemeColors;
    fonts: {
        heading: string;
        body: string;
    };
    radius: {
        sm: string;
        md: string;
        lg: string;
        full: string;
    };
    shadow: {
        card: string;
        elevated: string;
    };
}