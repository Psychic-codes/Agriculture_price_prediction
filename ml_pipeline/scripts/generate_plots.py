import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import matplotlib.dates as mdates
import matplotlib.patches as mpatches
from matplotlib.gridspec import GridSpec, GridSpecFromSubplotSpec
import joblib
import os
import warnings
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

warnings.filterwarnings('ignore')

# ── Light theme ───────────────────────────────────────────────────────────────
plt.rcParams.update({
    'figure.facecolor':  '#F6F8FA',
    'axes.facecolor':    '#FFFFFF',
    'axes.edgecolor':    '#D0D7DE',
    'axes.labelcolor':   '#24292F',
    'xtick.color':       '#57606A',
    'ytick.color':       '#57606A',
    'text.color':        '#24292F',
    'grid.color':        '#EFF1F3',
    'grid.linestyle':    '-',
    'grid.alpha':        1.0,
    'font.family':       'sans-serif',
    'axes.spines.top':   False,
    'axes.spines.right': False,
    'xtick.labelsize':   9,
    'ytick.labelsize':   9,
})

C_ACTUAL = '#24292F'
C_TRAIN  = '#0969DA'
C_VAL    = '#E36209'
C_TEST   = '#1A7F37'
C_BG     = '#F6F8FA'


# ── Helpers ───────────────────────────────────────────────────────────────────

def safe_metric(y_true, y_pred):
    mask = ~(np.isnan(y_true) | np.isnan(y_pred))
    if mask.sum() < 2:
        return dict(mae=np.nan, rmse=np.nan, r2=np.nan, mape=np.nan)
    yt, yp = y_true[mask], y_pred[mask]
    return dict(
        mae  = mean_absolute_error(yt, yp),
        rmse = np.sqrt(mean_squared_error(yt, yp)),
        r2   = r2_score(yt, yp),
        mape = np.mean(np.abs((yt - yp) / (np.abs(yt) + 1e-9))) * 100,
    )


def r2_color(r2):
    if r2 >= 0.85: return '#1A7F37'
    if r2 >= 0.65: return '#E36209'
    return '#CF222E'


def fmt_inr(ax, axis='y'):
    fmt = mticker.FuncFormatter(lambda x, _: f'₹{x:,.0f}')
    if axis == 'y': ax.yaxis.set_major_formatter(fmt)
    else:           ax.xaxis.set_major_formatter(fmt)


# ── Single commodity plot ────────────────────────────────────────────────────

def plot_commodity(commodity, df_comm, train_end, val_end, out_dir):

    df_train = df_comm[df_comm['date'] <= train_end]
    df_val   = df_comm[(df_comm['date'] > train_end) & (df_comm['date'] <= val_end)]
    df_test  = df_comm[df_comm['date'] > val_end]

    m_tr = safe_metric(df_train['actual_price_30d'].values, df_train['predicted_price_30d'].values)
    m_vl = safe_metric(df_val['actual_price_30d'].values,   df_val['predicted_price_30d'].values)
    m_ts = safe_metric(df_test['actual_price_30d'].values,  df_test['predicted_price_30d'].values)

    # ── figure: tall + wide, two rows clearly separated ──
    fig = plt.figure(figsize=(22, 16), facecolor=C_BG)

    # outer grid: row 0 = time-series (70%), row 1 = scatter row (30%)
    outer = GridSpec(
        2, 1,
        figure=fig,
        height_ratios=[2.6, 1],
        hspace=0.52,          # <-- generous vertical gap
        left=0.06, right=0.97,
        top=0.89,  bottom=0.07,
    )

    ax_main = fig.add_subplot(outer[0])

    # inner grid for the 3 scatter panels
    inner = GridSpecFromSubplotSpec(
        1, 3,
        subplot_spec=outer[1],
        wspace=0.42,           # <-- generous horizontal gap between scatters
    )
    ax_tr = fig.add_subplot(inner[0, 0])
    ax_vl = fig.add_subplot(inner[0, 1])
    ax_ts = fig.add_subplot(inner[0, 2])

    for ax in [ax_main, ax_tr, ax_vl, ax_ts]:
        ax.set_facecolor('#FFFFFF')
        ax.grid(True, color='#EFF1F3', linewidth=0.8, zorder=0)
        for s in ['top', 'right']:
            ax.spines[s].set_visible(False)
        for s in ['left', 'bottom']:
            ax.spines[s].set_color('#D0D7DE')

    # ── shaded zones ──
    d_min = df_comm['date'].min()
    d_max = df_comm['date'].max()
    ax_main.axvspan(d_min,      train_end, color='#DDF4FF', alpha=0.35, zorder=0)
    ax_main.axvspan(train_end,  val_end,   color='#FFF8C5', alpha=0.45, zorder=0)
    ax_main.axvspan(val_end,    d_max,     color='#DAFBE1', alpha=0.40, zorder=0)

    ax_main.axvline(train_end, color=C_TRAIN, lw=1.2, ls='--', alpha=0.55, zorder=2)
    ax_main.axvline(val_end,   color=C_VAL,   lw=1.2, ls='--', alpha=0.55, zorder=2)

    # zone labels (top of chart)
    ymax = df_comm[['actual_price_30d','predicted_price_30d']].max().max()
    ymin = df_comm[['actual_price_30d','predicted_price_30d']].min().min()
    ypad = (ymax - ymin) * 0.03

    for xpos, lbl, col in [
        (d_min + (train_end - d_min) * 0.5,    'TRAIN',      C_TRAIN),
        (train_end + (val_end - train_end)*0.5, 'VALIDATION', C_VAL),
        (val_end + (d_max - val_end)*0.5,       'TEST',       C_TEST),
    ]:
        ax_main.text(xpos, ymax - ypad, lbl,
                     ha='center', va='top', fontsize=9,
                     fontweight='bold', color=col, alpha=0.75)

    # ── lines ──
    ax_main.plot(df_comm['date'],  df_comm['actual_price_30d'],
                 color=C_ACTUAL, lw=2.0, alpha=0.70,
                 label='Actual Price (30-day forward)', zorder=4)
    ax_main.plot(df_train['date'], df_train['predicted_price_30d'],
                 color=C_TRAIN, lw=1.7, alpha=0.85,
                 label='Train Prediction', zorder=3)
    ax_main.plot(df_val['date'],   df_val['predicted_price_30d'],
                 color=C_VAL, lw=1.7, alpha=0.85,
                 label='Validation Prediction', zorder=3)
    ax_main.plot(df_test['date'],  df_test['predicted_price_30d'],
                 color=C_TEST, lw=2.0, alpha=0.95,
                 label='Test Prediction', zorder=5)

    ax_main.set_ylabel('Price  (₹)', fontsize=11, labelpad=10)
    fmt_inr(ax_main)
    ax_main.xaxis.set_major_formatter(mdates.DateFormatter('%b %Y'))
    ax_main.xaxis.set_major_locator(mdates.MonthLocator(interval=5))
    plt.setp(ax_main.xaxis.get_majorticklabels(),
             rotation=35, ha='right', fontsize=8.5)
    ax_main.tick_params(axis='both', labelsize=9, pad=4)
    ax_main.set_xlim(d_min, d_max)
    ax_main.legend(loc='upper left', fontsize=10,
                   framealpha=0.9, edgecolor='#D0D7DE',
                   fancybox=False, borderpad=0.8)

    # ── scatter panels ──
    def draw_scatter(ax, df_sub, metrics, color, title):
        ax.set_title(title, fontsize=10.5, fontweight='bold',
                     color=color, pad=10)
        if df_sub.empty or df_sub['actual_price_30d'].dropna().empty:
            ax.text(0.5, 0.5, 'No data', ha='center', va='center',
                    transform=ax.transAxes, color='#57606A', fontsize=10)
            return
        yt = df_sub['actual_price_30d'].dropna()
        yp = df_sub['predicted_price_30d'].dropna()
        idx = yt.index.intersection(yp.index)
        yt, yp = yt[idx].values, yp[idx].values
        ax.scatter(yt, yp, s=14, color=color, alpha=0.45,
                   zorder=3, linewidths=0)
        lo = min(yt.min(), yp.min())
        hi = max(yt.max(), yp.max())
        ax.plot([lo, hi], [lo, hi], color='#868E96',
                lw=1.2, ls='--', alpha=0.7, zorder=4)
        fmt_inr(ax, 'x')
        fmt_inr(ax, 'y')
        plt.setp(ax.xaxis.get_majorticklabels(),
                 rotation=30, ha='right', fontsize=8)
        ax.tick_params(axis='y', labelsize=8)
        ax.set_xlabel('Actual Price', fontsize=9, labelpad=6)
        ax.set_ylabel('Predicted Price', fontsize=9, labelpad=6)

        # metrics box inside the panel
        rc = r2_color(metrics['r2'])
        stats = (f"R² = {metrics['r2']:.3f}\n"
                 f"MAE = ₹{metrics['mae']:,.0f}\n"
                 f"MAPE = {metrics['mape']:.1f}%")
        ax.text(0.97, 0.05, stats,
                transform=ax.transAxes,
                ha='right', va='bottom',
                fontsize=8.5, color=rc,
                bbox=dict(boxstyle='round,pad=0.4',
                          facecolor='white',
                          edgecolor=rc,
                          alpha=0.85))

    draw_scatter(ax_tr, df_train, m_tr, C_TRAIN, 'Train — Actual vs Predicted')
    draw_scatter(ax_vl, df_val,   m_vl, C_VAL,   'Val   — Actual vs Predicted')
    draw_scatter(ax_ts, df_test,  m_ts, C_TEST,  'Test  — Actual vs Predicted')

    # ── title & subtitle ──
    last_actual = df_comm['actual_price_30d'].dropna().iloc[-1] \
                  if not df_comm['actual_price_30d'].dropna().empty else np.nan
    last_pred   = df_comm['predicted_price_30d'].dropna().iloc[-1] \
                  if not df_comm['predicted_price_30d'].dropna().empty else np.nan
    last_date   = str(df_comm['date'].iloc[-1])[:10]

    fig.text(0.5, 0.945,
             f'{commodity.upper()}  —  30-Day Forward Price Prediction',
             ha='center', fontsize=17, fontweight='bold', color='#24292F')
    fig.text(0.5, 0.913,
             f'Latest date: {last_date}   |   '
             f'Last actual: ₹{last_actual:,.0f}   |   '
             f'Last predicted: ₹{last_pred:,.0f}   |   '
             f'Test  R²: {m_ts["r2"]:.3f}   MAPE: {m_ts["mape"]:.1f}%',
             ha='center', fontsize=10.5, color='#57606A')

    # ── save ──
    clean = commodity.replace(' ', '_').replace('(', '').replace(')', '')
    path  = f"{out_dir}/{clean}_30d_forecast.png"
    plt.savefig(path, dpi=180, bbox_inches='tight', facecolor=C_BG)
    plt.close()
    print(f"  ✔  Saved → {path}")


# ── Pipeline ──────────────────────────────────────────────────────────────────

def plot_commodity_group(csv_path, model_path, train_end, val_end):
    print(f"\nLoading  {csv_path} ...")
    try:
        df_base = pd.read_csv(csv_path, parse_dates=['date'])
        payload = joblib.load(model_path)
    except FileNotFoundError:
        print("  ✘  Missing files — skipping.")
        return

    stacker_model     = payload['model']
    expected_features = payload['features']

    df_base   = df_base.sort_values(by=['commodity', 'date']).reset_index(drop=True)
    df_global = pd.get_dummies(df_base, columns=['commodity'])

    for col in ['month', 'state']:
        if col in df_global.columns:
            le = LabelEncoder()
            df_global[col] = le.fit_transform(df_global[col].astype(str))
    for col in expected_features:
        if col not in df_global.columns:
            df_global[col] = 0

    out_dir = 'ml_pipeline/plots/performance'
    os.makedirs(out_dir, exist_ok=True)

    for commodity in df_base['commodity'].unique():
        print(f"\n  [{commodity.title()}]")
        df_comm = df_global[df_base['commodity'] == commodity].copy()
        df_comm['commodity'] = commodity
        df_comm = df_comm.sort_values('date')

        df_features = df_comm[expected_features].copy()
        for col in df_features.select_dtypes(include='object').columns:
            le = LabelEncoder()
            df_features[col] = le.fit_transform(df_features[col].astype(str))

        X            = df_features.fillna(df_features.median(numeric_only=True)).values
        preds        = stacker_model.predict(X)
        pred_pct_30d = preds[:, 29]

        df_comm['predicted_price_30d'] = df_comm['modal_price'] * (1 + pred_pct_30d)
        if 'target_30d_pct' in df_comm.columns:
            df_comm['actual_price_30d'] = df_comm['modal_price'] * (1 + df_comm['target_30d_pct'])
        else:
            df_comm['actual_price_30d'] = df_comm['modal_price'].shift(-30)

        plot_commodity(commodity, df_comm, train_end, val_end, out_dir)


def generate_plots():
    print("─── Cereals ───")
    plot_commodity_group(
        'ml_pipeline/data/Cereal_Feature_v2_Multi.csv',
        'ml_pipeline/models/saved_models/global_stacking_30d.pkl',
        pd.to_datetime('2022-06-01'),
        pd.to_datetime('2024-01-11'),
    )
    print("\n─── Vegetables ───")
    plot_commodity_group(
        'ml_pipeline/data/Vegetable_Feature_v2_Multi.csv',
        'ml_pipeline/models/saved_models/global_veg_stacking_30d.pkl',
        pd.to_datetime('2022-05-17'),
        pd.to_datetime('2023-12-25'),
    )


if __name__ == "__main__":
    generate_plots()