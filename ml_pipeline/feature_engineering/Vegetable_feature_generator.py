import os

import pandas as pd


def generate_multihorizon_targets(df):

    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values(['commodity', 'date']).reset_index(drop=True)

    for horizon in range(1, 31):

        lead_col = f'target_lead_{horizon}'
        df[lead_col] = df.groupby('commodity')['modal_price'].shift(-horizon)


        pct_col = f'target_{horizon}d_pct_change'
        df[pct_col] = (df[lead_col] - df['modal_price']) / \
            (df['modal_price'] + 1e-6)


    target_cols = [f'target_{i}d_pct_change' for i in range(1, 31)]

    return df, target_cols


if __name__ == "__main__":
    print("[INFO] Loading base feature dataset (Vegetable_Feature_v1.csv)...")
    v1_path = 'ml_pipeline/data/Vegetable_Feature_v1.csv'
    if not os.path.exists(v1_path):
        raise FileNotFoundError(
            f"Missing {v1_path}. Run Vegetable_feature_v1.py first.")

    df = pd.read_csv(v1_path)

    # Remove old targets if re-running
    old_targets = [
        'target_30d_pct_change', 'target_7d_pct_change',
        'target_lead_30', 'target_lead_7'
    ]
    df = df.drop(
        columns=[c for c in old_targets if c in df.columns], errors='ignore')

    print("[INFO] Generating 30 daily multi-horizon targets (lead prices + pct changes)...")
    df, t_cols = generate_multihorizon_targets(df)

    n_lead_cols = sum(1 for c in df.columns if c.startswith('target_lead_'))
    n_pct_cols = sum(1 for c in df.columns if c.endswith('d_pct_change'))

    print(
        f"[INFO] Generated {n_lead_cols} lead columns and {n_pct_cols} pct-change columns")
    print(f"[INFO] Final dataset shape: {df.shape}")

    out_path = 'ml_pipeline/data/Vegetable_Feature_v2_Multi.csv'
    print(f"[INFO] Saving to {out_path}")
    df.to_csv(out_path, index=False)
    print("[SUCCESS] Multi-horizon targets engineered and saved!")
