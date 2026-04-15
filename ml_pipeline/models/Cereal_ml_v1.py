import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
import seaborn as sns

import warnings
warnings.filterwarnings('ignore')
warnings.filterwarnings('ignore', category=UserWarning, module='sklearn')
warnings.filterwarnings('ignore', category=UserWarning, message='.*sklearn.utils.parallel.delayed.*')
warnings.filterwarnings('ignore', category=Warning, module='statsmodels')
warnings.filterwarnings(
    "ignore",
    message="`sklearn.utils.parallel.delayed` should be used with `sklearn.utils.parallel.Parallel`"
)

import logging
logging.getLogger("cmdstanpy").setLevel(logging.ERROR)
logging.getLogger('cmdstanpy').setLevel(logging.WARNING)  # Only show warnings/errors
logging.getLogger('prophet').setLevel(logging.WARNING)
logging.getLogger('cmdstanpy').disabled = True

import os
os.environ['CMDSTAN_SUPPRESS_OUTPUT'] = '1'

from sklearn.preprocessing import RobustScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, make_scorer
from sklearn.ensemble import (RandomForestRegressor, GradientBoostingRegressor,
                               ExtraTreesRegressor, HistGradientBoostingRegressor)
from sklearn.linear_model import Ridge, Lasso, ElasticNet, HuberRegressor, LinearRegression as _LR
from sklearn.base import BaseEstimator, RegressorMixin
from xgboost import XGBRegressor
try:
    from lightgbm import LGBMRegressor
    HAS_LGBM = True
except ImportError:
    HAS_LGBM = False
    print("  [INFO] LightGBM not installed — skipping LightGBM model")
from sklearn.model_selection import RandomizedSearchCV, TimeSeriesSplit, ParameterGrid
from matplotlib.patches import Patch
from scipy.stats import norm
from statsmodels.graphics.tsaplots import plot_acf, plot_pacf

import pmdarima as pm
from prophet import Prophet

# ─────────────────────────────────────────────
# 1. LOAD & PREPROCESS
# ─────────────────────────────────────────────
print("=" * 72)
print("  Split     : 70% Train  15% Val  15% Test (temporal)")
print("  Reads     : ml_pipeline/data/Cereal_Feature_v2_Multi.csv")
print("=" * 72)

df = pd.read_csv('ml_pipeline/data/Cereal_Feature_v2_Multi.csv', parse_dates=['date'])
df = df.sort_values(['commodity', 'date']).reset_index(drop=True)
df = df.dropna(subset=['modal_price'])

print(f"  Loaded  : {df.shape[0]:,} rows x {df.shape[1]} columns")
print(f"  Dates   : {df['date'].min().date()} -> {df['date'].max().date()}")
print(f"  Commod. : {df['commodity'].unique().tolist()}")


NUMERIC_FEATURES_WANTED = [
    # ── Price signal (lagged — no leakage) ─────────────────────────────────
    'price_lag_1',             # lag-1 price: strongest short-term predictor
    'price_rolling_mean_14',   # 14d MA: proxy for recent price level (RF rank #3)
    'price_volatility_7',      # short-term volatility (RF rank #10)
    'price_volatility_14',     # medium-term volatility (RF rank #13)
    'price_volatility_30',     # long-term volatility (RF rank #15)
    'price_pct_change_3',      # 3d momentum (RF rank #11)
    'price_pct_change_30',     # 30d momentum (RF rank #16)
    'price_relative_strength', # 60d price range position (RF rank #8)
    'price_zscore_365',        # normalised against trailing year (regime-robust)
    'price_norm_trailing',     # level-shift-robust price ratio
    'price_accel_7',           # 2nd-order momentum: acceleration/deceleration
    'yoy_price_ratio',         # current lag-3 price vs same period last year
    # ── Supply / arrivals ──────────────────────────────────────────────────
    'arrivals_lag_7',          # 7d-lagged arrivals: #1 feature by RF importance
    'supply_tightness',        # price_pct/arrival_ratio composite: #2 by RF imp
    'supply_stress_index',     # (rolling14 - lag3) / rolling14 (RF rank #5)
    'arrival_rolling_30',      # 30d supply level (RF rank #7)
    'supply_demand_pressure',  # price_pct / arrivals_pct composite (RF rank #18)
    'supply_shock_7v30',       # short vs long supply deviation (RF rank #19)
    # ── Fuel / transport ───────────────────────────────────────────────────
    'diesel_pct_change_30',    # 30d fuel cost momentum: #4 by RF importance
    'fuel_cost_pressure',      # normalised fuel cost ratio (RF rank #6)
    'Diesel_price',            # fuel cost level (RF rank #9)
    # ── Weather ────────────────────────────────────────────────────────────
    'rainfall_30d',            # 30d cumulative rainfall (RF rank #12)
    # ── Seasonality / calendar ─────────────────────────────────────────────
    'month_sin',               # smooth cyclical month encoding
    'month_cos',
    'seasonal_price_index',    # historical seasonal norm (RF rank #14)
    'is_harvest_window',       # binary crop-specific harvest calendar flag
    # ── Market regime ──────────────────────────────────────────────────────
    'price_regime',            # bimodal level: 0=low era, 1=high era
    'regime_transition',       # 1 within ~21 days of a regime flip
]

NUMERIC_FEATURES = [f for f in NUMERIC_FEATURES_WANTED if f in df.columns]


for c_name, grp in df.groupby('commodity'):
    idx   = grp.index
    price = grp['modal_price']
    lag1  = price.shift(1)
    lag8  = price.shift(8)

    # v8 features (unchanged)
    df.loc[idx, 'price_diff_7']    = lag1 - lag8
    df.loc[idx, 'month_sin']       = np.sin(2 * np.pi * grp['Month_Num'] / 12)
    df.loc[idx, 'month_cos']       = np.cos(2 * np.pi * grp['Month_Num'] / 12)
    if 'msp' in df.columns and 'price_lag_3' in df.columns:
        df.loc[idx, 'price_lag_3_x_msp'] = (
            grp['price_lag_3'] / grp['msp'].replace(0, np.nan)
        )
    df.loc[idx, 'price_momentum_7'] = (lag1 - lag8) / lag8.replace(0, np.nan)

    # ── IMP 1: Regime-shift-robust features ─────────────────────────────────
    # 365-day trailing stats on lag-1 price (no leakage)
    trailing_mean = lag1.rolling(365, min_periods=30).mean()
    trailing_std  = lag1.rolling(365, min_periods=30).std().replace(0, np.nan)

    # Z-score relative to trailing year: (lag1 - mean) / std
    df.loc[idx, 'price_zscore_365']   = (lag1 - trailing_mean) / trailing_std

    # Normalised price: lag1 / trailing mean — ratio near 1.0 even with level shifts
    df.loc[idx, 'price_norm_trailing'] = lag1 / trailing_mean.replace(0, np.nan)

    # 2nd-order momentum: (lag1 - lag8) - (lag8 - lag15)   -> acceleration
    lag15 = price.shift(15)
    df.loc[idx, 'price_accel_7'] = (lag1 - lag8) - (lag8 - lag15)

    # ── IMP: Bimodal price regime indicator ──────────────────────────────────
    # Ensures this feature is always present even when the source CSV pre-dates
    # the new feature engineering run. Uses lag-1 price only (no look-ahead).
    long_median = lag1.rolling(365, min_periods=60).median()
    regime      = (lag1 > long_median).fillna(0).astype(int)
    df.loc[idx, 'price_regime']      = regime
    regime_flip = regime.diff().abs().fillna(0)
    df.loc[idx, 'regime_transition'] = (
        regime_flip.rolling(42, min_periods=1).max().shift(1).fillna(0)
    )

# Refresh after engineering
NUMERIC_FEATURES = [f for f in NUMERIC_FEATURES_WANTED if f in df.columns]
missing_after    = [f for f in NUMERIC_FEATURES_WANTED if f not in df.columns]

print(f"  Features used : {len(NUMERIC_FEATURES)}")
if missing_after:
    print(f"   Not in CSV (skipped): {missing_after}")
else:
    print("   All expected features present")

# ── Exogenous features ───────────────────────────────────────────────────────
SARIMAX_EXOG_WANTED = [
    'msp', 'Diesel_price', 'rainfall_7d', 'temp_7d_avg',
    'Month_Num', 'season_enc', 'price_lag_3', 'arrival_rolling_7'
]
SARIMAX_EXOG = [c for c in SARIMAX_EXOG_WANTED if c in df.columns]

PROPHET_REGRESSORS_WANTED = [
    'msp', 'Diesel_price', 'rainfall_7d', 'temp_7d_avg',
    'Month_Num', 'season_enc', 'price_lag_3', 'arrival_rolling_7'
]
PROPHET_REGRESSORS = [c for c in PROPHET_REGRESSORS_WANTED if c in df.columns]

TARGET = [f'target_{i}d_pct_change' for i in range(1, 31)] # ML stationary target (30-day vector)
ACTUAL_TARGET = [f'target_lead_{i}' for i in range(1, 31)]   # True future price (30-day vector)
COMMODITIES = df['commodity'].unique()

# Drop rows where target is NaN (Future horizon gap)
df = df.dropna(subset=TARGET).reset_index(drop=True)

# ── Shared date-based train/val/test cutoffs ─────────────────────────────────
# Row-based splits (int(n * 0.70) per commodity) produce different calendar
# date windows for each commodity depending on how many rows it has.
# That makes cross-commodity comparisons misleading and regime diagnostics
# inconsistent. Shared calendar cutoffs guarantee all commodities are evaluated
# on exactly the same time period.
#
# The global date range is used to compute the 70/15/15 breakpoints once,
# then each commodity's rows are assigned to splits by date — not by row index.
_all_dates   = df['date'].sort_values()
_n_dates     = len(_all_dates.unique())
_d_train_end = _all_dates.unique()[int(_n_dates * 0.70) - 1]
_d_val_end   = _all_dates.unique()[int(_n_dates * 0.85) - 1]

DATE_TRAIN_END = pd.Timestamp(_d_train_end)
DATE_VAL_END   = pd.Timestamp(_d_val_end)

print(f"  Date cutoffs  : Train end={DATE_TRAIN_END.date()}  "
      f"Val end={DATE_VAL_END.date()}  Test={DATE_VAL_END.date()} ->"
      f" {df['date'].max().date()}")

# ─────────────────────────────────────────────
# 2. HYPERPARAMETER SEARCH SPACES
# ─────────────────────────────────────────────
PARAM_GRIDS = {
    'Ridge Regression': {
        'ridge__alpha': [0.01, 0.1, 1, 3, 5, 10, 50, 100, 300, 500, 1000, 2000, 3000, 4000, 5000]
    },
    'Lasso Regression': {
        'lasso__alpha':    [0.01, 0.1, 1, 3, 5, 10, 20, 40, 80, 100, 200, 400, 800],
        'lasso__max_iter': [100, 200, 500, 1000, 2000, 5000, 10000]
    },

    'ElasticNet': {
        'elasticnet__alpha':    [0.01, 0.1, 1, 5, 10, 50, 100, 300],
        'elasticnet__l1_ratio': [0.1, 0.2, 0.3, 0.5, 0.7, 0.9],
        'elasticnet__max_iter': [500, 1000, 2000, 5000, 10000]
    },

    'Huber Regression': {
    'huber__epsilon':  [1.35, 1.5, 2.0, 2.5],   # remove 1.1 — too aggressive, causes instability
    'huber__alpha':    [0.001, 0.01, 0.1, 1.0],   # remove 0.0001 and 10.0 extremes
    'huber__max_iter': [500, 1000, 2000]           # was [200, 500, 1000] — too low for price scale
    },

    'Extra Trees': {
        'n_estimators':    [50, 100, 200, 300],
        'max_depth':       [3, 4, 5, 6, 8, 10],
        'min_samples_leaf':[5, 10, 15, 50, 100, 150],
        'min_samples_split':[100, 200],
        'max_features':    [0.3, 'sqrt', 0.5, 0.7]
    },
    'Gradient Boosting': {
        'n_estimators':    [200, 500, 1000, 2000],
        'learning_rate':   [0.01, 0.03, 0.05, 0.1],
        'max_depth':       [2, 3, 4],
        'subsample':       [0.6, 0.7, 0.8],
        'min_samples_leaf':[10, 20, 50, 100, 200]
    },
    'Hist Gradient Boosting': {
        'max_iter':          [300, 500, 1000, 2000],
        'learning_rate':     [0.01, 0.03, 0.05, 0.1],
        'max_depth':         [2, 3, 4, 6],
        'min_samples_leaf':  [20, 50, 80, 100, 150, 200],
        'l2_regularization': [0.1, 1.0, 2.0, 5.0, 10.0, 20.0]
    },
    'XGBoost': {
        'n_estimators':      [200, 500, 1000, 2000],
        'learning_rate':     [0.01, 0.03, 0.05, 0.1],
        'max_depth':         [2, 3],
        'min_child_weight':  [50, 100, 200],
        'subsample':         [0.6, 0.7, 0.8],
        'colsample_bytree':  [0.6, 0.7, 0.8],
        'reg_alpha':         [5, 10, 20],
        'reg_lambda':        [10, 20, 50]
    },
    'Random Forest': {
        'n_estimators':     [100, 200, 400],
        'max_depth':        [3, 4, 5, 8, 10],
        'min_samples_split':[5, 10, 20, 100, 200],
        'min_samples_leaf': [2, 5, 15, 50, 100, 150],
        'max_features':     [0.3, 'sqrt', 0.5, 0.7]
    },
    'LightGBM': {
        'n_estimators':      [300, 500, 1000, 2000],
        'learning_rate':     [0.01, 0.03, 0.05, 0.1],
        'max_depth':         [2, 3, 4, 6, -1],
        'num_leaves':        [15, 31, 63],
        'min_child_samples': [20, 50, 100, 150, 200],
        'subsample':         [0.6, 0.7, 0.8],
        'colsample_bytree':  [0.6, 0.7, 0.8],
        'reg_alpha':         [0, 0.1, 5, 10],
        'reg_lambda':        [1.0, 2.0, 10, 20],
    }
}

# ── IMP 6: Expanded Prophet HPT grid (30 combos, was 12) ────────────────────
# Added changepoint_prior_scale=0.001 (very flat) and 0.3 (flexible)
# Added seasonality_prior_scale=0.1 (tight seasonality)
# Added n_changepoints=15 (fewer pivots — better for Wheat's steady trend)
PROPHET_PARAM_GRID = list(ParameterGrid({
    'changepoint_prior_scale': [0.001, 0.01, 0.1, 0.3, 0.5],
    'seasonality_prior_scale': [0.1, 1.0, 10.0],
    'seasonality_mode':        ['additive', 'multiplicative'],
    'n_changepoints':          [15, 25],
}))
# 5 * 3 * 2 * 2 = 60 combos — cap at 30 for runtime by sampling
import random; random.seed(42)
if len(PROPHET_PARAM_GRID) > 30:
    PROPHET_PARAM_GRID = random.sample(PROPHET_PARAM_GRID, 30)

# ─────────────────────────────────────────────
# 3. HELPERS
# ─────────────────────────────────────────────
def prepare_data(data):
    X = data[NUMERIC_FEATURES].copy()
    y = data[TARGET].values
    y_actual = data[ACTUAL_TARGET].values
    if X.isna().sum().sum() > 0:
        # NOTE: prepare_data is called on already-split subsets (train/val/test
        # individually), so X.median() here is computed on that subset only.
        # The global training pipeline uses the train-only median from above.
        X = X.fillna(X.median())
    return X.values, y, y_actual

TREE_MODELS = {'Extra Trees', 'Gradient Boosting', 'Hist Gradient Boosting',
               'XGBoost', 'Random Forest', 'LightGBM'}
LINEAR_MODELS = {'Ridge Regression', 'Lasso Regression', 'ElasticNet', 'Huber Regression'}

# Log-transform the price target for linear models on arhar only.
# Arhar has the widest price range (Rs.3800-15000) and most skewed distribution.
# Linear models fit in log space learn % changes rather than absolute rupee gaps,
# which is more natural and avoids the model averaging across the two price modes.
# Tree models are excluded — DynamicPriceLevelWrapper already handles level shifts.
USE_LOG_TARGET = {'arhar (tur dal)'}

def log_y(y):   return np.log1p(y)
def exp_y(y):   return np.expm1(y)

def _mae_rupee_space(y_true_log, y_pred_log):
    return mean_absolute_error(exp_y(y_true_log), exp_y(y_pred_log))

TREE_SCORER   = 'neg_mean_absolute_error'
LINEAR_SCORER = 'neg_mean_absolute_error'


#
class DynamicPriceLevelWrapper(BaseEstimator, RegressorMixin):
    """
    Normalises training target by last-90-day price mean (static, for CV
    consistency), then at predict time re-scales by price_lag_1 extracted
    from the feature matrix.  This makes predictions regime-agnostic:
    the tree learns % deviations; price_lag_1 supplies the current level.
    sample_weight forwarded to base_estimator.fit().
    """
    def __init__(self, base_estimator, window=90, lag1_idx=None):
        self.base_estimator = base_estimator
        self.window         = window
        self.lag1_idx       = lag1_idx   # column index of price_lag_1 in X

    def fit(self, X, y, sample_weight=None, **fit_params):
        n = len(y)
        w = min(self.window, n)
        self._scale = float(np.mean(y[-w:]))
        if self._scale < 1e-6:
            self._scale = float(np.mean(y)) + 1e-6

        y_norm = y / self._scale

        if 'eval_set' in fit_params:
            normed_eval = [(X_e, y_e / self._scale)
                           for X_e, y_e in fit_params['eval_set']]
            fit_params = {**fit_params, 'eval_set': normed_eval}

        if sample_weight is not None:
            try:
                self.base_estimator.fit(X, y_norm,
                                        sample_weight=sample_weight, **fit_params)
            except TypeError:
                self.base_estimator.fit(X, y_norm, **fit_params)
        else:
            self.base_estimator.fit(X, y_norm, **fit_params)

        # Clip: 50%–200% of training scale as safety net
        self._clip_lo = 0.50 * self._scale
        self._clip_hi = 2.00 * self._scale
        return self

    def predict(self, X):
        return self.base_estimator.predict(X)

def fill_exog(arr):
    df_tmp = pd.DataFrame(arr).ffill().bfill()
    df_tmp = df_tmp.fillna(df_tmp.median())
    return df_tmp.values

def metrics(y_true, y_pred):
    """Computes Multi-Output Mean metrics"""
    # If passed a matrix, metric functions compute across all dimensions and return the mean.
    mae  = mean_absolute_error(y_true, y_pred)
    # RMSE across multiple outputs needs multioutput='uniform_average' handles this internally for MSE
    rmse = np.sqrt(mean_squared_error(y_true, y_pred)) 
    r2   = r2_score(y_true, y_pred)
    mape = np.mean(np.abs((y_true - y_pred) / (y_true + 1e-6))) * 100
    return {'MAE': mae, 'RMSE': rmse, 'R2': r2, 'MAPE': mape}

def evaluate(y_true_actual_matrix, y_pred_pct_matrix, price_base, name, split_label, X_eval_df):
    # Back-transform explicitly: price_base shape (N,) matching broadcast across (N, 30)
    # Add an axis to price_base if necessary to broadcast against (N, 30) array natively
    pb_col = price_base[:, None] if len(price_base.shape) == 1 else price_base
    y_pred_actual_matrix = pb_col * (1 + y_pred_pct_matrix)
    
    y_true = y_true_actual_matrix
    y_pred = y_pred_actual_matrix
    
    mae_val  = mean_absolute_error(y_true, y_pred)
    rmse_val = np.sqrt(mean_squared_error(y_true, y_pred))
    r2_val   = r2_score(y_true, y_pred)
    mape_val = np.mean(np.abs((y_true - y_pred) / (y_true + 1e-6))) * 100

    # Build detailed string containing global and per-commodity metrics
    detail_msg = [
        f"  [{split_label:>10}] {name:<30} "
        f"avg-MAE=Rs. {mae_val:7.2f}  "
        f"avg-RMSE=Rs. {rmse_val:7.2f}  "
        f"overall-R2={r2_val:6.4f}  "
        f"avg-MAPE={mape_val:4.2f}%"
    ]

    # Check for OHE commodity columns in X to calculate per-crop metrics
    commodity_cols = [c for c in X_eval_df.columns if c.startswith('commodity_')]
    if len(commodity_cols) > 0:
        for c_col in commodity_cols:
            c_name = c_col.replace('commodity_', '').title()
            c_mask = X_eval_df[c_col] == 1
            if c_mask.sum() > 0:
                y_true_c = y_true[c_mask]
                y_pred_c = y_pred[c_mask]
                c_mae  = mean_absolute_error(y_true_c, y_pred_c)
                c_rmse = np.sqrt(mean_squared_error(y_true_c, y_pred_c))
                c_mape = np.mean(np.abs((y_true_c - y_pred_c) / (y_true_c + 1e-6))) * 100
                detail_msg.append(
                    f"    ↳ {c_name:<15}: MAE=Rs. {c_mae:7.2f} | RMSE=Rs. {c_rmse:7.2f} | MAPE={c_mape:4.2f}%"
                )

    # Print all lines vertically
    print('\n'.join(detail_msg))
    
    # Return the overall metrics as before
    m = {'MAE': mae_val, 'RMSE': rmse_val, 'R2': r2_val, 'MAPE': mape_val}
    return m, y_pred_actual_matrix

SCALED_MODELS = {'Ridge Regression', 'Lasso Regression', 'ElasticNet', 'Huber Regression'}

def make_search_estimator(name):
    from sklearn.pipeline import Pipeline
    from sklearn.multioutput import MultiOutputRegressor
    # RobustScaler (median/IQR) instead of StandardScaler for all linear models.
    # Commodity prices have occasional spike outliers that inflate the standard
    # deviation and distort StandardScaler's normalisation.  RobustScaler is
    # unaffected by outliers, giving more stable coefficient estimates.
    if name == 'Ridge Regression':
        return Pipeline([('scaler', RobustScaler()), ('ridge', Ridge())])
    if name == 'Lasso Regression':
        return Pipeline([('scaler', RobustScaler()), ('lasso', Lasso())])
    if name == 'ElasticNet':
        return Pipeline([('scaler', RobustScaler()),
                         ('elasticnet', ElasticNet(random_state=42))])
    if name == 'Huber Regression':
        return Pipeline([
            ('scaler', RobustScaler()),
            ('huber', HuberRegressor(tol=1e-3, max_iter=2000, warm_start=True))
        ])
    models = {
        'Extra Trees': ExtraTreesRegressor(random_state=42, n_jobs=-1),
        'Gradient Boosting': MultiOutputRegressor(GradientBoostingRegressor(
            random_state=42, n_iter_no_change=20,
            validation_fraction=0.15, tol=1e-4), n_jobs=1),
        'Hist Gradient Boosting': MultiOutputRegressor(HistGradientBoostingRegressor(
            random_state=42, early_stopping=True,
            n_iter_no_change=20, validation_fraction=0.15, tol=1e-4), n_jobs=1),
        'XGBoost': MultiOutputRegressor(XGBRegressor(
            random_state=42, n_jobs=-1, verbosity=0,
            tree_method='hist'), n_jobs=1),
        'Random Forest': RandomForestRegressor(random_state=42, n_jobs=-1),
        'LightGBM': MultiOutputRegressor(LGBMRegressor(
            random_state=42, n_jobs=-1, verbose=-1,
            force_col_wise=True), n_jobs=1) if HAS_LGBM else None,
    }
    est = models.get(name)
    if est is None:
        raise ValueError(f"Model '{name}' not available")
    return est


def tune_model(name, X_train, y_train, tscv, sample_weight=None, lag1_idx=None):

    estimator  = make_search_estimator(name)
    param_grid = PARAM_GRIDS[name]

    if name in TREE_MODELS:
        # MultiOutputRegressor requires the 'estimator__' prefix for underlying params
        param_grid = {f'estimator__{k}': v for k, v in param_grid.items()}
        # For RandomForest and ExtraTrees which are NOT wrapped in MultiOutputRegressor
        # (they natively support multi-output), we need to revert the prefix.
        if name in ['Random Forest', 'Extra Trees']:
             param_grid = {k.replace('estimator__', ''): v for k, v in param_grid.items()}
        scorer     = TREE_SCORER
    else:
        scorer = LINEAR_SCORER

    fit_params = {}
    
    if name == 'XGBoost':
        fit_params['verbose']  = False
    elif name == 'LightGBM' and HAS_LGBM:
        fit_params['callbacks'] = [__import__('lightgbm').log_evaluation(-1)]

    search = RandomizedSearchCV(
    estimator, param_distributions=param_grid,
    n_iter=20, cv=tscv, scoring=scorer,
    n_jobs=1, random_state=42,
    refit=False,           # ← disable auto-refit
    error_score=np.nan
)
    search.fit(X_train, y_train, **fit_params)

    # ── Manual refit on full training data with best params ──────────────────
    best_params = search.best_params_
    estimator.set_params(**best_params)

    # Build refit kwargs
    refit_kwargs = {}
    if sample_weight is not None and name in TREE_MODELS:
        refit_kwargs['sample_weight'] = sample_weight

    # Wrap kwargs targeting multioutput estimators natively
    def multi_wrapper(kwargs):
        return {f'estimator__{k}': v for k, v in kwargs.items()}

    # Disable early stopping for final refit to avoid requiring eval_set
    # This prevents the final estimator in StackingRegressor from crashing
    if name == 'XGBoost':
        estimator.set_params(estimator__early_stopping_rounds=None)
        refit_kwargs['estimator__verbose']  = False
    elif name == 'LightGBM' and HAS_LGBM:
        estimator.set_params(estimator__early_stopping_round=None)
        

    try:
        estimator.fit(X_train, y_train, **refit_kwargs)
    except Exception as e:
        print(f"\n        WARNING: refit failed ({e}), retrying with safe params")
        if name == 'Huber Regression':
            # Scale alpha by price level — arhar (~Rs.9000) needs smaller alpha
            # than wheat (~Rs.2500) to avoid over-regularisation
            scale_alpha = 0.001 if np.mean(y_train) > 5000 else 0.01
            estimator.set_params(**{
                'huber__epsilon': 1.5,
                'huber__alpha': scale_alpha,
                'huber__max_iter': 2000
            })
            estimator.fit(X_train, y_train)
        elif name == 'XGBoost':
            # Retry without early stopping — avoids eval_set dependency
            estimator.estimator.set_params(early_stopping_rounds=None)
            estimator.fit(X_train, y_train,
                        sample_weight=refit_kwargs.get('sample_weight'))
        elif name == 'LightGBM' and HAS_LGBM:
            estimator.estimator.set_params(n_iter_no_change=None)
            estimator.fit(X_train, y_train,
                        sample_weight=refit_kwargs.get('sample_weight'))
        else:
            # Generic fallback — fit with no extra kwargs
            estimator.fit(X_train, y_train)

    return estimator, best_params, -search.best_score_


# ── Time-series helpers ──────────────────────────────────────────────────────
def fit_arima(y_train):
    model = pm.auto_arima(
        y_train, start_p=1, start_q=1, max_p=5, max_q=5, d=None,
        seasonal=False, stepwise=True, information_criterion='aic',
        suppress_warnings=True, error_action='ignore', n_fits=50
    )
    return model

def fit_sarimax(y_train, X_exog_train):
    model = pm.auto_arima(
        y_train, exogenous=X_exog_train,
        start_p=0, start_q=0, max_p=3, max_q=3, d=None,
        seasonal=True, m=7, start_P=0, start_Q=0, max_P=1, max_Q=1, D=None,
        stepwise=True, information_criterion='aic',
        suppress_warnings=True, error_action='ignore', n_fits=30
    )
    return model

def tune_prophet(y_train, dates_train, regressors_train):
    n           = len(y_train)
    n_hpt       = max(30, int(n * 0.15))
    y_ht        = y_train[:-n_hpt];   y_hv = y_train[-n_hpt:]
    d_ht        = dates_train[:-n_hpt]; d_hv = dates_train[-n_hpt:]
    r_ht = regressors_train.iloc[:-n_hpt].reset_index(drop=True) \
           if regressors_train is not None else None
    r_hv = regressors_train.iloc[-n_hpt:].reset_index(drop=True) \
           if regressors_train is not None else None

    best_mae    = np.inf
    best_params = PROPHET_PARAM_GRID[0]

    print(f"      Prophet HPT: {len(PROPHET_PARAM_GRID)} param combos ...", end=" ", flush=True)
    for params in PROPHET_PARAM_GRID:
        try:
            m = Prophet(
                changepoint_prior_scale=params['changepoint_prior_scale'],
                seasonality_prior_scale=params['seasonality_prior_scale'],
                seasonality_mode=params['seasonality_mode'],
                n_changepoints=params.get('n_changepoints', 25),

                changepoint_range=0.95,
                yearly_seasonality=True, weekly_seasonality=True,
                daily_seasonality=False
            )
            m.add_seasonality(name='monthly', period=30.5, fourier_order=5)
            # IMP 6: also add quarterly seasonality
            m.add_seasonality(name='quarterly', period=91.25, fourier_order=3)
            train_df = pd.DataFrame({'ds': d_ht, 'y': y_ht})
            if r_ht is not None:
                for col in r_ht.columns:
                    m.add_regressor(col); train_df[col] = r_ht[col].values
            m.fit(train_df, iter=150)
            future_df = pd.DataFrame({'ds': d_hv})
            if r_hv is not None:
                for col in r_hv.columns: future_df[col] = r_hv[col].values
            fc  = m.predict(future_df)
            mae = mean_absolute_error(y_hv, fc['yhat'].values)
            if mae < best_mae:
                best_mae = mae; best_params = params
        except Exception:
            continue
    print(f"best CV MAE=Rs.{best_mae:.2f}  {best_params}")
    return best_params, best_mae

def fit_prophet(y_train, dates_train, best_params, regressors_train):
    m = Prophet(
        changepoint_prior_scale=best_params['changepoint_prior_scale'],
        seasonality_prior_scale=best_params['seasonality_prior_scale'],
        seasonality_mode=best_params['seasonality_mode'],
        n_changepoints=best_params.get('n_changepoints', 25),
        changepoint_range=0.95,   # FIX: detect late regime shifts (default=0.80 missed Arhar shift)
        yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=False
    )
    m.add_seasonality(name='monthly', period=30.5, fourier_order=5)
    m.add_seasonality(name='quarterly', period=91.25, fourier_order=3)
    train_df = pd.DataFrame({'ds': dates_train, 'y': y_train})
    if regressors_train is not None:
        for col in regressors_train.columns:
            m.add_regressor(col); train_df[col] = regressors_train[col].values
    m.fit(train_df, iter=500)
    return m

def prophet_predict(model, dates_future, regressors_future):
    future_df = pd.DataFrame({'ds': dates_future})
    if regressors_future is not None:
        for col in regressors_future.columns:
            future_df[col] = regressors_future[col].values
    fc = model.predict(future_df)
    return fc['yhat'].values, fc


# ── IMP 4: Walk-forward helpers (ARIMA + SARIMAX) ───────────────────────────
from statsmodels.tsa.statespace.sarimax import SARIMAX as SM_SARIMAX
from statsmodels.tsa.arima.model import ARIMA as SM_ARIMA

def arima_walk_forward_fast(y_train_wf, y_pred_period, order):
    """
    IMP 4: ARIMA Walk-Forward.
    FIX: removed disp=False — statsmodels >=0.14 SM_ARIMA.fit() no longer
    accepts 'disp'; use method_kwargs to suppress convergence warnings only.
    """
    try:
        sm  = SM_ARIMA(y_train_wf, order=order)
        res = sm.fit(method_kwargs={'warn_convergence': False})
        res_applied = res.apply(y_pred_period, refit=False)
        fv = res_applied.fittedvalues
        return fv.values if hasattr(fv, 'values') else np.asarray(fv)
    except Exception as e:
        print(f"      ARIMA WF fallback ({e})")
        # Naive walk-forward: repeat last known value (better than mean)
        return np.full(len(y_pred_period), y_train_wf[-1])

def sarimax_walk_forward_fast(y_train_wf, X_train_wf,
                               y_pred_period, X_pred_period,
                               order, s_order):

    for method in ['lbfgs', 'nm', 'powell']:
        try:
            sm  = SM_SARIMAX(y_train_wf, exog=X_train_wf,
                             order=order, seasonal_order=s_order,
                             enforce_stationarity=False, enforce_invertibility=False)
            res = sm.fit(disp=False, maxiter=300, method=method)
            res_applied = res.apply(y_pred_period, exog=X_pred_period, refit=False)
            fv = res_applied.fittedvalues
            return fv.values if hasattr(fv, 'values') else np.asarray(fv)
        except Exception as e:
            last_err = e
            continue
    print(f"      SARIMAX WF fallback (all methods failed: {last_err})")
    return np.full(len(y_pred_period), y_train_wf[-1])


# ─────────────────────────────────────────────
# 4. MAIN TRAINING LOOP (GLOBAL MULTI-COMMODITY)
# ─────────────────────────────────────────────
all_val_results   = {}
all_test_results  = {}
all_preds         = {}
feature_imps      = {}
lasso_coefs       = {}
all_data          = {}
import joblib
cv_mae_table      = {}


ML_MODEL_NAMES = ['Random Forest', 'XGBoost']
if HAS_LGBM:
    ML_MODEL_NAMES.append('LightGBM')

print(f"\n{'='*72}")
print(f"  GLOBAL MULTI-COMMODITY TRAINING")
print(f"{'='*72}")

# One-hot encode commodity for the global ML model
df_global = pd.get_dummies(df, columns=['commodity'])
X_cols = NUMERIC_FEATURES + [c for c in df_global.columns if c.startswith('commodity_')]

# Sort chronologically for proper time-series validation
df_global = df_global.sort_values('date').reset_index(drop=True)

X_global = df_global[X_cols].copy()
if X_global.isna().sum().sum() > 0:
    # LEAK FIX: compute imputation median ONLY on training rows.
    # Using the full-dataset median leaks val/test statistics into training.
    _t1_for_impute = int((df_global['date'] <= DATE_TRAIN_END).sum())
    _train_median  = X_global.iloc[:_t1_for_impute].median()
    X_global = X_global.fillna(_train_median)
X_global = X_global.values.astype(np.float32)

y_global        = df_global[TARGET].values.astype(np.float32)
price_base_global = df_global['modal_price'].values
y_actual_global = price_base_global[:, None] * (1 + y_global)

n    = len(X_global)
t1 = int((df_global['date'] <= DATE_TRAIN_END).sum())
t2 = int((df_global['date'] <= DATE_VAL_END).sum())

X_train, y_train, price_base_train = X_global[:t1], y_global[:t1], price_base_global[:t1]
X_val,   y_val,   price_base_val   = X_global[t1:t2], y_global[t1:t2], price_base_global[t1:t2]
X_test,  y_test,  price_base_test  = X_global[t2:], y_global[t2:], price_base_global[t2:]
y_actual_train = y_actual_global[:t1]
y_actual_val   = y_actual_global[t1:t2]
y_actual_test  = y_actual_global[t2:]

print(f"  Rows -> Train: {len(X_train)}  Val: {len(X_val)}  Test: {len(X_test)}")

tscv = TimeSeriesSplit(n_splits=5, gap=30)  # gap=30 matches real 30-day deployment horizon
best_estimators = {}

# ── Recency-weighted sample weights (Imp 5) ────────────────────────────────
# Exponential decay: rows from 3 years ago get ~5x less weight than
# the most recent training row. This anchors learning to current price
# regimes while retaining the full history for seasonality signals.
_train_dates   = df_global.iloc[:t1]['date'].values
_max_date      = DATE_TRAIN_END
_days_ago      = np.array([
    (_max_date - pd.Timestamp(str(d))).days for d in _train_dates
], dtype=float)
sample_weight_train = np.exp(-0.001 * _days_ago)   # half-life ~693 days
sample_weight_train = sample_weight_train / sample_weight_train.mean()  # normalise
print(f"  Recency weights : min={sample_weight_train.min():.3f}  max={sample_weight_train.max():.3f}  "
      f"recent/oldest ratio={sample_weight_train.max()/sample_weight_train.min():.1f}x")

for name in ML_MODEL_NAMES:
    print(f"    Tuning {name:<30}", end=" ... ", flush=True)
    best_est, bp, cv_mae = tune_model(name, X_train, y_train, tscv,
                                      sample_weight=sample_weight_train)
    best_estimators[name] = best_est
    print(f"CV pseudo-MAE={cv_mae:.4f}  {bp}")

print(f"\n  -- Stacking Ensemble (Top ML Models) --")
from sklearn.ensemble import StackingRegressor
from sklearn.multioutput import MultiOutputRegressor



from sklearn.base import clone as _clone
estimators_list = []
for name in ML_MODEL_NAMES:
    est = best_estimators[name]
    # StackingRegressor expects UNFITTED estimators; clone() guarantees a
    # fresh, unfitted copy regardless of whether the base model has been fit.
    # For MultiOutputRegressor-wrapped models, extract the inner 1D estimator;
    # for native multi-output models (RF), clone the whole model — StackingRegressor
    # feeds 1D targets so RF handles them correctly as a single-output tree.
    if hasattr(est, 'estimator'):
        estimators_list.append((name, _clone(est.estimator)))
    else:
        estimators_list.append((name, _clone(est)))

stacking_model = MultiOutputRegressor(StackingRegressor(
    estimators=estimators_list,
    final_estimator=Ridge(alpha=1.0),
    cv=5,
    n_jobs=1
), n_jobs=1)

try:
    stacking_model.fit(X_train, y_train, sample_weight=sample_weight_train)
except TypeError:
    # Fallback if StackingRegressor version doesn't support sample_weight
    stacking_model.fit(X_train, y_train)
best_estimators['Stacking Ensemble'] = stacking_model

# ── Save the global model for predict.py UI zero-input forecasting ──
import os
os.makedirs('ml_pipeline/models/saved_models', exist_ok=True)
# Save the final meta-learner and the raw base models so we can manually
# query the base models for their variance during confidence interval generation
import joblib
joblib.dump({
    'model': stacking_model,
    'base_estimators': best_estimators, 
    'features': X_cols
}, 'ml_pipeline/models/saved_models/global_stacking_30d.pkl')
print(f"    -> Saved global stacking multi-output model to ml_pipeline/models/saved_models/global_stacking_30d.pkl")

# ────────────────────────────────────────────────────────────
# 4b. Global ML Evaluation
# ────────────────────────────────────────────────────────────
print(f"\n  -- Final Evaluation --")
val_list   = []
test_list  = []
preds_dict = {'y_val': y_actual_val, 'y_test': y_actual_test}

# We still iterate through the models to compute metrics
EVAL_MODELS = ML_MODEL_NAMES + ['Stacking Ensemble']

for name in EVAL_MODELS:
    est = best_estimators[name]
    
    # Predict percentage change explicitly
    # NOTE: Stacking Ensemble is now a bare StackingRegressor (not wrapped in MultiOutputRegressor)
    # so .predict() already returns shape (N, 30) — no special handling needed.
    p_val_pct  = est.predict(X_val)
    p_test_pct = est.predict(X_test)

    # Evaluate algebraically backs-out absolute price predictions
    vm, p_val_actual  = evaluate(y_actual_val,  p_val_pct,  price_base_val,  name, 'VALIDATION', X_eval_df=df_global.iloc[t1:t2][X_cols])
    tm, p_test_actual = evaluate(y_actual_test, p_test_pct, price_base_test, name, 'TEST', X_eval_df=df_global.iloc[t2:][X_cols])
    
    val_list.append({'model': name, **vm})
    test_list.append({'model': name, **tm})
    preds_dict[f'val_{name}']  = p_val_actual
    preds_dict[f'test_{name}'] = p_test_actual

all_val_results['Global']  = pd.DataFrame(val_list)
all_test_results['Global'] = pd.DataFrame(test_list)

# ── Bug 4: Empirical CI calibration from stacking ensemble test residuals ──
# Compute actual residuals in pct-change space and derive the 2.5/97.5
# percentile offsets per forecast horizon. These replace the hand-tuned
# z_scaled magic number in predict.py with data-driven bounds.
_stacking_test_pct = best_estimators['Stacking Ensemble'].predict(X_test)
_residuals_pct     = y_test - _stacking_test_pct    # shape (N_test, 30)
ci_lower_q = np.nanpercentile(_residuals_pct, 2.5,  axis=0)  # (30,)
ci_upper_q = np.nanpercentile(_residuals_pct, 97.5, axis=0)  # (30,)
print(f"\n  CI Calibration (empirical 95%):")
print(f"    Day  1: [{ci_lower_q[0]*100:+.2f}%, {ci_upper_q[0]*100:+.2f}%]")
print(f"    Day 15: [{ci_lower_q[14]*100:+.2f}%, {ci_upper_q[14]*100:+.2f}%]")
print(f"    Day 30: [{ci_lower_q[29]*100:+.2f}%, {ci_upper_q[29]*100:+.2f}%]")

# Append CI bounds to the saved model payload
_pkl_path = 'ml_pipeline/models/saved_models/global_stacking_30d.pkl'
_payload  = joblib.load(_pkl_path)
_payload['ci_lower_q'] = ci_lower_q
_payload['ci_upper_q'] = ci_upper_q
joblib.dump(_payload, _pkl_path)
print("  -> Calibrated CI bounds saved to model pkl")

# ─────────────────────────────────────────────
# 5. FINAL SUMMARY
# ─────────────────────────────────────────────
print("\n" + "="*95)
print("  FINAL SUMMARY — GLOBAL MULTI-COMMODITY FORECASTING (30-day Horizon) ")
print("="*95)
print(f"{'Model':<36} {'Val R2':>8} {'Test R2':>8} {'Val MAE':>9} {'Test MAE':>9} {'MAPE':>8}")
print("-"*95)

tb_df = all_test_results['Global'].sort_values('R2', ascending=False)
for _, tb in tb_df.iterrows():
    vb = all_val_results['Global'][all_val_results['Global']['model'] == tb['model']].iloc[0]
    print(f"{tb['model']:<36} {vb['R2']:>8.4f} {tb['R2']:>8.4f} "
          f"{vb['MAE']:>9.1f} {tb['MAE']:>9.1f} {tb['MAPE']:>7.2f}%")
print("="*95)

print("\n  Global outputs available in all_val_results / all_test_results / all_preds")