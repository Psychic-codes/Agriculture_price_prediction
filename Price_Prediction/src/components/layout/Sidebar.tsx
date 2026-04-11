import React from "react";
import type { PageId } from "../../types";
import { theme } from "../../styles/theme";

interface SidebarProps {
    activePage: PageId;
    onNavigate: (page: PageId) => void;
}

interface NavItemDef {
    id: PageId;
    label: string;
    Icon: React.FC;
}

interface BottomItemDef {
    id: string;
    label: string;
    Icon: React.FC;
}

const DashboardIcon: React.FC = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
);

const TrendUpIcon: React.FC = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
    </svg>
);

const FuelIcon: React.FC = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 22V8l9-5 9 5v14H3z" />
        <path d="M10 13h4v9h-4z" />
    </svg>
);

const CloudIcon: React.FC = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" />
    </svg>
);

const MarketIcon: React.FC = () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

const SettingsIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);

const HelpIcon: React.FC = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
);

const navItems: NavItemDef[] = [
    { id: "dashboard", label: "Dashboard", Icon: DashboardIcon },
    { id: "msp-tracker", label: "MSP Tracker", Icon: TrendUpIcon },
    { id: "fuel-prices", label: "Fuel Prices", Icon: FuelIcon },
    { id: "weather-forecast", label: "Weather Forecast", Icon: CloudIcon },
    { id: "market-prices", label: "Market Prices", Icon: MarketIcon },
    { id: "market-forecast", label: "Market Forecast", Icon: MarketIcon },
];

const bottomItems: BottomItemDef[] = [
    { id: "settings", label: "Settings", Icon: SettingsIcon },
    { id: "help", label: "Help", Icon: HelpIcon },
];

const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
    return (
        <aside
            style={{
                width: 220,
                minHeight: "100vh",
                background: theme.colors.neutralLight,
                borderRight: `1px solid ${theme.colors.neutralBorder}`,
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
                fontFamily: theme.fonts.body,
            }}
        >
            {/* Brand */}
            <div
                style={{
                    padding: "26px 22px 22px",
                    borderBottom: `1px solid ${theme.colors.neutralBorder}`,
                }}
            >
                <div
                    style={{
                        fontSize: 17,
                        fontWeight: 800,
                        color: theme.colors.primaryDark,
                        letterSpacing: "-0.5px",
                        fontFamily: theme.fonts.heading,
                    }}
                >
                    Fertile Data
                </div>
                <div
                    style={{
                        fontSize: 9.5,
                        color: theme.colors.text.muted,
                        fontWeight: 700,
                        letterSpacing: "1.8px",
                        marginTop: 3,
                        textTransform: "uppercase",
                    }}
                >
                    Market Insights
                </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: "14px 0" }}>
                {navItems.map(({ id, label, Icon }) => {
                    const isActive = activePage === id;
                    return (
                        <button
                            key={id}
                            onClick={() => onNavigate(id)}
                            style={{
                                width: "100%",
                                display: "flex",
                                alignItems: "center",
                                gap: 10,
                                padding: "11px 22px",
                                border: "none",
                                background: "transparent",
                                cursor: "pointer",
                                fontFamily: theme.fonts.body,
                                fontSize: 13.5,
                                fontWeight: isActive ? 700 : 500,
                                color: isActive ? theme.colors.white : theme.colors.neutral,
                                position: "relative",
                                textAlign: "left",
                                transition: "all 0.18s ease",
                            }}
                        >
                            {isActive && (
                                <span
                                    style={{
                                        position: "absolute",
                                        inset: "3px 12px 3px 0",
                                        background: theme.colors.primary,
                                        borderRadius: "0 22px 22px 0",
                                        zIndex: 0,
                                    }}
                                />
                            )}
                            <span style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center" }}>
                                <Icon />
                            </span>
                            <span style={{ position: "relative", zIndex: 1 }}>{label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Bottom */}
            <div style={{ padding: "14px 0 20px", borderTop: `1px solid ${theme.colors.neutralBorder}` }}>
                {bottomItems.map(({ id, label, Icon }) => (
                    <button
                        key={id}
                        style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "10px 22px",
                            border: "none",
                            background: "transparent",
                            cursor: "pointer",
                            fontFamily: theme.fonts.body,
                            fontSize: 13,
                            fontWeight: 500,
                            color: theme.colors.text.muted,
                            textAlign: "left",
                        }}
                    >
                        <Icon />
                        {label}
                    </button>
                ))}
            </div>
        </aside>
    );
};

export default Sidebar;