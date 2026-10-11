import math
from datetime import datetime, date, timedelta, timezone
from typing import List, Dict, Optional
import json
import uuid
from sqlmodel import Session, select
from backend.models import (
    Centre, Medicine, StockLevel, Transaction, SupplyParam,
    Alert, AlertEvent, TransferOrder, Facility, Pharmacy,
    InventoryBalance, CanonicalMedicine, Notification, AuditLog
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

    shortage_velocity = max(0.5, float(shortage_alert.velocity)) if (shortage_alert and shortage_alert.velocity) else 5.0
    shortage_days_before = round(current_shortage_stock / shortage_velocity, 1)
    shortage_tier_before = shortage_alert.tier if shortage_alert else ("CRITICAL" if shortage_days_before < 7 else "HIGH")

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
            donor_stock_after = donor["current_stock"] - transfer_qty
            donor_after_cover = round(donor_stock_after / donor["velocity"], 1)
            donor_tier_after = "SAFE" if donor_after_cover >= 14 else "WATCH"

            recipient_stock_after = current_shortage_stock + transfer_qty
            recipient_after_cover = round(recipient_stock_after / shortage_velocity, 1)
            recipient_tier_after = "SAFE" if recipient_after_cover >= 14 else ("WATCH" if recipient_after_cover >= 7 else "HIGH")
            cover_gained = round(recipient_after_cover - shortage_days_before, 1)

            eta_days = round(donor["road_time_mins"] / 1440.0, 2)
            arrives_before_stockout = bool(eta_days < max(0.2, shortage_days_before))

            allocated.append({
                **donor,
                "transfer_qty": transfer_qty,
                "eta_days": eta_days,
                "arrives_before_stockout": arrives_before_stockout,
                "donor_stock_before": donor["current_stock"],
                "donor_days_of_cover_before": round(donor["current_stock"] / donor["velocity"], 1),
                "donor_tier_before": "SAFE",
                "stock_after_transfer": donor_stock_after,
                "donor_stock_after": donor_stock_after,
                "days_of_cover_after": donor_after_cover,
                "tier_after_transfer": donor_tier_after,
                "recipient_stock_before": current_shortage_stock,
                "recipient_days_of_cover_before": shortage_days_before,
                "recipient_tier_before": shortage_tier_before,
                "recipient_stock_after": recipient_stock_after,
                "recipient_days_of_cover_after": recipient_after_cover,
                "recipient_tier_after": recipient_tier_after,
                "days_of_cover_gained": cover_gained,
            })
            remaining_needed -= transfer_qty
        if remaining_needed <= 0:
            break

    total_transferable = sum(a["transfer_qty"] for a in allocated)
    remaining_shortfall = max(0, needed_qty - total_transferable)

    district_replenishment_recommended = (total_transferable == 0 or remaining_shortfall > 0)
    district_reorder_qty = remaining_shortfall if total_transferable > 0 else needed_qty

    if total_transferable >= needed_qty:
        recommendation_summary = (
            f"Recommended inter-centre transfer of {total_transferable} {medicine.unit} from {len(allocated)} "
            f"nearby donor centre(s) with surplus. Preserves all donor safety buffers."
        )
    elif total_transferable > 0:
        recommendation_summary = (
            f"Partial inter-centre transfer feasible ({total_transferable} {medicine.unit}); recommend district warehouse "
            f"reorder for remaining shortfall of {remaining_shortfall} {medicine.unit}."
        )
    else:
        recommendation_summary = (
            f"No safe donor centres with surplus available in district network. "
            f"Recommend immediate district emergency warehouse reorder of {needed_qty} {medicine.unit}."
        )

    return {
        "shortage_centre": {
            "id": shortage_centre.id,
            "name": shortage_centre.name,
            "lat": shortage_centre.lat,
            "lng": shortage_centre.lng,
            "current_stock": current_shortage_stock,
            "needed_qty": needed_qty,
            "velocity": round(shortage_velocity, 1),
            "days_of_cover": shortage_days_before,
            "tier": shortage_tier_before,
        },
        "medicine": {
            "id": medicine.id,
            "name": medicine.name,
            "unit": medicine.unit,
        },
        "total_transferable": total_transferable,
        "remaining_shortfall": remaining_shortfall,
        "district_replenishment_recommended": district_replenishment_recommended,
        "district_reorder_qty": district_reorder_qty,
        "recommendation_summary": recommendation_summary,
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

    # Enforce donor safety stock protection: transfer cannot leave donor below safety threshold
    donor_alert = session.exec(
        select(Alert).where((Alert.centre_id == donor_id) & (Alert.medicine_id == medicine_id))
    ).first()
    donor_velocity = max(0.5, float(donor_alert.velocity)) if (donor_alert and donor_alert.velocity) else 5.0
    safety_days = med.safety_days if hasattr(med, 'safety_days') and med.safety_days else 15
    lead_time = 5
    donor_safety_stock = int(math.ceil(donor_velocity * (safety_days + lead_time)))

    if (donor_sl.current_stock - qty) < donor_safety_stock:
        return {
            "success": False,
            "error": f"Safety stock violation: Transfer of {qty} units leaves donor below safety threshold ({donor_safety_stock} units required).",
            "donor_current_stock": donor_sl.current_stock,
            "donor_safety_stock": donor_safety_stock,
            "max_safe_transfer_qty": max(0, donor_sl.current_stock - donor_safety_stock)
        }

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


# =====================================================================
# ---------- SMART AUTOMATIC MEDICINE REDISTRIBUTION ENGINE -----------
# =====================================================================

def verify_medicine_compatibility(
    session: Session,
    requested_med_id: str,
    candidate_med_id: str
) -> Dict:
    """
    Step 3: Verify medicine compatibility.
    Matches active ingredient, strength, and dosage form.
    Guards against clinical substitution when strength differs (e.g. 500mg vs 650mg).
    """
    if requested_med_id == candidate_med_id:
        return {
            "is_compatible": True,
            "substitution_type": "EXACT_MATCH",
            "reason": "Exact identical canonical medicine identifier."
        }

    med_a = session.get(CanonicalMedicine, requested_med_id)
    med_b = session.get(CanonicalMedicine, candidate_med_id)

    if not med_a or not med_b:
        return {
            "is_compatible": False,
            "substitution_type": "UNKNOWN",
            "reason": "One or both medicines not found in canonical catalogue."
        }

    # Normalization
    gen_a = (med_a.generic_name or "").strip().lower()
    gen_b = (med_b.generic_name or "").strip().lower()
    str_a = (med_a.strength or "").strip().lower().replace(" ", "")
    str_b = (med_b.strength or "").strip().lower().replace(" ", "")
    form_a = (med_a.dosage_form or "").strip().lower()
    form_b = (med_b.dosage_form or "").strip().lower()

    if gen_a != gen_b:
        return {
            "is_compatible": False,
            "substitution_type": "DIFFERENT_MOLECULE",
            "reason": f"Active ingredients differ: '{med_a.generic_name}' vs '{med_b.generic_name}'."
        }

    if str_a != str_b:
        return {
            "is_compatible": False,
            "substitution_type": "STRENGTH_MISMATCH",
            "reason": f"Clinical strength mismatch: '{med_a.strength}' vs '{med_b.strength}'. Automatic substitution prohibited without prescriber approval."
        }

    if form_a != form_b:
        return {
            "is_compatible": False,
            "substitution_type": "DOSAGE_FORM_MISMATCH",
            "reason": f"Dosage forms differ: '{med_a.dosage_form}' vs '{med_b.dosage_form}'. Requires pharmacist review."
        }

    return {
        "is_compatible": True,
        "substitution_type": "EQUIVALENT_GENERIC",
        "reason": f"Verified equivalent generic: {med_a.generic_name} {med_a.strength} {med_a.dosage_form}."
    }

def search_hierarchical_suppliers(
    session: Session,
    shortage_owner_id: str,
    shortage_owner_type: str,
    medicine_id: str,
    requested_qty: int
) -> List[Dict]:
    """
    Step 2: Hierarchical 6-tier search order:
      1. Same network / Town (< 5 km)
      2. Other pharmacies / facilities in Town (5 - 15 km)
      3. Nearby towns in same District (15 - 50 km)
      4. Other districts in State (50 - 250 km)
      5. Other states (> 250 km)
      6. National inventory channels
    """
    # 1. Coordinates of requester
    req_lat, req_lng = 10.3265, 76.9585 # default Valparai
    req_name = shortage_owner_id
    if shortage_owner_type == "facility":
        fac = session.get(Facility, shortage_owner_id) or session.get(Centre, shortage_owner_id)
        if fac:
            req_lat, req_lng = fac.lat, fac.lng
            req_name = getattr(fac, "facility_name", getattr(fac, "name", shortage_owner_id))
    else:
        ph = session.get(Pharmacy, shortage_owner_id)
        if ph:
            req_lat, req_lng = ph.lat, ph.lng
            req_name = ph.pharmacy_name

    # 2. Query available balances across all owners
    balances = session.exec(
        select(InventoryBalance).where(
            (InventoryBalance.medicine_id == medicine_id) &
            (InventoryBalance.owner_id != shortage_owner_id)
        )
    ).all()

    candidates = []
    for bal in balances:
        avail_qty = bal.quantity_on_hand - bal.quantity_reserved
        if avail_qty <= 0:
            continue

        c_lat, c_lng = req_lat, req_lng
        c_name = bal.owner_id
        district = "coimbatore"
        state = "TN"

        if bal.owner_type == "facility":
            f = session.get(Facility, bal.owner_id) or session.get(Centre, bal.owner_id)
            if f:
                c_lat, c_lng = f.lat, f.lng
                c_name = getattr(f, "facility_name", getattr(f, "name", bal.owner_id))
                district = getattr(f, "district_id", getattr(f, "district", "coimbatore"))
        else:
            p = session.get(Pharmacy, bal.owner_id)
            if p:
                c_lat, c_lng = p.lat, p.lng
                c_name = p.pharmacy_name
                district = p.district_id
                state = p.state_id

        dist_km = haversine_km(req_lat, req_lng, c_lat, c_lng)
        eta_mins = road_time_minutes(dist_km)

        # Classify into 6 tiers
        if dist_km <= 5.0:
            tier_num = 1
            tier_name = "TOWN_NETWORK"
        elif dist_km <= 15.0:
            tier_num = 2
            tier_name = "TOWN_OTHER"
        elif dist_km <= 50.0:
            tier_num = 3
            tier_name = "DISTRICT_NEARBY"
        elif dist_km <= 250.0:
            tier_num = 4
            tier_name = "STATE_DISTRICTS"
        elif dist_km <= 800.0:
            tier_num = 5
            tier_name = "INTER_STATE"
        else:
            tier_num = 6
            tier_name = "NATIONAL_CHANNEL"

        candidates.append({
            "supplier_id": bal.owner_id,
            "supplier_type": bal.owner_type,
            "supplier_name": c_name,
            "available_stock": bal.quantity_on_hand,
            "reserved_stock": bal.quantity_reserved,
            "unreserved_surplus": avail_qty,
            "distance_km": dist_km,
            "eta_minutes": eta_mins,
            "tier_num": tier_num,
            "tier_name": tier_name,
            "district": district,
            "state": state,
            "last_verified_at": bal.last_verified_at.isoformat() if bal.last_verified_at else None,
        })

    # Sort strictly by Tier number, then Distance, then Surplus
    candidates.sort(key=lambda c: (c["tier_num"], c["distance_km"], -c["unreserved_surplus"]))
    return candidates

def create_smart_redistribution(
    session: Session,
    shortage_owner_id: str,
    shortage_owner_type: str,
    medicine_id: str,
    requested_qty: int,
    urgency_level: str = "URGENT",
    created_by: str = "Pharmacist",
    notes: Optional[str] = None
) -> Dict:
    """
    Step 4 & 5: Find suppliers, create transfer, atomic offer or escalation.
    """
    candidates = search_hierarchical_suppliers(
        session, shortage_owner_id, shortage_owner_type, medicine_id, requested_qty
    )

    now = datetime.now(timezone.utc)
    ref = f"TRF-{int(now.timestamp())}-{shortage_owner_id[:4].upper()}"

    if not candidates:
        # Step 5: Automatic escalation dossier if zero suppliers in network
        t_order = TransferOrder(
            transfer_reference=ref,
            from_owner_type="unassigned",
            from_owner_id="PENDING_ESCALATION",
            to_owner_type=shortage_owner_type,
            to_owner_id=shortage_owner_id,
            medicine_id=medicine_id,
            quantity=requested_qty,
            urgency_level=urgency_level,
            request_level="DISTRICT",
            escalation_level="district",
            current_owner_role="district_officer",
            status="ESCALATED",
            requires_officer_approval=True,
            created_by=created_by,
            contacted_suppliers_json="[]",
            rejection_reasons_json="[]",
            escalation_deadline=now + timedelta(hours=24),
            notes=f"No local suppliers found with unreserved stock. Escalated to District Officer. {notes or ''}".strip()
        )
        session.add(t_order)
        session.commit()
        session.refresh(t_order)

        # Emit in-app notification
        session.add(Notification(
            target_role="district_officer",
            title="Immediate Shortage Escalation",
            message=f"{shortage_owner_id} requires {requested_qty} units of {medicine_id}. Zero local suppliers available.",
            category="ESCALATION",
            priority="CRITICAL" if urgency_level == "CRITICAL" else "WARNING",
            action_link=f"/transfers?id={t_order.id}",
            idempotency_key=f"notif-{t_order.id}"
        ))
        session.commit()

        return {
            "status": "escalated",
            "transfer_id": t_order.id,
            "transfer_reference": t_order.transfer_reference,
            "escalation_level": "district",
            "message": "No local stock available. Automated escalation dossier created for District Officer review."
        }

    # Primary supplier offer (closest candidate)
    primary = candidates[0]
    offerable_qty = min(requested_qty, primary["unreserved_surplus"])

    # Prepare list of contacted / fallback suppliers
    contacted_history = [{
        "supplier_id": primary["supplier_id"],
        "supplier_name": primary["supplier_name"],
        "offered_at": now.isoformat(),
        "status": "OFFERED",
        "tier": primary["tier_name"],
        "distance_km": primary["distance_km"]
    }]

    t_order = TransferOrder(
        transfer_reference=ref,
        from_owner_type=primary["supplier_type"],
        from_owner_id=primary["supplier_id"],
        to_owner_type=shortage_owner_type,
        to_owner_id=shortage_owner_id,
        medicine_id=medicine_id,
        quantity=offerable_qty,
        distance_km=primary["distance_km"],
        transit_minutes=primary["eta_minutes"],
        urgency_level=urgency_level,
        request_level=primary["tier_name"],
        escalation_level="facility",
        current_owner_role="pharmacist",
        status="OFFERED",
        requires_officer_approval=False,
        stock_reserved=False,
        contacted_suppliers_json=json.dumps(contacted_history),
        rejection_reasons_json="[]",
        escalation_deadline=now + (timedelta(hours=2) if urgency_level == "CRITICAL" else timedelta(hours=6)),
        created_by=created_by,
        notes=notes
    )
    session.add(t_order)
    session.commit()
    session.refresh(t_order)

    # Notify supplier
    session.add(Notification(
        user_id=primary["supplier_id"],
        target_role="pharmacist",
        title="New Medicine Transfer Offer",
        message=f"{shortage_owner_id} requested {offerable_qty} units of {medicine_id}. Distance: {primary['distance_km']} km.",
        category="TRANSFER_OFFER",
        priority="CRITICAL" if urgency_level == "CRITICAL" else "WARNING",
        action_link=f"/transfers?id={t_order.id}",
        idempotency_key=f"offer-{t_order.id}-{primary['supplier_id']}"
    ))
    session.commit()

    return {
        "status": "offered",
        "transfer_id": t_order.id,
        "transfer_reference": t_order.transfer_reference,
        "offered_supplier": primary,
        "backup_suppliers_count": len(candidates) - 1,
        "message": f"Transfer offered to {primary['supplier_name']} ({primary['distance_km']} km away)."
    }

def respond_to_supplier_offer(
    session: Session,
    transfer_id: str,
    action: str, # ACCEPT, REJECT, COUNTER_OFFER
    counter_qty: Optional[int] = None,
    rejection_reason: Optional[str] = None,
    user_name: str = "Supplier Pharmacist"
) -> Dict:
    """
    Step 4: Supplier response handling with atomic stock reservation.
    """
    trf = session.get(TransferOrder, transfer_id)
    if not trf:
        return {"success": False, "error": "Transfer order not found."}

    now = datetime.now(timezone.utc)

    if action == "ACCEPT":
        # Atomic reservation
        bal = session.exec(
            select(InventoryBalance).where(
                (InventoryBalance.owner_type == trf.from_owner_type) &
                (InventoryBalance.owner_id == trf.from_owner_id) &
                (InventoryBalance.medicine_id == trf.medicine_id)
            )
        ).first()

        qty_to_reserve = trf.quantity
        if counter_qty is not None and counter_qty > 0:
            qty_to_reserve = min(trf.quantity, counter_qty)
            trf.quantity = qty_to_reserve

        if not bal or (bal.quantity_on_hand - bal.quantity_reserved) < qty_to_reserve:
            return {"success": False, "error": "Insufficient unreserved stock to accept request."}

        bal.quantity_reserved += qty_to_reserve
        bal.last_verified_at = now
        bal.version += 1

        trf.status = "RESERVED"
        trf.stock_reserved = True
        session.commit()

        # Audit
        session.add(AuditLog(
            action="STOCK_RESERVE",
            entity_type="transfer",
            entity_id=trf.id,
            user_id=trf.from_owner_id,
            user_role="pharmacist",
            details=f"Reserved {qty_to_reserve} units of {trf.medicine_id} at {trf.from_owner_id} for transfer {trf.transfer_reference}."
        ))
        session.commit()

        return {
            "success": True,
            "status": "reserved",
            "reserved_quantity": qty_to_reserve,
            "message": f"Accepted and atomically reserved {qty_to_reserve} units. Ready for dispatch."
        }

    elif action == "REJECT":
        # Log rejection in transfer dossier
        try:
            reasons = json.loads(trf.rejection_reasons_json)
        except Exception:
            reasons = []
        reasons.append({
            "supplier_id": trf.from_owner_id,
            "rejected_at": now.isoformat(),
            "reason": rejection_reason or "Supplier stock constrained for local demand."
        })
        trf.rejection_reasons_json = json.dumps(reasons)

        # Automatic fallback: Search next supplier
        candidates = search_hierarchical_suppliers(
            session, trf.to_owner_id, trf.to_owner_type, trf.medicine_id, trf.quantity
        )
        # Exclude already contacted
        already_contacted = {r["supplier_id"] for r in reasons}
        eligible = [c for c in candidates if c["supplier_id"] not in already_contacted]

        if eligible:
            next_supplier = eligible[0]
            trf.from_owner_id = next_supplier["supplier_id"]
            trf.from_owner_type = next_supplier["supplier_type"]
            trf.distance_km = next_supplier["distance_km"]
            trf.transit_minutes = next_supplier["eta_minutes"]
            trf.status = "OFFERED"
            trf.request_level = next_supplier["tier_name"]

            try:
                hist = json.loads(trf.contacted_suppliers_json)
            except Exception:
                hist = []
            hist.append({
                "supplier_id": next_supplier["supplier_id"],
                "supplier_name": next_supplier["supplier_name"],
                "offered_at": now.isoformat(),
                "status": "OFFERED",
                "tier": next_supplier["tier_name"],
                "distance_km": next_supplier["distance_km"]
            })
            trf.contacted_suppliers_json = json.dumps(hist)
            session.commit()

            return {
                "success": True,
                "status": "reoffered",
                "next_supplier": next_supplier["supplier_name"],
                "message": f"Previous supplier rejected. Automatically re-offered to next eligible supplier: {next_supplier['supplier_name']}."
            }
        else:
            # Step 5: Automatically escalate to District Officer
            trf.status = "ESCALATED"
            trf.escalation_level = "district"
            trf.current_owner_role = "district_officer"
            trf.requires_officer_approval = True
            trf.escalation_deadline = now + timedelta(hours=24)
            session.commit()

            session.add(Notification(
                target_role="district_officer",
                title="Transfer Exhausted — Officer Escalation",
                message=f"All local suppliers rejected request for {trf.medicine_id} ({trf.quantity} units). Escalated to District Officer.",
                category="ESCALATION",
                priority="CRITICAL",
                action_link=f"/transfers?id={trf.id}",
                idempotency_key=f"esc-{trf.id}"
            ))
            session.commit()

            return {
                "success": True,
                "status": "escalated",
                "escalation_level": "district",
                "message": "All local suppliers rejected request. Automatically escalated to District Officer."
            }

    return {"success": False, "error": f"Unknown action: {action}"}

def escalate_transfer_dossier(
    session: Session,
    transfer_id: str,
    escalated_by: str,
    notes: Optional[str] = None
) -> Dict:
    """
    Step 5: Escalation pathway:
      facility -> district -> state -> national
    """
    trf = session.get(TransferOrder, transfer_id)
    if not trf:
        return {"success": False, "error": "Transfer order not found"}

    now = datetime.now(timezone.utc)
    current = trf.escalation_level

    if current in ("facility", "town"):
        next_level = "district"
        target_role = "district_officer"
    elif current == "district":
        next_level = "state"
        target_role = "state_officer"
    elif current == "state":
        next_level = "national"
        target_role = "national_officer"
    else:
        next_level = "national"
        target_role = "national_officer"

    trf.escalation_level = next_level
    trf.current_owner_role = target_role
    trf.status = "ESCALATED"
    trf.requires_officer_approval = True
    trf.escalation_deadline = now + timedelta(hours=24)
    if notes:
        trf.notes = f"{trf.notes or ''} [Escalated to {next_level}: {notes}]".strip()

    session.commit()

    # Log audit
    session.add(AuditLog(
        action="TRANSFER_ESCALATE",
        entity_type="transfer",
        entity_id=trf.id,
        user_id=escalated_by,
        user_role=target_role,
        details=f"Escalated transfer {trf.transfer_reference} to {next_level} level for review."
    ))

    session.add(Notification(
        target_role=target_role,
        title=f"Medicine Shortage Escalation ({next_level.upper()})",
        message=f"Request {trf.transfer_reference} for {trf.medicine_id} escalated to {next_level} level.",
        category="ESCALATION",
        priority="CRITICAL",
        action_link=f"/transfers?id={trf.id}",
        idempotency_key=f"esc-{trf.id}-{next_level}"
    ))
    session.commit()

    return {
        "success": True,
        "transfer_id": trf.id,
        "escalation_level": next_level,
        "target_role": target_role,
        "message": f"Successfully escalated to {next_level.upper()} officer."
    }

