import joblib
import pandas as pd
import numpy as np
import shap
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import os
from sklearn.preprocessing import LabelEncoder

warnings = __import__('warnings')
warnings.filterwarnings('ignore')

os.makedirs('ml_pipeline/plots/shap/', exist_ok=True)

plt.rcParams.update({
    'figure.facecolor': '#0d1117',
    'axes.facecolor':   '#161b22',
    'axes.edgecolor':   '#30363d',
    'axes.labelcolor':  '#c9d1d9',
    'xtick.color':      '#8b949e',
    'ytick.color':      '#8b949e',
    'text.color':       '#e6edf3',
    'grid.color':       '#21262d',
    'grid.linestyle':   '--',
    'grid.alpha':       0.5,
    'font.family':      'monospace',
})

POSITIVE = '#3fb950'
NEGATIVE = '#f85149'
ACCENT   = '#58a6ff'
BG_DARK  = '#0d1117'
BG_PANEL = '#161b22'


# ── Helpers ───────────────────────────────────────────────────────────────────

def encode_df(df_feat):
    for col in df_feat.select_dtypes(include='object').columns:
        le = LabelEncoder()
        df_feat[col] = le.fit_transform(df_feat[col].astype(str))
    return df_feat


def prepare_latest(csv_path, features):
    df     = pd.read_csv(csv_path, parse_dates=['date'])
    latest = df.groupby('commodity').last().reset_index()
    ohe    = pd.get_dummies(latest, columns=['commodity'])
    for col in ['month', 'state']:
        if col in ohe.columns:
            le = LabelEncoder()
            ohe[col] = le.fit_transform(ohe[col].astype(str))
    for c in features:
        if c not in ohe.columns:
            ohe[c] = 0
    df_feat = encode_df(ohe[features].copy())
    X = df_feat.fillna(df_feat.median(numeric_only=True)).values
    return latest, X


# ── Single plot per commodity ─────────────────────────────────────────────────

def plot_commodity(commodity, shap_row, features, base_val,
                   modal_price, last_date, label, out_dir, n_top=15):

    # rank features by |SHAP|
    abs_vals  = np.abs(shap_row)
    top_idx   = np.argsort(abs_vals)[::-1][:n_top]
    vals      = shap_row[top_idx]
    names     = [features[i] for i in top_idx]

    # sort bottom→top for horizontal bar
    order  = np.argsort(vals)
    vals   = vals[order]
    names  = [names[i] for i in order]
    colors = [POSITIVE if v > 0 else NEGATIVE for v in vals]

    # predicted output = base + sum of all shap
    predicted = base_val + float(shap_row.sum())

    fig, ax = plt.subplots(figsize=(13, 8), facecolor=BG_DARK)
    ax.set_facecolor(BG_PANEL)
    for spine in ax.spines.values():
        spine.set_edgecolor('#30363d')

    # ── bars ──
    bars = ax.barh(range(len(vals)), vals, color=colors,
                   height=0.62, zorder=3, edgecolor='#21262d', linewidth=0.5)

    # value labels
    x_range = max(abs(vals.min()), abs(vals.max()))
    offset  = x_range * 0.015
    for i, (bar, v) in enumerate(zip(bars, vals)):
        sign = '+' if v >= 0 else ''
        ax.text(
            v + (offset if v >= 0 else -offset),
            i,
            f'{sign}{v:.5f}',
            va='center',
            ha='left' if v >= 0 else 'right',
            fontsize=8.5, color='#e6edf3', fontweight='bold'
        )

    # ── zero line ──
    ax.axvline(0, color='#484f58', linewidth=1.5, zorder=2)

    # ── y-axis labels ──
    ax.set_yticks(range(len(names)))
    ax.set_yticklabels(names, fontsize=9.5)

    # ── contribution bar at the bottom (shows base → final) ──
    pos_sum = float(np.sum(vals[vals > 0]))
    neg_sum = float(np.sum(vals[vals < 0]))
    ax.set_xlabel('SHAP Value  —  contribution to 30-day price change prediction',
                  fontsize=10, labelpad=10)
    ax.grid(axis='x', zorder=1)

    # ── header box ──
    direction   = '▲' if predicted > base_val else '▼'
    dir_color   = POSITIVE if predicted > base_val else NEGATIVE
    change_pct  = (predicted - base_val) / (abs(base_val) + 1e-9) * 100

    fig.text(0.5, 0.97,
             f'SHAP Feature Attribution  ·  {commodity.upper()}  ·  {label}',
             ha='center', fontsize=15, fontweight='bold', color='#e6edf3')
    fig.text(0.5, 0.935,
             f'As of {str(last_date)[:10]}   |   Modal Price: ₹{modal_price:,.0f}   |   '
             f'Base value: {base_val:.4f}   |   '
             f'Predicted shift: {direction} {change_pct:+.3f}%',
             ha='center', fontsize=10, color='#8b949e')

    # ── summary legend ──
    pos_patch = mpatches.Patch(color=POSITIVE,
                               label=f'Pushes price UP   (+{pos_sum:.4f})')
    neg_patch = mpatches.Patch(color=NEGATIVE,
                               label=f'Pushes price DOWN ({neg_sum:.4f})')
    ax.legend(handles=[pos_patch, neg_patch],
              loc='lower right', fontsize=9,
              framealpha=0.15, edgecolor='#30363d')

    # ── rank badge on each bar ──
    for i, (v, name) in enumerate(zip(vals, names)):
        rank = n_top - order[i]   # 1 = most impactful
        ax.text(
            ax.get_xlim()[0],
            i,
            f' #{rank}',
            va='center', ha='left',
            fontsize=7, color='#484f58'
        )

    plt.tight_layout(rect=[0, 0, 1, 0.92])
    clean = commodity.replace(' ', '_').replace('(', '').replace(')', '')
    path  = f"{out_dir}/{clean}_shap.png"
    plt.savefig(path, dpi=220, bbox_inches='tight', facecolor=BG_DARK)
    plt.close()
    print(f"  ✔  {commodity.title():30s} → {path}")


# ── Master function ───────────────────────────────────────────────────────────

def generate_shap_plots(csv_path, model_path, label):
    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"{'='*60}")

    out_dir  = 'ml_pipeline/plots/shap/'
    payload  = joblib.load(model_path)
    features = payload['features']
    base     = payload['base_estimators']

    latest, X_latest = prepare_latest(csv_path, features)
    commodities      = latest['commodity'].tolist()

    explainer   = shap.TreeExplainer(base['XGBoost'].estimators_[0])
    shap_latest = explainer.shap_values(X_latest)
    ev          = explainer.expected_value
    base_val    = float(np.mean(ev)) if hasattr(ev, '__len__') else float(ev)

    df_raw = pd.read_csv(csv_path, parse_dates=['date'])

    for i, commodity in enumerate(commodities):
        row      = latest[latest['commodity'] == commodity].iloc[0]
        last_date    = row.get('date', 'N/A')
        modal_price  = float(row.get('modal_price', 0))
        print(f"\n  [{i+1}/{len(commodities)}] {commodity.title()}")
        plot_commodity(
            commodity    = commodity,
            shap_row     = shap_latest[i],
            features     = features,
            base_val     = base_val,
            modal_price  = modal_price,
            last_date    = last_date,
            label        = label,
            out_dir      = out_dir,
        )

    print(f"\n✅  {label} — {len(commodities)} plot(s) saved to {out_dir}/\n")


# ── Entry point ───────────────────────────────────────────────────────────────

generate_shap_plots(
    csv_path   = 'ml_pipeline/data/Cereal_Feature_v2_Multi.csv',
    model_path = 'ml_pipeline/models/saved_models/global_stacking_30d.pkl',
    label      = 'Cereals',
)

generate_shap_plots(
    csv_path   = 'ml_pipeline/data/Vegetable_Feature_v2_Multi.csv',
    model_path = 'ml_pipeline/models/saved_models/global_veg_stacking_30d.pkl',
    label      = 'Vegetables',
)