<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Vite-5.4-646CFF?style=for-the-badge&logo=vite&logoColor=white" />
  <img src="https://img.shields.io/badge/Express-4.x-000000?style=for-the-badge&logo=express&logoColor=white" />
</p>

# 🌾 Agriculture Price Prediction

> **End-to-end ML-powered agricultural commodity price forecasting platform** — from raw market data to interactive dashboards with 30-day price trajectories, SHAP-driven explainability, and real-time API integration.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Commodities Covered](#commodities-covered)
- [Project Structure](#project-structure)
- [ML Pipeline](#ml-pipeline)
  - [Feature Engineering](#feature-engineering)
  - [Model Training](#model-training)
  - [Prediction & Forecasting](#prediction--forecasting)
- [Dashboard (Price\_Prediction)](#dashboard-price_prediction)
  - [Frontend](#frontend)
  - [Backend API](#backend-api)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [ML Pipeline Setup](#ml-pipeline-setup)
  - [Dashboard Setup](#dashboard-setup)
- [API Reference](#api-reference)
- [Data Sources](#data-sources)
- [Screenshots](#screenshots)
- [License](#license)

---

## Overview

This project combines **production-grade machine learning** with a **modern React dashboard** to forecast agricultural commodity prices across Indian markets. The system ingests historical market prices, weather data, fuel economics, and government MSP (Minimum Support Price) data to produce daily 30-day-ahead price forecasts with 95% confidence intervals.

### Key Highlights

- 🤖 **Stacking Ensemble** — Multi-model meta-learner combining Random Forest, XGBoost, and LightGBM with Ridge regression as the final estimator
- 📊 **30-Day Multi-Output Forecasting** — Simultaneous prediction of prices for the next 30 days using percentage-change targets
- 🔍 **SHAP Explainability** — Tree-based SHAP values identify top price drivers per commodity
- 🌦️ **Weather Integration** — Maharashtra daily weather (temperature, rainfall) with short-cycle shock features
- ⛽ **Fuel Economics** — Diesel/petrol price lag features as transport cost proxies
- 📈 **Interactive Dashboard** — Dark-themed React SPA with Recharts-powered visualisations
- 🔌 **REST API** — Express.js backend serving live market data, MSP trends, weather, and ML forecasts

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                              │
│  Excel (Price/Arrival)  │  Weather CSV  │  Fuel CSV  │  MSP.xlsx │
└────────────┬─────────────────────┬──────────────┬────────────────┘
             │                     │              │
             ▼                     ▼              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    ML PIPELINE (Python)                           │
│                                                                  │
│  ┌─────────────────┐   ┌──────────────────┐   ┌──────────────┐  │
│  │ Feature Eng.    │──▶│ Model Training   │──▶│ predict.py   │  │
│  │ (Cereal + Veg)  │   │ (Stacking Meta)  │   │ (Forecasts)  │  │
│  └─────────────────┘   └──────────────────┘   └──────┬───────┘  │
│                                                       │          │
│  Outputs: Feature CSVs, .pkl models, SHAP plots,     │          │
│           latest_forecasts.json                       │          │
└───────────────────────────────────────────────────────┼──────────┘
                                                        │
                                                        ▼
┌──────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js / Express)                    │
│                                                                  │
│  /api/commodities  │  /api/msp  │  /api/weather  │  /api/fuel   │
│  /api/ml-forecasts │  /api/categories  │  /api/health            │
│  /plots/shap/*     │  /plots/performance/*                       │
└───────────────────────────────────────────────────────┬──────────┘
                                                        │
                                                        ▼
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + TypeScript + Vite)           │
│                                                                  │
│  Dashboard  │  Market Prices  │  Market Forecast  │  MSP Tracker │
│  Weather Forecast  │  Fuel Prices  │  AI Assistant (Planned)     │
└──────────────────────────────────────────────────────────────────┘
```

---

## Commodities Covered

| Category   | Commodity        | Emoji | Data Source         |
|------------|------------------|-------|---------------------|
| Vegetables | Onion            | 🧅    | Vegetable_Price.xlsx |
| Vegetables | Potato           | 🥔    | Vegetable_Price.xlsx |
| Vegetables | Tomato           | 🍅    | Vegetable_Price.xlsx |
| Cereals    | Wheat            | 🌾    | Cereal_Price.xlsx   |
| Cereals    | Rice             | 🍚    | Cereal_Price.xlsx   |
| Pulses     | Arhar (Tur Dal)  | 🫘    | Cereal_Price.xlsx   |

---

## Project Structure

```
Agriculture_price_prediction/
│
├── ml_pipeline/                          # Python ML pipeline
│   ├── data/                             # Raw & engineered datasets
│   │   ├── Cereal_Price.xlsx             # Raw cereal price + arrival data
│   │   ├── Vegetable_Price.xlsx          # Raw vegetable price + arrival data
│   │   ├── MSP.xlsx                      # Government MSP rates (2013–2025)
│   │   ├── Fuel_prices.csv               # Monthly petrol/diesel prices
│   │   ├── maharashtra_daily_weather_2015_2025.csv
│   │   ├── Cereal_Feature_v1.csv         # Engineered features (single-output)
│   │   ├── Cereal_Feature_v2_Multi.csv   # Engineered features (30-day multi-output)
│   │   ├── Vegetable_Feature_v1.csv      # Engineered features (single-output)
│   │   └── Vegetable_Feature_v2_Multi.csv# Engineered features (30-day multi-output)
│   │
│   ├── feature_engineering/              # Feature engineering scripts
│   │   ├── Cereal_feature_v1.py          # Single-output cereal features
│   │   ├── Cereal_feature_generator.py   # Multi-output cereal target generator
│   │   ├── Vegetable_feature_v1.py       # Single-output vegetable features
│   │   └── Vegetable_feature_generator.py# Multi-output vegetable target generator
│   │
│   ├── models/                           # Training & inference
│   │   ├── Cereal_ml_v1.py              # Cereal model training pipeline
│   │   ├── Vegetable_ml_v1.py           # Vegetable model training pipeline
│   │   ├── predict.py                   # Inference script → latest_forecasts.json
│   │   └── saved_models/
│   │       ├── global_stacking_30d.pkl       # Cereal stacking model (~67 MB)
│   │       └── global_veg_stacking_30d.pkl   # Vegetable stacking model (~69 MB)
│   │
│   ├── scripts/                          # Utility scripts
│   │   ├── generate_plots.py            # Performance & SHAP plot generation
│   │   └── test_shap.py                 # SHAP analysis testing
│   │
│   ├── plots/                            # Generated visualisations
│   │   ├── shap/                        # SHAP bar plots per commodity
│   │   └── performance/                 # Forecast accuracy plots per commodity
│   │
│   └── latest_forecasts.json            # Final prediction output (served by API)
│
├── Price_Prediction/                     # React dashboard application
│   ├── src/
│   │   ├── App.tsx                      # Main app with page routing
│   │   ├── main.tsx                     # React entry point
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx          # Navigation sidebar
│   │   │   │   └── Navbar.tsx           # Top navigation bar
│   │   │   └── ui/
│   │   │       ├── PriceChart.tsx       # Recharts price chart component
│   │   │       ├── MSPGrowthChart.tsx   # MSP trend visualisation
│   │   │       ├── Sparkline.tsx        # Inline sparkline component
│   │   │       └── index.tsx            # Shared UI components
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx        # Main overview dashboard
│   │   │   ├── MarketPricesPage.tsx     # Live market prices
│   │   │   ├── MarketForecastPage.tsx   # ML forecast visualisation
│   │   │   ├── MSPTrackerPage.tsx       # MSP history & trends
│   │   │   ├── WeatherForecastPage.tsx  # Weather data integration
│   │   │   ├── FuelPricesPage.tsx       # Fuel price tracking
│   │   │   ├── FarmerDashboard.tsx      # Farmer-focused view
│   │   │   ├── GovernmentDashboard.tsx  # Policy-maker view
│   │   │   ├── Auth.tsx                 # Authentication page
│   │   │   └── ProtectedRoute.tsx       # Route guard
│   │   ├── services/                    # API service layer
│   │   │   ├── marketApi.ts             # Market data API client
│   │   │   ├── mspService.ts            # MSP data service
│   │   │   └── weatherApi.ts            # Weather API client
│   │   ├── config/
│   │   │   └── api.ts                   # API base URL configuration
│   │   ├── context/
│   │   │   └── AuthContext.tsx           # Authentication context
│   │   ├── data/                        # Static/mock data fallbacks
│   │   ├── types/                       # TypeScript type definitions
│   │   └── styles/                      # Theme & styling
│   │
│   ├── backend/                         # Express.js API server
│   │   ├── server.js                    # Server entry point (port 5000)
│   │   ├── dataLoader.js               # Excel/CSV data parsers
│   │   ├── routes/
│   │   │   ├── commodities.js           # /api/commodities endpoints
│   │   │   ├── categories.js            # /api/categories endpoint
│   │   │   ├── msp.js                   # /api/msp endpoints
│   │   │   ├── weather.js               # /api/weather endpoint
│   │   │   ├── fuel.js                  # /api/fuel endpoint
│   │   │   ├── auth.js                  # /api/auth endpoints
│   │   │   ├── farmer.js                # /api/farmer endpoints
│   │   │   └── government.js            # /api/government endpoints
│   │   ├── middleware/
│   │   │   └── auth.js                  # JWT authentication middleware
│   │   ├── utils/
│   │   │   ├── auth.js                  # Auth helper utilities
│   │   │   ├── db.js                    # Database connection utility
│   │   │   └── excelwriter.js           # Excel export utility
│   │   └── data/                        # Backend data files (Excel)
│   │
│   ├── supabase/
│   │   └── migrations/                  # Database schema migrations
│   │
│   ├── package.json                     # Frontend dependencies
│   ├── vite.config.ts                   # Vite configuration
│   ├── tailwind.config.js               # Tailwind CSS config
│   └── tsconfig.json                    # TypeScript configuration
│
└── README.md                            # ← You are here
```

---

## ML Pipeline

### Feature Engineering

The pipeline generates **100+ engineered features** from raw market data, organised into categories:

| Feature Group          | Examples                                                        | Purpose                                |
|------------------------|-----------------------------------------------------------------|----------------------------------------|
| **Price Lags**         | `price_lag_1`, `price_lag_3`, `price_lag_7`, `price_lag_14`     | Autoregressive memory                  |
| **Rolling Statistics** | `price_rolling_mean_7/14/30`, `price_volatility_7/14/30`       | Trend & volatility context             |
| **Momentum**           | `price_momentum_3/7`, `price_pct_change_3/7/14`, `macd`, `rsi` | Directional signals & technical indicators |
| **Supply/Arrival**     | `arrival_shock`, `supply_stress_index`, `supply_tightness`      | Supply-demand dynamics                 |
| **Weather**            | `temp_7d_avg`, `rainfall_shock_3d`, `temp_deviation_14d`        | Climate-driven price pressure          |
| **Fuel Economics**     | `diesel_lag_7/30`, `diesel_pct_change_30`, `fuel_cost_pressure` | Transport cost proxies                 |
| **MSP**                | `msp`, `msp_yearly_growth`, `seasonal_price_index`              | Government policy signals (Cereals)    |
| **Regime Detection**   | `price_zscore_365`, `price_norm_trailing`, `price_accel_7`      | Structural break handling              |

> **Leak-free design**: All features use `shift(1)` or lagged values to ensure no future information contaminates training data.

### Model Training

Both the **Cereal** and **Vegetable** pipelines follow the same architecture:

1. **Data Split**: 70% Train / 15% Validation / 15% Test (date-based shared calendar cutoffs)
2. **Base Models** (tuned via `RandomizedSearchCV` with `TimeSeriesSplit`):
   - Random Forest
   - XGBoost (`reg:pseudohubererror` objective)
   - LightGBM (`huber` objective)
3. **Meta-Learner**: `MultiOutputRegressor(StackingRegressor(...))` with `Ridge(alpha=1.0)` as the final estimator
4. **Target**: 30-dimensional vector of day-ahead percentage changes (`target_1d_pct_change` ... `target_30d_pct_change`)

```
                    ┌─────────────────┐
                    │  Random Forest  │─┐
                    └─────────────────┘ │
                    ┌─────────────────┐ │   ┌──────────────────────┐
   Features ───────▶│    XGBoost      │─┼──▶│  Stacking Regressor  │──▶ 30-day predictions
                    └─────────────────┘ │   │  (Ridge meta-learner)│
                    ┌─────────────────┐ │   └──────────────────────┘
                    │    LightGBM     │─┘
                    └─────────────────┘
```

### Prediction & Forecasting

The `predict.py` script:

1. Loads the latest feature CSVs and saved `.pkl` models
2. Extracts the most recent row per commodity
3. Generates 30-day price trajectories with **95% confidence intervals** (Z-score scaled by cross-model standard deviation)
4. Computes **SHAP values** (via `TreeExplainer` on the XGBoost base model) to identify top price drivers
5. Outputs `latest_forecasts.json` with the following schema:

```json
{
  "generated_at": "2026-04-12T01:57:08",
  "horizon": "1-to-30-days",
  "forecasts": {
    "wheat": {
      "latest_data_date": "2025-10-30",
      "current_price": 2685.29,
      "trajectory": [
        {
          "day_ahead": 1,
          "date": "2025-10-31",
          "predicted_price": 2690.62,
          "lower_bound_95": 2684.65,
          "upper_bound_95": 2696.58,
          "predicted_pct_change": 0.20
        }
      ],
      "top_price_drivers": [
        { "feature": "arrivals_lag_7", "impact": "Lower", "strength": "0.3%" }
      ]
    }
  }
}
```

---

## Dashboard (Price_Prediction)

### Frontend

A **React 18 + TypeScript** single-page application built with Vite, featuring:

| Page               | Description                                                    |
|--------------------|----------------------------------------------------------------|
| **Dashboard**      | At-a-glance overview — key metrics, sparklines, market trends  |
| **Market Prices**  | Historical price & arrival charts per commodity (filterable)   |
| **Market Forecast**| ML-powered 30-day forecasts with confidence bands & SHAP plots |
| **MSP Tracker**    | Government MSP rates history (2014–2025) with growth trends    |
| **Weather Forecast**| Regional weather data affecting crop prices                   |
| **Fuel Prices**    | Petrol & diesel price tracking as transport cost proxies       |

**Tech highlights**: Recharts for data visualisation, Lucide React for icons, React Router for navigation, Supabase for auth, and a dark-themed custom design system.

### Backend API

An **Express.js** server (port 5000) that:

- Reads raw `.xlsx` data files directly via the `xlsx` library
- Parses and caches workbook data in memory for fast responses
- Serves ML forecast JSON from the Python pipeline output
- Statically serves SHAP and performance plots
- Provides JWT-based authentication

---

## Getting Started

### Prerequisites

- **Python 3.10+** with pip
- **Node.js 18+** with npm
- (Optional) **LightGBM** system dependencies for `lightgbm` Python package

### ML Pipeline Setup

```bash
# 1. Install Python dependencies
pip install pandas numpy scikit-learn xgboost lightgbm pmdarima prophet shap matplotlib seaborn joblib scipy statsmodels openpyxl

# 2. Run feature engineering (from project root)
python ml_pipeline/feature_engineering/Vegetable_feature_v1.py
python ml_pipeline/feature_engineering/Vegetable_feature_generator.py
python ml_pipeline/feature_engineering/Cereal_feature_v1.py
python ml_pipeline/feature_engineering/Cereal_feature_generator.py

# 3. Train models (takes ~30-60 minutes per pipeline)
python ml_pipeline/models/Cereal_ml_v1.py
python ml_pipeline/models/Vegetable_ml_v1.py

# 4. Generate predictions
python ml_pipeline/models/predict.py

# 5. (Optional) Generate performance plots
python ml_pipeline/scripts/generate_plots.py
```

### Dashboard Setup

```bash
# 1. Install frontend dependencies
cd Price_Prediction
npm install

# 2. Install backend dependencies
cd backend
npm install

# 3. Set up environment variables
# Create backend/.env with:
#   PORT=5000
#   JWT_SECRET=your_secret_key
#   SUPABASE_URL=your_supabase_url
#   SUPABASE_KEY=your_supabase_key

# 4. Start the backend (from Price_Prediction/backend)
npm run dev

# 5. Start the frontend (from Price_Prediction root, in a new terminal)
cd ..
npm run dev
```

The frontend will be available at `http://localhost:5173` and the API at `http://localhost:5000`.

---

## API Reference

| Method | Endpoint                              | Description                              |
|--------|---------------------------------------|------------------------------------------|
| GET    | `/api/health`                         | Health check                             |
| GET    | `/api/categories`                     | List commodity categories                |
| GET    | `/api/commodities`                    | List all commodities with metadata       |
| GET    | `/api/commodities/:id/price?days=90`  | Historical price data for a commodity    |
| GET    | `/api/commodities/:id/arrival?days=90`| Historical arrival data for a commodity  |
| GET    | `/api/msp`                            | All MSP data                             |
| GET    | `/api/msp/years`                      | Available MSP years                      |
| GET    | `/api/msp/latest`                     | Latest MSP rates                         |
| GET    | `/api/msp/summary`                    | MSP summary statistics                   |
| GET    | `/api/msp/trend/:commodity`           | MSP trend for a specific commodity       |
| GET    | `/api/weather?lat=19.076&lon=72.8777` | Weather data for coordinates             |
| GET    | `/api/fuel`                           | Fuel price data                          |
| GET    | `/api/ml-forecasts`                   | ML-generated 30-day forecasts (JSON)     |
| GET    | `/plots/shap/:name.png`              | SHAP explainability plots                |
| GET    | `/plots/performance/:name.png`       | Model performance plots                  |

---

## Data Sources

| Dataset                                    | Format  | Description                                                |
|-------------------------------------------|---------|------------------------------------------------------------|
| `Cereal_Price.xlsx`                        | Excel   | Daily price & arrival data for Wheat, Rice, Arhar          |
| `Vegetable_Price.xlsx`                     | Excel   | Daily price & arrival data for Onion, Potato, Tomato       |
| `MSP.xlsx`                                 | Excel   | Government Minimum Support Prices (2013–2025)              |
| `Fuel_prices.csv`                          | CSV     | Monthly petrol & diesel prices for Maharashtra             |
| `maharashtra_daily_weather_2015_2025.csv`  | CSV     | Daily temperature & rainfall for Maharashtra (2015–2025)   |

---

## Screenshots

> _The dashboard features a dark-themed design with a sidebar navigation system, interactive Recharts visualisations, and real-time data hydration from the Express API._

**Dashboard pages include:**
- 📊 Main Dashboard with commodity overview cards and trend sparklines
- 📈 Market Prices with interactive historical price & arrival charts
- 🔮 Market Forecast with 30-day ML predictions and confidence intervals
- 📋 MSP Tracker with yearly growth trend analysis
- 🌦️ Weather Forecast with agricultural weather impact analysis
- ⛽ Fuel Prices with petrol/diesel tracking

---

## License

This project is for educational and research purposes.
