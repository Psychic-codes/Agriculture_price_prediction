import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { governmentAPI } from '../config/api';
import { LogOut, Trash2, Download, TrendingUp, Database, Snowflake, Fuel } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=DM+Sans:wght@300;400;500;600;700&display=swap');

  .gd-root {
    min-height: 100vh;
    background: #110f05;
    font-family: 'DM Sans', sans-serif;
    color: #fef9ed;
  }

  /* NAV */
  .gd-nav {
    background: rgba(17,15,5,0.85);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid rgba(251,191,36,0.12);
    padding: 0 2rem;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 50;
  }

  .gd-nav-brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .gd-nav-logo-box {
    width: 34px; height: 34px;
    background: linear-gradient(135deg, #fbbf24, #d97706);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 4px 12px rgba(251,191,36,0.3);
    font-size: 16px;
  }
  .gd-nav-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.2rem;
    font-weight: 700;
    background: linear-gradient(135deg, #fbbf24, #fde68a);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .gd-nav-subtitle {
    font-size: 0.7rem;
    color: rgba(255,255,255,0.35);
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .gd-nav-right {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }
  .gd-nav-welcome {
    font-size: 0.82rem;
    color: rgba(255,255,255,0.4);
  }
  .gd-nav-welcome span {
    color: #fbbf24;
    font-weight: 600;
  }
  .gd-export-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 1rem;
    background: linear-gradient(135deg, rgba(74,222,128,0.15), rgba(22,163,74,0.1));
    border: 1px solid rgba(74,222,128,0.25);
    border-radius: 8px;
    color: #86efac;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .gd-export-btn:hover {
    background: rgba(74,222,128,0.2);
    border-color: rgba(74,222,128,0.4);
  }
  .gd-logout-btn {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.45rem 1rem;
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.2);
    border-radius: 8px;
    color: #fca5a5;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .gd-logout-btn:hover { background: rgba(239,68,68,0.18); border-color: rgba(239,68,68,0.35); }

  /* LAYOUT */
  .gd-layout {
    display: flex;
    height: calc(100vh - 64px);
  }

  /* SIDEBAR */
  .gd-sidebar {
    width: 220px;
    flex-shrink: 0;
    background: rgba(255,255,255,0.02);
    border-right: 1px solid rgba(255,255,255,0.05);
    padding: 1.5rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    overflow-y: auto;
  }
  .gd-sidebar-label {
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.2);
    padding: 0 0.5rem;
    margin-bottom: 0.25rem;
  }
  .gd-tab-btn {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    width: 100%;
    padding: 0.6rem 0.75rem;
    border: none;
    border-radius: 9px;
    background: transparent;
    color: rgba(255,255,255,0.4);
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }
  .gd-tab-btn:hover { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.7); }
  .gd-tab-btn.active {
    background: linear-gradient(135deg, rgba(251,191,36,0.15), rgba(217,119,6,0.1));
    color: #fbbf24;
    border: 1px solid rgba(251,191,36,0.2);
  }

  /* MAIN */
  .gd-main {
    flex: 1;
    overflow-y: auto;
    padding: 2rem;
    background: #110f05;
  }

  /* PAGE HEADER */
  .gd-page-header {
    margin-bottom: 1.75rem;
    animation: gdSlide 0.4s ease both;
  }
  @keyframes gdSlide {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .gd-page-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.75rem;
    font-weight: 700;
    color: #fef9ed;
    letter-spacing: -0.02em;
    margin: 0 0 0.25rem;
  }
  .gd-page-desc {
    font-size: 0.85rem;
    color: rgba(255,255,255,0.3);
    margin: 0;
  }

  /* SPLIT PANEL */
  .gd-split {
    display: grid;
    grid-template-columns: 320px 1fr;
    gap: 1.25rem;
    animation: gdFadeUp 0.5s ease both;
  }
  @keyframes gdFadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* FORM PANEL */
  .gd-form-panel {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 18px;
    padding: 1.5rem;
    height: fit-content;
    position: sticky;
    top: 1rem;
  }
  .gd-form-title {
    font-family: 'Playfair Display', serif;
    font-size: 1rem;
    font-weight: 700;
    color: #fbbf24;
    margin: 0 0 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .gd-form-title::before {
    content: '';
    display: inline-block;
    width: 3px;
    height: 16px;
    background: linear-gradient(#fbbf24, #d97706);
    border-radius: 2px;
  }

  .gd-input {
    width: 100%;
    padding: 0.625rem 0.875rem;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 9px;
    color: #fef9ed;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem;
    outline: none;
    transition: all 0.2s;
    margin-bottom: 0.625rem;
    box-sizing: border-box;
    display: block;
  }
  .gd-input::placeholder { color: rgba(255,255,255,0.25); }
  .gd-input:focus {
    border-color: rgba(251,191,36,0.45);
    background: rgba(251,191,36,0.06);
    box-shadow: 0 0 0 3px rgba(251,191,36,0.08);
  }
  .gd-input[type="date"] { color-scheme: dark; }

  .gd-add-btn {
    width: 100%;
    padding: 0.7rem;
    border: none;
    border-radius: 9px;
    background: linear-gradient(135deg, #fbbf24, #d97706);
    color: #451a03;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.25s;
    box-shadow: 0 4px 14px rgba(251,191,36,0.3);
    margin-top: 0.25rem;
    letter-spacing: 0.01em;
  }
  .gd-add-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 22px rgba(251,191,36,0.4);
  }
  .gd-add-btn:disabled { opacity: 0.45; cursor: not-allowed; }

  /* DATA PANEL */
  .gd-data-panel {
    background: rgba(255,255,255,0.025);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 18px;
    padding: 1.5rem;
    overflow: hidden;
  }
  .gd-data-title {
    font-family: 'Playfair Display', serif;
    font-size: 1.1rem;
    font-weight: 700;
    color: #fef9ed;
    margin: 0 0 1.25rem;
  }

  /* TABLE */
  .gd-table-wrap {
    overflow-x: auto;
    border-radius: 10px;
    border: 1px solid rgba(255,255,255,0.06);
  }
  .gd-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  .gd-table th {
    padding: 0.7rem 1rem;
    text-align: left;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.3);
    background: rgba(255,255,255,0.03);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    white-space: nowrap;
  }
  .gd-table td {
    padding: 0.7rem 1rem;
    border-bottom: 1px solid rgba(255,255,255,0.04);
    color: rgba(255,255,255,0.7);
  }
  .gd-table tbody tr:last-child td { border-bottom: none; }
  .gd-table tbody tr { transition: background 0.15s; }
  .gd-table tbody tr:hover td { background: rgba(251,191,36,0.04); }

  .gd-delete-btn {
    background: none;
    border: none;
    color: rgba(239,68,68,0.5);
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
  }
  .gd-delete-btn:hover { color: #f87171; background: rgba(239,68,68,0.12); }

  /* ERROR BANNER */
  .gd-error {
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.25);
    border-radius: 10px;
    padding: 0.75rem 1rem;
    color: #fca5a5;
    font-size: 0.85rem;
    margin-bottom: 1.25rem;
    animation: gdSlide 0.3s ease;
  }

  .gd-empty {
    text-align: center;
    padding: 2.5rem;
    color: rgba(255,255,255,0.2);
    font-size: 0.875rem;
  }
`;

const tabs = [
  { id: 'msp', label: 'MSP', icon: TrendingUp },
  { id: 'market', label: 'Market', icon: Database },
  { id: 'cold-storage', label: 'Cold Storage', icon: Snowflake },
  { id: 'fuel', label: 'Fuel', icon: Fuel },
];

export const GovernmentDashboard = () => {
  const { user, logout, token } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('msp');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [mspData, setMspData] = useState([]);
  const [marketPrices, setMarketPrices] = useState([]);
  const [coldStorage, setColdStorage] = useState([]);
  const [fuelPrices, setFuelPrices] = useState([]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [mspForm, setMspForm] = useState({ commodity: '', price: '', year: '' });
  const [marketForm, setMarketForm] = useState({ commodity: '', state: '', date: '', price_per_quintal: '' });
  const [coldStorageForm, setColdStorageForm] = useState({ date: '', state: '', fci_owned: '', private_owned: '', total_units: '', storage_capacity: '' });
  const [fuelForm, setFuelForm] = useState({ date: '', cng: '', petrol: '', diesel: '' });

  useEffect(() => {
    if (token) loadAllData();
  }, [token]);

  const loadAllData = async () => {
    try {
      const [msp, market, storage, fuel] = await Promise.all([
        fetch(`http://localhost:5000/api/farmer/msp`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch(`http://localhost:5000/api/farmer/market-prices`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch(`http://localhost:5000/api/farmer/cold-storage`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch(`http://localhost:5000/api/farmer/fuel-prices`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      ]);
      setMspData(msp); setMarketPrices(market); setColdStorage(storage); setFuelPrices(fuel);
    } catch (err) { setError('Failed to load data'); }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const handleAddMSP = async () => {
    try { setLoading(true); await governmentAPI.addMSP(token!, { commodity: mspForm.commodity, price: parseFloat(mspForm.price), year: parseInt(mspForm.year) }); setMspForm({ commodity: '', price: '', year: '' }); await loadAllData(); }
    catch (err) { setError('Failed to add MSP'); } finally { setLoading(false); }
  };
  const handleDeleteMSP = async (id: string) => {
    try { await governmentAPI.deleteMSP(token!, id); await loadAllData(); }
    catch (err) { setError('Failed to delete MSP'); }
  };
  const handleAddMarketPrice = async () => {
    try { setLoading(true); await governmentAPI.addMarketPrice(token!, { commodity: marketForm.commodity, state: marketForm.state, date: marketForm.date, price_per_quintal: parseFloat(marketForm.price_per_quintal) }); setMarketForm({ commodity: '', state: '', date: '', price_per_quintal: '' }); await loadAllData(); }
    catch (err) { setError('Failed to add market price'); } finally { setLoading(false); }
  };
  const handleDeleteMarketPrice = async (id: string) => {
    try { await governmentAPI.deleteMarketPrice(token!, id); await loadAllData(); }
    catch (err) { setError('Failed to delete market price'); }
  };
  const handleAddColdStorage = async () => {
    try { setLoading(true); await governmentAPI.addColdStorage(token!, { date: coldStorageForm.date, state: coldStorageForm.state, fci_owned: parseInt(coldStorageForm.fci_owned), private_owned: parseInt(coldStorageForm.private_owned), total_units: parseInt(coldStorageForm.total_units), storage_capacity: coldStorageForm.storage_capacity }); setColdStorageForm({ date: '', state: '', fci_owned: '', private_owned: '', total_units: '', storage_capacity: '' }); await loadAllData(); }
    catch (err) { setError('Failed to add cold storage'); } finally { setLoading(false); }
  };
  const handleDeleteColdStorage = async (id: string) => {
    try { await governmentAPI.deleteColdStorage(token!, id); await loadAllData(); }
    catch (err) { setError('Failed to delete cold storage'); }
  };
  const handleAddFuelPrice = async () => {
    try { setLoading(true); await governmentAPI.addFuelPrice(token!, { date: fuelForm.date, cng: parseFloat(fuelForm.cng), petrol: parseFloat(fuelForm.petrol), diesel: parseFloat(fuelForm.diesel) }); setFuelForm({ date: '', cng: '', petrol: '', diesel: '' }); await loadAllData(); }
    catch (err) { setError('Failed to add fuel price'); } finally { setLoading(false); }
  };
  const handleDeleteFuelPrice = async (id: string) => {
    try { await governmentAPI.deleteFuelPrice(token!, id); await loadAllData(); }
    catch (err) { setError('Failed to delete fuel price'); }
  };
  const handleExport = async () => {
    try { const response = await governmentAPI.exportMSP(token!); const blob = await response.blob(); const url = window.URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'msp_data.xlsx'; a.click(); }
    catch (err) { setError('Failed to export data'); }
  };

  const tabIcons: Record<string, React.ReactNode> = {
    msp: <TrendingUp size={15} />, market: <Database size={15} />,
    'cold-storage': <Snowflake size={15} />, fuel: <Fuel size={15} />,
  };

  return (
    <>
      <style>{styles}</style>
      <div className="gd-root">
        {/* NAV */}
        <nav className="gd-nav">
          <div className="gd-nav-brand">
            <div className="gd-nav-logo-box">🏛️</div>
            <div>
              <div className="gd-nav-title">AgroPrice</div>
              <div className="gd-nav-subtitle">Government Portal</div>
            </div>
          </div>
          <div className="gd-nav-right">
            <span className="gd-nav-welcome">
              <span>{user?.name}</span>{user?.state ? ` · ${user.state}` : ''}
            </span>
            <button onClick={handleExport} className="gd-export-btn">
              <Download size={14} /> Export
            </button>
            <button onClick={handleLogout} className="gd-logout-btn">
              <LogOut size={14} /> Logout
            </button>
          </div>
        </nav>

        <div className="gd-layout">
          {/* SIDEBAR */}
          <aside className="gd-sidebar">
            <div className="gd-sidebar-label">Data Management</div>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`gd-tab-btn ${activeTab === tab.id ? 'active' : ''}`}>
                  <Icon size={15} /> {tab.label}
                </button>
              );
            })}
          </aside>

          {/* MAIN */}
          <main className="gd-main">
            {error && <div className="gd-error">{error}</div>}

            {/* MSP */}
            {activeTab === 'msp' && (
              <>
                <div className="gd-page-header">
                  <h1 className="gd-page-title">Minimum Support Price</h1>
                  <p className="gd-page-desc">Add and manage commodity MSP records</p>
                </div>
                <div className="gd-split">
                  <div className="gd-form-panel">
                    <div className="gd-form-title">Add MSP Record</div>
                    <input type="text" placeholder="Commodity" value={mspForm.commodity} onChange={(e) => setMspForm({ ...mspForm, commodity: e.target.value })} className="gd-input" />
                    <input type="number" placeholder="Price (₹)" value={mspForm.price} onChange={(e) => setMspForm({ ...mspForm, price: e.target.value })} className="gd-input" />
                    <input type="number" placeholder="Year" value={mspForm.year} onChange={(e) => setMspForm({ ...mspForm, year: e.target.value })} className="gd-input" />
                    <button onClick={handleAddMSP} disabled={loading} className="gd-add-btn">
                      {loading ? 'Adding…' : '+ Add MSP'}
                    </button>
                  </div>
                  <div className="gd-data-panel">
                    <div className="gd-data-title">MSP Records</div>
                    {mspData.length > 0 ? (
                      <div className="gd-table-wrap">
                        <table className="gd-table">
                          <thead><tr><th>Commodity</th><th>Price</th><th>Year</th><th></th></tr></thead>
                          <tbody>
                            {mspData.map((item: any) => (
                              <tr key={item.id}>
                                <td>{item.commodity}</td>
                                <td>₹{item.price}</td>
                                <td>{item.year}</td>
                                <td><button onClick={() => handleDeleteMSP(item.id)} className="gd-delete-btn"><Trash2 size={15} /></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <div className="gd-empty">No records yet</div>}
                  </div>
                </div>
              </>
            )}

            {/* MARKET */}
            {activeTab === 'market' && (
              <>
                <div className="gd-page-header">
                  <h1 className="gd-page-title">Market Prices</h1>
                  <p className="gd-page-desc">Manage state-wise commodity market prices</p>
                </div>
                <div className="gd-split">
                  <div className="gd-form-panel">
                    <div className="gd-form-title">Add Market Price</div>
                    <input type="text" placeholder="Commodity" value={marketForm.commodity} onChange={(e) => setMarketForm({ ...marketForm, commodity: e.target.value })} className="gd-input" />
                    <input type="text" placeholder="State" value={marketForm.state} onChange={(e) => setMarketForm({ ...marketForm, state: e.target.value })} className="gd-input" />
                    <input type="date" value={marketForm.date} onChange={(e) => setMarketForm({ ...marketForm, date: e.target.value })} className="gd-input" />
                    <input type="number" placeholder="Price per Quintal" value={marketForm.price_per_quintal} onChange={(e) => setMarketForm({ ...marketForm, price_per_quintal: e.target.value })} className="gd-input" />
                    <button onClick={handleAddMarketPrice} disabled={loading} className="gd-add-btn">
                      {loading ? 'Adding…' : '+ Add Price'}
                    </button>
                  </div>
                  <div className="gd-data-panel">
                    <div className="gd-data-title">Market Prices</div>
                    {marketPrices.length > 0 ? (
                      <div className="gd-table-wrap">
                        <table className="gd-table">
                          <thead><tr><th>Commodity</th><th>State</th><th>Date</th><th>Price</th><th></th></tr></thead>
                          <tbody>
                            {marketPrices.map((item: any) => (
                              <tr key={item.id}>
                                <td>{item.commodity}</td>
                                <td>{item.state}</td>
                                <td>{item.date}</td>
                                <td>₹{item.price_per_quintal}</td>
                                <td><button onClick={() => handleDeleteMarketPrice(item.id)} className="gd-delete-btn"><Trash2 size={15} /></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <div className="gd-empty">No records yet</div>}
                  </div>
                </div>
              </>
            )}

            {/* COLD STORAGE */}
            {activeTab === 'cold-storage' && (
              <>
                <div className="gd-page-header">
                  <h1 className="gd-page-title">Cold Storage</h1>
                  <p className="gd-page-desc">Track FCI and private cold storage infrastructure</p>
                </div>
                <div className="gd-split">
                  <div className="gd-form-panel">
                    <div className="gd-form-title">Add Cold Storage</div>
                    <input type="date" value={coldStorageForm.date} onChange={(e) => setColdStorageForm({ ...coldStorageForm, date: e.target.value })} className="gd-input" />
                    <input type="text" placeholder="State" value={coldStorageForm.state} onChange={(e) => setColdStorageForm({ ...coldStorageForm, state: e.target.value })} className="gd-input" />
                    <input type="number" placeholder="FCI Owned" value={coldStorageForm.fci_owned} onChange={(e) => setColdStorageForm({ ...coldStorageForm, fci_owned: e.target.value })} className="gd-input" />
                    <input type="number" placeholder="Private Owned" value={coldStorageForm.private_owned} onChange={(e) => setColdStorageForm({ ...coldStorageForm, private_owned: e.target.value })} className="gd-input" />
                    <input type="number" placeholder="Total Units" value={coldStorageForm.total_units} onChange={(e) => setColdStorageForm({ ...coldStorageForm, total_units: e.target.value })} className="gd-input" />
                    <input type="text" placeholder="Storage Capacity" value={coldStorageForm.storage_capacity} onChange={(e) => setColdStorageForm({ ...coldStorageForm, storage_capacity: e.target.value })} className="gd-input" />
                    <button onClick={handleAddColdStorage} disabled={loading} className="gd-add-btn">
                      {loading ? 'Adding…' : '+ Add Storage'}
                    </button>
                  </div>
                  <div className="gd-data-panel">
                    <div className="gd-data-title">Cold Storage Data</div>
                    {coldStorage.length > 0 ? (
                      <div className="gd-table-wrap">
                        <table className="gd-table">
                          <thead><tr><th>State</th><th>FCI</th><th>Private</th><th>Total</th><th>Capacity</th><th></th></tr></thead>
                          <tbody>
                            {coldStorage.map((item: any) => (
                              <tr key={item.id}>
                                <td>{item.state}</td>
                                <td>{item.fci_owned}</td>
                                <td>{item.private_owned}</td>
                                <td>{item.total_units}</td>
                                <td>{item.storage_capacity}</td>
                                <td><button onClick={() => handleDeleteColdStorage(item.id)} className="gd-delete-btn"><Trash2 size={15} /></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <div className="gd-empty">No records yet</div>}
                  </div>
                </div>
              </>
            )}

            {/* FUEL */}
            {activeTab === 'fuel' && (
              <>
                <div className="gd-page-header">
                  <h1 className="gd-page-title">Fuel Prices</h1>
                  <p className="gd-page-desc">Manage CNG, petrol, and diesel price updates</p>
                </div>
                <div className="gd-split">
                  <div className="gd-form-panel">
                    <div className="gd-form-title">Add Fuel Price</div>
                    <input type="date" value={fuelForm.date} onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })} className="gd-input" />
                    <input type="number" placeholder="CNG (₹/kg)" value={fuelForm.cng} onChange={(e) => setFuelForm({ ...fuelForm, cng: e.target.value })} className="gd-input" />
                    <input type="number" placeholder="Petrol (₹/L)" value={fuelForm.petrol} onChange={(e) => setFuelForm({ ...fuelForm, petrol: e.target.value })} className="gd-input" />
                    <input type="number" placeholder="Diesel (₹/L)" value={fuelForm.diesel} onChange={(e) => setFuelForm({ ...fuelForm, diesel: e.target.value })} className="gd-input" />
                    <button onClick={handleAddFuelPrice} disabled={loading} className="gd-add-btn">
                      {loading ? 'Adding…' : '+ Add Price'}
                    </button>
                  </div>
                  <div className="gd-data-panel">
                    <div className="gd-data-title">Fuel Prices</div>
                    {fuelPrices.length > 0 ? (
                      <div className="gd-table-wrap">
                        <table className="gd-table">
                          <thead><tr><th>Date</th><th>CNG</th><th>Petrol</th><th>Diesel</th><th></th></tr></thead>
                          <tbody>
                            {fuelPrices.map((item: any) => (
                              <tr key={item.id}>
                                <td>{item.date}</td>
                                <td>₹{item.cng}</td>
                                <td>₹{item.petrol}</td>
                                <td>₹{item.diesel}</td>
                                <td><button onClick={() => handleDeleteFuelPrice(item.id)} className="gd-delete-btn"><Trash2 size={15} /></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : <div className="gd-empty">No records yet</div>}
                  </div>
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
};
