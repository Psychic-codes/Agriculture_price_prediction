import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import type { PageId } from "./types";
import Sidebar from "./components/layout/Sidebar";
import Navbar from "./components/layout/Navbar";
import DashboardPage from "./pages/DashboardPage";
import MSPTrackerPage from "./pages/MSPTrackerPage";
import { theme } from "./styles/theme";
import FuelPricesPage from "./pages/FuelPricesPage";
import WeatherForecastPage from "./pages/WeatherForecastPage";
import MarketPricesPage from "./pages/MarketPricesPage";
import MarketForecastPage from "./pages/MarketForecastPage";
import { Auth } from "./pages/Auth";
import { useAuth } from "./context/AuthContext";
import FertileDataFramework from "./pages/LandingPage";

interface SearchPlaceholders {
  [key: string]: string;
}

const searchPlaceholders: SearchPlaceholders = {
  dashboard: "Search crops, regions or trends...",
  "msp-tracker": "Search crop or season...",
  "fuel-prices": "Search fuel type or region...",
  "weather-forecast": "Search location or season...",
  "market-prices": "Search markets or commodities...",
};

interface ComingSoonProps {
  title: string;
}

const ComingSoon: React.FC<ComingSoonProps> = ({ title }) => (
  <div
    style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      background: theme.colors.neutralLight,
      fontFamily: theme.fonts.heading,
    }}
  >
    <div style={{ fontSize: 48 }}>🌾</div>
    <div style={{ fontSize: 22, fontWeight: 800, color: theme.colors.primaryDark }}>
      {title}
    </div>
    <div style={{ fontSize: 14, color: theme.colors.text.muted }}>
      This page is coming soon.
    </div>
  </div>
);

const pageLabels: Record<PageId, string> = {
  dashboard: "Dashboard",
  "msp-tracker": "MSP Tracker",
  "fuel-prices": "Fuel Prices",
  "weather-forecast": "Weather Forecast",
  "market-prices": "Market Prices",
  "market-forecast": "Market Forecast",
};

// ── Main app shell (only rendered when authenticated) ──────────────────────
const MainLayout: React.FC = () => {
  const [activePage, setActivePage] = useState<PageId>("dashboard");

  const renderPage = (): React.ReactNode => {
    switch (activePage) {
      case "dashboard": return <DashboardPage onNavigate={setActivePage} />;
      case "msp-tracker": return <MSPTrackerPage />;
      case "fuel-prices": return <FuelPricesPage />;
      case "weather-forecast": return <WeatherForecastPage />;
      case "market-prices": return <MarketPricesPage />;
      case "market-forecast": return <MarketForecastPage />;
      default: return <ComingSoon title={pageLabels[activePage]} />;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#1a1a1a" }}>
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Navbar searchPlaceholder={searchPlaceholders[activePage]} />
        {renderPage()}
      </div>

      {/* Floating AI bot */}
      <div
        title="AI Assistant"
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: theme.colors.primaryDark,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          cursor: "pointer",
          boxShadow: "0 4px 20px rgba(27,94,32,0.45)",
          zIndex: 999,
          transition: "transform 0.2s",
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.transform = "scale(1.08)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.transform = "scale(1)")}
      >
        🤖
      </div>
    </div>
  );
};

// ── Root router ────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* /login — redirect to /dashboard if already logged in */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Auth />}
      />

      {/* All other paths — redirect to /login if not authenticated */}
      <Route
        path="/*"
        element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />}
      />

      <Route path="/" element={<FertileDataFramework />} />
    </Routes>
  );
};

export default App;