import React, { useState, useEffect, useCallback } from "react";
import { theme } from "../styles/theme";
import {
    fetchWeather,
    decodeWeatherCode,
    degreesToCompass,
    soilMoistureLabel,
} from "../services/weatherApi";
import type {
    WeatherApiResult,
    DailyWeather,
    CurrentWeather,
    SoilData,
    ConditionKey,
    GeoLocation,
} from "../services/weatherApi";

// ─── Default location (Central Valley Farm, CA) ───────────────
const DEFAULT_LOCATION: GeoLocation = {
    latitude: 19.0760,
    longitude: 72.8777,
    label: "Mumbai, Maharashtra, IN",
};

// ─── °C → °F ─────────────────────────────────────────────────
const toF = (c: number) => Math.round(c * 9 / 5 + 32);

// ─── Icons ────────────────────────────────────────────────────
const WeatherIcon: React.FC<{ condition: ConditionKey; size?: number }> = ({ condition, size = 32 }) => {
    const s = size;
    switch (condition) {
        case "Sunny":
            return (
                <svg width={s} height={s} viewBox="0 0 24 24" fill="#F9A825" stroke="#F9A825" strokeWidth="0.5">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" strokeWidth="2" /><line x1="12" y1="21" x2="12" y2="23" strokeWidth="2" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" strokeWidth="2" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" strokeWidth="2" />
                    <line x1="1" y1="12" x2="3" y2="12" strokeWidth="2" /><line x1="21" y1="12" x2="23" y2="12" strokeWidth="2" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" strokeWidth="2" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" strokeWidth="2" />
                </svg>
            );
        case "Partly Cloudy": case "Mixed":
            return (
                <svg width={s} height={s} viewBox="0 0 24 24" fill="none" strokeWidth="1.8">
                    <path d="M12 2a5 5 0 0 1 5 4.5A4 4 0 0 1 17 15H8a4 4 0 0 1-1-7.87A5 5 0 0 1 12 2z" fill="#ccc" stroke="#aaa" />
                    <circle cx="8" cy="8" r="3" fill="#F9A825" stroke="none" />
                </svg>
            );
        case "Cloudy": case "Foggy":
            return (
                <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.8">
                    <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" fill="#ddd" />
                </svg>
            );
        case "Light Rain": case "Drizzle":
            return (
                <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="#5b9bd5" strokeWidth="1.8">
                    <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
                    <line x1="8" y1="19" x2="8" y2="21" /><line x1="12" y1="19" x2="12" y2="21" /><line x1="16" y1="19" x2="16" y2="21" />
                </svg>
            );
        case "Rain": case "Showers":
            return (
                <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="#4a90d9" strokeWidth="1.8">
                    <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
                    <line x1="8" y1="19" x2="8" y2="23" /><line x1="12" y1="17" x2="12" y2="21" /><line x1="16" y1="19" x2="16" y2="23" />
                </svg>
            );
        case "Snow":
            return (
                <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="#90caf9" strokeWidth="1.8">
                    <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
                    <line x1="8" y1="19" x2="9" y2="21" /><line x1="12" y1="19" x2="13" y2="21" /><line x1="16" y1="19" x2="17" y2="21" />
                </svg>
            );
        case "Thunderstorm":
            return (
                <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="#7c4dff" strokeWidth="1.8">
                    <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 9" />
                    <polyline points="13 11 9 17 15 17 11 23" stroke="#F9A825" fill="none" />
                </svg>
            );
        default:
            return <span style={{ fontSize: s * 0.7 }}>🌤</span>;
    }
};

const PinIcon: React.FC = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
    </svg>
);

const FieldMapIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary} strokeWidth="2">
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
    </svg>
);

const RadarExpandIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
        <polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" />
        <line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" />
    </svg>
);

// ─── Precipitation Radar SVG (static decorative) ──────────────
const PrecipRadar: React.FC<{ nextRainDate?: string }> = ({ nextRainDate }) => (
    <svg width="100%" height="100%" viewBox="0 0 220 160" preserveAspectRatio="xMidYMid slice">
        <rect width="220" height="160" fill="#0a1a0a" />
        {[60, 45, 30, 18].map((r, i) => <circle key={i} cx="110" cy="80" r={r} fill="none" stroke="rgba(46,125,50,0.25)" strokeWidth="0.8" />)}
        <line x1="110" y1="20" x2="110" y2="140" stroke="rgba(46,125,50,0.15)" strokeWidth="0.6" />
        <line x1="50" y1="80" x2="170" y2="80" stroke="rgba(46,125,50,0.15)" strokeWidth="0.6" />
        <defs>
            <radialGradient id="sweep" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#2E7D32" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#2E7D32" stopOpacity="0" />
            </radialGradient>
        </defs>
        <path d="M110 80 L150 35 A60 60 0 0 1 170 80 Z" fill="url(#sweep)" opacity="0.5" />
        <ellipse cx="135" cy="55" rx="14" ry="10" fill="#F9A825" opacity="0.35" />
        <ellipse cx="128" cy="62" rx="9" ry="7" fill="#dc3545" opacity="0.45" />
        <ellipse cx="148" cy="65" rx="7" ry="6" fill="#F9A825" opacity="0.25" />
        <ellipse cx="155" cy="72" rx="5" ry="4" fill="#2E7D32" opacity="0.5" />
        <circle cx="110" cy="80" r="3" fill="#2E7D32" />
        <circle cx="110" cy="80" r="6" fill="none" stroke="#2E7D32" strokeWidth="1" opacity="0.5" />
    </svg>
);

// ─── AQI / Wind bars ─────────────────────────────────────────
const AQIBar: React.FC<{ value: number }> = ({ value }) => {
    const pct = Math.min((value / 200) * 100, 100);
    const color = value <= 50 ? theme.colors.primary : value <= 100 ? theme.colors.secondary : "#dc3545";
    return (
        <div style={{ height: 5, background: "#e0e0e0", borderRadius: 4, overflow: "hidden", marginTop: 8, width: "80%" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 4, transition: "width 0.6s ease" }} />
        </div>
    );
};

const WindBars: React.FC<{ speed: number }> = ({ speed }) => {
    // 4 bars, fill based on speed (km/h): 0-10, 10-20, 20-40, 40+
    const filled = speed < 10 ? 1 : speed < 20 ? 2 : speed < 40 ? 3 : 4;
    return (
        <div style={{ display: "flex", gap: 4, marginTop: 8 }}>
            {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ height: 4, width: 28, background: i <= filled ? theme.colors.secondary : "#e0e0e0", borderRadius: 3, transition: "background 0.3s" }} />
            ))}
        </div>
    );
};

// ─── Skeleton loader ──────────────────────────────────────────
const Skeleton: React.FC<{ w?: string | number; h?: number; radius?: number }> = ({ w = "100%", h = 20, radius = 6 }) => (
    <div style={{ width: w, height: h, borderRadius: radius, background: "linear-gradient(90deg, #e8e8e8 25%, #f0f0f0 50%, #e8e8e8 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite" }}>
        <style>{`@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }`}</style>
    </div>
);

// ─── Day Card ────────────────────────────────────────────────
const DayCard: React.FC<{ day: DailyWeather; isToday?: boolean; isBest?: boolean }> = ({ day, isToday, isBest }) => {
    const { condition, label } = decodeWeatherCode(day.weatherCode);
    const dayLabel = isToday ? "TODAY" : new Date(day.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
    return (
        <div
            style={{
                borderRadius: theme.radius.md,
                padding: "14px 10px",
                textAlign: "center",
                background: isBest ? theme.colors.primaryMuted : "transparent",
                border: isBest ? `2px solid ${theme.colors.primary}` : `1px solid ${theme.colors.neutralBorder}`,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                transition: "background 0.15s, transform 0.15s",
                cursor: "default",
            }}
            onMouseEnter={(e) => { if (!isBest) { e.currentTarget.style.background = theme.colors.neutralLight; e.currentTarget.style.transform = "translateY(-1px)"; } }}
            onMouseLeave={(e) => { if (!isBest) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.transform = "translateY(0)"; } }}
        >
            <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.8px", color: isBest ? theme.colors.primary : theme.colors.text.muted, textTransform: "uppercase" }}>{dayLabel}</div>
            <WeatherIcon condition={condition} size={28} />
            <div style={{ fontSize: 18, fontWeight: 800, color: theme.colors.text.primary, fontFamily: theme.fonts.heading }}>{toF(day.tempMax)}°</div>
            <div style={{ fontSize: 11, color: theme.colors.text.muted, fontWeight: 500 }}>{toF(day.tempMin)}° lo</div>
            <div style={{ fontSize: 10.5, color: isBest ? theme.colors.primary : theme.colors.text.muted, fontWeight: isBest ? 800 : 500 }}>
                {isBest ? "Best Day" : label}
            </div>
            {day.precipitationProb != null && (
                <div style={{ fontSize: 10, color: "#5b9bd5", fontWeight: 600 }}>💧 {day.precipitationProb}%</div>
            )}
        </div>
    );
};

// ─── 30-day precip bar chart ──────────────────────────────────
const PrecipChart: React.FC<{ history: DailyWeather[] }> = ({ history }) => {
    const W = 480; const H = 80; const padL = 30; const padB = 20; const padT = 8; const padR = 8;
    const iW = W - padL - padR; const iH = H - padT - padB;
    const maxP = Math.max(...history.map(d => d.precipitation), 1);
    return (
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
            {history.map((d, i) => {
                const bH = (d.precipitation / maxP) * iH;
                const x = padL + (i / history.length) * iW;
                const bW = Math.max(1, iW / history.length - 1.5);
                return <rect key={i} x={x} y={padT + iH - bH} width={bW} height={bH} fill={theme.colors.primary} fillOpacity="0.7" rx="1" />;
            })}
            <line x1={padL} y1={padT + iH} x2={W - padR} y2={padT + iH} stroke={theme.colors.neutralBorder} strokeWidth="0.8" />
            <text x={padL} y={H - 4} fontSize="9" fill={theme.colors.text.muted} fontFamily={theme.fonts.body}>30 days ago</text>
            <text x={W - padR} y={H - 4} fontSize="9" fill={theme.colors.text.muted} fontFamily={theme.fonts.body} textAnchor="end">Today</text>
            <text x={padL - 4} y={padT + iH} fontSize="9" fill={theme.colors.text.muted} fontFamily={theme.fonts.body} textAnchor="end">0</text>
            <text x={padL - 4} y={padT + 6} fontSize="9" fill={theme.colors.text.muted} fontFamily={theme.fonts.body} textAnchor="end">{maxP.toFixed(0)}</text>
        </svg>
    );
};

// ─── Main Page ────────────────────────────────────────────────
const WeatherForecastPage: React.FC = () => {
    const [data, setData] = useState<WeatherApiResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [time, setTime] = useState<string>("");
    const location = DEFAULT_LOCATION;

    // Live clock
    useEffect(() => {
        const fmt = () => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
        setTime(fmt());
        const id = setInterval(() => setTime(fmt()), 30000);
        return () => clearInterval(id);
    }, []);

    const load = useCallback(() => {
        setLoading(true); setError(null);
        fetchWeather(location)
            .then(d => { setData(d); setLoading(false); })
            .catch(e => { setError(e.message); setLoading(false); });
    }, [location]);

    useEffect(() => { load(); }, [load]);

    const cur = data?.current;
    const curInfo = cur ? decodeWeatherCode(cur.weatherCode) : null;
    const forecast = data?.forecast7 ?? [];
    const history = data?.history30 ?? [];
    const isMock = data?.isMock ?? false;

    // Best harvest day = lowest precip prob + highest temp
    const bestDayIdx = forecast.reduce((best, d, i) => {
        const pp = d.precipitationProb ?? 50;
        const bpp = forecast[best]?.precipitationProb ?? 50;
        return pp < bpp || (pp === bpp && d.tempMax > (forecast[best]?.tempMax ?? 0)) ? i : best;
    }, 0);

    // Soil endpoint and mapping removed strictly in favor of ML datasets. 
    const precipProb = forecast[0]?.precipitationProb ?? 0;

    // Next rain day
    const nextRain = forecast.find(d => (d.precipitationProb ?? 0) >= 40 || d.precipitation > 0.5);
    const nextRainLabel = nextRain
        ? new Date(nextRain.date + "T12:00:00").toLocaleDateString("en-US", { weekday: "long" })
        : "None expected";

    // Agri alerts derived from live data
    const agriAlerts = [
        {
            id: 1,
            icon: "💧",
            category: "IRRIGATION ADVICE",
            message: precipProb >= 50 ? "Rain likely — skip irrigation" : "Skip irrigation for 24h",
            bg: theme.colors.primary,
            iconBg: "rgba(255,255,255,0.18)",
            textColor: "#fff",
        },
        {
            id: 2,
            icon: "☀️",
            category: "SOLAR EXPOSURE",
            message: (cur?.solarRadiation ?? 0) > 800 ? "Intense Radiation: Delay top-spray" : "Optimal lighting for field growth",
            bg: (cur?.solarRadiation ?? 0) > 800 ? "#F9A825" : theme.colors.primaryDark,
            iconBg: "rgba(0,0,0,0.1)",
            textColor: (cur?.solarRadiation ?? 0) > 800 ? "#3d2800" : "#fff",
        },
        {
            id: 3,
            icon: "🌿",
            category: "FERTILIZER WINDOW",
            message: forecast.slice(0, 2).every(d => (d.precipitationProb ?? 0) < 30)
                ? "Ideal window: Next 48h"
                : "Wait for dry window",
            bg: theme.colors.primaryDark,
            iconBg: "rgba(255,255,255,0.18)",
            textColor: "#fff",
        },
    ];

    return (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: theme.colors.neutralLight, fontFamily: theme.fonts.body }}>
            <div style={{ flex: 1, overflow: "auto", padding: "26px 28px 40px" }}>

                {/* Mock data banner */}
                {isMock && !error && (
                    <div style={{ background: "#fff8e1", border: "1px solid #ffe082", borderRadius: theme.radius.md, padding: "10px 18px", marginBottom: 16, display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 16 }}>⚠️</span>
                        <div style={{ fontSize: 12.5, color: "#6b5400", fontWeight: 500 }}>
                            <strong>Demo data</strong> — Open-Meteo API is temporarily unavailable. Showing estimated values for Mumbai.
                        </div>
                    </div>
                )}

                {/* Error banner */}
                {error && (
                    <div style={{ background: "#fdecea", border: "1px solid #f5c6cb", borderRadius: theme.radius.md, padding: "14px 18px", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <div style={{ fontWeight: 700, color: "#721c24", fontSize: 14 }}>⚠ Weather API unavailable</div>
                            <div style={{ fontSize: 12.5, color: "#721c24", marginTop: 3 }}>{error}</div>
                        </div>
                        <button onClick={load} style={{ padding: "7px 16px", borderRadius: theme.radius.full, border: "none", background: "#721c24", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: theme.fonts.body }}>Retry</button>
                    </div>
                )}

                {/* ── Hero Row ──────────────────────────────────── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 18, marginBottom: 22 }}>

                    {/* Current Weather Card */}
                    <div style={{ background: `linear-gradient(145deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%)`, borderRadius: theme.radius.lg, padding: "32px 36px", color: theme.colors.white, position: "relative", overflow: "hidden", boxShadow: theme.shadow.elevated, minHeight: 220 }}>
                        <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: "repeating-linear-gradient(0deg,#fff 0,#fff 1px,transparent 0,transparent 24px),repeating-linear-gradient(90deg,#fff 0,#fff 1px,transparent 0,transparent 24px)", backgroundSize: "24px 24px" }} />
                        <div style={{ position: "relative", zIndex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 16, opacity: 0.9 }}>
                                <PinIcon />
                                <span style={{ fontSize: 13, fontWeight: 600 }}>{location.label}</span>
                            </div>
                            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                                <div>
                                    {loading ? (
                                        <>
                                            <Skeleton w={120} h={72} radius={8} />
                                            <div style={{ marginTop: 12 }}><Skeleton w={160} h={22} /></div>
                                            <div style={{ marginTop: 8 }}><Skeleton w={220} h={14} /></div>
                                        </>
                                    ) : (
                                        <>
                                            <div style={{ fontSize: 72, fontWeight: 800, fontFamily: theme.fonts.heading, letterSpacing: "-3px", lineHeight: 1, marginBottom: 10 }}>
                                                {cur ? `${toF(cur.temp)}°` : "—"}
                                            </div>
                                            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: theme.fonts.heading, marginBottom: 4 }}>
                                                {curInfo?.label ?? "—"}
                                            </div>
                                            <div style={{ fontSize: 13, opacity: 0.78 }}>
                                                Feels like {cur ? `${toF(cur.feelsLike)}°F` : "—"} · Humidity {cur?.humidity ?? "—"}%
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div style={{ marginTop: -8 }}>
                                    {curInfo && <WeatherIcon condition={curInfo.condition} size={90} />}
                                </div>
                            </div>

                            {/* High / Low */}
                            <div style={{ display: "flex", gap: 16, marginTop: 20 }}>
                                {[
                                    { label: "HIGH", val: forecast[0] ? `${toF(forecast[0].tempMax)}°` : "—" },
                                    { label: "LOW", val: forecast[0] ? `${toF(forecast[0].tempMin)}°` : "—" },
                                ].map(({ label, val }) => (
                                    <div key={label} style={{ background: "rgba(255,255,255,0.14)", borderRadius: theme.radius.md, padding: "8px 16px", backdropFilter: "blur(4px)", textAlign: "center" }}>
                                        <div style={{ fontSize: 9.5, fontWeight: 700, opacity: 0.7, letterSpacing: "1px" }}>{label}</div>
                                        <div style={{ fontSize: 17, fontWeight: 800, fontFamily: theme.fonts.heading, marginTop: 2 }}>{val}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ML AI Dataset Fields */}
                    <div style={{ background: theme.colors.white, borderRadius: theme.radius.lg, padding: "22px 22px", boxShadow: theme.shadow.card, display: "flex", flexDirection: "column", gap: 4 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: theme.colors.text.primary, fontFamily: theme.fonts.heading, marginBottom: 10 }}>ML Weather Attributes</div>

                        {[
                            {
                                id: 1, icon: "🌡️",
                                label: "Temperature",
                                value: loading ? "…" : `${cur?.temp ?? 0}°C`,
                                status: undefined, statusColor: undefined,
                            },
                            {
                                id: 2, icon: "🌧️",
                                label: "Rainfall",
                                value: loading ? "…" : `${forecast[0]?.precipitation ?? 0} mm`,
                                status: (forecast[0]?.precipitation ?? 0) > 10 ? "HIGH" : (forecast[0]?.precipitation ?? 0) > 0 ? "LIGHT" : "NONE",
                                statusColor: (forecast[0]?.precipitation ?? 0) > 10 ? "#dc3545" : (forecast[0]?.precipitation ?? 0) > 0 ? "#F9A825" : "#888",
                            },
                            {
                                id: 3, icon: "☀️",
                                label: "Solar Radiation",
                                value: loading ? "…" : `${cur?.solarRadiation ?? 0} W/m²`,
                                status: (cur?.solarRadiation ?? 0) > 800 ? "INTENSE" : "OPTIMAL",
                                statusColor: (cur?.solarRadiation ?? 0) > 800 ? "#F9A825" : "#2E7D32",
                            },
                            {
                                id: 4, icon: "💨",
                                label: "Wind Speed",
                                value: loading ? "…" : `${cur?.windspeed ?? 0} km/h`,
                                status: undefined, statusColor: undefined,
                            },
                        ].map((ins, i, arr) => (
                            <div key={ins.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: i < arr.length - 1 ? `1px solid ${theme.colors.neutralBorder}` : "none" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: theme.radius.md, background: theme.colors.primaryMuted, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{ins.icon}</div>
                                    <div>
                                        <div style={{ fontSize: 11.5, color: theme.colors.text.muted, fontWeight: 600 }}>{ins.label}</div>
                                        <div style={{ fontSize: 15, fontWeight: 800, color: theme.colors.text.primary, fontFamily: theme.fonts.heading, marginTop: 1 }}>{ins.value}</div>
                                    </div>
                                </div>
                                {ins.status && (
                                    <span style={{ fontSize: 9.5, fontWeight: 800, color: ins.statusColor, background: ins.statusColor === "#2E7D32" ? theme.colors.primaryMuted : "#f0f0f0", borderRadius: theme.radius.full, padding: "3px 10px", letterSpacing: "0.5px" }}>
                                        {ins.status}
                                    </span>
                                )}
                            </div>
                        ))}

                        <button
                            style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", padding: "11px", border: `1.5px solid ${theme.colors.neutralBorder}`, borderRadius: theme.radius.md, background: "transparent", fontSize: 13, fontWeight: 700, color: theme.colors.primary, cursor: "pointer", fontFamily: theme.fonts.body }}
                            onMouseEnter={e => (e.currentTarget.style.background = theme.colors.primaryMuted)}
                            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        >
                            <FieldMapIcon /> View Field Map
                        </button>
                    </div>
                </div>

                {/* ── 7-Day Forecast ────────────────────────────── */}
                <div style={{ background: theme.colors.white, borderRadius: theme.radius.lg, padding: "22px 26px", boxShadow: theme.shadow.card, marginBottom: 22 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                        <h2 style={{ fontSize: 19, fontWeight: 800, color: theme.colors.text.primary, margin: 0, fontFamily: theme.fonts.heading }}>7-Day Forecast</h2>
                        <div style={{ fontSize: 12, color: theme.colors.text.muted }}>Last updated: {time || "—"} · Open-Meteo API</div>
                    </div>
                    {loading ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
                            {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} h={140} radius={12} />)}
                        </div>
                    ) : (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
                            {forecast.map((day, i) => (
                                <DayCard key={day.date} day={day} isToday={i === 0} isBest={i === bestDayIdx} />
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Wind/AQI + Radar ──────────────────────────── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 22 }}>

                    {/* Wind & AQI */}
                    <div style={{ background: theme.colors.white, borderRadius: theme.radius.lg, padding: "22px 26px", boxShadow: theme.shadow.card }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.colors.secondary} strokeWidth="2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2" /></svg>
                            <div style={{ fontWeight: 800, fontSize: 15, color: theme.colors.text.primary, fontFamily: theme.fonts.heading }}>Wind & Air Quality</div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                            <div>
                                <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                                    <span style={{ fontSize: 36, fontWeight: 800, color: theme.colors.text.primary, fontFamily: theme.fonts.heading, letterSpacing: "-1px" }}>
                                        {loading ? "—" : Math.round((cur?.windspeed ?? 0) * 0.621371)}
                                    </span>
                                    <span style={{ fontSize: 15, color: theme.colors.text.secondary, fontWeight: 600 }}>mph</span>
                                </div>
                                <div style={{ fontSize: 12, color: theme.colors.text.muted, marginTop: 3 }}>
                                    Direction: {cur ? degreesToCompass(cur.windDirection) : "—"} ({cur?.windDirection ?? "—"}°)
                                </div>
                                <WindBars speed={cur?.windspeed ?? 0} />
                            </div>
                            <div>
                                {/* AQI is not in Open-Meteo archive — show precipitation instead */}
                                <div style={{ fontSize: 32, fontWeight: 800, color: theme.colors.text.primary, fontFamily: theme.fonts.heading, letterSpacing: "-0.5px" }}>
                                    {loading ? "—" : `${precipProb ?? 0}%`}
                                </div>
                                <div style={{ fontSize: 12, color: theme.colors.text.muted, marginTop: 3, lineHeight: 1.5 }}>
                                    Rain probability today
                                </div>
                                <AQIBar value={precipProb ?? 0} />
                            </div>
                        </div>
                    </div>

                    {/* Precipitation Radar */}
                    <div style={{ borderRadius: theme.radius.lg, overflow: "hidden", position: "relative", minHeight: 180, boxShadow: theme.shadow.card, background: "#0a1a0a" }}>
                        <PrecipRadar nextRainDate={nextRain?.date} />
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "14px 18px", background: "linear-gradient(transparent, rgba(0,0,0,0.75))" }}>
                            <div style={{ fontWeight: 800, fontSize: 14, color: "#fff", fontFamily: theme.fonts.heading }}>Precipitation Radar</div>
                            <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>
                                Next rain: {loading ? "loading…" : nextRainLabel}
                            </div>
                        </div>
                        <button style={{ position: "absolute", top: 12, right: 12, width: 30, height: 30, borderRadius: theme.radius.sm, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", backdropFilter: "blur(4px)" }}>
                            <RadarExpandIcon />
                        </button>
                    </div>
                </div>

                {/* ── 30-day Precipitation History ──────────────── */}
                {!loading && history.length > 0 && (
                    <div style={{ background: theme.colors.white, borderRadius: theme.radius.lg, padding: "22px 26px", boxShadow: theme.shadow.card, marginBottom: 22 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <div style={{ fontWeight: 800, fontSize: 15, color: theme.colors.text.primary, fontFamily: theme.fonts.heading }}>Precipitation History (Last 30 Days)</div>
                            <div style={{ fontSize: 11.5, color: theme.colors.text.muted }}>Source: Open-Meteo archive API · mm/day</div>
                        </div>
                        <PrecipChart history={history} />
                    </div>
                )}

                {/* ── Agri Alert Banners ─────────────────────────── */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                    {agriAlerts.map((alert) => (
                        <div key={alert.id} style={{ background: alert.bg, borderRadius: theme.radius.lg, padding: "18px 20px", display: "flex", alignItems: "center", gap: 14, boxShadow: theme.shadow.card }}>
                            <div style={{ width: 38, height: 38, borderRadius: theme.radius.md, background: alert.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{alert.icon}</div>
                            <div>
                                <div style={{ fontSize: 9.5, fontWeight: 800, color: alert.textColor, opacity: 0.7, letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: 4 }}>{alert.category}</div>
                                <div style={{ fontSize: 14, fontWeight: 800, color: alert.textColor, fontFamily: theme.fonts.heading, lineHeight: 1.3 }}>{alert.message}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default WeatherForecastPage;