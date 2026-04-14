// frontend/pages/MSPTrackerPage.tsx
import React, { useState, useMemo, useEffect, useRef } from "react";
import type { CropCategory, SortOption } from "../types/msp";
import { fetchLatestMSP, fetchMSPTrend, toMSPCrops } from "../services/mspService";
import { theme } from "../styles/theme";
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    LineController,
    Filler,
    Tooltip as ChartTooltip,
    type TooltipModel,
    type Chart,
} from "chart.js";

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    LineController,
    Filler,
    ChartTooltip
);

// ─── Icons ────────────────────────────────────────────────────
const ExportIcon: React.FC = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);
const ChevronDownIcon: React.FC = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
);
const AlertIcon: React.FC = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);
const ChevronLeftIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
);
const ChevronRightIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
);

// ─── Inline Sparkline (pure SVG — no lib overhead per row) ───
const Sparkline: React.FC<{ points: number[]; color?: string; width?: number; height?: number }> = ({
    points, color = theme.colors.primary, width = 80, height = 32,
}) => {
    if (!points || points.length < 2) {
        return (
            <svg width={width} height={height}>
                <line x1="4" y1={height / 2} x2={width - 4} y2={height / 2} stroke="#ddd" strokeWidth="1.5" />
            </svg>
        );
    }
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const pad = 4;
    const xs = points.map((_, i) => pad + (i / (points.length - 1)) * (width - pad * 2));
    const ys = points.map(v => height - pad - ((v - min) / range) * (height - pad * 2));
    const linePath = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
    const areaPath = `${linePath} L${xs[xs.length - 1].toFixed(1)},${(height - pad).toFixed(1)} L${xs[0].toFixed(1)},${(height - pad).toFixed(1)} Z`;
    const gradId = `sg${color.replace(/[^a-z0-9]/gi, "")}`;
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
            <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaPath} fill={`url(#${gradId})`} />
            <path d={linePath} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="2.5" fill={color} />
        </svg>
    );
};

// ─── MSP Growth Chart (Chart.js) ─────────────────────────────
interface GrowthDataPoint { year: string; value: number; }

const MSPGrowthChart: React.FC<{ data: GrowthDataPoint[]; cropName: string }> = ({ data, cropName }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);
    const wrapRef = useRef<HTMLDivElement>(null);
    const [tooltip, setTooltip] = useState<{
        visible: boolean; x: number; y: number; year: string; value: number; growth: string;
    }>({ visible: false, x: 0, y: 0, year: "", value: 0, growth: "" });

    const values = data.map(d => d.value);
    const first = values[0] ?? 0;
    const last = values[values.length - 1] ?? 0;
    const totalGrowth = first ? (((last - first) / first) * 100).toFixed(1) : "—";
    const peak = Math.max(...values);
    const peakYear = data.find(d => d.value === peak)?.year ?? "—";
    const cagr = first && data.length > 1
        ? (((last / first) ** (1 / (data.length - 1)) - 1) * 100).toFixed(1)
        : "—";

    useEffect(() => {
        if (!canvasRef.current || data.length === 0) return;
        if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; }

        const labels = data.map(d => d.year.slice(0, 4));
        const vals = data.map(d => d.value);

        chartRef.current = new ChartJS(canvasRef.current, {
            type: "line",
            data: {
                labels,
                datasets: [{
                    label: cropName,
                    data: vals,
                    borderColor: theme.colors.primary,
                    backgroundColor: "rgba(24,95,165,0.07)",
                    borderWidth: 2.5,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: theme.colors.primary,
                    pointHoverBorderColor: "#fff",
                    pointHoverBorderWidth: 2,
                    fill: true,
                    tension: 0.4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 500, easing: "easeInOutQuart" },
                interaction: { mode: "index", intersect: false },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: false,
                        external: ({ chart, tooltip: tip }: { chart: Chart; tooltip: TooltipModel<any> }) => {
                            if (tip.opacity === 0) { setTooltip(prev => ({ ...prev, visible: false })); return; }
                            const idx = tip.dataPoints?.[0]?.dataIndex ?? 0;
                            const curr = vals[idx];
                            const prev = vals[idx - 1];
                            const growthStr = prev ? `+${(((curr - prev) / prev) * 100).toFixed(1)}%` : "—";
                            const wrapRect = wrapRef.current?.getBoundingClientRect();
                            const canvasRect = chart.canvas.getBoundingClientRect();
                            const relX = canvasRect.left - (wrapRect?.left ?? 0) + tip.caretX;
                            setTooltip({ visible: true, x: relX, y: tip.caretY, year: data[idx]?.year ?? "", value: curr, growth: growthStr });
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        border: { display: false },
                        ticks: { color: "rgba(0,0,0,0.35)", font: { size: 11 }, maxTicksLimit: 7, maxRotation: 0, autoSkip: true }
                    },
                    y: {
                        grid: { color: "rgba(0,0,0,0.04)" },
                        border: { display: false },
                        ticks: {
                            color: "rgba(0,0,0,0.35)",
                            font: { size: 11 },
                            maxTicksLimit: 5,
                            callback: (v: number) => `₹${(v / 1000).toFixed(1)}k`
                        }
                    }
                }
            }
        }) as Chart;

        return () => { chartRef.current?.destroy(); chartRef.current = null; };
    }, [data, cropName]);

    return (
        <div>
            {/* Stat pills */}
            <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
                {[
                    { label: "Total growth", value: `+${totalGrowth}%`, accent: theme.colors.primary },
                    { label: "CAGR", value: `${cagr}% / yr`, accent: "#2E7D32" },
                    { label: "Peak year", value: peakYear, accent: "#BA7517" },
                    { label: "Peak MSP", value: `₹${peak.toLocaleString("en-IN")}`, accent: "#6d3a9f" },
                ].map(({ label, value, accent }) => (
                    <div key={label} style={{ background: theme.colors.neutralLight, borderRadius: theme.radius.full, padding: "5px 13px", display: "flex", gap: 6, alignItems: "center", border: `1px solid ${theme.colors.neutralBorder}` }}>
                        <span style={{ fontSize: 10, color: theme.colors.text.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</span>
                        <span style={{ fontSize: 12, fontWeight: 800, color: accent, fontFamily: theme.fonts.heading }}>{value}</span>
                    </div>
                ))}
            </div>

            {/* Canvas */}
            <div ref={wrapRef} style={{ position: "relative", height: 180 }}>
                <canvas ref={canvasRef} role="img" aria-label={`MSP growth trend for ${cropName}`} />
                {tooltip.visible && (
                    <div style={{
                        position: "absolute",
                        left: Math.min(tooltip.x + 12, 330),
                        top: Math.max(tooltip.y - 44, 0),
                        pointerEvents: "none",
                        background: theme.colors.white,
                        border: `1px solid ${theme.colors.neutralBorder}`,
                        borderRadius: 8,
                        padding: "9px 14px",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
                        zIndex: 10,
                        whiteSpace: "nowrap",
                    }}>
                        <div style={{ fontSize: 10.5, color: theme.colors.text.muted, fontWeight: 600, marginBottom: 5 }}>{tooltip.year}</div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: theme.colors.text.primary, fontFamily: theme.fonts.heading }}>
                            ₹{tooltip.value.toLocaleString("en-IN")}
                            <span style={{ fontSize: 11, fontWeight: 600, color: "#2E7D32", marginLeft: 8 }}>{tooltip.growth}</span>
                        </div>
                        <div style={{ fontSize: 10.5, color: theme.colors.text.muted, marginTop: 2 }}>per quintal</div>
                    </div>
                )}
            </div>

            {/* Range label */}
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                <span style={{ fontSize: 10.5, color: theme.colors.text.muted }}>{data[0]?.year}</span>
                <span style={{ fontSize: 10.5, color: theme.colors.text.muted }}>{data[data.length - 1]?.year}</span>
            </div>
        </div>
    );
};

// ─── Helpers ──────────────────────────────────────────────────
const CATEGORIES: CropCategory[] = ["All Crops", "Cereals", "Pulses", "Oilseeds"];
const SORT_OPTIONS: SortOption[] = ["Highest Value", "Lowest Value", "Most Change", "A-Z"];

const seasonStyle = (season: string): React.CSSProperties => {
    const map: Record<string, { bg: string; color: string }> = {
        Winter: { bg: "#e8f4fd", color: "#1565C0" },
        Summer: { bg: "#fff3cd", color: "#856404" },
        Kharif: { bg: "#e8f5e9", color: "#1B5E20" },
    };
    const s = map[season] ?? { bg: "#f0f0f0", color: "#555" };
    return { fontSize: 11, fontWeight: 700, background: s.bg, color: s.color, borderRadius: theme.radius.full, padding: "3px 10px", display: "inline-block", letterSpacing: "0.3px" };
};

// ─── Main Page ────────────────────────────────────────────────
const MSPTrackerPage: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState<CropCategory>("All Crops");
    const [sortBy, setSortBy] = useState<SortOption>("Highest Value");
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 4;

    const [mspCrops, setMspCrops] = useState<ReturnType<typeof toMSPCrops>>([]);
    const [activeSeason, setActiveSeason] = useState("Kharif 2024");
    const [avgIncrease, setAvgIncrease] = useState("—");
    const [highestCrop, setHighestCrop] = useState({ name: "—", msp: 0 });
    const [mspGrowthData, setMspGrowthData] = useState<GrowthDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            try {
                setLoading(true);
                const { data: latest, year } = await fetchLatestMSP();
                const crops = toMSPCrops(latest);

                const cropsWithTrend = await Promise.all(
                    crops.map(async (crop) => {
                        try {
                            const { trend } = await fetchMSPTrend(crop.name);
                            return { ...crop, trendPoints: trend.map((t: any) => t.msp), rawTrend: trend };
                        } catch {
                            return crop;
                        }
                    })
                );

                setMspCrops(cropsWithTrend);

                const topCrop = [...latest].sort((a, b) => b.currentMSP - a.currentMSP)[0];
                setHighestCrop({ name: topCrop.commodity, msp: topCrop.currentMSP });

                const topCropData: any = cropsWithTrend.find(c => c.name === topCrop.commodity);
                if (topCropData?.rawTrend) {
                    setMspGrowthData(topCropData.rawTrend.map((t: any) => ({ year: t.year, value: t.msp })));
                }

                const changes = latest.map((c) => parseFloat(c.changePct));
                const avg = (changes.reduce((s, v) => s + v, 0) / changes.length).toFixed(1);
                setAvgIncrease(`+${avg}%`);
                setActiveSeason(`Kharif ${year.split("-")[0]}`);
            } catch (e: any) {
                setError(e.message ?? "Failed to load MSP data");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const filtered = useMemo(() => {
        let list = activeCategory === "All Crops"
            ? mspCrops
            : mspCrops.filter((c) => c.category === activeCategory);
        switch (sortBy) {
            case "Highest Value": list = [...list].sort((a, b) => b.currentMSP - a.currentMSP); break;
            case "Lowest Value": list = [...list].sort((a, b) => a.currentMSP - b.currentMSP); break;
            case "Most Change": list = [...list].sort((a, b) => b.change - a.change); break;
            case "A-Z": list = [...list].sort((a, b) => a.name.localeCompare(b.name)); break;
        }
        return list;
    }, [activeCategory, sortBy, mspCrops]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
    const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    const handleCategoryChange = (cat: CropCategory) => { setActiveCategory(cat); setCurrentPage(1); };

    if (loading) return (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: theme.fonts.body, color: theme.colors.text.muted, fontSize: 15 }}>Loading MSP data…</div>
    );
    if (error) return (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: theme.fonts.body, color: "red", fontSize: 15 }}>Error: {error}</div>
    );

    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: theme.colors.neutralLight, fontFamily: theme.fonts.body }}>
            <div style={{ flex: 1, overflow: "auto", padding: "26px 28px 40px" }}>

                {/* ── Page Header ─────────────────────────────────── */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 700, color: theme.colors.primary, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 5 }}>Economic Insights</div>
                        <h1 style={{ fontSize: 29, fontWeight: 800, color: theme.colors.text.primary, margin: "0 0 6px", letterSpacing: "-1px", fontFamily: theme.fonts.heading }}>MSP Tracker</h1>
                        <p style={{ color: theme.colors.text.secondary, fontSize: 13, margin: 0, maxWidth: 420, lineHeight: 1.55 }}>
                            Monitor Minimum Support Price trends across multiple seasons to optimize your harvest value and market timing.
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 4 }}>
                        <button style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", border: `1px solid ${theme.colors.neutralBorder}`, borderRadius: theme.radius.full, background: theme.colors.white, fontSize: 13, fontWeight: 600, color: theme.colors.neutral, cursor: "pointer", fontFamily: theme.fonts.body }}>
                            <ExportIcon /> Export
                        </button>
                    </div>
                </div>

                {/* ── Summary Stats ────────────────────────────────── */}
                <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
                    <div style={{ background: theme.colors.white, borderRadius: theme.radius.lg, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, boxShadow: theme.shadow.card }}>
                        <div style={{ width: 36, height: 36, borderRadius: theme.radius.md, background: theme.colors.primaryMuted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>↗</div>
                        <div>
                            <div style={{ fontSize: 10.5, color: theme.colors.text.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Avg. Increase</div>
                            <div style={{ fontSize: 17, fontWeight: 800, color: theme.colors.text.primary, fontFamily: theme.fonts.heading }}>{avgIncrease}</div>
                        </div>
                    </div>
                    <div style={{ background: theme.colors.white, borderRadius: theme.radius.lg, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12, boxShadow: theme.shadow.card }}>
                        <div style={{ width: 36, height: 36, borderRadius: theme.radius.md, background: theme.colors.secondaryLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>📅</div>
                        <div>
                            <div style={{ fontSize: 10.5, color: theme.colors.text.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Active Season</div>
                            <div style={{ fontSize: 17, fontWeight: 800, color: theme.colors.text.primary, fontFamily: theme.fonts.heading }}>{activeSeason}</div>
                        </div>
                    </div>
                    <div style={{ background: theme.colors.primary, borderRadius: theme.radius.lg, padding: "14px 22px", display: "flex", flexDirection: "column", justifyContent: "center", boxShadow: theme.shadow.elevated, flex: 1 }}>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase" }}>Highest MSP Crop</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: theme.colors.white, fontFamily: theme.fonts.heading, marginTop: 1 }}>{highestCrop.name}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: theme.colors.white, fontFamily: theme.fonts.heading, letterSpacing: "-0.5px" }}>
                            ₹{highestCrop.msp.toLocaleString("en-IN")} <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.75 }}>per quintal</span>
                        </div>
                    </div>
                </div>

                {/* ── Filter Tabs + Sort ──────────────────────────── */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 0 }}>
                    <div style={{ display: "flex", gap: 6 }}>
                        {CATEGORIES.map((cat) => (
                            <button key={cat} onClick={() => handleCategoryChange(cat)}
                                style={{ padding: "8px 18px", borderRadius: theme.radius.full, border: activeCategory === cat ? "none" : `1px solid ${theme.colors.neutralBorder}`, background: activeCategory === cat ? theme.colors.primary : theme.colors.white, color: activeCategory === cat ? theme.colors.white : theme.colors.neutral, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: theme.fonts.body, transition: "all 0.15s" }}>
                                {cat}
                            </button>
                        ))}
                    </div>
                    <div style={{ position: "relative" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: theme.colors.text.secondary }}>
                            <span style={{ fontWeight: 500 }}>Sort by:</span>
                            <button onClick={() => setShowSortMenu((v) => !v)}
                                style={{ display: "flex", alignItems: "center", gap: 5, background: theme.colors.white, border: `1px solid ${theme.colors.neutralBorder}`, borderRadius: theme.radius.full, padding: "7px 14px", fontSize: 13, fontWeight: 600, color: theme.colors.text.primary, cursor: "pointer", fontFamily: theme.fonts.body }}>
                                {sortBy} <ChevronDownIcon />
                            </button>
                        </div>
                        {showSortMenu && (
                            <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", background: theme.colors.white, borderRadius: theme.radius.md, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 20, minWidth: 160, overflow: "hidden", border: `1px solid ${theme.colors.neutralBorder}` }}>
                                {SORT_OPTIONS.map((opt) => (
                                    <button key={opt} onClick={() => { setSortBy(opt); setShowSortMenu(false); setCurrentPage(1); }}
                                        style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 16px", border: "none", background: sortBy === opt ? theme.colors.primaryMuted : "transparent", color: sortBy === opt ? theme.colors.primary : theme.colors.text.primary, fontSize: 13, fontWeight: sortBy === opt ? 700 : 500, cursor: "pointer", fontFamily: theme.fonts.body }}>
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Table ───────────────────────────────────────── */}
                <div style={{ background: theme.colors.white, borderRadius: theme.radius.lg, boxShadow: theme.shadow.card, overflow: "hidden", marginTop: 16 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.1fr 1.1fr 1fr 1fr", padding: "12px 24px", borderBottom: `1px solid ${theme.colors.neutralBorder}`, gap: 8 }}>
                        {["CROP DETAILS", "SEASON", "CURRENT MSP (2024)", "PREVIOUS (2023)", "CHANGE", "TREND"].map((h) => (
                            <div key={h} style={{ fontSize: 10.5, fontWeight: 700, color: theme.colors.text.muted, letterSpacing: "0.6px", textTransform: "uppercase" }}>{h}</div>
                        ))}
                    </div>

                    {paginated.length === 0 ? (
                        <div style={{ padding: "40px 24px", textAlign: "center", color: theme.colors.text.muted, fontSize: 14 }}>No crops found for this category.</div>
                    ) : (
                        paginated.map((crop, idx) => (
                            <div key={crop.id}
                                style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1.1fr 1.1fr 1fr 1fr", padding: "16px 24px", borderBottom: idx < paginated.length - 1 ? `1px solid ${theme.colors.neutralBorder}` : "none", alignItems: "center", gap: 8, transition: "background 0.15s" }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = theme.colors.neutralLight)}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                            >
                                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: theme.radius.md, background: theme.colors.neutralLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
                                        {crop.emoji}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 700, fontSize: 14, color: theme.colors.text.primary, fontFamily: theme.fonts.heading }}>{crop.name}</div>
                                        <div style={{ fontSize: 11.5, color: theme.colors.text.muted, marginTop: 1 }}>{crop.subLabel}</div>
                                    </div>
                                </div>
                                <div><span style={seasonStyle(crop.season)}>{crop.season}</span></div>
                                <div style={{ fontWeight: 700, fontSize: 14.5, color: theme.colors.text.primary, fontFamily: theme.fonts.heading }}>₹{crop.currentMSP.toLocaleString("en-IN")}</div>
                                <div style={{ fontSize: 14, color: theme.colors.text.secondary }}>₹{crop.previousMSP.toLocaleString("en-IN")}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                    <span style={{ color: theme.colors.primary, fontSize: 13, fontWeight: 700 }}>↑</span>
                                    <span style={{ fontSize: 13.5, fontWeight: 700, color: theme.colors.primary }}>₹{crop.change.toLocaleString("en-IN")}</span>
                                </div>
                                <div>
                                    <Sparkline points={crop.trendPoints} color={crop.trendColor} width={80} height={32} />
                                </div>
                            </div>
                        ))
                    )}

                    {/* Pagination */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 24px", borderTop: `1px solid ${theme.colors.neutralBorder}` }}>
                        <div style={{ fontSize: 12.5, color: theme.colors.text.muted }}>
                            Showing {filtered.length === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} crops
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                                style={{ width: 30, height: 30, borderRadius: theme.radius.sm, border: `1px solid ${theme.colors.neutralBorder}`, background: currentPage === 1 ? "#f5f5f5" : theme.colors.white, cursor: currentPage === 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: currentPage === 1 ? 0.5 : 1 }}>
                                <ChevronLeftIcon />
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                                <button key={pg} onClick={() => setCurrentPage(pg)}
                                    style={{ width: 30, height: 30, borderRadius: theme.radius.sm, border: pg === currentPage ? "none" : `1px solid ${theme.colors.neutralBorder}`, background: pg === currentPage ? theme.colors.primary : theme.colors.white, color: pg === currentPage ? theme.colors.white : theme.colors.text.primary, fontWeight: pg === currentPage ? 700 : 500, fontSize: 13, cursor: "pointer", fontFamily: theme.fonts.body }}>
                                    {pg}
                                </button>
                            ))}
                            <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}
                                style={{ width: 30, height: 30, borderRadius: theme.radius.sm, border: `1px solid ${theme.colors.neutralBorder}`, background: currentPage === totalPages ? "#f5f5f5" : theme.colors.white, cursor: currentPage === totalPages ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: currentPage === totalPages ? 0.5 : 1 }}>
                                <ChevronRightIcon />
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Bottom Row ──────────────────────────────────── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 18, marginTop: 22 }}>
                    <div style={{ background: theme.colors.white, borderRadius: theme.radius.lg, padding: "22px 24px", boxShadow: theme.shadow.card }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                            <span style={{ fontSize: 18 }}>🌾</span>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: 16, color: theme.colors.text.primary, fontFamily: theme.fonts.heading }}>
                                    MSP Growth Trend — {highestCrop.name}
                                </div>
                                <div style={{ fontSize: 11.5, color: theme.colors.text.muted, marginTop: 2 }}>
                                    {mspGrowthData.length > 0
                                        ? `${mspGrowthData[0].year} to ${mspGrowthData[mspGrowthData.length - 1].year} · hover for year-on-year detail`
                                        : "Historical data"}
                                </div>
                            </div>
                        </div>
                        {mspGrowthData.length > 0 ? (
                            <MSPGrowthChart data={mspGrowthData} cropName={highestCrop.name} />
                        ) : (
                            <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", color: theme.colors.text.muted, fontSize: 13 }}>
                                Sufficient trend data unavailable for this crop.
                            </div>
                        )}
                    </div>

                    <div style={{ background: theme.colors.white, borderRadius: theme.radius.lg, padding: "22px 22px", boxShadow: theme.shadow.card, display: "flex", flexDirection: "column", gap: 14 }}>
                        <div style={{ fontWeight: 800, fontSize: 16, color: theme.colors.text.primary, fontFamily: theme.fonts.heading }}>Market Alert</div>
                        <div style={{ fontSize: 13, color: theme.colors.text.secondary, lineHeight: 1.55 }}>Recommendations based on current MSP shifts and weather patterns.</div>
                        <div style={{ background: theme.colors.secondaryLight, borderRadius: theme.radius.md, padding: "12px 14px", border: `1px solid rgba(249,168,37,0.25)` }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                                <span style={{ color: theme.colors.secondary, display: "flex" }}><AlertIcon /></span>
                                <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.colors.secondary }}>Strong Trend Opportunity</span>
                            </div>
                            <div style={{ fontSize: 12, color: "#6b5400", lineHeight: 1.5 }}>
                                High historical yield margins are present on {highestCrop.name}. The engine predicts steady trajectory mapping.
                            </div>
                        </div>
                        <button style={{ background: theme.colors.primaryDark, color: theme.colors.white, border: "none", borderRadius: theme.radius.md, padding: "12px 16px", fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: theme.fonts.heading, textAlign: "center", marginTop: "auto", letterSpacing: "-0.2px" }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = theme.colors.primary)}
                            onMouseLeave={(e) => (e.currentTarget.style.background = theme.colors.primaryDark)}>
                            View Detailed Prediction
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28, paddingTop: 18, borderTop: `1px solid ${theme.colors.neutralBorder}` }}>
                    <div style={{ fontSize: 12, color: theme.colors.text.muted }}>© 2024 The Fertile Data Framework. All rights reserved.</div>
                    <div style={{ display: "flex", gap: 18 }}>
                        {["Data Sources", "Privacy Policy"].map((link) => (
                            <button key={link} style={{ fontSize: 12, color: theme.colors.text.muted, background: "none", border: "none", cursor: "pointer", fontFamily: theme.fonts.body }}>{link}</button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MSPTrackerPage;