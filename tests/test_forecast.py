import pytest
import numpy as np
from datetime import date, timedelta
from backend.forecast import (
    build_daily_series,
    compute_ewma,
    compute_trend,
    detect_cusum,
    monte_carlo_forecast,
    assign_tier,
    compute_urgency,
    compute_recommended_order,
    compute_patient_impact,
    generate_explanations,
)

def test_build_daily_series_gaps_filled():
    start = date(2026, 10, 1)
    end = date(2026, 10, 5)
    txs = [
        {"type": "dispense", "ts": "2026-10-01T10:00:00", "qty": 10},
        {"type": "dispense", "ts": "2026-10-03T10:00:00", "qty": 15},
    ]
    dates, series = build_daily_series(txs, start, end)
    assert len(dates) == 5
    assert len(series) == 5
    assert series[0] == 10.0
    assert series[1] == 0.0  # Oct 2 gap filled with 0
    assert series[2] == 15.0
    assert series[3] == 0.0  # Oct 4 gap filled with 0
    assert series[4] == 0.0

def test_compute_ewma():
    series = np.array([10.0, 10.0, 20.0, 20.0])
    ewma = compute_ewma(series, alpha=0.3)
    assert len(ewma) == 4
    assert ewma[0] == 10.0
    assert ewma[1] == 10.0
    assert round(ewma[2], 2) == 13.0  # 0.3*20 + 0.7*10 = 13.0
    assert round(ewma[3], 2) == 15.1  # 0.3*20 + 0.7*13 = 15.1

def test_compute_trend():
    # Accelerating series
    series = np.array([10.0]*7 + [20.0, 20.0, 20.0])
    trend, pct = compute_trend(series)
    assert trend > 1.8
    assert pct > 80.0

def test_detect_cusum_demand_spike():
    # 20 days baseline around 5, then a jump to 25
    baseline = [5.0]*20
    surge = [25.0, 30.0, 28.0]
    series = np.array(baseline + surge)
    dates = [date(2026, 9, 1) + timedelta(days=i) for i in range(len(series))]
    detected, spike_date = detect_cusum(series, dates, threshold=4.0)
    assert detected is True
    assert spike_date is not None

def test_monte_carlo_reproducibility():
    ref = date(2026, 10, 10)
    series = np.array([15.0]*14)
    res1 = monte_carlo_forecast(
        current_stock=80,
        velocity=15.0,
        trend=1.3,
        recent_series=series,
        action_window_days=14,
        ref_date=ref,
        num_runs=2000,
        seed=42
    )
    res2 = monte_carlo_forecast(
        current_stock=80,
        velocity=15.0,
        trend=1.3,
        recent_series=series,
        action_window_days=14,
        ref_date=ref,
        num_runs=2000,
        seed=42
    )
    assert res1["p_stockout"] == res2["p_stockout"]
    assert res1["p10_date"] == res2["p10_date"]
    assert res1["p50_date"] == res2["p50_date"]
    assert res1["p90_date"] == res2["p90_date"]

def test_tier_assignment_and_essential_escalation():
    # Non-essential medicine
    assert assign_tier(0.80, is_essential=False) == "CRITICAL"
    assert assign_tier(0.50, is_essential=False) == "HIGH"
    assert assign_tier(0.20, is_essential=False) == "WATCH"
    assert assign_tier(0.05, is_essential=False) == "SAFE"

    # Essential medicine escalates HIGH (P >= 0.40) to CRITICAL
    assert assign_tier(0.50, is_essential=True) == "CRITICAL"
    assert assign_tier(0.20, is_essential=True) == "WATCH"

    # Stale centre is BLIND_SPOT regardless of probability
    assert assign_tier(0.95, is_essential=True, is_stale=True) == "BLIND_SPOT"

def test_urgency_calculation():
    # High risk, short action window
    u_high = compute_urgency(p_stockout=0.9, days_to_latest_action=-1, trend=1.4, is_essential=True, daily_patients=50)
    assert u_high >= 80

    # Low risk
    u_low = compute_urgency(p_stockout=0.05, days_to_latest_action=20, trend=0.9, is_essential=False, daily_patients=10)
    assert u_low <= 20

def test_recommended_order_quantity():
    # velocity 10/day, horizon 14 days, safety 30 days = 440 target. stock 80 -> need 360
    order = compute_recommended_order(
        velocity=10.0,
        current_stock=80,
        days_to_next_indent=9,
        lead_time_days=5,
        indent_cycle_days=30,
        safety_days=15,
        in_transit=0
    )
    assert order > 400

def test_explanation_generator_en_and_ta():
    en, ta = generate_explanations(
        pct_change=28.0,
        spike_detected=True,
        spike_date_str="Oct 8",
        days_of_cover=2.1,
        days_to_next_indent=9,
        lead_time_days=5,
        p_stockout=0.82
    )
    assert "Consumption up 28% in 3 days (spike detected Oct 8)" in en
    assert "82% chance of stock-out" in en
    assert "3 நாட்களில் பயன்பாடு 28% அதிகரித்துள்ளது" in ta
    assert "82% வாய்ப்பு" in ta
