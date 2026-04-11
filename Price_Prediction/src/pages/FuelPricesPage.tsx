import React, { useState, useEffect } from "react";
import type { FuelTrendTab } from "../types/fuel";
import { theme } from "../styles/theme";

// ─── Icons ────────────────────────────────────────────────────
const BellAlertIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        <line x1="12" y1="2" x2="12" y2="4" />
    </svg>
);
const MapIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
);
const ExportIcon: React.FC = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);
const LocationPinIcon: React.FC = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
    </svg>
);
const GlobeIcon: React.FC = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
);

const TrendArrow: React.FC<{ change: number }> = ({ change }) => {
    if (change > 0) return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#dc3545" strokeWidth="2.5">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
        </svg>
    );
    if (change < 0) return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2.5">
            <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" /><polyline points="16 17 22 17 22 11" />
        </svg>
    );
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12" /><polyline points="15 8 19 12 15 16" />
        </svg>
    );
};

// ─── Chart ────────────────────────────────────────────────────
const TREND_TABS: FuelTrendTab[] = ["Recent", "Monthly", "Yearly"];
const MAX_HEIGHT = 160;

const chartDataMap: Record<FuelTrendTab, any> = {
    Recent: [],
    Monthly: [],
    Yearly: [],
};

const tabSubtitles: Record<FuelTrendTab, string> = {
    Recent: "Recent 8 Months",
    Monthly: "Trailing 12 Months",
    Yearly: "Annual averages 2015–2025",
};

// ─── Page ─────────────────────────────────────────────────────
const FuelPricesPage: React.FC = () => {
    const [trendTab, setTrendTab] = useState<FuelTrendTab>("Monthly");
    const [hoveredRow, setHoveredRow] = useState<number | null>(null);

    const [fuelSummary, setFuelSummary] = useState<any>(null);
    const [fuelRegions, setFuelRegions] = useState<any[]>([]);
    const [chartDataMap, setChartDataMap] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("http://localhost:5000/api/fuel")
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setFuelSummary(data.fuelSummary);
                    setFuelRegions(data.fuelRegions);
                    setChartDataMap(data.chartDataMap);
                }
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading || !fuelSummary) {
         return <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: theme.colors.text.muted, fontFamily: theme.fonts.body }}>Loading fuel data...</div>;
    }

    const chartBars = chartDataMap[trendTab] || [];
    // Normalize bars relative to visible max so bars fill the chart nicely
    const maxBar = Math.max(...chartBars.flatMap((b: any) => [b.diesel, b.petrol]));
    const minBar = Math.min(...chartBars.flatMap((b: any) => [b.diesel, b.petrol]));
    const range = maxBar - minBar || 1;

    // For yearly tab use full range; for recent/monthly use relative to min for detail
    const isYearly = trendTab === "Yearly";
    const barHeight = (val: number) =>
        isYearly
            ? Math.round((val / maxBar) * MAX_HEIGHT)
            : Math.round(((val - minBar) / range) * (MAX_HEIGHT * 0.7) + MAX_HEIGHT * 0.15);

    const dieselChange = fuelSummary.dieselChangePct;
    const petrolChange = fuelSummary.petrolChangePct;

    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: theme.colors.neutralLight, fontFamily: theme.fonts.body }}>
            <div style={{ flex: 1, overflow: "auto", padding: "26px 28px 40px" }}>

                {/* Data source badge */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: theme.colors.text.muted, background: theme.colors.white, border: `1px solid ${theme.colors.neutralBorder}`, borderRadius: theme.radius.full, padding: "4px 12px", display: "flex", alignItems: "center", gap: 5 }}>
                        📄 {fuelSummary.dataSource}
                    </div>
                </div>

                {/* ── Hero Row ──────────────────────────────────────── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 22 }}>

                    {/* Primary — Diesel */}
                    <div style={{ background: `linear-gradient(145deg, ${theme.colors.primaryDark} 0%, ${theme.colors.primary} 100%)`, borderRadius: theme.radius.lg, padding: "28px 32px", color: theme.colors.white, position: "relative", overflow: "hidden", boxShadow: theme.shadow.elevated }}>
                        <div style={{ position: "absolute", inset: 0, opacity: 0.05, backgroundImage: "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)", backgroundSize: "12px 12px" }} />
                        <div style={{ position: "relative", zIndex: 1 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.7, letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>
                                Maharashtra Average · Live CSV
                            </div>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
                                <h2 style={{ fontSize: 28, fontWeight: 800, margin: 0, letterSpacing: "-0.5px", fontFamily: theme.fonts.heading, lineHeight: 1.2, maxWidth: 260 }}>
                                    Agri-Diesel (HSD)
                                </h2>
                                <span style={{
                                    background: dieselChange >= 0 ? theme.colors.secondary : "#dc3545",
                                    color: dieselChange >= 0 ? "#3d2800" : "#fff",
                                    fontSize: 12, fontWeight: 800, borderRadius: theme.radius.full,
                                    padding: "5px 12px", display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginTop: 4
                                }}>
                                    {dieselChange >= 0 ? "↗" : "↘"} {dieselChange >= 0 ? "+" : ""}{dieselChange}%
                                </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "18px 0 10px" }}>
                                <span style={{ fontSize: 52, fontWeight: 800, fontFamily: theme.fonts.heading, letterSpacing: "-2px", lineHeight: 1 }}>
                                    ₹{fuelSummary.dieselLatest.toFixed(2)}
                                </span>
                                <span style={{ fontSize: 15, opacity: 0.75, fontWeight: 500 }}>per Liter</span>
                            </div>
                            <div style={{ fontSize: 12, opacity: 0.65, marginBottom: 22 }}>
                                Annual range: ₹{fuelSummary.dieselMin} – ₹{fuelSummary.dieselMax} / L
                            </div>
                            <div style={{ display: "flex", gap: 12 }}>
                                <button style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: theme.radius.full, color: theme.colors.white, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: theme.fonts.body }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}>
                                    <BellAlertIcon /> Set Price Alert
                                </button>
                                <button style={{ display: "flex", alignItems: "center", gap: 7, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: theme.radius.full, color: theme.colors.white, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: theme.fonts.body }}
                                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.25)")}
                                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.15)")}>
                                    <MapIcon /> View Regional Map
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Secondary — Petrol */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <div style={{ background: theme.colors.white, borderRadius: theme.radius.lg, padding: "22px 26px", boxShadow: theme.shadow.card, flex: 1 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: theme.colors.primary, letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: 8 }}>
                                Secondary Fuel · Local Average
                            </div>
                            <h3 style={{ fontSize: 22, fontWeight: 800, color: theme.colors.text.primary, margin: "0 0 4px", fontFamily: theme.fonts.heading, letterSpacing: "-0.5px" }}>
                                Petrol (Maharashtra)
                            </h3>
                            <div style={{ fontSize: 12, color: theme.colors.text.muted, marginBottom: 16 }}>
                                Monthly weighted average · Source: CSV
                            </div>
                            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 16 }}>
                                <span style={{ fontSize: 36, fontWeight: 800, color: theme.colors.text.primary, fontFamily: theme.fonts.heading, letterSpacing: "-1px" }}>
                                    ₹{fuelSummary.petrolLatest.toFixed(2)}
                                </span>
                                <span style={{ fontSize: 13, fontWeight: 700, color: petrolChange >= 0 ? "#dc3545" : theme.colors.primary }}>
                                    {petrolChange >= 0 ? "↑" : "↓"} {petrolChange >= 0 ? "+" : ""}{petrolChange}%
                                </span>
                            </div>

                            {/* Daily Range */}
                            <div>
                                <div style={{ fontSize: 10, fontWeight: 700, color: theme.colors.text.muted, letterSpacing: "1px", textTransform: "uppercase", marginBottom: 8 }}>
                                    2025 Price Range
                                </div>
                                <div style={{ position: "relative", height: 6, background: "#e8e8e8", borderRadius: 4, marginBottom: 8, overflow: "hidden" }}>
                                    {/* fill proportional to min/max within the year */}
                                    <div style={{
                                        position: "absolute",
                                        left: `${((fuelSummary.petrolMin - 100) / (fuelSummary.petrolMax - 100)) * 10}%`,
                                        right: "5%",
                                        top: 0, bottom: 0,
                                        background: `linear-gradient(90deg, ${theme.colors.primaryLight}, ${theme.colors.secondary})`,
                                        borderRadius: 4
                                    }} />
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between" }}>
                                    <span style={{ fontSize: 11.5, fontWeight: 700, color: theme.colors.text.secondary }}>₹{fuelSummary.petrolMin.toFixed(2)}</span>
                                    <span style={{ fontSize: 11.5, fontWeight: 700, color: theme.colors.text.secondary }}>₹{fuelSummary.petrolMax.toFixed(2)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Chart + Check Local Pumps ──────────────────────── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 18, marginBottom: 22 }}>

                    <div style={{ background: theme.colors.white, borderRadius: theme.radius.lg, padding: "22px 26px", boxShadow: theme.shadow.card }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 22 }}>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: 17, color: theme.colors.text.primary, fontFamily: theme.fonts.heading }}>Price Trend Comparison</div>
                                <div style={{ fontSize: 12, color: theme.colors.text.muted, marginTop: 3 }}>{tabSubtitles[trendTab]}</div>
                            </div>
                            <div style={{ display: "flex", gap: 3, background: theme.colors.neutralLight, borderRadius: theme.radius.full, padding: "3px" }}>
                                {TREND_TABS.map(tab => (
                                    <button key={tab} onClick={() => setTrendTab(tab)}
                                        style={{ padding: "6px 14px", borderRadius: theme.radius.full, border: "none", background: trendTab === tab ? theme.colors.primary : "transparent", color: trendTab === tab ? theme.colors.white : theme.colors.text.secondary, fontWeight: 700, fontSize: 12.5, cursor: "pointer", fontFamily: theme.fonts.body, transition: "all 0.15s" }}>
                                        {tab}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Grouped bar chart */}
                        <div style={{ display: "flex", alignItems: "flex-end", gap: trendTab === "Yearly" ? 6 : 10, height: MAX_HEIGHT + 28, paddingBottom: 24, position: "relative" }}>
                            {chartBars.map((bar: any, i: number) => {
                                const dH = barHeight(bar.diesel);
                                const pH = barHeight(bar.petrol);
                                return (
                                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", height: "100%", gap: 5, position: "relative" }}>
                                        <div style={{ display: "flex", alignItems: "flex-end", gap: trendTab === "Yearly" ? 2 : 4, width: "100%" }}>
                                            <div style={{ flex: 1, height: dH, borderRadius: "6px 6px 4px 4px", background: theme.colors.primary, transition: "height 0.4s ease", minHeight: 4 }} title={`₹${bar.diesel}`} />
                                            <div style={{ flex: 1, height: pH, borderRadius: "6px 6px 4px 4px", background: theme.colors.secondary, transition: "height 0.4s ease", minHeight: 4 }} title={`₹${bar.petrol}`} />
                                        </div>
                                        <div style={{ position: "absolute", bottom: 0, fontSize: trendTab === "Yearly" ? 9 : 10.5, color: theme.colors.text.muted, fontWeight: 600, letterSpacing: "0.2px", whiteSpace: "nowrap" }}>{bar.label}</div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Legend + note */}
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 4 }}>
                            {[{ label: "Diesel (HSD)", color: theme.colors.primary }, { label: "Petrol", color: theme.colors.secondary }].map(({ label, color }) => (
                                <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: color }} />
                                    <span style={{ fontSize: 12, color: theme.colors.text.secondary, fontWeight: 600 }}>{label}</span>
                                </div>
                            ))}
                            <span style={{ fontSize: 10.5, color: theme.colors.text.muted, marginLeft: 8 }}>₹/Litre</span>
                        </div>
                    </div>

                    {/* Check Local Pumps */}
                    <div style={{ background: theme.colors.secondary, borderRadius: theme.radius.lg, padding: "26px 22px", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 12, boxShadow: "0 4px 20px rgba(249,168,37,0.3)" }}>
                        <div style={{ color: "rgba(60,35,0,0.7)", display: "flex" }}><LocationPinIcon /></div>
                        <div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#3d2800", fontFamily: theme.fonts.heading, lineHeight: 1.25, marginBottom: 8 }}>Check Local Pumps</div>
                            <div style={{ fontSize: 12.5, color: "rgba(60,35,0,0.7)", lineHeight: 1.6 }}>Compare prices within 20km of your farm.</div>
                        </div>
                        <button style={{ marginTop: "auto", background: theme.colors.primaryDark, color: theme.colors.white, border: "none", borderRadius: theme.radius.md, padding: "12px 20px", fontWeight: 700, fontSize: 13.5, cursor: "pointer", fontFamily: theme.fonts.heading, width: "100%", textAlign: "center" }}
                            onMouseEnter={e => (e.currentTarget.style.background = theme.colors.primary)}
                            onMouseLeave={e => (e.currentTarget.style.background = theme.colors.primaryDark)}>
                            Search Nearby
                        </button>
                    </div>
                </div>

                {/* ── Regional Price Index ───────────────────────────── */}
                <div style={{ background: theme.colors.white, borderRadius: theme.radius.lg, padding: "22px 26px", boxShadow: theme.shadow.card, marginBottom: 22 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 17, color: theme.colors.text.primary, fontFamily: theme.fonts.heading }}>Regional Price Index</div>
                            <div style={{ fontSize: 11.5, color: theme.colors.text.muted, marginTop: 2 }}>Maharashtra figures from CSV · others are market estimates</div>
                        </div>
                        <button style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: theme.colors.primary, background: "none", border: "none", cursor: "pointer", fontFamily: theme.fonts.body }}>
                            Export Report <ExportIcon />
                        </button>
                    </div>

                    {/* Header */}
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px", gap: 8, paddingBottom: 12, borderBottom: `1px solid ${theme.colors.neutralBorder}`, marginBottom: 4, background: theme.colors.neutralLight, padding: "10px 8px", borderRadius: theme.radius.sm }}>
                        {["REGION / ZONE", "DIESEL (AVG)", "PETROL (AVG)", "MOM CHANGE", "TREND"].map(h => (
                            <div key={h} style={{ fontSize: 10.5, fontWeight: 700, color: theme.colors.text.muted, letterSpacing: "0.6px", textTransform: "uppercase" }}>{h}</div>
                        ))}
                    </div>

                    {fuelRegions.map((row: any, idx: number) => {
                        const changeColor = row.change24h > 0 ? "#dc3545" : row.change24h < 0 ? theme.colors.primary : theme.colors.text.muted;
                        const changeStr = row.change24h === 0 ? "₹0.00" : `${row.change24h > 0 ? "+" : ""}₹${Math.abs(row.change24h).toFixed(2)}`;
                        return (
                            <div key={row.id}
                                style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 80px", gap: 8, padding: "14px 8px", borderBottom: idx < fuelRegions.length - 1 ? `1px solid ${theme.colors.neutralBorder}` : "none", alignItems: "center", transition: "background 0.12s", borderRadius: theme.radius.sm, background: hoveredRow === row.id ? theme.colors.neutralLight : "transparent" }}
                                onMouseEnter={() => setHoveredRow(row.id)}
                                onMouseLeave={() => setHoveredRow(null)}>
                                <div style={{ fontWeight: 600, fontSize: 14, color: theme.colors.text.primary }}>{row.region}</div>
                                <div style={{ fontSize: 14, color: theme.colors.text.primary, fontWeight: 500 }}>₹{row.dieselAvg.toFixed(2)}</div>
                                <div style={{ fontSize: 14, color: theme.colors.text.primary, fontWeight: 500 }}>₹{row.petrolAvg.toFixed(2)}</div>
                                <div style={{ fontSize: 13.5, fontWeight: 700, color: changeColor }}>{changeStr}</div>
                                <div style={{ display: "flex", alignItems: "center" }}><TrendArrow change={row.change24h} /></div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Bottom Banners ─────────────────────────────────── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                    {/* Crude Outlook */}
                    <div style={{ background: `linear-gradient(135deg, ${theme.colors.primaryDark} 0%, ${theme.colors.primary} 100%)`, borderRadius: theme.radius.lg, padding: "24px 28px", color: theme.colors.white, display: "flex", gap: 18, alignItems: "flex-start", boxShadow: theme.shadow.elevated, position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: "repeating-linear-gradient(45deg, #fff 0, #fff 1px, transparent 0, transparent 50%)", backgroundSize: "10px 10px" }} />
                        <div style={{ flexShrink: 0, opacity: 0.9, position: "relative", zIndex: 1, marginTop: 4 }}><GlobeIcon /></div>
                        <div style={{ position: "relative", zIndex: 1 }}>
                            <div style={{ fontSize: 17, fontWeight: 800, fontFamily: theme.fonts.heading, marginBottom: 8 }}>Global Brent Crude Outlook</div>
                            <div style={{ fontSize: 12.5, opacity: 0.8, lineHeight: 1.65, marginBottom: 14 }}>
                                Maharashtra diesel has declined from ₹97.34 avg (2022) to ₹90.78 avg (2025) — a 6.8% drop over 3 years. OPEC+ shifts may sustain stability.
                            </div>
                            <button style={{ background: "none", border: "none", color: theme.colors.secondary, fontWeight: 700, fontSize: 13, cursor: "pointer", fontFamily: theme.fonts.body, padding: 0 }}>
                                Read Full Analysis →
                            </button>
                        </div>
                    </div>

                    {/* Bulk Purchase */}
                    <div style={{ borderRadius: theme.radius.lg, padding: "28px 28px", background: "linear-gradient(135deg, #2a1800 0%, #5a3200 100%)", color: theme.colors.white, display: "flex", flexDirection: "column", justifyContent: "center", gap: 10, boxShadow: theme.shadow.card, position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", inset: 0, opacity: 0.12, backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Ccircle cx='7' cy='7' r='1'/%3E%3Ccircle cx='27' cy='7' r='1'/%3E%3Ccircle cx='47' cy='7' r='1'/%3E%3Ccircle cx='17' cy='17' r='1'/%3E%3Ccircle cx='37' cy='17' r='1'/%3E%3C/g%3E%3C/svg%3E\")" }} />
                        <div style={{ position: "relative", zIndex: 1 }}>
                            <h3 style={{ fontSize: 24, fontWeight: 800, fontFamily: theme.fonts.heading, margin: "0 0 8px", letterSpacing: "-0.5px" }}>Bulk Purchase?</h3>
                            <p style={{ fontSize: 13, opacity: 0.82, margin: "0 0 18px", lineHeight: 1.55 }}>Save up to 4% on orders above 5,000L with our logistics partner.</p>
                            <button style={{ background: theme.colors.secondary, color: "#3d2800", border: "none", borderRadius: theme.radius.full, padding: "11px 24px", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: theme.fonts.heading, letterSpacing: "0.5px", textTransform: "uppercase" }}
                                onMouseEnter={e => (e.currentTarget.style.opacity = "0.88")}
                                onMouseLeave={e => (e.currentTarget.style.opacity = "1")}>
                                Get Quote
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default FuelPricesPage;