import pandas as pd
import numpy as np

def generate_multihorizon_targets(df):
    """
    Takes the base cereal dataframe (output of Cereal_feature_v1.py) and generates
    30 distinct forward percentage-change targets AND their absolute lead prices,
    grouped by commodity.

    Returns the augmented dataframe and the list of pct-change target column names.

    IMPORTANT: Both target_lead_{i} AND target_{i}d_pct_change are kept in the output.
    Cereal_ml_v1.py needs:
      - TARGET       = [target_1d_pct_change ... target_30d_pct_change]  (what models predict)
      - ACTUAL_TARGET = [target_lead_1 ... target_lead_30]               (used for rupee-space MAE/RMSE evaluation)
    Dropping target_lead_{i} here would cause a KeyError in the ML training script.
    """
    # Ensure sorted chronologically per commodity — shifts must be in correct order
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values(['commodity', 'date']).reset_index(drop=True)

    for horizon in range(1, 31):
        # Pull the future price at day `horizon` back to the current row
        lead_col = f'target_lead_{horizon}'
        df[lead_col] = df.groupby('commodity')['modal_price'].shift(-horizon)

        # Stationary percentage-change target — what ML models actually learn to predict.
        # +1e-6 in denominator guards against division by zero on any zero/near-zero price.
        pct_col = f'target_{horizon}d_pct_change'
        df[pct_col] = (df[lead_col] - df['modal_price']) / (df['modal_price'] + 1e-6)

        # FIX: Do NOT drop lead_col — Cereal_ml_v1.py uses ACTUAL_TARGET = [target_lead_1..30]
        # to back-transform predictions into absolute rupees for MAE/RMSE reporting.

    # FIX: DO NOT drop NA targets here! Doing so deletes the absolute most recent 30 days
    # of commodity data because they don't have future 30-day prices yet.
    # We must keep these recent rows in the CSV so `predict.py` can load them and generate
    # the out-of-sample future forecasts.
    # Cereal_ml_v1.py natively drops NAs before training via `df.dropna(subset=TARGET)`.
    target_cols = [f'target_{i}d_pct_change' for i in range(1, 31)]

    return df, target_cols

if __name__ == "__main__":
    # Run order: Cereal_feature_v1.py → this script → Cereal_ml_v1.py
    # This script reads the base feature CSV (v1) and outputs the multi-horizon version (v2_Multi).
    print("[INFO] Loading base feature dataset (output of Cereal_feature_v1.py)...")
    df = pd.read_csv('ml_pipeline/data/Cereal_Feature_v1.csv')

    # Remove old 2-target columns if they exist from a previous v1 run
    old_targets = [
        'target_30d_pct_change', 'target_7d_pct_change',
        'target_lead_30', 'target_lead_7'
    ]
    df = df.drop(columns=[c for c in old_targets if c in df.columns], errors='ignore')

    print("[INFO] Generating 30 daily multi-horizon targets (lead prices + pct changes)...")
    df, t_cols = generate_multihorizon_targets(df)

    n_lead_cols = sum(1 for c in df.columns if c.startswith('target_lead_'))
    n_pct_cols  = sum(1 for c in df.columns if c.endswith('d_pct_change'))
    print(f"[INFO] Generated {n_lead_cols} lead columns and {n_pct_cols} pct-change columns")
    print(f"[INFO] Final dataset shape: {df.shape}")
    print(f"[INFO] Saving to ml_pipeline/data/Cereal_Feature_v2_Multi.csv")
    df.to_csv('ml_pipeline/data/Cereal_Feature_v2_Multi.csv', index=False)
    print("[SUCCESS] Multi-horizon targets engineered and saved!")