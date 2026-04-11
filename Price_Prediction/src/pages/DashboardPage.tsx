import React, { useState, useEffect } from "react";
import { theme } from "../styles/theme";
import PriceChart from "../components/ui/PriceChart";
import { WeatherCard, CropCard, StatWidget } from "../components/ui";

// Core APIs
import { fetchLatestMSP } from "../services/mspService";
import { fetchWeather } from "../services/weatherApi";
import { marketApi } from "../services/marketApi";
import type { ChartDataPoint, Crop, WeatherData } from "../types";

type Tab = "Today" | "Weekly" | "Monthly";
const TABS: Tab[] = ["Today", "Weekly", "Monthly"];
const DEFAULT_LOC = { latitude: 19.0760, longitude: 72.8777, label: "Mumbai, Maharashtra, IN" };

const DashboardPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>("Today");

    // Dynamic state
    const [avgIncrease, setAvgIncrease] = useState<string>("...");
    const [highestCrop, setHighestCrop] = useState<{ name: string, price: string }>({ name: "...", price: "..." });
    const [fuelPrice, setFuelPrice] = useState<string>("Loading...");
    const [weather, setWeather] = useState<WeatherData>({ temp: "...", humidity: 0, wind: "...", harvestWindow: "..." });
    const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
    const [cropData, setCropData] = useState<Crop[]>([]);
    const [marketPulse, setMarketPulse] = useState({ state: "...", detail: "..." });

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const hydrate = async () => {
            try {
                // 1. MSP Hook
                const mspTask = fetchLatestMSP().then(({ data }) => {
                    if (!mounted) return;
                    const changes = data.map(c => parseFloat(c.changePct));
                    const avg = changes.reduce((a, b) => a + b, 0) / changes.length;
                    setAvgIncrease(`+${avg.toFixed(1)}%`);

                    const top = [...data].sort((a, b) => b.currentMSP - a.currentMSP)[0];
                    if (top) setHighestCrop({ name: top.commodity, price: `₹${top.currentMSP.toLocaleString("en-IN")}` });
                }).catch(() => { });

                // 2. Weather Hook
                const weatherTask = fetchWeather(DEFAULT_LOC).then(res => {
                    if (!mounted) return;
                    const cur = res.current;
                    setWeather({
                        temp: `${Math.round(cur.temp)}°C`,
                        humidity: cur.humidity,
                        wind: `${Math.round(cur.windspeed)} km/h`,
                        harvestWindow: cur.solarRadiation > 800 ? "Avoid mid-day spraying." : "Optimal harvest lighting.",
                    });
                }).catch(() => { });

                // 3. Fuel Hook
                const fuelTask = fetch("http://localhost:5000/api/fuel")
                    .then(r => r.json())
                    .then(d => {
                        if (mounted && d.success) {
                            const current = d.data.currentFuelPrice;
                            setFuelPrice(`₹${current.toFixed(2)}/L`);
                        }
                    }).catch(() => { });

                // 4. Market Hooks
                const commoditiesTask = marketApi.getCommodities().then(com => {
                    if (!mounted) return;
                    
                    // Filter to Top 4 for Priority Cards
                    const priority = [...com].filter(c => c.modal > 0).sort((a,b) => (b.change || 0) - (a.change || 0)).slice(0, 4);
                    
                    const mapped = priority.map((c, i) => {
                        const isUp = c.change ? c.change > 0 : null;
                        const tPercent = Math.min(c.trendPercent || 0, 100);
                        return {
                            id: i + 1,
                            icon: c.emoji || "🌾",
                            name: c.name,
                            price: `₹${c.modal.toLocaleString()}`,
                            change: c.change ? `${isUp ? '+' : ''}${c.trendPercent.toFixed(1)}%` : "0%",
                            positive: isUp,
                            tag: isUp ? "BULLISH" : "STABLE",
                            tagColor: isUp ? "#d4edda" : "#fff3cd",
                            tagText: isUp ? "#1B5E20" : "#856404",
                            barColor: isUp ? "#2E7D32" : "#F9A825",
                            barWidth: `${Math.min(100, Math.max(30, 50 + (tPercent * 2)))}%`
                        } as Crop;
                    });
                    setCropData(mapped);

                    const upCount = com.filter(c => c.trend === "up").length;
                    const pulse = upCount > com.length / 2.5 ? "High Activity" : "Stable Volume";
                    setMarketPulse({ state: pulse, detail: `${upCount} markets trending up` });
                }).catch(() => { });

                // 5. ML Chart Hooks
                const chartTask = fetch("http://localhost:5000/api/ml-forecasts")
                    .then(r => r.json())
                    .then(d => {
                        if (mounted && d.success && d.predictions) {
                            // Extract primary predictive trajectory
                            const keys = Object.keys(d.predictions);
                            if (keys.length > 0) {
                                const vals = d.predictions[keys[0]] as number[];
                                const dates = d.future_dates as string[];
                                if (vals && dates) {
                                    const steps = Math.min(6, vals.length);
                                    const pts: ChartDataPoint[] = [];
                                    for (let i = 0; i < steps; i++) {
                                        pts.push({
                                            month: new Date(dates[i]).toLocaleDateString("en", { month: "short" }).toUpperCase(),
                                            value: Math.round(vals[i]),
                                            predicted: i >= 2 // Mock visualize predictions tapering in
                                        });
                                    }
                                    setChartData(pts);
                                }
                            }
                        }
                    }).catch(() => { });

                await Promise.allSettled([mspTask, weatherTask, fuelTask, commoditiesTask, chartTask]);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        hydrate();
        return () => { mounted = false; };
    }, []);


    const summaryStats = [
        { label: "Avg. Increase", value: avgIncrease, icon: "↗", bg: theme.colors.primaryMuted },
        { label: "Active Season", value: "Kharif 2024", icon: "📅", bg: theme.colors.secondaryLight },
    ];

    if (loading) {
        return (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: theme.colors.neutralLight, fontFamily: theme.fonts.body, flexDirection: "column", gap: 16 }}>
                <style>{`@keyframes pulse { 0% { opacity: 0.4; } 50% { opacity: 1; } 100% { opacity: 0.4; } }`}</style>
                <div style={{ width: 40, height: 40, border: `3px solid ${theme.colors.primary}`, borderTopColor: "transparent", borderRadius: "50%", animation: "pulse 1s linear infinite" }} />
                <div style={{ fontSize: 13, color: theme.colors.text.muted, fontWeight: 600 }}>Unifying Backend API Metrics...</div>
            </div>
        );
    }

    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: theme.colors.neutralLight, fontFamily: theme.fonts.body }}>
            <div style={{ flex: 1, overflow: "auto", padding: "26px 28px 40px" }}>
                
                {/* Header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22 }}>
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: theme.colors.primary, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 5 }}>Economic Insights</div>
                        <h1 style={{ fontSize: 29, fontWeight: 800, color: theme.colors.primaryDark, margin: 0, letterSpacing: "-1px", fontFamily: theme.fonts.heading }}>Greenhouse Overview</h1>
                        <p style={{ color: theme.colors.text.secondary, fontSize: 13.5, margin: "5px 0 0", fontWeight: 500 }}>Live telemetry compiled across weather grids and ML futures.</p>
                    </div>

                    <div style={{ display: "flex", gap: 4, background: theme.colors.white, borderRadius: theme.radius.full, padding: "4px", boxShadow: theme.shadow.card }}>
                        {TABS.map((tab) => (
                            <button key={tab} onClick={() => setActiveTab(tab)}
                                style={{ padding: "8px 18px", borderRadius: theme.radius.full, border: "none", background: activeTab === tab ? theme.colors.primary : "transparent", color: activeTab === tab ? theme.colors.white : theme.colors.text.secondary, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: theme.fonts.heading, transition: "all 0.18s ease" }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Summaries */}
                <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
                    {summaryStats.map((s) => (
                        <div key={s.label} style={{ background: theme.colors.white, borderRadius: theme.radius.lg, padding: "13px 20px", display: "flex", alignItems: "center", gap: 12, boxShadow: theme.shadow.card }}>
                            <div style={{ width: 36, height: 36, borderRadius: theme.radius.md, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{s.icon}</div>
                            <div>
                                <div style={{ fontSize: 10.5, color: theme.colors.text.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</div>
                                <div style={{ fontSize: 15, fontWeight: 800, color: theme.colors.text.primary, fontFamily: theme.fonts.heading }}>{s.value}</div>
                            </div>
                        </div>
                    ))}

                    <div style={{ background: theme.colors.primary, borderRadius: theme.radius.lg, padding: "13px 22px", display: "flex", flexDirection: "column", justifyContent: "center", boxShadow: theme.shadow.elevated }}>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase" }}>Highest MSP Crop</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: theme.colors.white, fontFamily: theme.fonts.heading, marginTop: 1 }}>{highestCrop.name}</div>
                        <div style={{ fontSize: 21, fontWeight: 800, color: theme.colors.white, fontFamily: theme.fonts.heading, letterSpacing: "-0.5px" }}>
                            {highestCrop.price} <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.75 }}>per quintal</span>
                        </div>
                    </div>
                </div>

                {/* Main Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 268px", gap: 18, marginBottom: 22 }}>
                    <PriceChart data={chartData} />

                    <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                        <WeatherCard data={weather} />
                        <StatWidget icon="⛽" iconBg={theme.colors.secondaryLight} title="Fuel Watch" subtitle={`Agri-diesel current: ${fuelPrice}`} trailingIcon="↑" trailingColor={theme.colors.status.up} />
                        <StatWidget icon="🌿" iconBg={theme.colors.primaryMuted} title="Market Pulse" subtitle={`Wholesale: ${marketPulse.state}`} trailingIcon="→" trailingColor={theme.colors.neutral} />
                    </div>
                </div>

                {/* Crop Performance */}
                <section>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <h2 style={{ fontSize: 19, fontWeight: 800, color: theme.colors.primaryDark, margin: 0, fontFamily: theme.fonts.heading, letterSpacing: "-0.4px" }}>Priority Crop Performance</h2>
                        <button style={{ fontSize: 13, color: theme.colors.primary, fontWeight: 700, background: "none", border: "none", cursor: "pointer", fontFamily: theme.fonts.body }}>View All Markets →</button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 13 }}>
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