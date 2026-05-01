"""
feature_selection_analysis.py
==============================
Efficient feature selection for the 30-day agricultural price forecasting pipeline.

Strategy:
 1. Load the trained RF model's feature_importances_ (free - already computed during training)
 2. Warn if the model was trained on known-leaky features (modal_price / min_price / max_price)
 3. Compute pairwise Pearson correlation on the training features
 4. Flag correlated pairs (|corr| > CORR_THRESHOLD)
 5. For each correlated pair, keep the one with higher RF importance
 6. Print the final curated NUMERIC_FEATURES_WANTED list you can paste directly
    into Cereal_ml_v1.py / Vegetable_ml_v1.py

Run from project root:
  python ml_pipeline/scripts/feature_selection_analysis.py
"""

import warnings

import joblib
import numpy as np
import pandas as pd

warnings.filterwarnings('ignore')

# ── Configuration ────────────────────────────────────────────────────────────
CORR_THRESHOLD = 0.88   # flag pairs more correlated than this as redundant
TOP_N_KEEP = 25     # maximum features to keep per pipeline
IMPORTANCE_ALPHA = 0.005  # drop features with RF importance < this threshold

# Raw price columns that should NEVER be features (they are or strongly proxy
# today's modal_price — the denominator of the pct-change target -> circular dependency)
LEAKY_RAW_COLS = {'modal_price', 'min_price', 'max_price', 'rolling_median_7',
                  'price', 'close', 'open', 'high', 'low'}
# ─────────────────────────────────────────────────────────────────────────────

PIPELINES = {
    'Cereal': {
        'csv':   'ml_pipeline/data/Cereal_Feature_v2_Multi.csv',
        'pkl':   'ml_pipeline/models/saved_models/global_stacking_30d.pkl',
    },
    'Vegetable': {
        'csv':   'ml_pipeline/data/Vegetable_Feature_v2_Multi.csv',
        'pkl':   'ml_pipeline/models/saved_models/global_veg_stacking_30d.pkl',
    },
}


def analyze(label, csv_path, pkl_path):
    print(f"\n{'='*70}")
    print(f"  {label} Pipeline Feature Analysis")
    print(f"{'='*70}")

    # ── Load data and model ──────────────────────────────────────────────────
    try:
        payload = joblib.load(pkl_path)
    except FileNotFoundError:
        print(f"  [SKIP] Model pkl not found: {pkl_path}")
        print(f"         Re-train the model first, then run this script.")
        return

    features = payload['features']          # list of feature names used
    rf_model = payload['base_estimators'].get('Random Forest')
    if rf_model is None:
        print("  [SKIP] Random Forest not in base_estimators")
        return

    if not hasattr(rf_model, 'feature_importances_'):
        print("  [SKIP] RF not fitted yet.")
        return

    # ── LEAKY MODEL GUARD ────────────────────────────────────────────────────
    leaky_in_model = [f for f in features if f in LEAKY_RAW_COLS]
    if leaky_in_model:
        print(f"\n  !!  WARNING: This model was trained on LEAKY features:")
        for f in leaky_in_model:
            print(
                f"     '{f}' = same-day raw price column — creates circular dependency")
        print(f"\n  The feature importances below are BIASED because the model learned")
        print(
            f"  to use today's price (via {leaky_in_model}) to predict % change from")
        print(f"  today's price. All other features appear less important than they")
        print(
            f"  really are. This output should NOT be used to set NUMERIC_FEATURES_WANTED.")
        print(f"\n  ACTION REQUIRED: Re-train the model after running the updated")
        print(f"  feature engineering scripts, then re-run this analysis.")
        print(f"{'='*70}")
        return None

    importances = rf_model.feature_importances_
    imp_series = pd.Series(
        importances, index=features).sort_values(ascending=False)

    # ── Step 1: importance threshold ─────────────────────────────────────────
    low_imp = imp_series[imp_series < IMPORTANCE_ALPHA].index.tolist()
    imp_series_filtered = imp_series[imp_series >= IMPORTANCE_ALPHA]
    print(f"\n  Total features in trained model : {len(features)}")
    print(f"  Below importance threshold ({IMPORTANCE_ALPHA}): {len(low_imp)}")
    if low_imp:
        print(
            f"    -> Dropping low-importance: {low_imp[:10]}{'...' if len(low_imp) > 10 else ''}")

    # ── Step 2: correlation pruning ──────────────────────────────────────────
    df = pd.read_csv(csv_path, nrows=50000)   # sample for speed
    feat_cols = [f for f in imp_series_filtered.index if f in df.columns]
    if not feat_cols:
        print("  [WARN] No features found in CSV — skipping correlation analysis")
        return

    X = df[feat_cols].apply(pd.to_numeric, errors='coerce').fillna(0)
    corr = X.corr().abs()

    # Find pairs exceeding threshold
    to_drop_corr = set()
    upper = corr.where(np.triu(np.ones(corr.shape), k=1).astype(bool))
    for col in upper.columns:
        corr_partners = upper[col][upper[col] > CORR_THRESHOLD].index.tolist()
        for partner in corr_partners:
            # Drop the one with lower RF importance
            if imp_series_filtered.get(col, 0) >= imp_series_filtered.get(partner, 0):
                to_drop_corr.add(partner)
            else:
                to_drop_corr.add(col)

    print(
        f"\n  Correlation pairs |r| > {CORR_THRESHOLD}  ->  dropping {len(to_drop_corr)} redundant features:")
    for f in sorted(to_drop_corr):
        partners = [(other, corr.loc[f, other]) for other in feat_cols
                    if other != f and other not in to_drop_corr
                    and corr.loc[f, other] > CORR_THRESHOLD]
        if partners:
            best = max(partners, key=lambda x: x[1])
            print(f"    drop '{f}' (r={best[1]:.2f} with '{best[0]}')")
        else:
            print(f"    drop '{f}' (correlated pair already removed)")

    # ── Step 3: final ranked list ────────────────────────────────────────────
    final_feats = [f for f in imp_series_filtered.index
                   if f not in to_drop_corr and f in feat_cols][:TOP_N_KEEP]

    print(f"\n  OK   Final curated feature set: {len(final_feats)} features")
    print(
        f"  (down from {len(features)}, -{len(features)-len(final_feats)} features)\n")

    print("  Rank | Importance | Feature")
    print("  " + "-"*55)
    for rank, feat in enumerate(final_feats, 1):
        imp_val = imp_series.get(feat, 0)
        bar = '#' * int(imp_val * 400)
        print(f"  {rank:4d} | {imp_val:9.4f} | {feat:<35} {bar}")

    # ── Paste-ready NUMERIC_FEATURES_WANTED ─────────────────────────────────
    print(
        f"\n  --- Paste this as NUMERIC_FEATURES_WANTED in {label}_ml_v1.py ---")
    print(f"NUMERIC_FEATURES_WANTED = [")

    # Group by semantic category — use ordered dict to avoid duplicates
    categories = {
        'price_lag':     [f for f in final_feats if 'price_lag' in f],
        'rolling_price': [f for f in final_feats if 'rolling_mean' in f or ('volatility' in f and 'price_volatility' in f)],
        'momentum':      [f for f in final_feats if any(x in f for x in ['pct_change', 'accel', 'zscore', 'norm_trailing', 'price_diff'])],
        'supply':        [f for f in final_feats if any(x in f for x in ['arrival', 'supply', 'tightness'])],
        'weather':       [f for f in final_feats if any(x in f for x in ['temp', 'rain', 'rainfall'])],
        'fuel':          [f for f in final_feats if any(x in f for x in ['Diesel', 'diesel', 'fuel', 'Petrol', 'petrol'])],
        'market_struc':  [f for f in final_feats if any(x in f for x in ['msp', 'season', 'regime', 'harvest', 'yoy', 'rsi', 'macd', 'ema', 'month', 'Day', 'relative', 'momentum', 'ema_7', 'ema_14'])],
    }

    # Assign each feature to exactly ONE category (first match wins)
    assigned = set()
    final_output_lines = []

    for cat, feats_in_cat in categories.items():
        # Remove already-assigned to prevent duplicates
        feats_uniq = [f for f in feats_in_cat if f not in assigned]
        if feats_uniq:
            final_output_lines.append(f"    # {cat}")
            for f in feats_uniq:
                final_output_lines.append(f"    '{f}',")
                assigned.add(f)

    # Anything not matched by any category
    rest = [f for f in final_feats if f not in assigned]
    if rest:
        final_output_lines.append("    # misc")
        for f in rest:
            final_output_lines.append(f"    '{f}',")

    for line in final_output_lines:
        print(line)
    print("]")
    print()
    return final_feats


if __name__ == '__main__':
    for label, cfg in PIPELINES.items():
        analyze(label, cfg['csv'], cfg['pkl'])

    print("\n" + "="*70)
    print("  HOW TO APPLY:")
    print("  1. If you see a !!  WARNING above, re-train the model first.")
    print("     Run the full pipeline in order:")
    print("       python ml_pipeline/feature_engineering/Cereal_feature_v1.py")
    print("       python ml_pipeline/feature_engineering/Cereal_feature_generator.py")
    print("       python ml_pipeline/models/Cereal_ml_v1.py")
    print("       (same for Vegetable)")
    print("  2. Then re-run this script to get clean importance rankings.")
    print("  3. Copy the printed NUMERIC_FEATURES_WANTED and paste into the ML scripts.")
    print("="*70)
