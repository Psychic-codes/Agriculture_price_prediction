import type { ChartDataPoint, Crop, WeatherData } from "../types";

export const chartData: ChartDataPoint[] = [
  { month: "JAN", value: 120 },
  { month: "MAR", value: 170 },
  { month: "MAY", value: 150 },
  { month: "JUL", value: 210 },
  { month: "SEP", value: 280, predicted: true },
  { month: "NOV", value: 130 },
];

export const cropData: Crop[] = [
  {
    id: 1,
    icon: "🌿",
    name: "Organic Roma",
    price: "$2.45",
    change: "+4.2%",
    positive: true,
    tag: "BULLISH",
    tagColor: "#d4edda",
    tagText: "#1B5E20",
    barColor: "#2E7D32",
    barWidth: "65%",
  },
  {
    id: 2,
    icon: "🫑",
    name: "Bell Peppers",
    price: "$1.89",
    change: "0.0%",
    positive: null,
    tag: "STABLE",
    tagColor: "#fff3cd",
    tagText: "#856404",
    barColor: "#F9A825",
    barWidth: "50%",
  },
  {
    id: 3,
    icon: "🥑",
    name: "Hass Avocado",
    price: "$4.10",
    change: "+18.5%",
    positive: true,
    tag: "SHORTAGE",
    tagColor: "#f8d7da",
    tagText: "#721c24",
    barColor: "#dc3545",
    barWidth: "85%",
  },
  {
    id: 4,
    icon: "🍓",
    name: "Strawberries",
    price: "$3.20",
    change: "-2.1%",
    positive: false,
    tag: "PEAK",
    tagColor: "#d4edda",
    tagText: "#1B5E20",
    barColor: "#2E7D32",
    barWidth: "72%",
  },
];

export const weatherData: WeatherData = {
  temp: "28°C",
  humidity: 42,
  wind: "Light breeze",
  harvestWindow: "Next 48 hours predicted dry and clear.",
};