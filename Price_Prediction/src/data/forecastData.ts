import type {
    CommodityTab,
    ForecastCommodityData,
    TrainingHistoryItem,
    KeyPredictor,
    OutlookRow,
} from "../types/forecast";

export const commodityTabs: CommodityTab[] = [
    { id: "wheat", label: "WHEAT", emoji: "🌾" },
    { id: "paddy", label: "PADDY", emoji: "🌱" },
    { id: "tomatoes", label: "TOMATOES", emoji: "🍅" },
    { id: "soybeans", label: "SOYBEANS", emoji: "🫘" },
    { id: "cotton", label: "COTTON", emoji: "🌸" },
];

// Smooth curve data: 7 points spanning -30d → +30d
const makePoints = (
    hist: number[],  // 4 historical points (oldest→newest)
    pred: number[],  // 4 predicted points (from today)
) => [
        { label: "LAST 30 DAYS", historical: hist[0], predicted: null },
        { label: "", historical: hist[1], predicted: null },
        { label: "", historical: hist[2], predicted: null },
        { label: "MODEL\nTRANSITION", historical: hist[3], predicted: pred[0] },
        { label: "", historical: null, predicted: pred[1] },
        { label: "", historical: null, predicted: pred[2] },
        { label: "NEXT 30 DAYS\n(FORECAST)", historical: null, predicted: pred[3] },
    ];

export const forecastData: Record<string, ForecastCommodityData> = {
    wheat: {
        id: "wheat",
        name: "Wheat Price Forecast",
        unit: "MT",
        currentPrice: 328.00,
        day30Estimate: 342.50,
        changePct: 4.2,
        confidence: 92,
        volatility: "Low",
        volatilityNote: "+/-1.2% Risk",
        sampleSizeM: 1.4,
        shortTermAcc: 98,
        longTermAcc: 82,
        modelAccuracy: 94.8,
        tag: "PREMIUM",
        points: makePoints(
            [275, 290, 308, 320],
            [320, 328, 336, 342],
        ),
    },
    paddy: {
        id: "paddy",
        name: "Paddy Price Forecast",
        unit: "MT",
        currentPrice: 412.20,
        day30Estimate: 408.00,
        changePct: -1.2,
        confidence: 88,
        volatility: "Medium",
        volatilityNote: "+/-2.8% Risk",
        sampleSizeM: 1.1,
        shortTermAcc: 95,
        longTermAcc: 79,
        modelAccuracy: 91.3,
        points: makePoints(
            [395, 408, 418, 415],
            [415, 412, 410, 408],
        ),
    },
    tomatoes: {
        id: "tomatoes",
        name: "Tomato Price Forecast",
        unit: "kg",
        currentPrice: 0.85,
        day30Estimate: 1.12,
        changePct: 31.7,
        confidence: 78,
        volatility: "High",
        volatilityNote: "+/-8.4% Risk",
        sampleSizeM: 0.8,
        shortTermAcc: 89,
        longTermAcc: 68,
        modelAccuracy: 87.2,
        points: makePoints(
            [0.60, 0.72, 0.80, 0.85],
            [0.85, 0.92, 1.02, 1.12],
        ),
    },
    soybeans: {
        id: "soybeans",
        name: "Soybean Price Forecast",
        unit: "MT",
        currentPrice: 520.00,
        day30Estimate: 538.00,
        changePct: 3.5,
        confidence: 85,
        volatility: "Low",
        volatilityNote: "+/-1.8% Risk",
        sampleSizeM: 1.2,
        shortTermAcc: 96,
        longTermAcc: 80,
        modelAccuracy: 93.1,
        points: makePoints(
            [490, 500, 510, 518],
            [518, 524, 531, 538],
        ),
    },
    cotton: {
        id: "cotton",
        name: "Cotton Price Forecast",
        unit: "MT",
        currentPrice: 1840.00,
        day30Estimate: 1790.00,
        changePct: -2.7,
        confidence: 83,
        volatility: "Medium",
        volatilityNote: "+/-3.1% Risk",
        sampleSizeM: 0.9,
        shortTermAcc: 93,
        longTermAcc: 77,
        modelAccuracy: 90.4,
        points: makePoints(
            [1900, 1875, 1858, 1842],
            [1842, 1830, 1812, 1790],
        ),
    },
};

export const trainingHistory: TrainingHistoryItem[] = [
    { id: 1, commodity: "Tomatoes", image: "🍅", trainingMonths: 64, status: "TRAINED" },
    { id: 2, commodity: "Rice", image: "🍚", trainingMonths: 72, status: "TRAINED" },
    { id: 3, commodity: "Wheat", image: "🌾", trainingMonths: 72, status: "TRAINING" },
];

export const keyPredictors: KeyPredictor[] = [
    { icon: "🌩️", label: "Weather Anomalies", impact: "High" },
    { icon: "🚛", label: "Logistics Costs", impact: "Moderate" },
    { icon: "🌐", label: "Global Supply Index", impact: "Extreme" },
];

export const outlookRows: OutlookRow[] = [
    { id: 1, commodity: "Wheat", tag: "PREMIUM", currentPrice: "₹ 2,685", day30Est: "₹ 2,696", trendPct: +0.41, accuracy: 96 },
    { id: 2, commodity: "Rice", tag: undefined, currentPrice: "₹ 4,118", day30Est: "₹ 4,096", trendPct: -0.53, accuracy: 94 },
    { id: 3, commodity: "Tomato", tag: undefined, currentPrice: "₹ 1,358", day30Est: "₹ 1,634", trendPct: +20.3, accuracy: 91 },
    { id: 4, commodity: "Potato", tag: undefined, currentPrice: "₹ 1,670", day30Est: "₹ 1,909", trendPct: +14.3, accuracy: 93 },
    { id: 5, commodity: "Onion", tag: undefined, currentPrice: "₹ 1,323", day30Est: "₹ 1,625", trendPct: +22.8, accuracy: 89 },
];