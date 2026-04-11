import React, { useState, useEffect, useCallback } from "react";
import { theme } from "../styles/theme";
import type {
    CommoditySummary,
    MarketCategory,
    SortOption,
    PriceTrend,
    PricePoint,
    ArrivalPoint,
} from "../types/market";
import { marketApi } from "../services/marketApi";

// ─── Constants ────────────────────────────────────────────────
const CATEGORIES: MarketCategory[] = ["All", "Vegetables", "Cereals", "Pulses"];

const CATEGORY_ICONS: Record<string, string> = {
    Vegetables: "🥬",
    Cereals: "🌾",
    Pulses: "🫘",
};

const DAY_OPTIONS = [7, 30, 90, 365] as const;
type DayOption = (typeof DAY_OPTIONS)[number];

// ─── Helpers ──────────────────────────────────────────────────
function fmt(n: number | null | undefined, decimals = 0): string {
    if (n == null) return "—";
    return n.toLocaleString("en-IN", { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

function trendColor(t: PriceTrend): string {
    return t === "up" ? "#2E7D32" : t === "down" ? "#dc3545" : "#F9A825";
}
function trendBg(t: PriceTrend): string {
    return t === "up" ? "#e8f5e9" : t === "down" ? "#fdecea" : "#fff8e1";
}
function trendArrow(t: PriceTrend): string {
    return t === "up" ? "▲" : t === "down" ? "▼" : "—";
}

// ─── Sparkline ────────────────────────────────────────────────
const Sparkline: React.FC<{
    data: number[];
    trend: PriceTrend;
    width?: number;
    height?: number;
}> = ({ data, trend, width = 80, height = 36 }) => {
    if (!data.length) return null;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const pts = data.map((v, i) => ({
        x: (i / Math.max(data.length - 1, 1)) * width,
        y: height - ((v - min) / range) * (height - 4) - 2,
    }));
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const areaD = `${d} L ${pts[pts.length - 1].x} ${height} L 0 ${height} Z`;
    const color = trendColor(trend);
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
            <defs>
                <linearGradient id={`sg-${trend}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.18" />
                    <stop offset="100%" stopColor={color} stopOpacity="0" />
                </linearGradient>
            </defs>
            <path d={areaD} fill={`url(#sg-${trend})`} />
            <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3" fill={color} />
        </svg>
    );
};

// ─── Price Chart (detail drawer) ──────────────────────────────
const PriceLineChart: React.FC<{ data: PricePoint[]; color: string }> = ({ data, color }) => {
    const W = 560;
    const H = 160;
    const padL = 56;
    const padR = 16;
    const padT = 12;
    const padB = 32;

    if (!data.length) return <div style={{ height: H, display: "flex", alignItems: "center", justifyContent: "center", color: theme.colors.text.muted }}>No data</div>;

    const reversed = [...data].reverse();
    const mins = reversed.map((d) => d.min);
    const maxs = reversed.map((d) => d.max);

    const yMin = Math.min(...mins) * 0.97;
    const yMax = Math.max(...maxs) * 1.03;
    const yRange = yMax - yMin || 1;
    const iW = W - padL - padR;
    const iH = H - padT - padB;

    const toX = (i: number) => padL + (i / Math.max(reversed.length - 1, 1)) * iW;
    const toY = (v: number) => padT + iH - ((v - yMin) / yRange) * iH;

    // Modal price line
    const modalLine = reversed.map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(d.modal).toFixed(1)}`).join(" ");

    // Min-max band area
    const bandTop = reversed.map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(d.max).toFixed(1)}`).join(" ");
    const bandBottom = [...reversed].reverse().map((d, i) => `L ${toX(reversed.length - 1 - i).toFixed(1)} ${toY(d.min).toFixed(1)}`).join(" ");
    const bandPath = `${bandTop} ${bandBottom} Z`;

    // Y-axis ticks
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => ({
        y: padT + iH * (1 - t),
        label: fmt(yMin + yRange * t),
    }));

    // X-axis date labels (show ~5)
    const step = Math.max(1, Math.floor(reversed.length / 5));
    const xLabels = reversed
        .filter((_, i) => i % step === 0 || i === reversed.length - 1)
        .map((d) => {
            const idx = reversed.indexOf(d);
            return { x: toX(idx), label: d.date.slice(5) }; // MM-DD
        });

    return (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
            <defs>
                <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.12" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.03" />
                </linearGradient>
            </defs>
            {/* Y gridlines */}
            {yTicks.map((t, i) => (
                <g key={i}>
                    <line x1={padL} y1={t.y} x2={W - padR} y2={t.y} stroke={theme.colors.neutralBorder} strokeWidth="0.6" strokeDasharray="3,3" />
                    <text x={padL - 6} y={t.y + 4} textAnchor="end" fontSize="9.5" fill={theme.colors.text.muted} fontFamily={theme.fonts.body}>{t.label}</text>
                </g>
            ))}
            {/* Min-max band */}
            <path d={bandPath} fill="url(#bandGrad)" />
            {/* Modal line */}
            <path d={modalLine} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {/* X labels */}
            {xLabels.map((l, i) => (
                <text key={i} x={l.x} y={H - 6} textAnchor="middle" fontSize="9.5" fill={theme.colors.text.muted} fontFamily={theme.fonts.body}>{l.label}</text>
            ))}
        </svg>
    );
};

// Arrival bar chart
const ArrivalBarChart: React.FC<{ data: ArrivalPoint[]; color: string }> = ({ data, color }) => {
    const W = 560;
    const H = 100;
    const padL = 56;
    const padR = 16;
    const padT = 8;
    const padB = 24;

    const reversed = [...data].reverse().slice(-60);
    if (!reversed.length) return null;

    const maxQ = Math.max(...reversed.map((d) => d.qty));
    const iW = W - padL - padR;
    const iH = H - padT - padB;
    const barW = Math.max(1, iW / reversed.length - 1.5);

    return (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
            <text x={padL - 6} y={padT + 8} textAnchor="end" fontSize="9" fill={theme.colors.text.muted} fontFamily={theme.fonts.body}>Tonne</text>
            {reversed.map((d, i) => {
                const barH = (d.qty / maxQ) * iH;
                const x = padL + (i / reversed.length) * iW;
                const y = padT + iH - barH;
                return (
                    <rect key={i} x={x} y={y} width={barW} height={barH}
                        fill={color} fillOpacity="0.7" rx="1" />
                );
            })}
        </svg>
    );
};

// ─── Detail Drawer ────────────────────────────────────────────
const DetailDrawer: React.FC<{
    commodity: CommoditySummary;
    onClose: () => void;
}> = ({ commodity, onClose }) => {
    const [days, setDays] = useState<DayOption>(30);
    const [priceData, setPriceData] = useState<PricePoint[]>([]);
    const [arrivalData, setArrivalData] = useState<ArrivalPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const color = trendColor(commodity.trend);

    useEffect(() => {
        setLoading(true);
        Promise.all([
            marketApi.getPriceHistory(commodity.id, days),
            marketApi.getArrivalHistory(commodity.id, days),
        ]).then(([price, arrival]) => {
            setPriceData(price.data);
            setArrivalData(arrival.data);
            setLoading(false);
        }).catch(() => setLoading(false));
    }, [commodity.id, days]);

    return (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex" }}
            onClick={onClose}>
            {/* Backdrop */}
            <div style={{ flex: 1, background: "rgba(0,0,0,0.35)", backdropFilter: "blur(2px)" }} />
            {/* Drawer panel */}
            <div
                style={{
                    width: 620,
                    background: theme.colors.white,
                    height: "100vh",
                    overflowY: "auto",
                    boxShadow: "-8px 0 40px rgba(0,0,0,0.18)",
                    display: "flex",
                    flexDirection: "column",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ padding: "24px 28px 20px", borderBottom: `1px solid ${theme.colors.neutralBorder}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                        <div style={{ width: 52, height: 52, borderRadius: theme.radius.md, background: theme.colors.neutralLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{commodity.emoji}</div>
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 800, color: theme.colors.text.primary, fontFamily: theme.fonts.heading }}>{commodity.name}</div>
                            <div style={{ fontSize: 12, color: theme.colors.text.muted, marginTop: 2 }}>{commodity.category} · Last updated: {commodity.date}</div>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: theme.radius.full, border: `1px solid ${theme.colors.neutralBorder}`, background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: theme.colors.text.muted }}>✕</button>
                </div>

                <div style={{ padding: "22px 28px", flex: 1 }}>
                    {/* Price summary row */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
                        {[
                            { label: "Modal Price", value: `₹${fmt(commodity.modal)}`, sub: `/${commodity.unit}`, bold: true },
                            { label: "Min Price", value: `₹${fmt(commodity.min)}`, sub: `/${commodity.unit}` },
                            { label: "Max Price", value: `₹${fmt(commodity.max)}`, sub: `/${commodity.unit}` },
                            { label: "Arrival", value: fmt(commodity.arrivalQty, 0), sub: " T" },
                        ].map((s) => (
                            <div key={s.label} style={{ background: theme.colors.neutralLight, borderRadius: theme.radius.md, padding: "12px 14px" }}>
                                <div style={{ fontSize: 10.5, fontWeight: 700, color: theme.colors.text.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{s.label}</div>
                                <div style={{ fontSize: s.bold ? 20 : 16, fontWeight: 800, color: s.bold ? color : theme.colors.text.primary, fontFamily: theme.fonts.heading }}>
                                    {s.value}<span style={{ fontSize: 11, fontWeight: 500, opacity: 0.7 }}>{s.sub}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Change badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: color, background: trendBg(commodity.trend), borderRadius: theme.radius.full, padding: "4px 12px" }}>
                            {trendArrow(commodity.trend)} {commodity.change != null ? `₹${fmt(Math.abs(commodity.change), 2)} (${commodity.trendPercent}%)` : "Stable"} today
                        </span>
                    </div>

                    {/* Day filter */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: theme.colors.text.primary, fontFamily: theme.fonts.heading }}>Price History (Modal / Min / Max)</div>
                        <div style={{ display: "flex", gap: 4, background: theme.colors.neutralLight, borderRadius: theme.radius.full, padding: 3 }}>
                            {DAY_OPTIONS.map((d) => (
                                <button key={d} onClick={() => setDays(d)}
                                    style={{ padding: "5px 12px", borderRadius: theme.radius.full, border: "none", background: days === d ? color : "transparent", color: days === d ? "#fff" : theme.colors.text.secondary, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: theme.fonts.body, transition: "all 0.15s" }}>
                                    {d === 365 ? "1Y" : `${d}D`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: theme.colors.text.muted, fontSize: 13 }}>Loading chart…</div>
                    ) : (
                        <>
                            <div style={{ background: theme.colors.neutralLight, borderRadius: theme.radius.md, padding: "14px 12px 8px", marginBottom: 16 }}>
                                <PriceLineChart data={priceData} color={color} />
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: theme.colors.text.primary, fontFamily: theme.fonts.heading, marginBottom: 8 }}>Arrival Volume</div>
                            <div style={{ background: theme.colors.neutralLight, borderRadius: theme.radius.md, padding: "10px 12px 6px" }}>
                                <ArrivalBarChart data={arrivalData} color={color} />
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Commodity Card ───────────────────────────────────────────
const CommodityCard: React.FC<{
    item: CommoditySummary;
    onSelect: (item: CommoditySummary) => void;
}> = ({ item, onSelect }) => {
    const color = trendColor(item.trend);
    return (
        <div
            onClick={() => onSelect(item)}
            style={{
                background: theme.colors.white,
                borderRadius: theme.radius.lg,
                border: `1px solid ${theme.colors.neutralBorder}`,
                padding: "18px 20px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                cursor: "pointer",
                transition: "box-shadow 0.2s, transform 0.2s",
                boxShadow: theme.shadow.card,
                flex: "1 1 200px",
                minWidth: 190,
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = theme.shadow.elevated;
                e.currentTarget.style.transform = "translateY(-2px)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = theme.shadow.card;
                e.currentTarget.style.transform = "translateY(0)";
            }}
        >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: theme.radius.md, background: theme.colors.neutralLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{item.emoji}</div>
                    <div>
                        <div style={{ fontSize: 13.5, fontWeight: 800, color: theme.colors.text.primary, fontFamily: theme.fonts.heading, lineHeight: 1.2 }}>{item.name}</div>
                        <div style={{ fontSize: 10.5, color: theme.colors.text.muted, marginTop: 2 }}>{item.category}</div>
                    </div>
                </div>
                <span style={{ fontSize: 10.5, fontWeight: 700, color, background: trendBg(item.trend), borderRadius: theme.radius.full, padding: "2px 8px", flexShrink: 0 }}>
                    {trendArrow(item.trend)} {item.trendPercent}%
                </span>
            </div>

            {/* Price */}
            <div>
                <span style={{ fontSize: 24, fontWeight: 800, color: theme.colors.primaryDark, fontFamily: theme.fonts.heading }}>₹{fmt(item.modal)}</span>
                <span style={{ fontSize: 11, color: theme.colors.text.muted, marginLeft: 4 }}>/{item.unit}</span>
            </div>

            {/* Min/Max row */}
            <div style={{ display: "flex", gap: 12 }}>
                {[{ l: "MIN", v: item.min }, { l: "MAX", v: item.max }].map(({ l, v }) => (
                    <div key={l}>
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: theme.colors.text.muted, letterSpacing: "0.4px" }}>{l}</div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: theme.colors.text.secondary, fontFamily: theme.fonts.heading }}>₹{fmt(v)}</div>
                    </div>
                ))}
                <div style={{ marginLeft: "auto" }}>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: theme.colors.text.muted, letterSpacing: "0.4px" }}>ARRIVAL</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: theme.colors.text.secondary, fontFamily: theme.fonts.heading }}>{fmt(item.arrivalQty)} T</div>
                </div>
            </div>

            {/* Sparkline + change */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color }}>
                    {item.change != null ? `${item.change >= 0 ? "+" : ""}₹${fmt(Math.abs(item.change), 2)} today` : "Stable"}
                </div>
                <Sparkline data={item.sparkline} trend={item.trend} width={72} height={30} />
            </div>
        </div>
    );
};

// ─── Live Ticker ──────────────────────────────────────────────
const LiveTicker: React.FC<{ commodities: CommoditySummary[] }> = ({ commodities }) => {
    // Generate dynamic feed from absolute changes
    const dynamicFeed = commodities.slice(0, 8).map(c => ({
        commodity: c.name,
        market: "Maharashtra", // since datasets are primarily Maharashtra
        price: `₹${fmt(c.modal)}/qtl`,
        change: c.trend === 'stable' ? "— Stable" : `${c.trend === 'up' ? '▲' : '▼'} ${c.trendPercent}%`,
        positive: c.trend === 'up' || c.trend === 'stable'
    }));
    
    // Duplicate for infinite scroll smoothness
    const items = [...dynamicFeed, ...dynamicFeed];
    
    if (items.length === 0) return null;
    return (
        <div style={{ background: theme.colors.primaryDark, borderRadius: theme.radius.md, padding: "10px 16px", display: "flex", alignItems: "center", gap: 16, overflow: "hidden", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, flexShrink: 0, background: theme.colors.primary, borderRadius: theme.radius.full, padding: "4px 12px" }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80", display: "inline-block", animation: "pulse 1.5s infinite" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: theme.colors.white, letterSpacing: "0.08em", fontFamily: theme.fonts.heading }}>LIVE MANDI FEED</span>
            </div>
            <div style={{ overflow: "hidden", flex: 1 }}>
                <div style={{ display: "flex", gap: 32, animation: "ticker 24s linear infinite", whiteSpace: "nowrap" }}>
                    {items.map((item, i) => (
                        <span key={i} style={{ fontSize: 13, color: theme.colors.white, fontFamily: theme.fonts.body, display: "inline-flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontWeight: 700, fontFamily: theme.fonts.heading }}>{item.commodity}</span>
                            <span style={{ opacity: 0.6 }}>{item.market}:</span>
                            <span>{item.price}</span>
                            <span style={{ color: item.positive ? "#86efac" : "#fca5a5", fontWeight: 600 }}>{item.change}</span>
                            <span style={{ opacity: 0.3 }}>|</span>
                        </span>
                    ))}
                </div>
            </div>
            <style>{`
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.3; } }
      `}</style>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────
const MarketPricesPage: React.FC = () => {
    const [activeCategory, setActiveCategory] = useState<MarketCategory>("All");
    const [sortBy, setSortBy] = useState<SortOption>("price");
    const [showHighVolatility, setShowHighVolatility] = useState(false);
    const [commodities, setCommodities] = useState<CommoditySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selected, setSelected] = useState<CommoditySummary | null>(null);

    const fetchCommodities = useCallback(() => {
        setLoading(true);
        setError(null);
        marketApi
            .getCommodities(activeCategory)
            .then((data) => { setCommodities(data); setLoading(false); })
            .catch((err) => { setError(err.message); setLoading(false); });
    }, [activeCategory]);

    useEffect(() => { fetchCommodities(); }, [fetchCommodities]);

    const sorted = [...commodities]
        .filter((c) => !showHighVolatility || Math.abs(c.trendPercent) >= 2)
        .sort((a, b) => {
            if (sortBy === "price") return b.modal - a.modal;
            if (sortBy === "arrival") return (b.arrivalQty ?? 0) - (a.arrivalQty ?? 0);
            if (sortBy === "change") return Math.abs(b.change ?? 0) - Math.abs(a.change ?? 0);
            if (sortBy === "name") return a.name.localeCompare(b.name);
            return 0;
        });

    const catCounts = CATEGORIES.slice(1).map((cat) => ({
        cat,
        count: commodities.filter((c) => c.category === cat).length,
    }));

    return (
        <div style={{ flex: 1, overflow: "auto", background: theme.colors.neutralLight, display: "flex", flexDirection: "column", fontFamily: theme.fonts.body }}>
            <div style={{ padding: "24px 28px", display: "flex", gap: 20 }}>

                {/* ── Left Sidebar ──────────────────────────────── */}
                <div style={{ width: 196, flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                    {/* Categories */}
                    <div style={{ background: theme.colors.white, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.neutralBorder}`, padding: "18px 14px", boxShadow: theme.shadow.card }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: theme.colors.text.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Categories</div>
                        {CATEGORIES.map((cat) => {
                            const count = cat === "All" ? commodities.length : catCounts.find((c) => c.cat === cat)?.count ?? 0;
                            const active = activeCategory === cat;
                            return (
                                <button key={cat} onClick={() => setActiveCategory(cat)}
                                    style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "9px 10px", borderRadius: theme.radius.md, border: "none", background: active ? theme.colors.primaryDark : "transparent", color: active ? theme.colors.white : theme.colors.text.secondary, fontFamily: theme.fonts.heading, fontWeight: active ? 700 : 500, fontSize: 13, cursor: "pointer", marginBottom: 3, transition: "all 0.15s", textAlign: "left" }}>
                                    <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                                        <span>{cat === "All" ? "🏪" : CATEGORY_ICONS[cat]}</span>
                                        {cat}
                                    </span>
                                    <span style={{ fontSize: 11, fontWeight: 700, background: active ? "rgba(255,255,255,0.2)" : theme.colors.neutralLight, color: active ? theme.colors.white : theme.colors.text.muted, borderRadius: theme.radius.full, padding: "1px 7px" }}>{count}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Data source info */}
                    <div style={{ background: theme.colors.white, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.neutralBorder}`, padding: "16px 14px", boxShadow: theme.shadow.card }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: theme.colors.text.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>Data Source</div>
                        <div style={{ fontSize: 12, color: theme.colors.text.secondary, lineHeight: 1.6 }}>
                            Real price & arrival data from Excel datasets covering <strong>2014–2025</strong>.
                        </div>
                        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
                            {["Vegetable_Price.xlsx", "Cereal_Price.xlsx"].map((f) => (
                                <div key={f} style={{ fontSize: 11, color: theme.colors.primary, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                                    <span>📄</span> {f}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Main Content ───────────────────────────────── */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16, minWidth: 0 }}>
                    <LiveTicker commodities={commodities} />

                    {/* Section header */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: theme.colors.text.primary, fontFamily: theme.fonts.heading }}>
                                {activeCategory === "All" ? "All Commodities" : `${activeCategory} Mandi Prices`}
                            </div>
                            <div style={{ fontSize: 12, color: theme.colors.text.muted, marginTop: 2 }}>
                                {loading ? "Loading…" : `${sorted.length} commodities · Click any card for full price history`}
                            </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                            {/* Sort */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortOption)}
                                style={{ padding: "8px 12px", borderRadius: theme.radius.md, border: `1.5px solid ${theme.colors.neutralBorder}`, background: theme.colors.white, fontSize: 12.5, fontWeight: 600, color: theme.colors.text.secondary, cursor: "pointer", fontFamily: theme.fonts.body, outline: "none" }}
                            >
                                <option value="price">⇅ Sort: Price</option>
                                <option value="arrival">⇅ Sort: Arrival</option>
                                <option value="change">⇅ Sort: Change</option>
                                <option value="name">⇅ Sort: Name</option>
                            </select>
                            {/* High Volatility */}
                            <button
                                onClick={() => setShowHighVolatility((v) => !v)}
                                style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: theme.radius.md, border: `1.5px solid ${showHighVolatility ? theme.colors.status.up : theme.colors.neutralBorder}`, background: showHighVolatility ? "#fdecea" : theme.colors.white, color: showHighVolatility ? theme.colors.status.up : theme.colors.text.secondary, fontFamily: theme.fonts.heading, fontWeight: 600, fontSize: 12, cursor: "pointer", transition: "all 0.15s" }}
                            >
                                ⚡ High Volatility
                            </button>
                        </div>
                    </div>

                    {/* Error state */}
                    {error && (
                        <div style={{ background: "#fdecea", borderRadius: theme.radius.md, padding: "14px 18px", border: "1px solid #f5c6cb" }}>
                            <div style={{ fontWeight: 700, color: "#721c24", fontSize: 14, marginBottom: 4 }}>⚠ Could not reach API</div>
                            <div style={{ fontSize: 12.5, color: "#721c24", lineHeight: 1.55 }}>
                                Make sure the Node.js backend is running:<br />
                                <code style={{ background: "rgba(0,0,0,0.06)", padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>cd backend && npm run dev</code>
                            </div>
                            <button onClick={fetchCommodities} style={{ marginTop: 10, padding: "7px 16px", borderRadius: theme.radius.full, border: "none", background: "#721c24", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: theme.fonts.body }}>Retry</button>
                        </div>
                    )}

                    {/* Loading skeleton */}
                    {loading && !error && (
                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                            {[1, 2, 3].map((i) => (
                                <div key={i} style={{ flex: "1 1 200px", minWidth: 190, height: 180, borderRadius: theme.radius.lg, background: "#e8e8e8", animation: "pulse 1.5s infinite" }} />
                            ))}
                        </div>
                    )}

                    {/* Commodity Cards */}
                    {!loading && !error && (
                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
                            {sorted.map((item) => (
                                <CommodityCard key={item.id} item={item} onSelect={setSelected} />
                            ))}
                            {sorted.length === 0 && (
                                <div style={{ flex: 1, textAlign: "center", padding: "40px 0", color: theme.colors.text.muted, fontSize: 14 }}>
                                    No commodities match your filter.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Summary stats bar */}
                    {!loading && !error && sorted.length > 0 && (
                        <div style={{ background: theme.colors.white, borderRadius: theme.radius.lg, border: `1px solid ${theme.colors.neutralBorder}`, padding: "16px 22px", boxShadow: theme.shadow.card, display: "flex", gap: 28 }}>
                            {[
                                { label: "Avg. Modal Price", value: `₹${fmt(sorted.reduce((s, c) => s + c.modal, 0) / sorted.length)}` },
                                { label: "Total Arrival", value: `${fmt(sorted.reduce((s, c) => s + (c.arrivalQty ?? 0), 0))} T` },
                                { label: "Rising Today", value: String(sorted.filter((c) => c.trend === "up").length) },
                                { label: "Falling Today", value: String(sorted.filter((c) => c.trend === "down").length) },
                                { label: "Stable", value: String(sorted.filter((c) => c.trend === "stable").length) },
                            ].map(({ label, value }) => (
                                <div key={label}>
                                    <div style={{ fontSize: 10.5, fontWeight: 700, color: theme.colors.text.muted, textTransform: "uppercase", letterSpacing: "0.4px" }}>{label}</div>
                                    <div style={{ fontSize: 16, fontWeight: 800, color: theme.colors.text.primary, fontFamily: theme.fonts.heading, marginTop: 2 }}>{value}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Detail drawer */}
            {selected && <DetailDrawer commodity={selected} onClose={() => setSelected(null)} />}
        </div>
    );
};

export default MarketPricesPage;