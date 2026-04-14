import React, { useState, useEffect, useRef } from "react";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
    type ChartOptions,
    type TooltipItem,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { theme } from "../styles/theme";
import { WeatherCard, StatWidget } from "../components/ui";

// Core APIs
import { fetchLatestMSP } from "../services/mspService";
import { fetchWeather } from "../services/weatherApi";
import { marketApi } from "../services/marketApi";
import type { Crop, WeatherData } from "../types";

// ─── Chart.js registration ───────────────────────────────────────────────────
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
);

// ─── Types ───────────────────────────────────────────────────────────────────
interface ChartDataPoint {
    month: string;
    value: number;
    predicted: boolean;
}

type Tab = "Today" | "Weekly" | "Monthly";
const TABS: Tab[] = ["Today", "Weekly", "Monthly"];
const DEFAULT_LOC = {
    latitude: 19.076,
    longitude: 72.8777,
    label: "Mumbai, Maharashtra, IN",
};

interface DashboardPageProps {
    onNavigate?: (page: string) => void;
}

// ─── MSP Prediction Chart ─────────────────────────────────────────────────────
interface MSPChartProps {
    data: ChartDataPoint[];
}

const MSPPredictionChart: React.FC<MSPChartProps> = ({ data }) => {
    const chartRef = useRef<ChartJS<"line"> | null>(null);

    // Split into actual vs predicted series, bridging the join point
    const pivotIndex = data.findIndex((d) => d.predicted);
    const bridgeIndex = pivotIndex > 0 ? pivotIndex - 1 : -1;

    const actualValues = data.map((d, i) =>
        !d.predicted || i === bridgeIndex ? d.value : null
    );
    const predictedValues = data.map((d, i) =>
        d.predicted || i === bridgeIndex ? d.value : null
    );
    const labels = data.map((d) => d.month);

    const buildGradient = (
        ctx: CanvasRenderingContext2D,
        colorTop: string,
        colorBottom: string
    ) => {
        const gradient = ctx.createLinearGradient(0, 0, 0, 260);
        gradient.addColorStop(0, colorTop);
        gradient.addColorStop(1, colorBottom);
        return gradient;
    };

    const chartData = {
        labels,
        datasets: [
            {
                label: "",
                data: actualValues,
                borderColor: theme.colors.primary ?? "#2D6A4F",
                borderWidth: 2.5,
                pointBackgroundColor: theme.colors.primary ?? "#2D6A4F",
                pointBorderColor: "#fff",
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.42,
                fill: true,
                // backgroundColor resolved dynamically via beforeDraw plugin
                backgroundColor: "rgba(64,145,108,0.15)",
                spanGaps: false,
            },
            {
                label: "Predicted",
                data: predictedValues,
                borderColor: "#F9A825",
                borderWidth: 2.5,
                borderDash: [6, 4],
                pointBackgroundColor: "#F9A825",
                pointBorderColor: "#fff",
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                tension: 0.42,
                fill: true,
                backgroundColor: "rgba(249,168,37,0.10)",
                spanGaps: false,
            },
        ],
    };

    const options: ChartOptions<"line"> = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: "index",
            intersect: false,
        },
        plugins: {
            legend: {
                position: "top",
                align: "end",
                labels: {
                    boxWidth: 22,
                    boxHeight: 2,
                    font: {
                        family: theme.fonts.body,
                        size: 11,
                        weight: "bold",
                    },
                    color: theme.colors.text.muted ?? "#6B8F7A",
                    padding: 18,
                    usePointStyle: true,
                    pointStyle: "line",
                },
            },
            tooltip: {
                backgroundColor: theme.colors.primaryDark ?? "#1B4332",
                titleColor: "rgba(255,255,255,0.65)",
                bodyColor: "#fff",
                titleFont: { family: theme.fonts.body, size: 11 },
                bodyFont: { family: theme.fonts.heading, size: 14, weight: "bold" },
                padding: 14,
                cornerRadius: 10,
                displayColors: true,
                boxWidth: 10,
                boxHeight: 10,
                callbacks: {
                    label: (ctx: TooltipItem<"line">) => {
                        const val = ctx.raw as number | null;
                        return val != null
                            ? ` ₹${val.toLocaleString("en-IN")}`
                            : " —";
                    },
                },
            },
        },
        scales: {
            x: {
                grid: { display: false },
                border: { display: false },
                ticks: {
                    font: { family: theme.fonts.body, size: 10, weight: "600" },
                    color: theme.colors.text.muted ?? "#6B8F7A",
                    maxRotation: 0,
                },
            },
            y: {
                position: "right",
                grid: {
                    color: "rgba(107,143,122,0.10)",
                    drawTicks: false,
                },
                border: { display: false, dash: [4, 4] },
                ticks: {
                    font: { family: theme.fonts.body, size: 10 },
                    color: theme.colors.text.muted ?? "#6B8F7A",
                    padding: 10,
                    callback: (value: string | number) => {
                        const n = Number(value);
                        return n >= 1000 ? `₹${(n / 1000).toFixed(1)}k` : `₹${n}`;
                    },
                },
            },
        },
    };

    // Gradient fill plugin — runs on each draw
    const gradientPlugin = {
        id: "gradientFill",
        beforeDraw(chart: ChartJS) {
            const ctx2d = chart.ctx;
            const chartArea = chart.chartArea;
            if (!chartArea) return;

            const { top, bottom } = chartArea;

            // Dataset 0 — actual (green)
            const ds0 = chart.data.datasets[0] as { backgroundColor: unknown };
            ds0.backgroundColor = (() => {
                const g = ctx2d.createLinearGradient(0, top, 0, bottom);
                g.addColorStop(0, "rgba(64,145,108,0.22)");
                g.addColorStop(1, "rgba(64,145,108,0)");
                return g;
            })();

            // Dataset 1 — predicted (amber)
            const ds1 = chart.data.datasets[1] as { backgroundColor: unknown };
            ds1.backgroundColor = (() => {
                const g = ctx2d.createLinearGradient(0, top, 0, bottom);
                g.addColorStop(0, "rgba(249,168,37,0.18)");
                g.addColorStop(1, "rgba(249,168,37,0)");
                return g;
            })();
        },
    };

    return (
        <div style={{ position: "relative", height: 200, width: "100%" }}>
            <Line
                ref={chartRef}
                data={chartData}
                options={options}
                plugins={[gradientPlugin]}
            />
        </div>
    );
};

// ─── CropCard ────────────────────────────────────────────────────────────────
interface CropCardProps {
    crop: Crop;
}

const CropCard: React.FC<CropCardProps> = ({ crop }) => (
    <div
        style={{
            background: theme.colors.white,
            borderRadius: theme.radius.lg,
            padding: "16px 18px",
            boxShadow: theme.shadow.card,
            position: "relative",
            overflow: "hidden",
        }}
    >
        {/* Accent stripe */}
        <div
            style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: crop.positive
                    ? theme.colors.primary
                    : crop.positive === false
                        ? "#E53935"
                        : "#F9A825",
                borderRadius: `${theme.radius.lg} ${theme.radius.lg} 0 0`,
            }}
        />
        <div style={{ fontSize: 22, marginBottom: 8 }}>{crop.icon}</div>
        <div
            style={{
                fontSize: 11,
                fontWeight: 700,
                color: theme.colors.text.muted,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
            }}
        >
            {crop.name}
        </div>
        <div
            style={{
                fontSize: 19,
                fontWeight: 800,
                color: theme.colors.text.primary,
                fontFamily: theme.fonts.heading,
                margin: "4px 0 6px",
                letterSpacing: "-0.3px",
            }}
        >
            {crop.price}
        </div>
        <div
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 10,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 20,
                background: crop.tagColor,
                color: crop.tagText,
                letterSpacing: "0.4px",
            }}
        >
            {crop.positive ? "▲" : "—"} {crop.tag} {crop.change}
        </div>
        <div
            style={{
                background: theme.colors.neutralLight ?? "#F0F4F0",
                borderRadius: 4,
                height: 4,
                marginTop: 10,
            }}
        >
            <div
                style={{
                    height: 4,
                    borderRadius: 4,
                    background: crop.barColor,
                    width: crop.barWidth,
                    transition: "width 0.6s ease",
                }}
            />
        </div>
    </div>
);

// ─── DashboardPage ────────────────────────────────────────────────────────────
const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
    const [activeTab, setActiveTab] = useState<Tab>("Today");

    const [avgIncrease, setAvgIncrease] = useState<string>("...");
    const [highestCrop, setHighestCrop] = useState<{ name: string; price: string }>({
        name: "...",
        price: "...",
    });
    const [fuelPrice, setFuelPrice] = useState<string>("Loading...");
    const [weather, setWeather] = useState<WeatherData>({
        temp: "...",
        humidity: 0,
        wind: "...",
        harvestWindow: "...",
    });
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [cropData, setCropData] = useState<Crop[]>([]);
    const [marketPulse, setMarketPulse] = useState({ state: "...", detail: "..." });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const hydrate = async () => {
            try {
                const mspTask = fetchLatestMSP()
                    .then(({ data }) => {
                        if (!mounted) return;
                        const changes = data.map((c) => parseFloat(c.changePct));
                        const avg = changes.reduce((a, b) => a + b, 0) / changes.length;
                        setAvgIncrease(`+${avg.toFixed(1)}%`);
                        const top = [...data].sort((a, b) => b.currentMSP - a.currentMSP)[0];
                        if (top)
                            setHighestCrop({
                                name: top.commodity,
                                price: `₹${top.currentMSP.toLocaleString("en-IN")}`,
                            });
                    })
                    .catch(() => { });

                const weatherTask = fetchWeather(DEFAULT_LOC)
                    .then((res) => {
                        if (!mounted) return;
                        const cur = res.current;
                        setWeather({
                            temp: `${Math.round(cur.temp)}°C`,
                            humidity: cur.humidity,
                            wind: `${Math.round(cur.windspeed)} km/h`,
                            harvestWindow:
                                cur.solarRadiation > 800
                                    ? "Avoid mid-day spraying."
                                    : "Optimal harvest lighting.",
                        });
                    })
                    .catch(() => { });

                const fuelTask = fetch("http://localhost:5000/api/fuel")
                    .then((r) => r.json())
                    .then((d) => {
                        if (mounted && d.success && d.fuelSummary) {
                            setFuelPrice(`₹${d.fuelSummary.dieselLatest.toFixed(2)}/L`);
                        }
                    })
                    .catch(() => { });

                const commoditiesTask = marketApi.getCommodities().then((com) => {
                    if (!mounted) return;
                    const priority = [...com]
                        .filter((c) => c.modal > 0)
                        .sort((a, b) => (b.change || 0) - (a.change || 0))
                        .slice(0, 4);

                    const mapped: Crop[] = priority.map((c, i) => {
                        const isUp = c.change ? c.change > 0 : null;
                        const tPercent = Math.min(c.trendPercent || 0, 100);
                        return {
                            id: i + 1,
                            icon: c.emoji || "🌾",
                            name: c.name,
                            price: `₹${c.modal.toLocaleString()}`,
                            change: c.change ? `${isUp ? "+" : ""}${c.trendPercent.toFixed(1)}%` : "0%",
                            positive: isUp,
                            tag: isUp ? "BULLISH" : "STABLE",
                            tagColor: isUp ? "#D8F3DC" : "#FFF3CD",
                            tagText: isUp ? "#1B5E20" : "#856404",
                            barColor: isUp ? "#2E7D32" : "#F9A825",
                            barWidth: `${Math.min(100, Math.max(30, 50 + tPercent * 2))}%`,
                        };
                    });
                    setCropData(mapped);

                    const upCount = com.filter((c) => c.trend === "up").length;
                    setMarketPulse({
                        state: upCount > com.length / 2.5 ? "High Activity" : "Stable Volume",
                        detail: `${upCount} markets trending up`,
                    });
                });

                const chartTask = fetch("http://localhost:5000/api/ml-forecasts")
                    .then((r) => r.json())
                    .then((d) => {
                        if (!mounted || !d?.forecasts) return;
                        const keys = Object.keys(d.forecasts);
                        if (!keys.length) return;
                        const traj: Array<{ date: string; predicted_price: number }> =
                            d.forecasts[keys[0]]?.trajectory || [];
                        if (!traj.length) return;
                        const steps = Math.min(6, traj.length);
                        const pts: ChartDataPoint[] = traj.slice(0, steps).map((t, i) => ({
                            month: new Date(t.date)
                                .toLocaleDateString("en", { month: "short", day: "numeric" })
                                .toUpperCase(),
                            value: Math.round(t.predicted_price),
                            predicted: i >= 2,
                        }));
                        setChartData(pts);
                    })
                    .catch(() => { });

                await Promise.allSettled([
                    mspTask,
                    weatherTask,
                    fuelTask,
                    commoditiesTask,
                    chartTask,
                ]);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        hydrate();
        return () => {
            mounted = false;
        };
    }, []);

    const summaryStats = [
        {
            label: "Avg. Increase",
            value: avgIncrease,
            icon: "↗",
            bg: theme.colors.primaryMuted,
        },
        {
            label: "Active Season",
            value: "Kharif 2024",
            icon: "📅",
            bg: theme.colors.secondaryLight,
        },
    ];

    if (loading) {
        return (
            <div
                style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: theme.colors.neutralLight,
                    fontFamily: theme.fonts.body,
                    flexDirection: "column",
                    gap: 16,
                }}
            >
                <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
                <div
                    style={{
                        width: 36,
                        height: 36,
                        border: `3px solid ${theme.colors.primary}`,
                        borderTopColor: "transparent",
                        borderRadius: "50%",
                        animation: "spin 0.8s linear infinite",
                    }}
                />
                <div
                    style={{
                        fontSize: 12,
                        color: theme.colors.text.muted,
                        fontWeight: 700,
                        letterSpacing: "0.5px",
                        textTransform: "uppercase",
                    }}
                >
                    Unifying Backend API Metrics…
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                background: theme.colors.neutralLight,
                fontFamily: theme.fonts.body,
            }}
        >
            <div
                style={{
                    flex: 1,
                    overflow: "auto",
                    padding: "26px 28px 48px",
                }}
            >
                {/* ── Header ── */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        marginBottom: 22,
                    }}
                >
                    <div>
                        <div
                            style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: theme.colors.primary,
                                letterSpacing: "2px",
                                textTransform: "uppercase",
                                marginBottom: 5,
                            }}
                        >
                            Economic Insights
                        </div>
                        <h1
                            style={{
                                fontSize: 29,
                                fontWeight: 800,
                                color: theme.colors.primaryDark,
                                margin: 0,
                                letterSpacing: "-1px",
                                fontFamily: theme.fonts.heading,
                            }}
                        >
                            Greenhouse Overview
                        </h1>
                        <p
                            style={{
                                color: theme.colors.text.secondary,
                                fontSize: 13.5,
                                margin: "5px 0 0",
                                fontWeight: 500,
                            }}
                        >
                            Live telemetry compiled across weather grids and ML futures.
                        </p>
                    </div>
                </div>

                {/* ── Summary Pills ── */}
                <div style={{ display: "flex", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
                    {summaryStats.map((s) => (
                        <div
                            key={s.label}
                            style={{
                                background: theme.colors.white,
                                borderRadius: theme.radius.lg,
                                padding: "13px 20px",
                                display: "flex",
                                alignItems: "center",
                                gap: 12,
                                boxShadow: theme.shadow.card,
                            }}
                        >
                            <div
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: theme.radius.md,
                                    background: s.bg,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 16,
                                }}
                            >
                                {s.icon}
                            </div>
                            <div>
                                <div
                                    style={{
                                        fontSize: 10.5,
                                        color: theme.colors.text.muted,
                                        fontWeight: 700,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px",
                                    }}
                                >
                                    {s.label}
                                </div>
                                <div
                                    style={{
                                        fontSize: 15,
                                        fontWeight: 800,
                                        color: theme.colors.text.primary,
                                        fontFamily: theme.fonts.heading,
                                    }}
                                >
                                    {s.value}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Highest MSP accent pill */}
                    <div
                        style={{
                            background: theme.colors.primary,
                            borderRadius: theme.radius.lg,
                            padding: "13px 22px",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "center",
                            boxShadow: theme.shadow.elevated,
                        }}
                    >
                        <div
                            style={{
                                fontSize: 10,
                                color: "rgba(255,255,255,0.7)",
                                fontWeight: 700,
                                letterSpacing: "0.8px",
                                textTransform: "uppercase",
                            }}
                        >
                            Highest MSP Crop
                        </div>
                        <div
                            style={{
                                fontSize: 13,
                                fontWeight: 800,
                                color: theme.colors.white,
                                fontFamily: theme.fonts.heading,
                                marginTop: 1,
                            }}
                        >
                            {highestCrop.name}
                        </div>
                        <div
                            style={{
                                fontSize: 20,
                                fontWeight: 800,
                                color: theme.colors.white,
                                fontFamily: theme.fonts.heading,
                                letterSpacing: "-0.5px",
                            }}
                        >
                            {highestCrop.price}{" "}
                            <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.75 }}>
                                per quintal
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Main Grid: Chart + Side Widgets ── */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 268px",
                        gap: 18,
                        marginBottom: 22,
                    }}
                >
                    {/* Chart card */}
                    <div
                        style={{
                            background: theme.colors.white,
                            borderRadius: theme.radius.lg,
                            padding: "22px 24px",
                            boxShadow: theme.shadow.card,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 18,
                            }}
                        >
                            <span style={{ fontSize: 18 }}>📈</span>
                            <div
                                style={{
                                    fontWeight: 800,
                                    fontSize: 17,
                                    color: theme.colors.text.primary,
                                    fontFamily: theme.fonts.heading,
                                }}
                            >
                                Short-term Prediction Trajectory
                            </div>
                        </div>
                        {chartData.length > 0 ? (
                            <MSPPredictionChart data={chartData} />
                        ) : (
                            <div
                                style={{
                                    height: 200,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: theme.colors.text.muted,
                                    fontSize: 13,
                                }}
                            >
                                Loading prediction data…
                            </div>
                        )}
                    </div>

                    {/* Side widgets */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                        <WeatherCard
                            data={weather}
                            onClick={() => onNavigate?.("weather-forecast")}
                        />
                        <StatWidget
                            onClick={() => onNavigate?.("fuel-prices")}
                            icon="⛽"
                            iconBg={theme.colors.secondaryLight}
                            title="Fuel Watch"
                            subtitle={`Agri-diesel current: ${fuelPrice}`}
                            trailingIcon="↑"
                            trailingColor={theme.colors.status.up}
                        />
                        <StatWidget
                            onClick={() => onNavigate?.("market-prices")}
                            icon="🌿"
                            iconBg={theme.colors.primaryMuted}
                            title="Market Pulse"
                            subtitle={`Wholesale: ${marketPulse.state}`}
                            trailingIcon="→"
                            trailingColor={theme.colors.neutral}
                        />
                    </div>
                </div>

                {/* ── Crop Performance ── */}
                <section>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 14,
                        }}
                    >
                        <h2
                            style={{
                                fontSize: 19,
                                fontWeight: 800,
                                color: theme.colors.primaryDark,
                                margin: 0,
                                fontFamily: theme.fonts.heading,
                                letterSpacing: "-0.4px",
                            }}
                        >
                            Priority Crop Performance
                        </h2>
                        <button
                            onClick={() => onNavigate?.("market-prices")}
                            style={{
                                fontSize: 13,
                                color: theme.colors.primary,
                                fontWeight: 700,
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontFamily: theme.fonts.body,
                            }}
                        >
                            View All Markets →
                        </button>
                    </div>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(4, 1fr)",
                            gap: 13,
                        }}
                    >
                        {cropData.map((crop) => (
                            <CropCard key={crop.id} crop={crop} />
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default DashboardPage;