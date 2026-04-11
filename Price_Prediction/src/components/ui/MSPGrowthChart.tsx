import React from "react";
import type { MSPGrowthPoint } from "../../types/msp";
import { theme } from "../../styles/theme";

interface MSPGrowthChartProps {
    data: MSPGrowthPoint[];
}

const MSPGrowthChart: React.FC<MSPGrowthChartProps> = ({ data }) => {
    const width = 460;
    const height = 120;
    const padL = 10;
    const padR = 10;
    const padT = 20;
    const padB = 28;

    const minVal = Math.min(...data.map((d) => d.value));
    const maxVal = Math.max(...data.map((d) => d.value));
    const range = maxVal - minVal || 1;

    const innerW = width - padL - padR;
    const innerH = height - padT - padB;

    const toX = (i: number) => padL + (i / (data.length - 1)) * innerW;
    const toY = (v: number) => padT + innerH - ((v - minVal) / range) * innerH;

    const coords = data.map((d, i) => ({ x: toX(i), y: toY(d.value) }));
    const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
    const areaPath = `M ${coords[0].x} ${padT + innerH} ${coords.map((c) => `L ${c.x} ${c.y}`).join(" ")} L ${coords[coords.length - 1].x} ${padT + innerH} Z`;

    const lastPoint = coords[coords.length - 1];
    const lastData = data[data.length - 1];

    return (
        <svg
            width="100%"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            style={{ overflow: "visible" }}
        >
            <defs>
                <linearGradient id="mspGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={theme.colors.primary} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={theme.colors.primary} stopOpacity={0} />
                </linearGradient>
            </defs>

            {/* Area */}
            <path d={areaPath} fill="url(#mspGrad)" />

            {/* Line */}
            <path
                d={linePath}
                fill="none"
                stroke={theme.colors.primary}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Year labels */}
            {data.map((d, i) => (
                <text
                    key={d.year}
                    x={toX(i)}
                    y={height - 4}
                    textAnchor="middle"
                    fontSize={10}
                    fill={theme.colors.text.muted}
                    fontFamily={theme.fonts.body}
                    fontWeight={600}
                >
                    {d.year}
                </text>
            ))}

            {/* Last point callout */}
            <circle cx={lastPoint.x} cy={lastPoint.y} r={4} fill={theme.colors.primary} />
            <rect
                x={lastPoint.x - 26}
                y={lastPoint.y - 22}
                width={52}
                height={18}
                rx={4}
                fill={theme.colors.primary}
            />
            <text
                x={lastPoint.x}
                y={lastPoint.y - 10}
                textAnchor="middle"
                fontSize={9.5}
                fill={theme.colors.white}
                fontFamily={theme.fonts.body}
                fontWeight={700}
            >
                ₹{lastData.value.toLocaleString("en-IN")}
            </text>
        </svg>
    );
};

export default MSPGrowthChart;