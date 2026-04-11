import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LogOut, TrendingUp, Database, Snowflake, Fuel, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ── Static Data ──────────────────────────────────────────────────────────────
const STATIC_MSP = [
  { id: '1', commodity: 'Wheat',       price: 2275, year: 2024 },
  { id: '2', commodity: 'Rice',        price: 2300, year: 2024 },
  { id: '3', commodity: 'Maize',       price: 2090, year: 2024 },
  { id: '4', commodity: 'Soybean',     price: 4600, year: 2024 },
  { id: '5', commodity: 'Groundnut',   price: 6783, year: 2024 },
  { id: '6', commodity: 'Wheat',       price: 2150, year: 2023 },
  { id: '7', commodity: 'Rice',        price: 2183, year: 2023 },
  { id: '8', commodity: 'Maize',       price: 1962, year: 2023 },
  { id: '9', commodity: 'Soybean',     price: 4300, year: 2023 },
  { id: '10', commodity: 'Groundnut',  price: 5850, year: 2023 },
];

const STATIC_MARKET_PRICES = [
  { id: '1', commodity: 'Wheat',     state: 'Punjab',       date: '2024-11-01', price_per_quintal: 2400 },
  { id: '2', commodity: 'Rice',      state: 'Haryana',      date: '2024-11-01', price_per_quintal: 2500 },
  { id: '3', commodity: 'Maize',     state: 'Karnataka',    date: '2024-11-02', price_per_quintal: 2150 },
  { id: '4', commodity: 'Soybean',   state: 'Maharashtra',  date: '2024-11-02', price_per_quintal: 4800 },
  { id: '5', commodity: 'Groundnut', state: 'Gujarat',      date: '2024-11-03', price_per_quintal: 7000 },
  { id: '6', commodity: 'Cotton',    state: 'Andhra Pradesh', date: '2024-11-03', price_per_quintal: 6600 },
  { id: '7', commodity: 'Sugarcane', state: 'Uttar Pradesh', date: '2024-11-04', price_per_quintal: 370  },
  { id: '8', commodity: 'Mustard',   state: 'Rajasthan',    date: '2024-11-04', price_per_quintal: 5500 },
];

const STATIC_COLD_STORAGE = [
  { id: '1',  state: 'Punjab',          year: 2023, fci_owned: 12, private_owned: 85,  total_units: 97,  storage_capacity: '4.2 LMT'  },
  { id: '2',  state: 'Punjab',          year: 2024, fci_owned: 13, private_owned: 92,  total_units: 105, storage_capacity: '4.8 LMT'  },
  { id: '3',  state: 'Haryana',         year: 2023, fci_owned: 9,  private_owned: 60,  total_units: 69,  storage_capacity: '3.1 LMT'  },
  { id: '4',  state: 'Haryana',         year: 2024, fci_owned: 10, private_owned: 67,  total_units: 77,  storage_capacity: '3.5 LMT'  },
  { id: '5',  state: 'Uttar Pradesh',   year: 2023, fci_owned: 20, private_owned: 140, total_units: 160, storage_capacity: '9.0 LMT'  },
  { id: '6',  state: 'Uttar Pradesh',   year: 2024, fci_owned: 22, private_owned: 155, total_units: 177, storage_capacity: '10.2 LMT' },
  { id: '7',  state: 'Maharashtra',     year: 2023, fci_owned: 8,  private_owned: 50,  total_units: 58,  storage_capacity: '2.8 LMT'  },
  { id: '8',  state: 'Maharashtra',     year: 2024, fci_owned: 9,  private_owned: 58,  total_units: 67,  storage_capacity: '3.2 LMT'  },
  { id: '9',  state: 'Karnataka',       year: 2023, fci_owned: 6,  private_owned: 38,  total_units: 44,  storage_capacity: '1.9 LMT'  },
  { id: '10', state: 'Karnataka',       year: 2024, fci_owned: 7,  private_owned: 44,  total_units: 51,  storage_capacity: '2.2 LMT'  },
  { id: '11', state: 'Gujarat',         year: 2023, fci_owned: 7,  private_owned: 45,  total_units: 52,  storage_capacity: '2.5 LMT'  },
  { id: '12', state: 'Gujarat',         year: 2024, fci_owned: 8,  private_owned: 52,  total_units: 60,  storage_capacity: '2.9 LMT'  },
  { id: '13', state: 'Madhya Pradesh',  year: 2023, fci_owned: 15, private_owned: 75,  total_units: 90,  storage_capacity: '5.1 LMT'  },
  { id: '14', state: 'Madhya Pradesh',  year: 2024, fci_owned: 16, private_owned: 83,  total_units: 99,  storage_capacity: '5.7 LMT'  },
];

const STATIC_FUEL_PRICES = [
  { id: '1',  date: '2024-11-01', cng: 75.5,  petrol: 96.72, diesel: 89.62 },
  { id: '2',  date: '2024-10-01', cng: 75.5,  petrol: 96.72, diesel: 89.62 },
  { id: '3',  date: '2024-09-01', cng: 76.0,  petrol: 96.72, diesel: 89.62 },
  { id: '4',  date: '2024-08-01', cng: 76.0,  petrol: 94.72, diesel: 87.62 },
  { id: '5',  date: '2024-07-01', cng: 78.5,  petrol: 94.72, diesel: 87.62 },
  { id: '6',  date: '2024-06-01', cng: 78.5,  petrol: 94.72, diesel: 87.62 },
  { id: '7',  date: '2024-05-01', cng: 79.0,  petrol: 94.72, diesel: 87.62 },
  { id: '8',  date: '2024-04-01', cng: 79.0,  petrol: 94.72, diesel: 87.62 },
  { id: '9',  date: '2024-03-01', cng: 80.5,  petrol: 94.72, diesel: 87.62 },
  { id: '10', date: '2024-02-01', cng: 80.5,  petrol: 94.72, diesel: 87.62 },
];
// ─────────────────────────────────────────────────────────────────────────────

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600;700&display=swap');

  .fd-root {
    min-height: 100vh;
    background: #0d1a0d;
    font-family: 'DM Sans', sans-serif;
    color: #e8f5e8;
  }

  /* NAV */
  .fd-nav {
    background: rgba(13,26,13,0.8);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(74,222,128,0.12);
    padding: 0 2rem;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 50;
  }

  .fd-nav-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .fd-nav-logo-box {
    width: 34px; height: 34px;
    background: linear-gradient(135deg, #4ade80, #16a34a);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(74,222,128,0.3);
  }
  .fd-nav-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.2rem;
    font-weight: 700;
    background: linear-gradient(135deg, #4ade80, #a3e635);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .fd-nav-subtitle {
    font-size: 0.7rem;
    color: rgba(255,255,255,0.35);
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .fd-nav-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .fd-nav-welcome {
    font-size: 0.82rem;
    color: rgba(255,255,255,0.45);
  }
  .fd-nav-welcome span {
    color: #86efac;
    font-weight: 600;
  }
  .fd-logout-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 1rem;
    background: rgba(239,68,68,0.12);
    border: 1px solid rgba(239,68,68,0.25);
    border-radius: 8px;
    color: #fca5a5;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .fd-logout-btn:hover {
    background: rgba(239,68,68,0.2);
    border-color: rgba(239,68,68,0.4);
    color: #f87171;
  }

  /* LAYOUT */
  .fd-layout {
    display: flex;
    height: calc(100vh - 64px);
  }

  /* SIDEBAR */
  .fd-sidebar {
    width: 220px;
    flex-shrink: 0;
    background: rgba(255,255,255,0.025);
    border-right: 1px solid rgba(255,255,255,0.06);
    padding: 1.5rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    overflow-y: auto;
  }

  .fd-sidebar-label {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.25);
    padding: 0 0.5rem;
    margin-bottom: 0.25rem;
    margin-top: 0.5rem;
  }

  .fd-tab-btn {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
    padding: 0.6rem 0.75rem;
    border: none;
    border-radius: 9px;
    background: transparent;
    color: rgba(255,255,255,0.45);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }
  .fd-tab-btn:hover {
    background: rgba(255,255,255,0.06);
    color: rgba(255,255,255,0.75);
  }
  .fd-tab-btn.active {
    background: linear-gradient(135deg, rgba(74,222,128,0.15), rgba(22,163,74,0.1));
    color: #4ade80;
    border: 1px solid rgba(74,222,128,0.2);
  }
  .fd-tab-btn.active svg { color: #4ade80; }
  .fd-tab-btn svg { flex-shrink: 0; }

  /* MAIN CONTENT */
  .fd-main {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
    background: #0d1a0d;
  }

  /* PAGE HEADER */
  .fd-page-header {
    margin-bottom: 1.75rem;
    animation: slideDown 0.4s ease both;
  }
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .fd-page-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.75rem;
    font-weight: 700;
    color: #f0fdf4;
    letter-spacing: -0.02em;
    margin: 0 0 0.25rem;
  }
  .fd-page-desc {
    font-size: 0.85rem;
    color: rgba(255,255,255,0.35);
    margin: 0;
  }

  /* STAT CARDS */
  .fd-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
    animation: fadeUp 0.5s ease both;
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .fd-stat-card {
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 16px;
    padding: 1.25rem 1.5rem;
    position: relative;
    overflow: hidden;
    transition: all 0.25s ease;
    cursor: default;
  }
  .fd-stat-card:hover {
    background: rgba(255,255,255,0.06);
    transform: translateY(-2px);
    box-shadow: 0 12px 30px rgba(0,0,0,0.3);
  }
  .fd-stat-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 2px;
  }
  .fd-stat-card.green::before { background: linear-gradient(90deg, #4ade80, #16a34a); }
  .fd-stat-card.blue::before { background: linear-gradient(90deg, #60a5fa, #3b82f6); }
  .fd-stat-card.yellow::before { background: linear-gradient(90deg, #fbbf24, #d97706); }
  .fd-stat-card.orange::before { background: linear-gradient(90deg, #fb923c, #ea580c); }

  .fd-stat-label {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.35);
    margin-bottom: 0.625rem;
  }
  .fd-stat-value {
    font-family: 'Playfair Display', serif;
    font-size: 2.25rem;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1;
  }
  .fd-stat-card.green .fd-stat-value { color: #4ade80; }
  .fd-stat-card.blue .fd-stat-value { color: #60a5fa; }
  .fd-stat-card.yellow .fd-stat-value { color: #fbbf24; }
  .fd-stat-card.orange .fd-stat-value { color: #fb923c; }

  /* CHART PANEL */
  .fd-panel {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 18px;
    padding: 1.75rem;
    margin-bottom: 1.5rem;
    animation: fadeUp 0.5s ease both;
  }

  .fd-panel-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.2rem;
    font-weight: 700;
    color: #e8f5e8;
    margin: 0 0 1.25rem;
    letter-spacing: -0.01em;
  }
  .fd-year-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: rgba(255,255,255,0.45);
    margin: 1.5rem 0 0.75rem;
    letter-spacing: 0.02em;
  }
  .fd-year-label:first-of-type { margin-top: 0; }

  /* TABLE */
  .fd-table-wrap {
    overflow-x: auto;
    margin-top: 1.5rem;
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.07);
  }
  .fd-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  .fd-table th {
    padding: 0.75rem 1rem;
    text-align: left;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.3);
    background: rgba(255,255,255,0.03);
    border-bottom: 1px solid rgba(255,255,255,0.07);
  }
  .fd-table td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    color: rgba(255,255,255,0.75);
  }
  .fd-table tbody tr:last-child td { border-bottom: none; }
  .fd-table tbody tr:hover td { background: rgba(255,255,255,0.03); }

  /* STATE FILTER */
  .fd-filter-row {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .fd-filter-label {
    font-size: 0.85rem;
    font-weight: 600;
    color: rgba(255,255,255,0.45);
  }
  .fd-select {
    padding: 0.5rem 0.875rem;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 8px;
    color: #e8f5e8;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
    outline: none;
    transition: all 0.2s;
    cursor: pointer;
    min-width: 180px;
  }
  .fd-select:focus {
    border-color: rgba(74,222,128,0.4);
    box-shadow: 0 0 0 3px rgba(74,222,128,0.08);
  }
  .fd-select option { background: #1a2e1a; }

  /* EMPTY */
  .fd-empty {
    text-align: center;
    padding: 2.5rem;
    color: rgba(255,255,255,0.25);
    font-size: 0.875rem;
  }

  /* LOADING */
  .fd-loading {
    min-height: 100vh;
    background: #0d1a0d;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'DM Sans', sans-serif;
    color: #4ade80;
  }
  .fd-spinner {
    width: 36px; height: 36px;
    border: 3px solid rgba(74,222,128,0.15);
    border-top-color: #4ade80;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    margin-right: 1rem;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* RECHARTS CUSTOMIZATION */
  .recharts-cartesian-grid-horizontal line,
  .recharts-cartesian-grid-vertical line { stroke: rgba(255,255,255,0.06) !important; }
  .recharts-text { fill: rgba(255,255,255,0.4) !important; font-family: 'DM Sans', sans-serif !important; font-size: 11px !important; }
  .recharts-tooltip-wrapper .recharts-default-tooltip {
    background: #1a2e1a !important;
    border: 1px solid rgba(74,222,128,0.2) !important;
    border-radius: 10px !important;
    box-shadow: 0 8px 24px rgba(0,0,0,0.5) !important;
  }
  .recharts-default-tooltip .recharts-tooltip-label { color: #86efac !important; font-weight: 600 !important; }
  .recharts-default-tooltip .recharts-tooltip-item { color: rgba(255,255,255,0.75) !important; }
  .recharts-legend-item-text { color: rgba(255,255,255,0.55) !important; font-size: 12px !important; }
`;

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'msp', label: 'MSP', icon: TrendingUp },
  { id: 'market', label: 'Market', icon: Database },
  { id: 'cold-storage', label: 'Cold Storage', icon: Snowflake },
  { id: 'fuel', label: 'Fuel Prices', icon: Fuel },
];

export const FarmerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedState, setSelectedState] = useState('');

  const mspData = STATIC_MSP;
  const marketPrices = STATIC_MARKET_PRICES;
  const coldStorage = STATIC_COLD_STORAGE;
  const fuelPrices = STATIC_FUEL_PRICES;

  const states = [...new Set(coldStorage.map((item: any) => item.state))];
  const filteredColdStorage = coldStorage.filter((item: any) => item.state === selectedState);
  const years = [...new Set(mspData.map((item: any) => item.year))];

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <>
      <style>{styles}</style>
      <div className="fd-root">
        {/* NAV */}
        <nav className="fd-nav">
          <div className="fd-nav-brand">
            <div className="fd-nav-logo-box">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22V12M12 12C12 7 7 3 2 3c0 5 4 9 10 9M12 12c0-5 5-9 10-9-1 5-5 9-10 9"/>
              </svg>
            </div>
            <div>
              <div className="fd-nav-title">AgroPrice</div>
              <div className="fd-nav-subtitle">Farmer Portal</div>
            </div>
          </div>
          <div className="fd-nav-right">
            <span className="fd-nav-welcome">Welcome, <span>{user?.name}</span></span>
            <button onClick={handleLogout} className="fd-logout-btn">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </nav>

        <div className="fd-layout">
          {/* SIDEBAR */}
          <aside className="fd-sidebar">
            <div className="fd-sidebar-label">Navigation</div>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`fd-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </aside>

          {/* MAIN */}
          <main className="fd-main">

            {activeTab === 'overview' && (
              <>
                <div className="fd-page-header">
                  <h1 className="fd-page-title">Dashboard Overview</h1>
                  <p className="fd-page-desc">Your agricultural data at a glance</p>
                </div>
                <div className="fd-stats-grid">
                  <div className="fd-stat-card green">
                    <div className="fd-stat-label">MSP Records</div>
                    <div className="fd-stat-value">{mspData.length}</div>
                  </div>
                  <div className="fd-stat-card blue">
                    <div className="fd-stat-label">Market Prices</div>
                    <div className="fd-stat-value">{marketPrices.length}</div>
                  </div>
                  <div className="fd-stat-card yellow">
                    <div className="fd-stat-label">Cold Storage Units</div>
                    <div className="fd-stat-value">{coldStorage.length}</div>
                  </div>
                  <div className="fd-stat-card orange">
                    <div className="fd-stat-label">Fuel Updates</div>
                    <div className="fd-stat-value">{fuelPrices.length}</div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'msp' && (
              <div className="fd-panel">
                <h2 className="fd-panel-title">Minimum Support Price (MSP)</h2>
                {mspData.length > 0 ? (
                  <>
                    {years.map((year) => {
                      const yearData = mspData.filter((item: any) => item.year === year);
                      return (
                        <div key={year}>
                          <div className="fd-year-label">Year {year}</div>
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={yearData} margin={{ top: 4, right: 10, left: 0, bottom: 4 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="commodity" tick={{ fontSize: 11 }} />
                              <YAxis tick={{ fontSize: 11 }} />
                              <Tooltip contentStyle={{ background: '#1a2e1a', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '10px' }} />
                              <Legend />
                              <Bar dataKey="price" fill="#4ade80" name="MSP Price (₹)" radius={[6, 6, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })}
                    <div className="fd-table-wrap">
                      <table className="fd-table">
                        <thead>
                          <tr>
                            <th>Commodity</th>
                            <th>Price</th>
                            <th>Year</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mspData.map((item: any) => (
                            <tr key={item.id}>
                              <td>{item.commodity}</td>
                              <td>₹{item.price}</td>
                              <td>{item.year}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : <div className="fd-empty">No MSP data available</div>}
              </div>
            )}

            {activeTab === 'market' && (
              <div className="fd-panel">
                <h2 className="fd-panel-title">Market Prices</h2>
                {marketPrices.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={marketPrices}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="commodity" />
                      <YAxis />
                      <Tooltip contentStyle={{ background: '#1a2e1a', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '10px' }} />
                      <Legend />
                      <Line type="monotone" dataKey="price_per_quintal" stroke="#4ade80" strokeWidth={2.5} dot={{ fill: '#4ade80', r: 4 }} name="Price per Quintal" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <div className="fd-empty">No market price data available</div>}
              </div>
            )}

            {activeTab === 'cold-storage' && (
              <div className="fd-panel">
                <h2 className="fd-panel-title">Cold Storage Distribution</h2>
                <div className="fd-filter-row">
                  <span className="fd-filter-label">State:</span>
                  <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} className="fd-select">
                    <option value="">— Select State —</option>
                    {states.map((state) => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>

                {selectedState ? (
                  filteredColdStorage.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={filteredColdStorage}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip contentStyle={{ background: '#1a2e1a', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '10px' }} />
                        <Legend />
                        <Bar dataKey="fci_owned" fill="#fbbf24" name="FCI Owned" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="private_owned" fill="#60a5fa" name="Private Owned" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <div className="fd-empty">No data available for this state</div>
                ) : <div className="fd-empty">Select a state to view analytics</div>}

                <div className="fd-table-wrap">
                  <table className="fd-table">
                    <thead>
                      <tr>
                        <th>State</th>
                        <th>FCI Owned</th>
                        <th>Private Owned</th>
                        <th>Total Units</th>
                        <th>Capacity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coldStorage.map((item: any) => (
                        <tr key={item.id}>
                          <td>{item.state}</td>
                          <td>{item.fci_owned}</td>
                          <td>{item.private_owned}</td>
                          <td>{item.total_units}</td>
                          <td>{item.storage_capacity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'fuel' && (
              <div className="fd-panel">
                <h2 className="fd-panel-title">Fuel Prices</h2>
                {fuelPrices.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={fuelPrices.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip contentStyle={{ background: '#1a2e1a', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '10px' }} />
                      <Legend />
                      <Bar dataKey="cng" fill="#60a5fa" name="CNG" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="petrol" fill="#fbbf24" name="Petrol" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="diesel" fill="#a78bfa" name="Diesel" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="fd-empty">No fuel price data available</div>}
              </div>
            )}

          </main>
        </div>
      </div>
    </>
  );
};