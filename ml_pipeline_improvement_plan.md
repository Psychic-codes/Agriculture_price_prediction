# ML Pipeline Improvement Plan — 30-Day Agricultural Price Forecasting

## What I Found (Audit Summary)

After reading every file in `ml_pipeline/`, here are the key observations across all layers of your pipeline.

---

## 🔴 High-Priority Issues (Fix These First)

### 1. Vegetable `NUMERIC_FEATURES` is Hard-Coded and Wrong

**File:** `models/Vegetable_ml_v1.py` — Lines 79 & 114

```python
# Line 79 — this list is hard-coded and never filtered against df.columns
NUMERIC_FEATURES = ['modal_price', 'min_price', 'max_price', ..., 'rsi_14']
```

The cereal script correctly builds `NUMERIC_FEATURES` by filtering `NUMERIC_FEATURES_WANTED` against `df.columns`. The vegetable script instead has a **raw hard-coded list** that gets assigned again at line 114 — the `NUMERIC_FEATURES_WANTED` filter at line 64-77 literally does nothing because the result is overwritten. This means:
- Raw price columns like `modal_price`, `min_price`, `max_price` are passed as features — **these are direct price leakage** since the model learns from the current modal price to predict itself.
- `'State'` and `'Month'` (string columns) also slip into this list, and you have a special `non_numeric` drop at line 689 to fix that at runtime — a bandaid on a bad root cause.
- The vegetable features aren't using the engineered features from `NUMERIC_FEATURES_WANTED` at all.

**Fix:** Replace the hard-coded list with the same filtering pattern as the cereal script, and add the missing features (`supply_shock_7v30`, `price_regime`, `price_zscore_365`, `price_norm_trailing`, `price_accel_7`) to `NUMERIC_FEATURES_WANTED`.

---

### 2. Direct Price Leakage in Vegetable Feature Set

**File:** `models/Vegetable_ml_v1.py` — Line 79

`modal_price`, `min_price`, `max_price`, `arrivals` are included as features in the vegetable model. At prediction time, `modal_price` = today's price, which should only be used to back-transform predictions — not as an input feature. The model is learning to copy-paste today's price forward, masking its true generalization ability.

**Fix:** Remove `modal_price`, `min_price`, `max_price` from the vegetable feature list. Use `price_lag_1` (which exists and is already in the data) instead.

---

### 3. Multi-Output Wrapping is Inconsistent — Causes Silent Errors in Stacker

**File:** Both `Cereal_ml_v1.py` and `Vegetable_ml_v1.py` — Lines 719-736

```python
estimators_list = []
for name in ML_MODEL_NAMES:
    est = best_estimators[name]
    if hasattr(est, 'estimator'):
        estimators_list.append((name, est.estimator))  # ← extracts single 1D estimator
    else:
        estimators_list.append((name, est))  # ← passes full multi-output RF
```

`RandomForestRegressor` is a native multi-output model, but when you pass it directly to `StackingRegressor` (which expects 1D estimators — it calls `column_or_1d(y)` internally), it silently trains on only the **first target column** (`target_1d_pct_change`). This means the stacker's meta-learner is trained with corrupted out-of-fold predictions for day 2-30.

**Fix:** Strip RF down to a single-output estimator inside the stacker, or clone it and override to `n_outputs_=1`.

---

### 4. Confidence Interval Width Grows Linearly But Not Calibrated

**File:** `models/predict.py` — Line 139

```python
z_scaled = Z_SCORE * (1 + 0.03 * d)  # grows 3% per day
```

This is a manually tuned magic number. It will under-cover high-volatility vegetables (onion) and over-cover stable cereals (wheat). The CI width isn't calibrated against actual holdout coverage — you have no guarantee it actually contains 95% of true prices.

**Fix (efficient):** After training, compute the actual residuals per commodity on the test set for each horizon `d`. Use the empirical 2.5th/97.5th percentile of residuals per day as the CI bounds. Save these per-commodity, per-horizon quantile offsets to the pickle file and load them in `predict.py`.

---

## 🟡 Medium-Priority Improvements (High ROI)

### 5. No Horizon-Specific Models — Day 1 and Day 30 Use the Same Weights

Currently all 30 targets are predicted by a single `MultiOutputRegressor`, which assigns **one set of feature weights** across all 30 days simultaneously. This is fundamentally wrong:
- Day 1 prediction relies heavily on price momentum and recent lags.
- Day 30 prediction should rely more on seasonality, MSP, and supply cycles.

**Fix (most efficient):** Use **chained architecture** — train separate models for short (1-7d), medium (8-20d), and long (21-30d) horizons. Alternatively, add `horizon_index` as an additional feature and train one model on a "stacked" long-format dataset (each row = one commodity-date-horizon combination).

---

### 6. No Recency Weighting in Training

The training data spans from 2015. A price movement from 2015 receives equal weight as one from 2024, even though recent patterns are more predictive of the next 30 days (new price regimes, post-COVID inflation, etc.).

**File:** Both ML scripts — `tune_model()` function

**Fix:** Apply exponential time decay as `sample_weight` in `tune_model()`:
```python
days_ago = (max_date - dates_train).dt.days
sample_weight = np.exp(-0.001 * days_ago)  # recent data ~3x weight vs 3 years ago
```
`RandomForestRegressor`, `XGBoost`, and `LightGBM` all accept `sample_weight`.

---

### 7. `RandomizedSearchCV` with Only 20 Iterations is Too Sparse

**File:** Both ML scripts — `tune_model()` — Line 461

```python
search = RandomizedSearchCV(..., n_iter=20, ...)
```

For XGBoost and LightGBM, your grids have thousands of combinations. 20 samples is a very noisy estimate. This can easily cause a "winning" config that happens to get a lucky random evaluation.

**Fix:** Use **Optuna** (Bayesian optimization) instead of `RandomizedSearchCV`. It converges in ~50 trials what random search needs 200+ for. Replacing just the XGBoost/LightGBM searchers will give meaningful gains with minimal code change.

```python
import optuna
optuna.logging.set_verbosity(optuna.logging.WARNING)
```

---

### 8. Vegetable Script Missing Regime Features That Cereal Has

**File:** `models/Cereal_ml_v1.py` — Lines 76-79 vs `models/Vegetable_ml_v1.py`

Cereals have `price_regime` (bimodal regime indicator) and `regime_transition` (±21 day flip signal). Vegetables like **onion** are even more prone to dramatic regime shifts (Rs.15 → Rs.100+), yet these features are missing from the vegetable pipeline entirely.

**Fix:** Port `price_regime` and `regime_transition` computation from the cereal feature engineering and add them to `Vegetable_feature_v1.py`. This requires computing a 2-class GMM or simple quantile breakpoint on price per commodity.

---

### 9. Single-Point Prediction Instead of Probabilistic in `predict.py`

The SHAP explainability is done only for the `XGBoost` base estimator's **first** output column (day 1). SHAP values for day 15 or day 30 are completely ignored and not exposed to the UI.

**Fix:** Compute SHAP for XGBoost across all 30 output columns and aggregate:
```python
# Per horizon importance
shap_per_horizon = [explainer.shap_values(X_latest[:, :]) for col in range(30)]
mean_shap_30d = np.mean([np.abs(v) for v in shap_per_horizon], axis=0)
```

---

## 🟢 Low-Effort, High-Value Feature Additions

### 10. Missing: `price_lag_1` in Cereal Model

The cereal `NUMERIC_FEATURES_WANTED` doesn't include `price_lag_1`, which is the single most predictive feature for next-day price. The vegetable feature list does compute it in `Vegetable_feature_v1.py`. Add it to the cereal feature engineering and model features:

```python
# In Cereal_feature_v1.py
final_df["price_lag_1"] = final_df.groupby("commodity")["modal_price"].shift(1)
```

---

### 11. Missing: Crop Calendar / Harvest Season Flags

Vegetables (especially tomato, onion) have very sharp price spikes tied to harvest calendars and festival demand. A binary `is_harvest_window` flag per commodity per month would give the model an explicit signal:

```python
HARVEST_WINDOWS = {
    'onion':   [11, 12, 1, 2],   # Nov-Feb rabi harvest; price crashes
    'tomato':  [1, 2, 10, 11],
    'potato':  [2, 3, 4],
    'wheat':   [4, 5],           # Already in cereal
    'rice':    [10, 11],
}
final_df['is_harvest_window'] = final_df.apply(
    lambda r: 1 if r['Month_Num'] in HARVEST_WINDOWS.get(r['commodity'], []) else 0,
    axis=1
)
```

---

### 12. Missing: Year-over-Year Price Comparison Feature

30-day predictions are strongly anchored to seasonal norms. Adding a `yoy_price_ratio` feature (current price / same-month last year's average) helps the model understand whether the current price is abnormally high or low for the season.

```python
# In feature_v1.py
final_df['yoy_price_ratio'] = (
    final_df.groupby(['commodity', 'Month_Num'])['modal_price']
    .transform(lambda x: x / x.shift(365).rolling(30).mean())
)
```

---

### 13. Walk-Forward Validation Gap is Too Small

**File:** Both ML scripts — Line 704

```python
tscv = TimeSeriesSplit(n_splits=5, gap=7)
```

A 7-day gap between train and validation folds means model performance is measured on data only 1 week after the training cutoff. Since your actual use case is predicting 30 days ahead, you should use `gap=30` so that CV folds simulate the real deployment scenario.

**Fix:**
```python
tscv = TimeSeriesSplit(n_splits=5, gap=30)
```

---

## 📋 Recommended Implementation Order

| Priority | Change | Est. Impact | Files Affected |
|---|---|---|---|
| 🔴 1 | Fix vegetable hard-coded `NUMERIC_FEATURES` | Very High | `Vegetable_ml_v1.py` |
| 🔴 2 | Remove price leakage (`modal_price` as feature) | High | `Vegetable_ml_v1.py` |
| 🔴 3 | Fix RF in stacker — 1D wrapper | High | Both ML scripts |
| 🔴 4 | Calibrate CI bounds from holdout residuals | High | Both ML scripts + `predict.py` |
| 🟡 5 | Add `sample_weight` recency decay | High | Both ML scripts |
| 🟡 6 | Change `gap=7` → `gap=30` in TimeSeriesSplit | Medium | Both ML scripts |
| 🟡 7 | Add `price_lag_1` to cereal features | Medium | `Cereal_feature_v1.py` + `Cereal_ml_v1.py` |
| 🟡 8 | Add harvest calendar flags | Medium | Both `feature_v1.py` scripts |
| 🟡 9 | Add `yoy_price_ratio` feature | Medium | Both `feature_v1.py` scripts |
| 🟡 10 | Port regime features to vegetables | Medium | `Vegetable_feature_v1.py` + `Vegetable_ml_v1.py` |
| 🟢 11 | Replace `RandomizedSearchCV` with Optuna for XGB/LGBM | Medium | Both ML scripts |
| 🟢 12 | Multi-horizon SHAP (all 30 days) | Low | `predict.py` |

---

## Architecture Note: Why Not LSTM/Transformer?

Your current setup (RF + XGBoost + LightGBM stacker, predicting 30 % changes simultaneously) is actually a solid production choice for this problem because:
- You have ~10 years × 3-5 commodities = relatively small datasets. LSTMs need much more data to outperform tree ensembles.
- Tree models are robust to the mixed-frequency data (monthly MSP, daily weather, daily prices).

However, **if you fix items 1-4 and implement items 5-9 above, you can realistically expect a 15-25% reduction in MAPE** on the 30-day horizon without adding any new model architectures.
