import React from "react";
import type { WeatherData, Crop, StatWidgetProps } from "../../types";
import { theme } from "../../styles/theme";

// ─── WeatherCard ──────────────────────────────────────────────
interface WeatherCardProps {
    data: WeatherData;
    onClick?: () => void;
}

export const WeatherCard: React.FC<WeatherCardProps> = ({ data, onClick }) => (
    <div
        onClick={onClick}
        style={{
            background: theme.colors.primary,
            borderRadius: theme.radius.lg,
            padding: "20px 22px",
            color: theme.colors.white,
            boxShadow: theme.shadow.elevated,
            cursor: onClick ? "pointer" : "default",
            transition: onClick ? "transform 0.1s" : "none"
        }}
        onMouseEnter={e => onClick && (e.currentTarget.style.transform = "scale(1.02)")}
        onMouseLeave={e => onClick && (e.currentTarget.style.transform = "scale(1)")}
    >
        <div
            style={{
                fontSize: 12,
                fontWeight: 700,
                opacity: 0.75,
                marginBottom: 12,
                letterSpacing: "0.5px",
                fontFamily: theme.fonts.heading,
            }}
        >
            Weather Snippet
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <span style={{ fontSize: 30 }}>☁️</span>
            <span
                style={{
                    fontSize: 34,
                    fontWeight: 800,
                    fontFamily: theme.fonts.heading,
                    letterSpacing: "-1px",
                }}
            >
                {data.temp}
            </span>
        </div>

        <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 14 }}>
            {data.wind} • Humidity {data.humidity}%
        </div>

        <div
            style={{
                background: "rgba(255,255,255,0.14)",
                borderRadius: theme.radius.md,
                padding: "12px 14px",
                fontSize: 12.5,
                lineHeight: 1.55,
                fontWeight: 500,
            }}
        >
            <span style={{ opacity: 0.7 }}>Ideal harvest window: </span>
            {data.harvestWindow}
        </div>
    </div>
);

// ─── CropCard ─────────────────────────────────────────────────
interface CropCardProps {
    crop: Crop;
}

export const CropCard: React.FC<CropCardProps> = ({ crop }) => {
    const changeColor: string =
        crop.positive === true
            ? theme.colors.primary
            : crop.positive === false
                ? theme.colors.status.up
                : theme.colors.text.muted;

    return (
        <div
            style={{
                background: theme.colors.white,
                borderRadius: theme.radius.lg,
                padding: "18px 20px 16px",
                boxShadow: theme.shadow.card,
                cursor: "default",
                transition: "transform 0.15s, box-shadow 0.15s",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 6px 20px rgba(0,0,0,0.09)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = theme.shadow.card;
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 14,
                }}
            >
                <span style={{ fontSize: 22 }}>{crop.icon}</span>
                <span
                    style={{
                        fontSize: 9.5,
                        fontWeight: 800,
                        background: crop.tagColor,
                        color: crop.tagText,
                        borderRadius: theme.radius.full,
                        padding: "3px 10px",
                        letterSpacing: "0.6px",
                        textTransform: "uppercase",
                    }}
                >
                    {crop.tag}
                </span>
            </div>

            <div
                style={{
                    fontWeight: 800,
                    fontSize: 15,
                    color: theme.colors.text.primary,
                    marginBottom: 6,
                    fontFamily: theme.fonts.heading,
                    letterSpacing: "-0.3px",
                }}
            >
                {crop.name}
            </div>

            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <span
                    style={{
                        fontSize: 22,
                        fontWeight: 800,
                        color: theme.colors.text.primary,
                        fontFamily: theme.fonts.heading,
                        letterSpacing: "-0.5px",
                    }}
                >
                    {crop.price}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: changeColor }}>
                    {crop.change}
                </span>
            </div>

            <div
                style={{
                    marginTop: 14,
                    background: "#eee",
                    borderRadius: 4,
                    height: 4,
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        width: crop.barWidth,
                        height: "100%",
                        borderRadius: 4,
                        background: crop.barColor,
                        transition: "width 0.6s ease",
                    }}
                />
            </div>
        </div>
    );
};

// ─── StatWidget ───────────────────────────────────────────────
export const StatWidget: React.FC<StatWidgetProps> = ({
    icon,
    iconBg,
    title,
    subtitle,
    trailingIcon,
    trailingColor,
    onClick,
}) => (
    <div
        onClick={onClick}
        style={{
            background: theme.colors.white,
            borderRadius: theme.radius.lg,
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            boxShadow: theme.shadow.card,
            cursor: onClick ? "pointer" : "default",
            transition: onClick ? "transform 0.1s" : "none"
        }}
        onMouseEnter={e => onClick && (e.currentTarget.style.transform = "scale(1.02)")}
        onMouseLeave={e => onClick && (e.currentTarget.style.transform = "scale(1)")}
    >
        <div
            style={{
                width: 44,
                height: 44,
                borderRadius: theme.radius.md,
                background: iconBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                flexShrink: 0,
            }}
        >
            {icon}
        </div>

        <div style={{ flex: 1 }}>
            <div
                style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: theme.colors.text.primary,
                    fontFamily: theme.fonts.heading,
                }}
            >
                {title}
            </div>
            <div style={{ fontSize: 12, color: theme.colors.text.muted, marginTop: 2 }}>
                {subtitle}
            </div>
        </div>

        {trailingIcon && (
            <span
                style={{
                    color: trailingColor ?? theme.colors.neutral,
                    fontSize: 18,
                    fontWeight: 700,
                }}
            >
                {trailingIcon}
            </span>
        )}
    </div>
);