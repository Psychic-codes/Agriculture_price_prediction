import json
import os
import warnings
from datetime import datetime, timedelta

import joblib
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import shap

warnings.filterwarnings('ignore')


def get_forecasts_for_pipeline(feature_csv, model_pkl):
    print(f"[INFO] Loading latest features from {feature_csv}")
    try:
        df_base = pd.read_csv(feature_csv, parse_dates=['date'])
    except FileNotFoundError:
        print(f"[ERROR] Could not find {feature_csv}")
        return {}

    print(f"[INFO] Loading 30-day multi-output model from {model_pkl}")
    try:
        payload = joblib.load(model_pkl)
        stacker_model = payload['model']
        base_estimators = payload['base_estimators']
        expected_features = payload['features']
        # Bug 4 Fix: load empirically calibrated CI bounds (added by ML training script)
        # If absent (old model pkl), fall back to the previous z_scaled formula.
        # shape (30,) pct offsets
        ci_lower_q = payload.get('ci_lower_q', None)
        # shape (30,) pct offsets
        ci_upper_q = payload.get('ci_upper_q', None)
        if ci_lower_q is not None:
            print(f"[INFO] Using empirically calibrated CI bounds (day-1: "
                  f"[{ci_lower_q[0]*100:+.2f}%, {ci_upper_q[0]*100:+.2f}%])")
        else:
            print(
                "[INFO] No calibrated CI in model pkl — using legacy z_scaled formula")
    except FileNotFoundError:
        print(f"[ERROR] Model file missing: {model_pkl}")
        return {}

    df_base = df_base.sort_values(
        by=['commodity', 'date']).reset_index(drop=True)
    latest_rows = df_base.groupby('commodity').last().reset_index()

    latest_ohe = pd.get_dummies(latest_rows, columns=['commodity'])

    missing_cols = set(expected_features) - set(latest_ohe.columns)
    for col in missing_cols:
        latest_ohe[col] = 0

    X_latest = latest_ohe[expected_features].copy()
    X_latest = X_latest.apply(pd.to_numeric, errors='coerce').fillna(0).values

    # Step 1: Predict using the Meta-Stacker
    preds_stacker = stacker_model.predict(X_latest)

    # Step 2: Query base estimators for cross-model std dev (used for CI)
    base_preds = []
    base_keys = [k for k in base_estimators.keys() if k != 'Stacking Ensemble']
    for b_name in base_keys:
        b_model = base_estimators[b_name]
        try:
            b_pred = np.atleast_2d(b_model.predict(X_latest))
            if b_pred.shape[1] == 30:
                base_preds.append(b_pred)
        except Exception:
            continue

    if not base_preds:
        print(f"[ERROR] All base estimators failed for {model_pkl}")
        return {}

    base_preds_tensor = np.stack(base_preds)
    std_devs = np.std(base_preds_tensor, axis=0)

    # Initialize SHAP Matrix
    os.makedirs('plots', exist_ok=True)
    explainer = None
    shap_vals_matrix = None
    if 'XGBoost' in base_estimators:
        try:
            all_shap_vals = []
            for est in base_estimators['XGBoost'].estimators_:
                explainer = shap.TreeExplainer(est)
                all_shap_vals.append(explainer.shap_values(X_latest))
            # Average true SHAP across all 30 horizon models
            shap_vals_matrix = np.mean(all_shap_vals, axis=0)
            print("[INFO] Analyzed multi-horizon AI logic paths utilizing SHAP TreeExplainer.")
        except Exception as e:
            print(f"[WARNING] SHAP Failed: {e}")

    Z_SCORE = 1.96

    forecasts = {}
    for i, (_, row) in enumerate(latest_rows.iterrows()):
        commodity = row['commodity']
        base_price = row['modal_price']
        base_date = pd.to_datetime(row['date'])

        commodity_data = {
            "latest_data_date": base_date.strftime('%Y-%m-%d'),
            "current_price": float(base_price),
            "trajectory": [],
            "top_price_drivers": []
        }

        if shap_vals_matrix is not None:
            # Array slice retaining 2D form
            comm_shap = shap_vals_matrix[i:i+1]

            # Native Analytical SHAP Plot Generation
            plt.figure(figsize=(10, 6))

            ax = plt.gca()
            ax.spines['top'].set_visible(False)
            ax.spines['right'].set_visible(False)
            ax.spines['left'].set_color('#dddddd')
            ax.spines['bottom'].set_color('#dddddd')
            ax.tick_params(axis='both', colors='#666666')

            shap.summary_plot(comm_shap, pd.DataFrame(
                X_latest[i:i+1], columns=expected_features), plot_type="bar", max_display=10, show=False, color="#2E7D32")
            plt.title(f"Live AI Drivers ({commodity.title()})",
                      fontsize=15, pad=20, fontweight='bold', color='#1a1a1a')
            plt.xlabel("Average Impact on Price Trajectory Output",
                       fontsize=11, fontweight='bold', color='#454745', labelpad=10)
            plt.tight_layout()

            clean_name = commodity.replace(
                ' ', '_').replace('(', '').replace(')', '')
            plt.savefig(f"plots/{clean_name}_shap.png",
                        dpi=250, bbox_inches='tight', transparent=True)
            plt.close()

            # Compute textual drivers for JSON exports matching React UI schemas
            mean_shap = np.abs(comm_shap[0])
            top_idx = np.argsort(mean_shap)[-4:][::-1]

            drivers = []
            for idx in top_idx:
                val = comm_shap[0, idx]
                impact = "Higher" if val > 0 else "Lower"
                drivers.append({
                    "feature": expected_features[idx],
                    "impact": impact,
                    "strength": f"{round(abs(val)*100, 1)}%"
                })
            commodity_data['top_price_drivers'] = drivers

        for d in range(30):
            day_offset = d + 1
            forecast_date = base_date + timedelta(days=day_offset)

            target_pct = preds_stacker[i, d]
            target_std_pct = std_devs[i, d]

            pred_price_abs = base_price * (1 + target_pct)

            # Bug 4 Fix: use empirically calibrated residual quantiles when available.
            # Otherwise fall back to the original parametric formula.
            if ci_lower_q is not None and ci_upper_q is not None:
                # Quantile offsets are additive in pct-change space.
                lower_pct = target_pct + ci_lower_q[d]
                upper_pct = target_pct + ci_upper_q[d]
            else:
                z_scaled = Z_SCORE * (1 + 0.03 * d)   # legacy fallback
                lower_pct = target_pct - (z_scaled * target_std_pct)
                upper_pct = target_pct + (z_scaled * target_std_pct)

            commodity_data["trajectory"].append({
                "day_ahead": day_offset,
                "date": forecast_date.strftime('%Y-%m-%d'),
                "predicted_price": round(float(pred_price_abs), 2),
                "lower_bound_95": round(float(base_price * (1 + lower_pct)), 2),
                "upper_bound_95": round(float(base_price * (1 + upper_pct)), 2),
                "predicted_pct_change": round(float(target_pct * 100), 2)
            })

        forecasts[commodity] = commodity_data
        final_day = commodity_data['trajectory'][-1]
        print(f"  [{commodity}] Base: {base_date.date()} (Rs. {int(base_price)}) -> Day 30: Rs. {int(final_day['predicted_price'])} (\u00B1 Rs. {int(final_day['upper_bound_95'] - final_day['predicted_price'])})")

    return forecasts


def generate_all_predictions():
    cereal_forecasts = get_forecasts_for_pipeline(
        'ml_pipeline/data/Cereal_Feature_v2_Multi.csv', 'ml_pipeline/models/saved_models/global_stacking_30d.pkl')
    veg_forecasts = get_forecasts_for_pipeline(
        'ml_pipeline/data/Vegetable_Feature_v2_Multi.csv', 'ml_pipeline/models/saved_models/global_veg_stacking_30d.pkl')

    combined_forecasts = {**cereal_forecasts, **veg_forecasts}

    output_dict = {
        "generated_at": datetime.now().isoformat(),
        "horizon": "1-to-30-days",
        "forecasts": combined_forecasts
    }

    out_file = 'ml_pipeline/latest_forecasts.json'
    with open(out_file, 'w') as f:
        json.dump(output_dict, f, indent=4)
    print(
        f"[SUCCESS] Multi-Horizon Forecasts with Confidence Intervals saved to {out_file}")


if __name__ == "__main__":
    generate_all_predictions()
