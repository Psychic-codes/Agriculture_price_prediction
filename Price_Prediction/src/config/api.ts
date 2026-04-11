const API_URL = 'http://localhost:5000/api';

export const authAPI = {
  signup: (data: any) => fetch(`${API_URL}/auth/signup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
  login: (data: any) => fetch(`${API_URL}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(r => r.json()),
};

export const farmerAPI = {
  getMSP: (token: string) => fetch(`${API_URL}/farmer/msp`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  getMarketPrices: (token: string) => fetch(`${API_URL}/farmer/market-prices`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  getColdStorage: (token: string) => fetch(`${API_URL}/farmer/cold-storage`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  getFuelPrices: (token: string) => fetch(`${API_URL}/farmer/fuel-prices`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
  predict: (token: string, data: any) => fetch(`${API_URL}/farmer/predict`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) }).then(r => r.json()),
};

export const governmentAPI = {
  addMSP: (token: string, data: any) => fetch(`${API_URL}/government/msp`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) }).then(r => r.json()),
  updateMSP: (token: string, id: string, data: any) => fetch(`${API_URL}/government/msp/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) }).then(r => r.json()),
  deleteMSP: (token: string, id: string) => fetch(`${API_URL}/government/msp/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),

  addColdStorage: (token: string, data: any) => fetch(`${API_URL}/government/cold-storage`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) }).then(r => r.json()),
  updateColdStorage: (token: string, id: string, data: any) => fetch(`${API_URL}/government/cold-storage/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) }).then(r => r.json()),
  deleteColdStorage: (token: string, id: string) => fetch(`${API_URL}/government/cold-storage/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),

  addFuelPrice: (token: string, data: any) => fetch(`${API_URL}/government/fuel-prices`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) }).then(r => r.json()),
  updateFuelPrice: (token: string, id: string, data: any) => fetch(`${API_URL}/government/fuel-prices/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) }).then(r => r.json()),
  deleteFuelPrice: (token: string, id: string) => fetch(`${API_URL}/government/fuel-prices/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),

  addMarketPrice: (token: string, data: any) => fetch(`${API_URL}/government/market-prices`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) }).then(r => r.json()),
  updateMarketPrice: (token: string, id: string, data: any) => fetch(`${API_URL}/government/market-prices/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(data) }).then(r => r.json()),
  deleteMarketPrice: (token: string, id: string) => fetch(`${API_URL}/government/market-prices/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),

  exportMSP: (token: string) => fetch(`${API_URL}/government/export/msp`, { headers: { Authorization: `Bearer ${token}` } }),
};
