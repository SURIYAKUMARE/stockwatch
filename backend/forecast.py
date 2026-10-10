import numpy as np
from datetime import datetime, timedelta, date
from typing import List, Dict, Tuple, Optional

def build_daily_series(transactions: List[dict], start_date: date, end_date: date) -> Tuple[List[date], np.ndarray]:
    """
    Build daily dispense consumption series, filling missing days with 0.
    """
    date_map = {}
    for tx in transactions:
        tx_type = tx.get("type", "")
        if tx_type == "dispense":
            ts = tx.get("ts")
            if isinstance(ts, str):
                d = datetime.fromisoformat(ts[:10]).date()
            elif isinstance(ts, (datetime, date)):
                d = ts.date() if isinstance(ts, datetime) else ts
            else:
                continue
            date_map[d] = date_map.get(d, 0) + tx.get("qty", 0)

    cur = start_date
    dates = []
    values = []
    while cur <= end_date:
        dates.append(cur)
        val = date_map.get(cur, 0.0)
        values.append(float(val))
        cur += timedelta(days=1)

    return dates, np.array(values, dtype=float)

def compute_ewma(series: np.ndarray, alpha: float = 0.3) -> np.ndarray:
    """
    Computes EWMA with given alpha parameter.
    """
    if len(series) == 0:
        return np.array([0.0])
    ewma = np.zeros_like(series, dtype=float)
    ewma[0] = series[0]
    for i in range(1, len(series)):
        ewma[i] = alpha * series[i] + (1.0 - alpha) * ewma[i - 1]
    return ewma

def compute_trend(series: np.ndarray) -> Tuple[float, float]:
    """
    trend = mean(last 3d) / mean(prior 7d).
    Returns (trend_ratio, pct_change).
    """
    if len(series) < 3:
        return 1.0, 0.0
    last_3d = float(np.mean(series[-3:]))
    if len(series) >= 10:
        prior_7d = float(np.mean(series[-10:-3]))
    else:
        prior_7d = float(np.mean(series[:-3])) if len(series) > 3 else last_3d

    prior_clean = max(prior_7d, 0.1)
    trend = last_3d / prior_clean
    pct_change = ((last_3d - prior_clean) / prior_clean) * 100.0
    return float(trend), float(pct_change)

def detect_cusum(series: np.ndarray, dates: List[date], threshold: float = 4.0, drift: float = 0.5) -> Tuple[bool, Optional[str]]:
    """
    CUSUM change-point detector for upward demand surge.
    """
    if len(series) < 14:
        return False, None
    baseline = series[:-7]
    mu = float(np.mean(baseline))
    sigma = max(float(np.std(baseline)), 0.5)

    s_pos = 0.0
    spike_detected = False
    spike_date_str = None

    for i in range(len(baseline), len(series)):
        val = series[i]
        s_pos = max(0.0, s_pos + (val - mu - drift * sigma) / sigma)
        if s_pos >= threshold and not spike_detected:
            spike_detected = True
            spike_date_str = dates[i].strftime("%b %d")

    return spike_detected, spike_date_str

def monte_carlo_forecast(
    current_stock: int,
    velocity: float,
    trend: float,
    recent_series: np.ndarray,
    action_window_days: int,
    ref_date: date,
    num_runs: int = 2000,
    seed: int = 42
) -> Dict:
    """
    Monte Carlo simulation bootstrapping recent residuals scaled by trend.
    Outputs P10, P50, P90 stockout dates and probability of stockout before action window.
    """
    rng = np.random.RandomState(seed)
    trend_clamped = float(np.clip(trend, 0.8, 1.6))
    
    # Calculate residuals against mean or EWMA
    if len(recent_series) >= 7:
        mean_recent = np.mean(recent_series[-14:])
        residuals = recent_series[-14:] - mean_recent
    else:
        residuals = np.array([0.0])

    if current_stock <= 0:
        p10_date = ref_date
        p50_date = ref_date
        p90_date = ref_date
        return {
            "p_stockout": 1.0,
            "p10_date": p10_date.isoformat(),
            "p50_date": p50_date.isoformat(),
            "p90_date": p90_date.isoformat(),
            "p10_days": 0.0,
            "p50_days": 0.0,
            "p90_days": 0.0,
            "days_of_cover": 0.0,
        }

    effective_velocity = max(velocity * trend_clamped, 0.1)
    days_of_cover = round(current_stock / effective_velocity, 1)

    max_sim_days = 90
    if len(residuals) == 0:
        residuals = np.array([0.0])

    # Fully vectorized Monte Carlo simulation with NumPy
    sampled_res = rng.choice(residuals, size=(num_runs, max_sim_days))
    daily_demand = np.maximum(0.1, effective_velocity + sampled_res * trend_clamped * 0.5)
    cum_demand = np.cumsum(daily_demand, axis=1)

    stocked_out_mask = (cum_demand >= current_stock)
    first_stockout_idx = np.argmax(stocked_out_mask, axis=1)
    ever_stocked_out = np.any(stocked_out_mask, axis=1)

    sim_stockout_days = np.where(ever_stocked_out, first_stockout_idx + 1, max_sim_days).astype(float)

    p_stockout = float(np.mean(sim_stockout_days <= action_window_days))
    p10_day = float(np.percentile(sim_stockout_days, 10))
    p50_day = float(np.percentile(sim_stockout_days, 50))
    p90_day = float(np.percentile(sim_stockout_days, 90))

    p10_date = ref_date + timedelta(days=max(0, int(p10_day)))
    p50_date = ref_date + timedelta(days=max(0, int(p50_day)))
    p90_date = ref_date + timedelta(days=max(0, int(p90_day)))

    return {
        "p_stockout": round(p_stockout, 3),
        "p10_date": p10_date.isoformat(),
        "p50_date": p50_date.isoformat(),
        "p90_date": p90_date.isoformat(),
        "p10_days": round(p10_day, 1),
        "p50_days": round(p50_day, 1),
        "p90_days": round(p90_day, 1),
        "days_of_cover": days_of_cover,
    }

def assign_tier(p_stockout: float, is_essential: bool = True, is_stale: bool = False) -> str:
    """
    Tier assignment by probability + essential escalation rule.
    """
    if is_stale:
        return "BLIND_SPOT"

    if p_stockout >= 0.70:
        base = "CRITICAL"
    elif p_stockout >= 0.40:
        base = "HIGH"
    elif p_stockout >= 0.15:
        base = "WATCH"
    else:
        base = "SAFE"

    # Essential medicines escalate one tier when P >= 0.40
    if is_essential and p_stockout >= 0.40:
        if base == "HIGH":
            base = "CRITICAL"

    return base

def compute_urgency(
    p_stockout: float,
    days_to_latest_action: float,
    trend: float,
    is_essential: bool,
    daily_patients: int
) -> int:
    """
    Urgency score 0-100 combining probability, days to action, trend, essential flag, and OPD load.
    """
    score = 0.0
    # Probability contributes up to 45 points
    score += p_stockout * 45.0

    # Days to latest safe action (fewer days -> higher urgency)
    if days_to_latest_action <= 0:
        score += 25.0
    elif days_to_latest_action <= 2:
        score += 20.0
    elif days_to_latest_action <= 5:
        score += 12.0
    elif days_to_latest_action <= 10:
        score += 5.0

    # Trend acceleration (up to 15 points)
    if trend >= 1.3:
        score += 15.0
    elif trend >= 1.15:
        score += 10.0
    elif trend >= 1.05:
        score += 5.0

    # Essential medicine (+10 points)
    if is_essential:
        score += 10.0

    # Patient load (up to 5 points)
    patient_factor = min(5.0, daily_patients / 25.0)
    score += patient_factor

    return int(np.clip(round(score), 0, 100))

def compute_recommended_order(
    velocity: float,
    current_stock: int,
    days_to_next_indent: int,
    lead_time_days: int,
    indent_cycle_days: int,
    safety_days: int,
    in_transit: int = 0
) -> int:
    """
    recommended_order_qty = projected demand until the indent after next + safety stock - (stock + in-transit).
    """
    total_days = days_to_next_indent + lead_time_days + indent_cycle_days
    projected_demand = velocity * total_days
    safety_stock = velocity * safety_days
    order = (projected_demand + safety_stock) - (current_stock + in_transit)
    return max(0, int(np.ceil(order)))

def compute_patient_impact(
    days_of_cover: float,
    action_window_days: int,
    daily_patients: int
) -> int:
    """
    Patient impact = expected shortfall days * daily patients needing that medicine.
    """
    shortfall_days = max(0.0, float(action_window_days) - days_of_cover)
    return int(round(shortfall_days * max(1, daily_patients)))

def generate_explanations(
    pct_change: float,
    spike_detected: bool,
    spike_date_str: Optional[str],
    days_of_cover: float,
    days_to_next_indent: int,
    lead_time_days: int,
    p_stockout: float
) -> Tuple[str, str]:
    """
    Generates plain-language explanation in English and Tamil.
    """
    p_pct = int(round(p_stockout * 100))
    spike_txt_en = f" (spike detected {spike_date_str})" if (spike_detected and spike_date_str) else ""
    spike_txt_ta = f" ({spike_date_str} அன்று திடீர் உயர்வு கண்டறியப்பட்டது)" if (spike_detected and spike_date_str) else ""
    
    change_direction_en = "up" if pct_change >= 0 else "down"
    change_direction_ta = "அதிகரித்துள்ளது" if pct_change >= 0 else "குறைந்துள்ளது"
    abs_pct = abs(round(pct_change))

    en = (
        f"Consumption {change_direction_en} {abs_pct}% in 3 days{spike_txt_en}. "
        f"Stock lasts ~{days_of_cover:.1f} days. "
        f"Next indent in {days_to_next_indent} days + {lead_time_days} days delivery. "
        f"{p_pct}% chance of stock-out before help arrives."
    )

    ta = (
        f"3 நாட்களில் பயன்பாடு {abs_pct}% {change_direction_ta}{spike_txt_ta}. "
        f"இருப்பு ~{days_of_cover:.1f} நாட்களுக்கு மட்டுமே நீடிக்கும். "
        f"அடுத்த இண்டென்ட் {days_to_next_indent} நாட்களில் + {lead_time_days} நாட்கள் விநியோகம். "
        f"மருந்து தீர்ந்துபோக {p_pct}% வாய்ப்பு உள்ளது."
    )

    return en, ta
