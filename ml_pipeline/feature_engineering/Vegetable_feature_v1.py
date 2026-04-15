import pandas as pd
import numpy as np
import os
from sklearn.preprocessing import LabelEncoder

print("=" * 60)
print("  VEGETABLE FEATURE ENGINEERING PIPELINE v2")
print("=" * 60)

# ─────────────────────────────────────────────────────────────
# SECTION 1 — LOAD PRICE & ARRIVAL DATA
# ─────────────────────────────────────────────────────────────
input_file = "ml_pipeline/data/Vegetable_Price.xlsx"
sheets = pd.read_excel(input_file, sheet_name=None)
print(" Excel Loaded")

product_sheets = {}
for sheet_name, df in sheets.items():
    product, sheet_type = sheet_name.rsplit(" ", 1)
    product_sheets.setdefault(product.lower(), {})[sheet_type] = df

final_data = []
for product, data in product_sheets.items():
    if "Price" not in data or "Arrival" not in data:
        continue

    p_df       = data["Price"].copy()
    arrival_df = data["Arrival"].copy()

    p_df["Date"]       = pd.to_datetime(p_df["Date"])
    arrival_df["Date"] = pd.to_datetime(arrival_df["Date"])

    merged = pd.merge(p_df, arrival_df, on="Date", how="outer")

    min_date   = merged["Date"].min()
    max_date   = merged["Date"].max()
    full_dates = pd.DataFrame({"Date": pd.date_range(min_date, max_date, freq="D")})

    merged = full_dates.merge(merged, on="Date", how="left")
    merged["commodity"] = product
    final_data.append(merged)

price_df = pd.concat(final_data, ignore_index=True)

column_map = {
    "Modal Price (₹)": "modal_price",
    "Min Price (₹)":   "min_price",
    "Max Price (₹)":   "max_price",
    "Qty (Tonne)":     "arrivals"
}
price_df = price_df.rename(columns=column_map)

new_arr_col = [c for c in price_df.columns if "arrival" in c.lower() and c != "arrivals"]
if new_arr_col:
    price_df.rename(columns={new_arr_col[0]: "arrivals"}, inplace=True)

print(" Price & Arrival mapped and merged")

# ─────────────────────────────────────────────────────────────
# SECTION 2 — CLEANING & OUTLIER FILTERING
# ─────────────────────────────────────────────────────────────
price_df["date"] = pd.to_datetime(price_df["Date"])
price_df = price_df.loc[:, ~price_df.columns.duplicated(keep="first")]
price_df = price_df.sort_values(["commodity", "date"])

for col in ["Change (₹)", "Date"]:
    if col in price_df.columns:
        price_df.drop(columns=[col], inplace=True)

columns_to_ffill = ["modal_price", "min_price", "max_price", "arrivals"]
columns_to_ffill = [c for c in columns_to_ffill if c in price_df.columns]
price_df[columns_to_ffill] = (
    price_df.groupby("commodity")[columns_to_ffill].ffill(limit=3)
)

# Basic validity filter (align with Cereal pipeline)
validity_mask = price_df["modal_price"] > 0
if "min_price" in price_df.columns and "max_price" in price_df.columns:
    validity_mask &= (price_df["min_price"] <= price_df["modal_price"])
    validity_mask &= (price_df["modal_price"] <= price_df["max_price"])
validity_mask &= (price_df["arrivals"] >= 0)
price_df = price_df[validity_mask]

# Rolling median outlier smoothing — shift(1) ensures no look-ahead
price_df["rolling_median_7"] = (
    price_df.groupby("commodity")["modal_price"]
    .transform(lambda x: x.shift(1).rolling(7, min_periods=3).median())
)
outlier_mask = price_df["modal_price"] > 3 * price_df["rolling_median_7"]
price_df.loc[
    outlier_mask & (price_df["arrivals"] > 0), "modal_price"
] = price_df.loc[
    outlier_mask & (price_df["arrivals"] > 0), "rolling_median_7"
]

price_df["zero_arrival_flag"] = (price_df["arrivals"] == 0).astype(int)

# ─────────────────────────────────────────────────────────────
# SECTION 3 — MERGE SHORT-CYCLE WEATHER
# NOTE: Vegetables are highly sensitive to flash events (3-day
# shock focus), but 7-day + 14-day windows are also added for
# consistency with the Cereal pipeline.
# ─────────────────────────────────────────────────────────────
weather_df = pd.read_csv("ml_pipeline/data/maharashtra_daily_weather_2015_2025.csv")
weather_df["date"] = pd.to_datetime(weather_df["date"])

# Aggregate all available weather channels (align with Cereal)
agg_cols = {"temperature": "mean", "rainfall": "sum"}
for col in ["solar_radiation", "wind_speed"]:
    if col in weather_df.columns:
        agg_cols[col] = "mean"

weather_daily = (
    weather_df.groupby("date")
    .agg(agg_cols)
    .reset_index()
    .sort_values("date")
)

# --- Short-cycle windows (vegetable-specific) ---
weather_daily["rainfall_3d_sum"]  = weather_daily["rainfall"].rolling(3).sum()
weather_daily["temp_3d_avg"]      = weather_daily["temperature"].rolling(3).mean()
weather_daily["rainfall_shock_3d"] = (
    (weather_daily["rainfall"] - weather_daily["rainfall"].rolling(3).mean()) /
    (weather_daily["rainfall"].rolling(3).mean() + 1e-6)
)
weather_daily["temp_shock_3d"] = (
    (weather_daily["temperature"] - weather_daily["temperature"].rolling(3).mean()) /
    (weather_daily["temperature"].rolling(3).mean() + 1e-6)
)

# --- Shared medium windows ---
weather_daily["rainfall_7d"]         = weather_daily["rainfall"].rolling(7).sum()
weather_daily["rainfall_15d"]       = weather_daily["rainfall"].rolling(15).sum()
weather_daily["temp_7d_avg"]        = weather_daily["temperature"].rolling(7).mean()
weather_daily["temp_14d_avg"]       = weather_daily["temperature"].rolling(14).mean()
weather_daily["temp_deviation_14d"] = (
    weather_daily["temperature"] - weather_daily["temp_14d_avg"]
)
weather_daily["rainfall_shock_7d"] = (
    (weather_daily["rainfall"] - weather_daily["rainfall"].rolling(7).mean()) /
    (weather_daily["rainfall"].rolling(7).mean() + 1e-6)
)

final_df = price_df.merge(weather_daily, on="date", how="left")
print(" Weather (Short-Cycle + Medium) processed and merged")

# ─────────────────────────────────────────────────────────────
# SECTION 4 — FUEL ECONOMICS MERGE
# Upgraded from v1: full diesel + petrol feature suite to match
# the Cereal pipeline. The v1 rolling-mean transport proxy is
# replaced with properly lagged price-change features.
# ─────────────────────────────────────────────────────────────
fuel_df = pd.read_csv("ml_pipeline/data/Fuel_prices.csv")

# Robust price parsing (handles '*' suffix and whitespace)
fuel_df["Petrol_price"] = (
    fuel_df["Petrol_price"].astype(str).str.replace("*", "", regex=False).astype(float)
)
fuel_df["Diesel_price"] = (
    fuel_df["Diesel_price"].astype(str).str.replace("*", "", regex=False).astype(float)
)

fuel_df["Month"] = fuel_df["Month"].astype(str).str.strip()
month_map = {
    "Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4,  "May": 5,  "Jun": 6,
    "Jul": 7, "Aug": 8, "Sep": 9, "Oct": 10, "Nov": 11, "Dec": 12
}
fuel_df["Month_Num"] = fuel_df["Month"].map(month_map)
fuel_df = fuel_df[fuel_df["Month_Num"].notna()]
fuel_df["Year"] = pd.to_numeric(fuel_df["Year"], errors="coerce")
fuel_df = fuel_df[fuel_df["Year"].notna()]
fuel_df["date"] = pd.to_datetime(dict(
    year=fuel_df["Year"].astype(int),
    month=fuel_df["Month_Num"].astype(int),
    day=1
))
fuel_df = fuel_df[fuel_df["date"].notna()].sort_values("date")

fuel_daily = pd.DataFrame({
    "date": pd.date_range(fuel_df["date"].min(), fuel_df["date"].max(), freq="D")
})
fuel_daily = pd.merge_asof(
    fuel_daily.sort_values("date"),
    fuel_df.sort_values("date"),
    on="date",
    direction="backward"
)

# Lagged fuel price features
fuel_daily["diesel_lag_7"]  = fuel_daily["Diesel_price"].shift(7)
fuel_daily["diesel_lag_30"] = fuel_daily["Diesel_price"].shift(30)
fuel_daily["petrol_lag_7"]  = fuel_daily["Petrol_price"].shift(7)
fuel_daily["petrol_lag_30"] = fuel_daily["Petrol_price"].shift(30)

fuel_daily["diesel_pct_change_7"] = (
    (fuel_daily["Diesel_price"] - fuel_daily["diesel_lag_7"]) /
    (fuel_daily["diesel_lag_7"] + 1e-6)
)
fuel_daily["diesel_pct_change_30"] = (
    (fuel_daily["Diesel_price"] - fuel_daily["diesel_lag_30"]) /
    (fuel_daily["diesel_lag_30"] + 1e-6)
)
fuel_daily["petrol_pct_change_7"] = (
    (fuel_daily["Petrol_price"] - fuel_daily["petrol_lag_7"]) /
    (fuel_daily["petrol_lag_7"] + 1e-6)
)

final_df = final_df.merge(fuel_daily, on="date", how="left")

fuel_cols = [
    "Petrol_price", "Diesel_price",
    "diesel_lag_7", "diesel_lag_30",
    "petrol_lag_7", "petrol_lag_30",
    "diesel_pct_change_7", "diesel_pct_change_30", "petrol_pct_change_7"
]
final_df[fuel_cols] = final_df[fuel_cols].ffill()

# NOTE: Expanding historical mean is shifted by 1 to avoid look-ahead leakage.
# Full-dataset transform("mean") would leak future diesel prices into past rows.
final_df["fuel_cost_pressure"] = (
    final_df["Diesel_price"] /
    (final_df.groupby("commodity")["Diesel_price"]
     .transform(lambda x: x.expanding().mean().shift(1)) + 1e-6)
)
print(" Fuel economics merged (full feature suite)")

# ─────────────────────────────────────────────────────────────
# SECTION 5 — MISSING VALUE HANDLING
# ─────────────────────────────────────────────────────────────
# Interpolate modal_price where arrivals imply the market was open
mask = final_df["modal_price"].isna() & (final_df["arrivals"] > 0)
final_df.loc[mask, "modal_price"] = (
    final_df.groupby("commodity")["modal_price"]
    .transform(lambda x: x.interpolate())
)

# Market-closed flag: price missing AND no arrivals
final_df["market_closed_flag"] = (
    final_df["modal_price"].isna() & (final_df["arrivals"] == 0)
).astype(int)

# ─────────────────────────────────────────────────────────────
# SECTION 6 — TIME FEATURES
# ─────────────────────────────────────────────────────────────
print(" Engineering time features")
final_df["Month_Num"]  = final_df["date"].dt.month
final_df["DayOfYear"]  = final_df["date"].dt.dayofyear
final_df["Year"]       = final_df["date"].dt.year
final_df["WeekOfYear"] = final_df["date"].dt.isocalendar().week.astype(int)

# Seasonal price index — expanding historical mean shifted by 1 to avoid leakage
monthly_avg = (
    final_df.groupby(["commodity", "Month_Num"])["modal_price"]
    .transform(lambda x: x.expanding().mean().shift(1))
)
overall_avg = (
    final_df.groupby("commodity")["modal_price"]
    .transform(lambda x: x.expanding().mean().shift(1))
)
final_df["seasonal_price_index"] = monthly_avg / (overall_avg + 1e-6)

# ─────────────────────────────────────────────────────────────
# SECTION 7 — ARRIVAL FEATURES
# NOTE: All rolling windows use shift(1) to exclude same-day
# arrivals. Shock numerators use arrival_lag_3 (not raw arrivals)
# — this mirrors the fix applied in the Cereal pipeline.
# ─────────────────────────────────────────────────────────────
print(" Engineering arrival features")
final_df = final_df.sort_values(["commodity", "date"])

final_df["arrival_lag_3"] = (
    final_df.groupby("commodity")["arrivals"].shift(3)
)
final_df["arrivals_lag_7"] = (
    final_df.groupby("commodity")["arrivals"].shift(7)
)
final_df["arrivals_pct_change_7"] = (
    final_df.groupby("commodity")["arrivals"]
    .transform(lambda x: x.shift(1).pct_change(7))
)
final_df["arrival_rolling_7"] = (
    final_df.groupby("commodity")["arrivals"]
    .transform(lambda x: x.shift(1).rolling(7).mean())
)
final_df["arrival_rolling_14"] = (
    final_df.groupby("commodity")["arrivals"]
    .transform(lambda x: x.shift(1).rolling(14).mean())
)
final_df["arrival_rolling_30"] = (
    final_df.groupby("commodity")["arrivals"]
    .transform(lambda x: x.shift(1).rolling(30).mean())
)

# FIX v1 → v2: replaced raw arrivals with arrival_lag_3 in numerator.
# arrival_rolling_7 is already shift(1)-lagged; numerator must match.
final_df["arrival_shock"] = (
    (final_df["arrival_lag_3"] - final_df["arrival_rolling_7"]) /
    (final_df["arrival_rolling_7"] + 1e-6)
)
final_df["supply_stress_index"] = (
    (final_df["arrival_rolling_14"] - final_df["arrival_lag_3"]) /
    (final_df["arrival_rolling_14"] + 1e-6)
)
final_df["supply_shock_7v30"] = (
    (final_df["arrival_rolling_7"] - final_df["arrival_rolling_30"]) /
    (final_df["arrival_rolling_30"] + 1e-6)
)

# ─────────────────────────────────────────────────────────────
# SECTION 8 — PRICE LAG FEATURES
# Using short lags (1–3) appropriate for vegetables, plus 7 & 14
# for medium-term context. Boundary check prevents cross-commodity
# contamination when the grouped dataframe is re-joined.
# ─────────────────────────────────────────────────────────────
print(" Engineering price lag features (per commodity — no contamination)")
final_df = final_df.sort_values(["commodity", "date"])

for lag in [1, 2, 3, 7, 14]:
    final_df[f"price_lag_{lag}"] = (
        final_df.groupby("commodity")["modal_price"].shift(lag)
    )

# Boundary verification
final_df["_prev_commodity"] = final_df["commodity"].shift(1)
boundary_rows  = final_df[final_df["commodity"] != final_df["_prev_commodity"]]
contaminated   = boundary_rows["price_lag_3"].notna().sum()
if contaminated == 0:
    print("   Lag verification passed — no cross-commodity contamination")
else:
    print(f"  ⚠️  WARNING: {contaminated} boundary rows have non-NaN lag_3")
final_df.drop(columns=["_prev_commodity"], inplace=True)

# ─────────────────────────────────────────────────────────────
# SECTION 9 — ROLLING PRICE STATISTICS
# All rolling operations use shift(1) before the window so that
# the current day's price is never included (no look-ahead).
# ─────────────────────────────────────────────────────────────
print(" Engineering rolling price statistics")
final_df["price_rolling_mean_7"] = (
    final_df.groupby("commodity")["modal_price"]
    .transform(lambda x: x.shift(1).rolling(7).mean())
)
final_df["price_rolling_mean_14"] = (
    final_df.groupby("commodity")["modal_price"]
    .transform(lambda x: x.shift(1).rolling(14).mean())
)
final_df["price_rolling_mean_30"] = (
    final_df.groupby("commodity")["modal_price"]
    .transform(lambda x: x.shift(1).rolling(30).mean())
)
final_df["price_volatility_7"] = (
    final_df.groupby("commodity")["modal_price"]
    .transform(lambda x: x.shift(1).rolling(7).std())
)
final_df["price_volatility_14"] = (
    final_df.groupby("commodity")["modal_price"]
    .transform(lambda x: x.shift(1).rolling(14).std())
)
final_df["price_volatility_30"] = (
    final_df.groupby("commodity")["modal_price"]
    .transform(lambda x: x.shift(1).rolling(30).std())
)

# Price regime — deviation of 3-day-lagged price from 30-day average
final_df["price_vs_30d_mean"] = (
    (final_df["price_lag_3"] - final_df["price_rolling_mean_30"]) /
    (final_df["price_rolling_mean_30"] + 1e-6)
)

# ─────────────────────────────────────────────────────────────
# SECTION 10 — PRICE MOMENTUM & COMPOSITE FEATURES
# NOTE v1 leak fix: price_momentum_3/7 previously used raw
# modal_price (same-day) in the numerator. Now uses price_lag_1
# so the ratio is fully in the past relative to prediction time.
# ─────────────────────────────────────────────────────────────
print(" Engineering price momentum features")

# FIX v1 → v2: numerator changed from modal_price → price_lag_1
final_df["price_momentum_3"] = (
    final_df["price_lag_1"] / (final_df["price_lag_3"] + 1e-6)
)
final_df["price_momentum_7"] = (
    final_df["price_lag_1"] / (final_df["price_lag_7"] + 1e-6)
)

# Momentum index — short-window vs long-window moving average crossover
final_df["price_momentum_index"] = (
    (final_df["price_rolling_mean_7"] - final_df["price_rolling_mean_30"]) /
    (final_df["price_rolling_mean_30"] + 1e-6)
)

# Percentage change features (all shift(1)-safe via transform)
final_df["price_pct_change_3"] = (
    final_df.groupby("commodity")["modal_price"]
    .transform(lambda x: x.shift(1).pct_change(3))
)
final_df["price_pct_change_7"] = (
    final_df.groupby("commodity")["modal_price"]
    .transform(lambda x: x.shift(1).pct_change(7))
)
final_df["price_pct_change_14"] = (
    final_df.groupby("commodity")["modal_price"]
    .transform(lambda x: x.shift(1).pct_change(14))
)

# Supply tightness — price momentum relative to supply level
final_df["supply_tightness"] = (
    final_df["price_pct_change_7"] /
    (final_df["arrivals"] / (final_df["arrival_rolling_7"] + 1e-6) + 1e-6)
)

# Market shock — how many standard deviations the lagged price is from the mean
final_df["market_shock"] = (
    (final_df["price_lag_3"] - final_df["price_rolling_mean_30"]) /
    (final_df["price_volatility_30"] + 1e-6)
)

# Supply-demand pressure
final_df["supply_demand_pressure"] = (
    final_df["price_pct_change_7"] /
    (final_df["arrivals_pct_change_7"].abs() + 1e-6)
)

# Price relative strength (60-day range, shift(1)-safe)
window = 60
rolling_min = (
    final_df.groupby("commodity")["modal_price"]
    .transform(lambda x: x.shift(1).rolling(window).min())
)
rolling_max = (
    final_df.groupby("commodity")["modal_price"]
    .transform(lambda x: x.shift(1).rolling(window).max())
)
# FIX v1 → v2: numerator uses price_lag_3 instead of raw modal_price.
final_df["price_relative_strength"] = (
    (final_df["price_lag_3"] - rolling_min) /
    (rolling_max - rolling_min + 1e-6)
)

# ─────────────────────────────────────────────────────────────
# SECTION 11 — FINANCIAL TECHNICAL INDICATORS
# FIX v1 → v2: All indicators are now computed on the shifted
# price series (shift(1)) so that the current day's price is
# never part of any rolling window. This eliminates same-day
# look-ahead present in every indicator in v1.
# ─────────────────────────────────────────────────────────────
print(" Engineering technical indicators (leak-free)")

def compute_technical_indicators(group):
    """Compute EMA, MACD, and RSI per commodity on the lagged price series."""
    df = group.copy()

    # Use shifted series as the base — current price is excluded from all windows
    p = df["modal_price"].shift(1)

    # Exponential Moving Averages
    df["price_ema_7"]  = p.ewm(span=7,  adjust=False).mean()
    df["price_ema_14"] = p.ewm(span=14, adjust=False).mean()

    # MACD (Moving Average Convergence Divergence)
    ema_12 = p.ewm(span=12, adjust=False).mean()
    ema_26 = p.ewm(span=26, adjust=False).mean()
    df["macd"]        = ema_12 - ema_26
    df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean()

    # RSI-14
    delta    = p.diff()
    up       = delta.clip(lower=0)
    down     = -1 * delta.clip(upper=0)
    ema_up   = up.ewm(com=13,   adjust=False).mean()
    ema_down = down.ewm(com=13, adjust=False).mean()
    rs = ema_up / (ema_down + 1e-6)
    df["rsi_14"] = 100 - (100 / (1 + rs))

    return df

final_df = final_df.groupby("commodity", group_keys=False).apply(
    compute_technical_indicators
)

# ─────────────────────────────────────────────────────────────
# SECTION 11b — PRICE REGIME INDICATORS
# Vegetable prices undergo dramatic regime shifts (e.g., onion Rs.15
# crushing to Rs.100+). A bimodal regime indicator anchored to the
# 365-day rolling median helps the model re-calibrate its price-level
# expectation after a regime flip, mirroring the Cereal pipeline.
# regime_transition marks the ±21 day window around a flip.
# All operations on lag-1 price to avoid same-day look-ahead.
# ─────────────────────────────────────────────────────────────
print(" Engineering price regime features")
for c_name, grp in final_df.groupby('commodity'):
    idx  = grp.index
    lag1 = grp['modal_price'].shift(1)
    long_median = lag1.rolling(365, min_periods=60).median()
    regime      = (lag1 > long_median).fillna(0).astype(int)
    final_df.loc[idx, 'price_regime'] = regime
    # Regime transition: 1 within a 42-day window centred on a flip
    regime_flip = regime.diff().abs().fillna(0)
    final_df.loc[idx, 'regime_transition'] = (
        regime_flip.rolling(42, min_periods=1).max().shift(1).fillna(0)
    )

# ─────────────────────────────────────────────────────────────
# SECTION 11c — CROP CALENDAR / HARVEST WINDOW FLAGS + YoY RATIO
# Vegetable prices crash at harvest (supply glut) and spike at
# lean season. An explicit binary flag prevents the model from
# treating harvest-driven crashes as unexplained noise.
# ─────────────────────────────────────────────────────────────
print(" Engineering crop calendar & year-over-year features")
HARVEST_WINDOWS = {
    'onion':       [11, 12, 1, 2],    # Rabi onion harvest: Nov-Feb
    'tomato':      [1, 2, 10, 11],    # Winter + Kharif harvests
    'potato':      [2, 3, 4],         # Rabi harvest: Feb-Apr
    'brinjal':     [10, 11, 12],      # Post-Kharif flush
    'cabbage':     [11, 12, 1],       # Winter harvest
    'cauliflower': [11, 12, 1, 2],    # Winter harvest
}
final_df['is_harvest_window'] = final_df.apply(
    lambda r: 1 if r['Month_Num'] in HARVEST_WINDOWS.get(r['commodity'], []) else 0,
    axis=1
)

# Year-over-year price ratio:
# LEAK FIX: pre-fill price_lag_365 NaN (first ~365 rows per commodity)
# with price_lag_3 so that yoy_price_ratio = price_lag_3/price_lag_3 ≈ 1.0
# (neutral 'no-change' prior). Prevents bfill from later propagating
# day-365 data backward to warmup rows 15-364.
final_df['price_lag_365'] = final_df.groupby('commodity')['modal_price'].shift(365)
final_df['price_lag_365'] = final_df['price_lag_365'].fillna(final_df['price_lag_3'])
final_df['yoy_price_ratio'] = (
    final_df['price_lag_3'] / (final_df['price_lag_365'] + 1e-6)
)

# ─────────────────────────────────────────────────────────────
# SECTION 12 — NaN FILLING FOR LAG & ROLLING FEATURES
# Drop warmup rows up to price_lag_14 (longest hard lag for
# vegetables). Backfill then median-fill remaining NaNs per
# commodity, matching the Cereal pipeline strategy.
# ─────────────────────────────────────────────────────────────
print(" Filling NaN values in lag & rolling features")

lag_cols = [
    "price_lag_1", "price_lag_2", "price_lag_3", "price_lag_7", "price_lag_14",
    "price_rolling_mean_7", "price_rolling_mean_14", "price_rolling_mean_30",
    "price_volatility_7", "price_volatility_14", "price_volatility_30",
    "price_pct_change_3", "price_pct_change_7", "price_pct_change_14",
    "price_vs_30d_mean",
    "arrivals_lag_7", "arrivals_pct_change_7",
    "arrival_lag_3", "arrival_rolling_7", "arrival_rolling_14", "arrival_rolling_30",
    "arrival_shock", "supply_stress_index", "supply_shock_7v30",
    "supply_tightness", "price_relative_strength",
    "yoy_price_ratio",    # warmup NaN pre-filled with neutral≈1.0 above (no bfill needed)
]
lag_cols = [c for c in lag_cols if c in final_df.columns]

before_nan = final_df[lag_cols].isna().sum().sum()
print(f"  Total NaNs before filling : {before_nan}")

final_df = final_df.sort_values(["commodity", "date"])

# Step 1: Drop warmup rows (longest meaningful lag = price_lag_14)
rows_before = len(final_df)
final_df    = final_df.dropna(subset=["price_lag_14"])
rows_dropped = rows_before - len(final_df)
print(f"  Warmup rows dropped       : {rows_dropped} ({rows_dropped/rows_before*100:.2f}%)")

# Step 2: Forward-fill per commodity (ffill = safe — propagates last known
# value forward, never backward; no future-to-past leakage)
final_df[lag_cols] = (
    final_df.groupby("commodity")[lag_cols]
    .transform(lambda x: x.ffill())
)

# Step 3: Fill any residual NaN at the very start of a commodity's history
# with 0 (fixed constant — no group statistics, no leakage)
final_df[lag_cols] = final_df[lag_cols].fillna(0.0)

after_nan = final_df[lag_cols].isna().sum().sum()
print(f"  Total NaNs after filling  : {after_nan}")
print("\n  NaN % per feature after filling:")
for c in lag_cols:
    pct    = final_df[c].isna().mean() * 100
    status = "" if pct == 0 else "⚠️ "
    print(f"    {status} {c:<40} {pct:.2f}%")

# ─────────────────────────────────────────────────────────────
# SECTION 13 — FINAL CLEANUP & EXPORT
# ─────────────────────────────────────────────────────────────
print(" Final cleanup")
final_df = final_df.sort_values(["commodity", "date"]).reset_index(drop=True)
print(f"\n  Final dataset shape : {final_df.shape}")
print(f"  Total features      : {final_df.shape[1]}")
print(f"  Date range          : {final_df['date'].min().date()} -> {final_df['date'].max().date()}")
print(f"  Commodities         : {final_df['commodity'].unique().tolist()}")

out_dir  = "ml_pipeline/data"
out_file = os.path.join(out_dir, "Vegetable_Feature_v1.csv")
final_df.to_csv(out_file, index=False)

print("=" * 60)
print(f" SUCCESS: Generated {len(final_df)} structured rows.")
print(f" Exported to: {out_file}")
print("=" * 60)