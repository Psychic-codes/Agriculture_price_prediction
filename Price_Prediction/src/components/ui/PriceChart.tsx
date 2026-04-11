import React from "react";
import type { ChartDataPoint } from "../../types";
import { theme } from "../../styles/theme";

interface PriceChartProps {
    data: ChartDataPoint[];
}

const BAR_COLORS: string[] = [
    theme.colors.chart.bar1,
    theme.colors.chart.bar2,
    theme.colors.chart.bar1,
    theme.colors.chart.bar4,
    theme.colors.chart.barPredicted,
    theme.colors.chart.bar2,
];

const PriceChart: React.FC<PriceChartProps> = ({ data }) => {
    const maxVal = data.length > 0 ? Math.max(...data.map(d => d.value)) : 280;
    const paddingVal = maxVal * 1.15; // 15% headroom
    return (
        <div
            style={{
                background: theme.colors.white,
                borderRadius: theme.radius.lg,
                padding: "24px 28px 20px",
                boxShadow: theme.shadow.card,
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 26,
                }}
            >
                <div>
                    <div
                        style={{
                            fontWeight: 800,
                            fontSize: 18,
                            color: theme.colors.text.primary,
                            fontFamily: theme.fonts.heading,
                            letterSpacing: "-0.4px",
                        }}
                    >
                        Price Index Prediction
                    </div>
                    <div style={{ fontSize: 12.5, color: theme.colors.text.muted, marginTop: 4 }}>
                        Estimated market trajectory for horticultural staples.
                    </div>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div
                        style={{
                            fontSize: 26,
                            fontWeight: 800,
                            color: theme.colors.primary,
                            fontFamily: theme.fonts.heading,
                            letterSpacing: "-1px",
                        }}
                    >
                        +12.4%
                    </div>
                    <div
                        style={{
                            fontSize: 9.5,
                            color: theme.colors.text.muted,
                            letterSpacing: "1.2px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                        }}
                    >
                        Forecast Confidence
                    </div>
                </div>
            </div>

            {/* Bars */}
            <div
                style={{
                    display: "flex",
                    alignItems: "flex-end",
                    gap: 14,
                    height: 195,
                    paddingBottom: 28,
                    position: "relative",
                }}
            >
                {data.map((d, i) => {
                    const barH = Math.round((d.value / paddingVal) * 158);
                    const isPeak = d.value === maxVal;
                    const barColor = BAR_COLORS[i] ?? theme.colors.chart.bar2;

                    return (
                        <div
                            key={d.month}
                            style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "flex-end",
                                height: "100%",
                                gap: 6,
                                position: "relative",
                            }}
                        >
                            {isPeak && (
                                <div
                                    style={{
                                        position: "absolute",
                                        top: 0,
                                        background: theme.colors.primaryDark,
                                        color: theme.colors.white,
                                        fontSize: 9.5,
                                        fontWeight: 700,
                                        borderRadius: theme.radius.sm,
                                        padding: "5px 9px",
                                        textAlign: "center",
                                        whiteSpace: "nowrap",
                                        letterSpacing: "0.4px",
                                        lineHeight: 1.4,
                                        zIndex: 2,
                                    }}
                                >
                                    PREDICTED PEAK
                                    <br />
                                    <span style={{ fontSize: 13 }}>{d.value}</span>
                                </div>
                            )}
                            <div
                                style={{
                                    width: "100%",
                                    height: barH,
                                    borderRadius: "8px 8px 5px 5px",
                                    background: barColor,
                                    transition: "height 0.5s ease",
                                }}
                            />
                            <div
                                style={{
                                    position: "absolute",
                                    bottom: 0,
                                    fontSize: 11,
                                    color: theme.colors.text.muted,
                                    fontWeight: 600,
                                }}
                            >
                                {d.month}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PriceChart;