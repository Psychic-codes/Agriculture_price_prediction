import pandas as pd
import numpy as np
from sklearn.preprocessing import LabelEncoder
import os

# ─────────────────────────────────────────────────────────────
# SECTION 1 — LOAD PRICE & ARRIVAL DATA
# ─────────────────────────────────────────────────────────────
print("=" * 60)
print("  CEREAL FEATURE ENGINEERING PIPELINE v2")
print("=" * 60)
input_file = "ml_pipeline/data/Cereal_Price.xlsx"
sheets     = pd.read_excel(input_file, sheet_name=None)
print(" Excel Loaded")

product_sheets = {}
for sheet_name, df in sheets.items():
    product, sheet_type = sheet_name.rsplit(" ", 1)
    product_sheets.setdefault(product, {})[sheet_type] = df

final_data = []
for product, data in product_sheets.items():
    if "Price" not in data or "Arrival" not in data:
        continue
    p_df       = data["Price"].copy()
    arrival_df = data["Arrival"].copy()
    p_df["Date"]       = pd.to_datetime(p_df["Date"])
    arrival_df["Date"] = pd.to_datetime(arrival_df["Date"])
    price_col   = [c for c in p_df.columns       if c != "Date"][0]
    arrival_col = [c for c in arrival_df.columns if c != "Date"][0]
    p_df.rename(columns={price_col: "Price"},         inplace=True)
    arrival_df.rename(columns={arrival_col: "Arrival"}, inplace=True)
    min_date   = min(p_df["Date"].min(), arrival_df["Date"].min())
    max_date   = max(p_df["Date"].max(), arrival_df["Date"].max())
    full_dates = pd.DataFrame({"Date": pd.date_range(min_date, max_date, freq="D")})
    merged = (
        full_dates
        .merge(p_df,       on="Date", how="left")
        .merge(arrival_df, on="Date", how="left")
    )
    merged["commodity"] = product
    merged["Date"]      = merged["Date"].dt.strftime("%d-%m-%Y")
    final_data.append(merged)

price_df = pd.concat(final_data, ignore_index=True)
print(" Price & Arrival merged")

# ─────────────────────────────────────────────────────────────
# SECTION 2 — MSP MERGE
# ─────────────────────────────────────────────────────────────
msp_df     = pd.read_excel("ml_pipeline/data/MSP.xlsx")
weather_df = pd.read_csv("ml_pipeline/data/maharashtra_daily_weather_2015_2025.csv")
print(" MSP & Weather loaded")

price_df["date"]      = pd.to_datetime(price_df["Date"])
weather_df["date"]    = pd.to_datetime(weather_df["date"])
price_df["commodity"] = price_df["commodity"].str.strip().str.lower()
msp_df["Commodity"]   = msp_df["Commodity"].str.strip().str.lower()

column_map = {
    "Price":         "modal_price",
    "Min Price (₹)": "min_price",
    "Arrival":       "arrivals",
    "Max Price (₹)": "max_price"
}
price_df = price_df.rename(columns=column_map)

# Basic validity filter
price_df = price_df[
    (price_df["modal_price"] > 0) &
    (price_df["min_price"] <= price_df["modal_price"]) &
    (price_df["modal_price"] <= price_df["max_price"]) &
    (price_df["arrivals"] >= 0)
]
price_df = price_df.sort_values(["commodity", "date"])

# Rolling median outlier smoothing (per commodity) — shift(1) avoids look-ahead
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

# Season mapping
season_mapping = {
    "rice":            "kharif",
    "arhar (tur dal)": "kharif",
    "wheat":           "rabi"
}
price_df["season"]        = price_df["commodity"].map(season_mapping)
price_df["msp_commodity"] = price_df["commodity"]

# MSP merge
msp_df.rename(columns={"Commodity": "msp_commodity"}, inplace=True)
msp_long = msp_df.melt(
    id_vars=["msp_commodity"],
    var_name="year",
    value_name="msp"
)

def get_msp_start_date(row):
    start_year = int(str(row["year"]).split("-")[0])
    if row["msp_commodity"] in ["paddy (common)", "tur (arhar)"]:
        return pd.Timestamp(f"{start_year}-10-01")
    elif row["msp_commodity"] == "wheat":
        return pd.Timestamp(f"{start_year + 1}-04-01")
    return pd.Timestamp(f"{start_year}-04-01")

msp_long["start_date"] = msp_long.apply(get_msp_start_date, axis=1)
msp_long = msp_long.sort_values(["msp_commodity", "start_date"])

full_dates  = pd.date_range(start=price_df["date"].min(), end=price_df["date"].max(), freq="D")
commodities = price_df["msp_commodity"].dropna().unique()
daily_index = pd.MultiIndex.from_product(
    [commodities, full_dates], names=["msp_commodity", "date"]
)
msp_daily = pd.DataFrame(index=daily_index).reset_index()
msp_daily = pd.merge_asof(
    msp_daily.sort_values("date"),
    msp_long.sort_values("start_date"),
    left_on="date",
    right_on="start_date",
    by="msp_commodity",
    direction="backward"
)
msp_daily  = msp_daily[["msp_commodity", "date", "msp"]]
final_df   = price_df.merge(msp_daily, on=["msp_commodity", "date"], how="left")
print(" MSP merged")

# ─────────────────────────────────────────────────────────────
# SECTION 3 — WEATHER MERGE
# costs and local supply even for slow-cycle crops.
# ─────────────────────────────────────────────────────────────
# Aggregate all available channels
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

# --- Short-cycle windows (added from Vegetable pipeline) ---
weather_daily["rainfall_3d_sum"]   = weather_daily["rainfall"].rolling(3).sum()
weather_daily["temp_3d_avg"]       = weather_daily["temperature"].rolling(3).mean()
weather_daily["rainfall_shock_3d"] = (
    (weather_daily["rainfall"] - weather_daily["rainfall"].rolling(3).mean()) /
    (weather_daily["rainfall"].rolling(3).mean() + 1e-6)
)
weather_daily["temp_shock_3d"] = (
    (weather_daily["temperature"] - weather_daily["temperature"].rolling(3).mean()) /
    (weather_daily["temperature"].rolling(3).mean() + 1e-6)
)

# --- Medium and long windows (cereal-specific) ---
weather_daily["rainfall_7d"]        = weather_daily["rainfall"].rolling(7).sum()
weather_daily["rainfall_15d"]       = weather_daily["rainfall"].rolling(15).sum()
weather_daily["rainfall_30d"]       = weather_daily["rainfall"].rolling(30).sum()
weather_daily["rainfall_60d"]       = weather_daily["rainfall"].rolling(60).sum()
weather_daily["temp_7d_avg"]        = weather_daily["temperature"].rolling(7).mean()
weather_daily["temp_14d_avg"]       = weather_daily["temperature"].rolling(14).mean()
weather_daily["temp_deviation_14d"] = (
    weather_daily["temperature"] - weather_daily["temp_14d_avg"]
)
weather_daily["rainfall_shock_7d"] = (
    (weather_daily["rainfall"] - weather_daily["rainfall"].rolling(7).mean()) /
    (weather_daily["rainfall"].rolling(7).mean() + 1e-6)
)
weather_daily["rainfall_shock_30d"] = (
    (weather_daily["rainfall"] - weather_daily["rainfall"].rolling(30).mean()) /
    (weather_daily["rainfall"].rolling(30).mean() + 1e-6)
)

final_df = final_df.merge(weather_daily, on="date", how="left")
print(" Weather merged (short + medium + long cycle windows)")

# ─────────────────────────────────────────────────────────────
# SECTION 4 — FUEL MERGE
# ─────────────────────────────────────────────────────────────
fuel_df = pd.read_csv("ml_pipeline/data/Fuel_prices.csv")
fuel_df["Petrol_price"] = (
    fuel_df["Petrol_price"].astype(str).str.replace("*", "", regex=False).astype(float)
)
fuel_df["Diesel_price"] = (
    fuel_df["Diesel_price"].astype(str).str.replace("*", "", regex=False).astype(float)
)
fuel_df["Month"]     = fuel_df["Month"].astype(str).str.strip()
month_map = {
    "Jan":1,"Feb":2,"Mar":3,"Apr":4,"May":5,"Jun":6,
    "Jul":7,"Aug":8,"Sep":9,"Oct":10,"Nov":11,"Dec":12
}
fuel_df["Month_Num"] = fuel_df["Month"].map(month_map)
fuel_df              = fuel_df[fuel_df["Month_Num"].notna()]
fuel_df["Year"]      = pd.to_numeric(fuel_df["Year"], errors="coerce")
fuel_df              = fuel_df[fuel_df["Year"].notna()]
fuel_df["date"]      = pd.to_datetime(dict(
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
fuel_daily["diesel_lag_7"]  = fuel_daily["Diesel_price"].shift(7)
fuel_daily["diesel_lag_30"] = fuel_daily["Diesel_price"].shift(30)
fuel_daily["petrol_lag_7"]  = fuel_daily["Petrol_price"].shift(7)
fuel_daily["petrol_lag_30"] = fuel_daily["Petrol_price"].shift(30)
fuel_daily["diesel_pct_change_30"] = (
    (fuel_daily["Diesel_price"] - fuel_daily["diesel_lag_30"]) /
    (fuel_daily["diesel_lag_30"] + 1e-6)
)
fuel_daily["diesel_pct_change_7"] = (
    (fuel_daily["Diesel_price"] - fuel_daily["diesel_lag_7"]) /
    (fuel_daily["diesel_lag_7"] + 1e-6)
)
fuel_daily["petrol_pct_change_7"] = (
    (fuel_daily["Petrol_price"] - fuel_daily["petrol_lag_7"]) /
    (fuel_daily["petrol_lag_7"] + 1e-6)
)

final_df = final_df.merge(fuel_daily, on="date", how="left")
fuel_cols = [
    "Petrol_price","Diesel_price",
    "diesel_lag_7","diesel_lag_30",
    "petrol_lag_7","petrol_lag_30",
    "diesel_pct_change_30","diesel_pct_change_7","petrol_pct_change_7"
]
final_df[fuel_cols] = final_df[fuel_cols].ffill()
print(" Fuel data merged")

# NOTE: Use expanding historical mean shifted by 1 to avoid look-ahead leakage.
# Full-dataset transform("mean") would leak future diesel prices into past rows.
final_df["fuel_cost_pressure"] = (
    final_df["Diesel_price"] /
    (final_df.groupby("commodity")["Diesel_price"]
     .transform(lambda x: x.expanding().mean().shift(1)) + 1e-6)
)

# ─────────────────────────────────────────────────────────────
# SECTION 5 — MISSING VALUE HANDLING
# ─────────────────────────────────────────────────────────────
mask = final_df["modal_price"].isna() & (final_df["arrivals"] > 0)
final_df.loc[mask, "modal_price"] = (
    final_df.groupby("commodity")["modal_price"]
    .transform(lambda x: x.interpolate())
)
final_df["market_closed_flag"] = (
    final_df["modal_price"].isna() &
    (final_df["arrivals"] == 0)
).astype(int)

# ─────────────────────────────────────────────────────────────
# SECTION 6 — TIME FEATURES
# ─────────────────────────────────────────────────────────────
print(" Engineering time features")
final_df["Year"]       = final_df["date"].dt.year
final_df["Month_Num"]  = final_df["date"].dt.month
final_df["DayOfYear"]  = final_df["date"].dt.dayofyear
final_df["WeekOfYear"] = final_df["date"].dt.isocalendar().week.astype(int)

le = LabelEncoder()
final_df["season_enc"] = le.fit_transform(final_df["season"].fillna("unknown"))

# NOTE: Use expanding historical mean shifted by 1 to avoid look-ahead leakage.
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
# SECTION 8 — ARRIVAL FEATURES
# ─────────────────────────────────────────────────────────────
print(" Engineering arrival features")
final_df = final_df.sort_values(["commodity", "date"])

final_df["arrivals_lag_7"] = (
    final_df.groupby("commodity")["arrivals"].shift(7)
)
final_df["arrivals_pct_change_7"] = (
    final_df.groupby("commodity")["arrivals"]
    .transform(lambda x: x.shift(1).pct_change(7))
)
final_df["arrival_lag_3"] = (
    final_df.groupby("commodity")["arrivals"].shift(3)
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
# FIX: Use arrival_lag_3 instead of raw arrivals to avoid same-day leakage.
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
# SECTION 9 — PRICE LAG FEATURES (grouped by commodity)
# ─────────────────────────────────────────────────────────────
print(" Engineering price lag features (per commodity — no contamination)")
final_df = final_df.sort_values(["commodity", "date"])

for lag in [1, 3, 7, 14, 30]:   # price_lag_1 added — single strongest predictor
    final_df[f"price_lag_{lag}"] = (
        final_df.groupby("commodity")["modal_price"].shift(lag)
    )

# Boundary verification
final_df["_prev_commodity"] = final_df["commodity"].shift(1)
boundary_rows = final_df[final_df["commodity"] != final_df["_prev_commodity"]]
contaminated  = boundary_rows["price_lag_3"].notna().sum()
if contaminated == 0:
    print("   Lag verification passed — no cross-commodity contamination")
else:
    print(f"  ⚠️  WARNING: {contaminated} boundary rows have non-NaN lag_3")
final_df.drop(columns=["_prev_commodity"], inplace=True)

# ─────────────────────────────────────────────────────────────
# SECTION 7 — MSP-BASED FEATURES  (cereal-exclusive)
# ─────────────────────────────────────────────────────────────
print(" Engineering MSP features")
final_df["price_to_msp_ratio"] = final_df["price_lag_3"] / final_df["msp"]
final_df["below_msp_flag"]     = (final_df["price_lag_3"] < final_df["msp"]).astype(int)
final_df["price_above_msp"]    = (final_df["price_lag_3"] - final_df["msp"])
final_df["msp_yearly_growth"]  = (
    final_df.groupby("commodity")["msp"]
    .transform(lambda x: x.pct_change(365))
    .fillna(0)
)

# ─────────────────────────────────────────────────────────────
# SECTION 7.5 — MULTI-HORIZON TARGETS
# Targets are NOT generated here. Run Cereal_feature_generator.py
# after this script to add all 30 lead + pct-change target columns
# and produce Cereal_Feature_v2_Multi.csv for model training.
# Pipeline order:
#   1. Cereal_feature_v2.py         → Cereal_Feature_v2.csv
#   2. Cereal_feature_generator.py  → Cereal_Feature_v2_Multi.csv
#   3. Cereal_ml_v1.py              → global_stacking_30d.pkl
#   4. predict.py                   → latest_forecasts.json
# ─────────────────────────────────────────────────────────────

# ─────────────────────────────────────────────────────────────
# SECTION 10 — ROLLING PRICE STATISTICS (grouped by commodity)
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
final_df["price_vs_30d_mean"] = (
    (final_df["price_lag_3"] - final_df["price_rolling_mean_30"]) /
    (final_df["price_rolling_mean_30"] + 1e-6)
)

# ─────────────────────────────────────────────────────────────
# SECTION 11 — PRICE MOMENTUM FEATURES
# ─────────────────────────────────────────────────────────────
print(" Engineering price momentum features")
final_df["price_momentum_index"] = (
    (final_df["price_rolling_mean_7"] - final_df["price_rolling_mean_30"]) /
    (final_df["price_rolling_mean_30"] + 1e-6)
)
final_df["price_pct_change_3"] = (
    final_df.groupby("commodity")["modal_price"]
    .transform(lambda x: x.shift(1).pct_change(3))
)
final_df["price_pct_change_7"] = (
    final_df.groupby("commodity")["modal_price"]
    .transform(lambda x: x.shift(1).pct_change(7))
)
final_df["price_pct_change_30"] = (
    final_df.groupby("commodity")["modal_price"]
    .transform(lambda x: x.shift(1).pct_change(30))
)

final_df["supply_tightness"] = (
    final_df["price_pct_change_7"] /
    (final_df["arrivals"] / (final_df["arrival_rolling_7"] + 1e-6) + 1e-6)
)
final_df["market_shock"] = (
    (final_df["price_lag_3"] - final_df["price_rolling_mean_30"]) /
    (final_df["price_volatility_30"] + 1e-6)
)
final_df["supply_demand_pressure"] = (
    final_df["price_pct_change_7"] /
    (final_df["arrivals_pct_change_7"].abs() + 1e-6)
)

window = 60
# NOTE: shift(1) added to avoid look-ahead leakage.
rolling_min = final_df.groupby("commodity")["modal_price"].transform(
    lambda x: x.shift(1).rolling(window).min()
)
rolling_max = final_df.groupby("commodity")["modal_price"].transform(
    lambda x: x.shift(1).rolling(window).max()
)
# FIX: Use price_lag_3 in the numerator instead of raw modal_price.
final_df["price_relative_strength"] = (
    (final_df["price_lag_3"] - rolling_min) /
    (rolling_max - rolling_min + 1e-6)
)

# ─────────────────────────────────────────────────────────────
# SECTION 11b — FINANCIAL TECHNICAL INDICATORS
# Added from Vegetable pipeline (v2). All indicators operate on
# the shift(1) price series to prevent same-day look-ahead.
# ─────────────────────────────────────────────────────────────
print(" Engineering technical indicators (leak-free)")

def compute_technical_indicators(group):
    """Compute EMA, MACD, and RSI per commodity on the lagged price series."""
    df = group.copy()

    # Shift by 1 so no current-day price enters any window
    p = df["modal_price"].shift(1)

    # Exponential Moving Averages
    df["price_ema_7"]  = p.ewm(span=7,  adjust=False).mean()
    df["price_ema_14"] = p.ewm(span=14, adjust=False).mean()

    # MACD
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
# SECTION 11c — CROP CALENDAR / HARVEST WINDOW FLAGS
# Cereal price crashes and spikes are strongly tied to harvest
# season (wheat: Apr-May rabi harvest; rice/arhar: Oct-Nov kharif).
# A binary flag gives the model an explicit seasonal anchor rather
# than relying on month_sin/cos alone.
# ─────────────────────────────────────────────────────────────
print(" Engineering crop calendar & year-over-year features")

HARVEST_WINDOWS = {
    'wheat':           [4, 5],        # Rabi harvest: Apr-May
    'rice':            [10, 11],      # Kharif harvest: Oct-Nov
    'arhar (tur dal)': [3, 4, 5],    # Kharif harvest arrives Mar-May
}
final_df['is_harvest_window'] = final_df.apply(
    lambda r: 1 if r['Month_Num'] in HARVEST_WINDOWS.get(r['commodity'], []) else 0,
    axis=1
)

# Year-over-year price ratio — leakage-free
# price_lag_3 (current lagged price) divided by 1-year-ago lagged price.
# Captures whether the current period is abnormally expensive/cheap vs last year.
final_df['price_lag_365'] = final_df.groupby('commodity')['modal_price'].shift(365)
final_df['yoy_price_ratio'] = (
    final_df['price_lag_3'] / (final_df['price_lag_365'] + 1e-6)
)

# ─────────────────────────────────────────────────────────────
# SECTION 12 — NaN FILLING FOR LAG & ROLLING FEATURES
# ─────────────────────────────────────────────────────────────
print(" Filling NaN values in lag & rolling features")
lag_cols = [
    "price_lag_1", "price_lag_3", "price_lag_7", "price_lag_14", "price_lag_30",
    "price_rolling_mean_7", "price_rolling_mean_14", "price_rolling_mean_30",
    "price_volatility_7", "price_volatility_14", "price_volatility_30",
    "price_pct_change_3", "price_pct_change_7", "price_pct_change_30",
    "price_vs_30d_mean",
    "arrivals_lag_7", "arrivals_pct_change_7",
    "arrival_lag_3", "arrival_rolling_7", "arrival_rolling_14", "arrival_rolling_30",
    "arrival_shock", "supply_stress_index", "supply_shock_7v30",
    "supply_tightness", "price_relative_strength",
    "yoy_price_ratio",    # NaN for first ~365 days per commodity; bfill handles it
]
lag_cols = [c for c in lag_cols if c in final_df.columns]

before_nan = final_df[lag_cols].isna().sum().sum()
print(f"  Total NaNs before filling : {before_nan}")

final_df = final_df.sort_values(["commodity", "date"])

# Step 1: Drop warmup rows (longest lag = price_lag_30)
rows_before  = len(final_df)
final_df     = final_df.dropna(subset=["price_lag_30"])
rows_dropped = rows_before - len(final_df)
print(f"  Warmup rows dropped       : {rows_dropped} ({rows_dropped/rows_before*100:.2f}%)")

# Step 2: Backfill remaining NaNs per commodity
final_df[lag_cols] = (
    final_df.groupby("commodity")[lag_cols]
    .transform(lambda x: x.bfill())
)

# Step 3: Per-commodity median fill as last resort
final_df[lag_cols] = (
    final_df.groupby("commodity")[lag_cols]
    .transform(lambda x: x.fillna(x.median()))
)

after_nan = final_df[lag_cols].isna().sum().sum()
print(f"  Total NaNs after filling  : {after_nan}")
print("\n  NaN % per feature after filling:")
for c in lag_cols:
    pct    = final_df[c].isna().mean() * 100
    status = "" if pct == 0 else "⚠️ "
    print(f"    {status} {c:<40} {pct:.2f}%")

# ─────────────────────────────────────────────────────────────
# SECTION 13 — FINAL CLEANUP
# ─────────────────────────────────────────────────────────────
print(" Final cleanup")
drop_cols = ["msp_commodity"]
final_df.drop(columns=drop_cols, errors="ignore", inplace=True)
final_df = final_df.sort_values(["commodity", "date"]).reset_index(drop=True)

print(f"\n  Final dataset shape : {final_df.shape}")
print(f"  Total features      : {final_df.shape[1]}")
print(f"  Date range          : {final_df['date'].min().date()} -> {final_df['date'].max().date()}")
print(f"  Commodities         : {final_df['commodity'].unique().tolist()}")

final_df.to_csv("ml_pipeline/data/Cereal_Feature_v1.csv", index=False)
print("\n Saved -> ml_pipeline/data/Cereal_Feature_v1.csv")
print(" Next step: run Cereal_feature_generator.py to add 30-day targets → Cereal_Feature_v2_Multi.csv")