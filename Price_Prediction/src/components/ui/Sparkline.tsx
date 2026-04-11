import React from "react";

interface SparklineProps {
    points: number[];
    color?: string;
    width?: number;
    height?: number;
}

const Sparkline: React.FC<SparklineProps> = ({
    points,
    color = "#2E7D32",
    width = 80,
    height = 32,
}) => {
    if (points.length < 2) return null;

    const minY = Math.min(...points);
    const maxY = Math.max(...points);
    const range = maxY - minY || 1;
    const padX = 4;
    const padY = 4;
    const innerW = width - padX * 2;
    const innerH = height - padY * 2;

    const coords = points.map((p, i) => {
        const x = padX + (i / (points.length - 1)) * innerW;
        const y = padY + innerH - ((p - minY) / range) * innerH;
        return `${x},${y}`;
    });

    const pathD = `M ${coords.join(" L ")}`;

    // Area fill path
    const firstX = padX;
    const lastX = padX + innerW;
    const bottomY = padY + innerH;
    const areaD = `M ${firstX},${bottomY} L ${coords.join(" L ")} L ${lastX},${bottomY} Z`;

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} fill="none">
            {/* Area under curve */}
            <path d={areaD} fill={color} fillOpacity={0.08} />
            {/* Line */}
            <path d={pathD} stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
            {/* End dot */}
            <circle
                cx={padX + innerW}
                cy={padY + innerH - ((points[points.length - 1] - minY) / range) * innerH}
                r={2.5}
                fill={color}
            />
        </svg>
    );
};

export default Sparkline;