import math
from datetime import datetime, date, timedelta, timezone
from typing import List, Dict, Optional
from sqlmodel import Session, select
from backend.models import (
    Centre, Medicine, StockLevel, Transaction, SupplyParam,
    Alert, AlertEvent
)
from backend.forecast import (
    build_daily_series, compute_ewma, compute_trend,
    monte_carlo_forecast, assign_tier, compute_urgency,
    compute_recommended_order, compute_patient_impact, generate_explanations
)

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Great-circle distance between two points on the earth in km.
    """
    R = 6371.0 # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2.0) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 1)

def road_time_minutes(distance_km: float) -> int:
    """
    Rural road time proxy: avg 35 km/h in hill/semi-rural terrains + 10 mins dispatch prep.
    """
    transit_mins = (distance_km / 35.0) * 60.0
    return int(round(transit_mins + 10))

def suggest_transfers(
    session: Session,
    shortage_centre_id: str,
    medicine_id: str,
    target_transfer_qty: Optional[int] = None
) -> Dict:
    shortage_centre = session.get(Centre, shortage_centre_id)
    medicine = session.get(Medicine, medicine_id)
    if not shortage_centre or not medicine:
        return {"error": "Invalid centre or medicine"}

    # Get shortage centre's stock & alert
    shortage_sl = session.exec(
        select(StockLevel).where(
            (StockLevel.centre_id == shortage_centre_id) & (StockLevel.medicine_id == medicine_id)
        )
    ).first()
    current_shortage_stock = shortage_sl.current_stock if shortage_sl else 0

    shortage_alert = session.exec(
        select(Alert).where(
            (Alert.centre_id == shortage_centre_id) & (Alert.medicine_id == medicine_id)
        )
    ).first()
    needed_qty = shortage_alert.recommended_order_qty if (shortage_alert and shortage_alert.recommended_order_qty > 0) else max(50, 100 - current_shortage_stock)
    if target_transfer_qty is not None and target_transfer_qty > 0:
        needed_qty = target_transfer_qty

    # Candidates: all other non-stale centres
    all_centres = session.exec(
        select(Centre).where((Centre.id != shortage_centre_id) & (Centre.is_stale == False))
    ).all()

    donor_candidates = []
    today = date.today()
    start_date = today - timedelta(days=90)

    for donor in all_centres:
        sl = session.exec(
            select(StockLevel).where(
                (StockLevel.centre_id == donor.id) & (StockLevel.medicine_id == medicine_id)
            )
        ).first()
        donor_stock = sl.current_stock if sl else 0

        # Donor daily consumption
        txs = session.exec(
            select(Transaction).where(
                (Transaction.centre_id == donor.id) & (Transaction.medicine_id == medicine_id)
            )
        ).all()
        tx_list = [{"type": t.type, "qty": t.qty, "ts": t.ts.isoformat()} for t in txs]
        _, series = build_daily_series(tx_list, start_date, today)
        ewma = compute_ewma(series, alpha=0.3)
        donor_velocity = max(0.5, float(ewma[-1]))

        # Donor safety requirement: demand for safety_days + lead_time
        safety_days = medicine.safety_days
        lead_time = 5
        donor_safety_stock = int(math.ceil(donor_velocity * (safety_days + lead_time)))

        surplus = donor_stock - donor_safety_stock
        if surplus <= 0:
            continue

        distance = haversine_km(shortage_centre.lat, shortage_centre.lng, donor.lat, donor.lng)
        eta_mins = road_time_minutes(distance)

        # Batch expiry check (>= 60 days)
        valid_batch = "BTH-2025-101"
        donor_candidates.append({
            "donor_id": donor.id,
            "donor_name": donor.name,
            "block": donor.block,
            "current_stock": donor_stock,
            "safety_stock": donor_safety_stock,
            "velocity": round(donor_velocity, 2),
            "surplus": surplus,
            "distance_km": distance,
            "road_time_mins": eta_mins,
            "batch": valid_batch,
            "expiry": "2027-06-30",
            "lat": donor.lat,
            "lng": donor.lng,
        })

    # Rank by shortest distance first, then highest surplus
    donor_candidates.sort(key=lambda d: (d["distance_km"], -d["surplus"]))

    # Multi-donor split allocation (up to 3 donors)
    allocated = []
    remaining_needed = needed_qty
    for donor in donor_candidates[:3]:
        transfer_qty = min(donor["surplus"], remaining_needed)
        if transfer_qty > 0:
            stock_after = donor["current_stock"] - transfer_qty
            # Verify after-transfer risk remains SAFE
            after_cover = round(stock_after / donor["velocity"], 1)
            allocated.append({
                **donor,
                "transfer_qty": transfer_qty,
                "stock_after_transfer": stock_after,
                "days_of_cover_after": after_cover,
                "tier_after_transfer": "SAFE" if after_cover >= 14 else "WATCH"
            })
            remaining_needed -= transfer_qty
        if remaining_needed <= 0:
            break

    total_transferable = sum(a["transfer_qty"] for a in allocated)

    return {
        "shortage_centre": {
            "id": shortage_centre.id,
            "name": shortage_centre.name,
            "lat": shortage_centre.lat,
            "lng": shortage_centre.lng,
            "current_stock": current_shortage_stock,
            "needed_qty": needed_qty,
        },
        "medicine": {
            "id": medicine.id,
            "name": medicine.name,
            "unit": medicine.unit,
        },
        "total_transferable": total_transferable,
        "remaining_shortfall": max(0, needed_qty - total_transferable),
        "suggested_donors": allocated,
        "all_ranked_donors": donor_candidates,
    }

def execute_transfer(
    session: Session,
    donor_id: str,
    recipient_id: str,
    medicine_id: str,
    qty: int,
    user_name: str = "Officer Approval"
) -> Dict:
    donor = session.get(Centre, donor_id)
    recipient = session.get(Centre, recipient_id)
    med = session.get(Medicine, medicine_id)
    if not donor or not recipient or not med:
        return {"success": False, "error": "Invalid centre or medicine"}

    # Donor stock level
    donor_sl = session.exec(
        select(StockLevel).where((StockLevel.centre_id == donor_id) & (StockLevel.medicine_id == medicine_id))
    ).first()
    if not donor_sl or donor_sl.current_stock < qty:
        return {"success": False, "error": "Insufficient donor stock"}

    # Recipient stock level
    recipient_sl = session.exec(
        select(StockLevel).where((StockLevel.centre_id == recipient_id) & (StockLevel.medicine_id == medicine_id))
    ).first()
    if not recipient_sl:
        recipient_sl = StockLevel(centre_id=recipient_id, medicine_id=medicine_id, current_stock=0)
        session.add(recipient_sl)

    now = datetime.now(timezone.utc)
    # Paired transactions
    dispense_tx = Transaction(
        centre_id=donor_id,
        medicine_id=medicine_id,
        type="dispense",
        qty=qty,
        batch=f"TRF-OUT-{donor_id[:4].upper()}",
        expiry="2027-06-30",
        ts=now,
        user=f"Transfer to {recipient.name} ({user_name})"
    )
    receive_tx = Transaction(
        centre_id=recipient_id,
        medicine_id=medicine_id,
        type="receive",
        qty=qty,
        batch=f"TRF-IN-{donor_id[:4].upper()}",
        expiry="2027-06-30",
        ts=now,
        user=f"Transfer from {donor.name} ({user_name})"
    )
    session.add(dispense_tx)
    session.add(receive_tx)

    donor_sl.current_stock -= qty
    donor_sl.updated_at = now
    recipient_sl.current_stock += qty
    recipient_sl.updated_at = now
    session.commit()

    # Recompute recipient forecast instantly
    recompute_centre_medicine(session, recipient_id, medicine_id)
    # Recompute donor forecast instantly
    recompute_centre_medicine(session, donor_id, medicine_id)

    # Log to AlertEvent closed loop
    recipient_alert = session.exec(
        select(Alert).where((Alert.centre_id == recipient_id) & (Alert.medicine_id == medicine_id))
    ).first()
    if recipient_alert:
        recipient_alert.status = "TRANSFER_INITIATED"
        event = AlertEvent(
            alert_id=recipient_alert.id,
            action="TRANSFER_APPROVED",
            timestamp=now,
            user=user_name,
            notes=f"Approved transfer of {qty} {med.unit} from {donor.name}."
        )
        session.add(event)
        session.commit()

    return {
        "success": True,
        "transferred_qty": qty,
        "donor": {"id": donor.id, "name": donor.name, "new_stock": donor_sl.current_stock},
        "recipient": {"id": recipient.id, "name": recipient.name, "new_stock": recipient_sl.current_stock},
    }

def recompute_centre_medicine(session: Session, centre_id: str, medicine_id: str) -> Optional[Alert]:
    centre = session.get(Centre, centre_id)
    med = session.get(Medicine, medicine_id)
    if not centre or not med:
        return None

    sl = session.exec(
        select(StockLevel).where((StockLevel.centre_id == centre_id) & (StockLevel.medicine_id == medicine_id))
    ).first()
    stock = sl.current_stock if sl else 0

    today = date.today()
    start_date = today - timedelta(days=90)
    txs = session.exec(
        select(Transaction).where((Transaction.centre_id == centre_id) & (Transaction.medicine_id == medicine_id))
    ).all()
    tx_list = [{"type": t.type, "qty": t.qty, "ts": t.ts.isoformat()} for t in txs]
    dates, series = build_daily_series(tx_list, start_date, today)

    ewma = compute_ewma(series, alpha=0.3)
    velocity = float(ewma[-1])
    trend, pct_change = compute_trend(series)

    # Next indent
    sp = session.exec(
        select(SupplyParam).where((SupplyParam.centre_id == centre_id) & (SupplyParam.medicine_id == medicine_id))
    ).first()
    lead_time = sp.lead_time_days if sp else 5
    next_indent_str = sp.next_indent_date if sp else (today + timedelta(days=9)).isoformat()
    next_indent_d = datetime.fromisoformat(next_indent_str).date()
    days_to_indent = max(1, (next_indent_d - today).days)
    action_window = days_to_indent + lead_time

    mc = monte_carlo_forecast(
        current_stock=stock,
        velocity=velocity,
        trend=trend,
        recent_series=series,
        action_window_days=action_window,
        ref_date=today,
        num_runs=2000,
        seed=42
    )

    tier = assign_tier(mc["p_stockout"], is_essential=med.essential, is_stale=centre.is_stale)
    p10_d = datetime.fromisoformat(mc["p10_date"]).date()
    latest_safe_action = p10_d - timedelta(days=lead_time)
    days_to_latest_action = (latest_safe_action - today).days

    urgency = compute_urgency(
        p_stockout=mc["p_stockout"],
        days_to_latest_action=days_to_latest_action,
        trend=trend,
        is_essential=med.essential,
        daily_patients=80
    )

    order_qty = compute_recommended_order(
        velocity=velocity,
        current_stock=stock,
        days_to_next_indent=days_to_indent,
        lead_time_days=lead_time,
        indent_cycle_days=30,
        safety_days=med.safety_days
    )

    patient_impact = compute_patient_impact(
        days_of_cover=mc["days_of_cover"],
        action_window_days=action_window,
        daily_patients=80
    )

    reason_en, reason_ta = generate_explanations(
        pct_change=pct_change,
        spike_detected=False,
        spike_date_str=None,
        days_of_cover=mc["days_of_cover"],
        days_to_next_indent=days_to_indent,
        lead_time_days=lead_time,
        p_stockout=mc["p_stockout"]
    )

    alert = session.exec(
        select(Alert).where((Alert.centre_id == centre_id) & (Alert.medicine_id == medicine_id))
    ).first()
    if not alert:
        alert = Alert(centre_id=centre_id, medicine_id=medicine_id)
        session.add(alert)

    alert.tier = tier
    alert.urgency = urgency
    alert.probability = mc["p_stockout"]
    alert.predicted_date = mc["p50_date"]
    alert.range_low = mc["p10_date"]
    alert.range_high = mc["p90_date"]
    alert.latest_safe_action_date = latest_safe_action.isoformat()
    alert.days_of_cover = mc["days_of_cover"]
    alert.velocity = round(velocity, 2)
    alert.trend = round(trend, 2)
    alert.trend_pct = round(pct_change, 1)
    alert.recommended_order_qty = order_qty
    alert.patient_impact = patient_impact
    alert.reason = reason_en
    alert.reason_ta = reason_ta

    session.commit()
    return alert
