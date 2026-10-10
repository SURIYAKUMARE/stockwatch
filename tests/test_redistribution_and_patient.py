import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.seed import run_seed

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    run_seed()

def test_patient_medicine_compare():
    res = client.get("/api/patient/medicines/compare?medicine_id=med_pcm")
    assert res.status_code == 200
    data = res.json()
    assert "sources" in data
    assert data["total_sources_found"] > 0
    first = data["sources"][0]
    assert "price_inr" in first
    assert "directions_url" in first
    assert "distance_km" in first
    assert "availability_status" in first

def test_patient_medicine_clinical_info():
    res = client.get("/api/patient/medicines/med_pcm/info")
    assert res.status_code == 200
    data = res.json()
    assert data["generic_name"] == "Paracetamol"
    assert "approved_indications" in data
    assert "common_side_effects" in data
    assert "serious_warnings" in data
    assert "contraindications" in data
    assert data["prescription_status"] in ("OTC", "Rx")

def test_patient_reminders_and_adherence():
    # 1. Get initial reminders
    res = client.get("/api/patient/reminders")
    assert res.status_code == 200
    data = res.json()
    assert len(data["schedules"]) >= 1

    sched_id = data["schedules"][0]["id"]

    # 2. Log an action: TAKEN
    res_act = client.post(f"/api/patient/reminders/{sched_id}/action", json={
        "action": "TAKEN",
        "scheduled_time": "2026-03-01 08:00",
        "notes": "Taken with water"
    })
    assert res_act.status_code == 200
    assert res_act.json()["action"] == "TAKEN"

    # 3. Check adherence report
    res_adh = client.get("/api/patient/adherence")
    assert res_adh.status_code == 200
    adh = res_adh.json()
    assert "adherence_percentage" in adh
    assert adh["current_streak_days"] >= 1
    assert adh["adherence_rating"] in ("EXCELLENT", "GOOD", "NEEDS_ATTENTION")

def test_clinical_compatibility_guard():
    # Compatible: med_pcm (500mg tab) vs med_pcm_dup (500mg tab)
    res = client.post("/api/redistribution/verify-compatibility", json={
        "requested_medicine_id": "med_pcm",
        "offered_medicine_id": "med_pcm_dup"
    })
    assert res.status_code == 200
    assert res.json()["is_compatible"] is True

    # Incompatible: Paracetamol 500mg vs Paracetamol 650mg (Strength mismatch guard!)
    res_diff = client.post("/api/redistribution/verify-compatibility", json={
        "requested_medicine_id": "med_pcm",
        "offered_medicine_id": "med_pcm_650"
    })
    assert res_diff.status_code == 200
    assert res_diff.json()["is_compatible"] is False
    assert "Clinical strength mismatch" in res_diff.json()["reason"]

def test_hierarchical_supplier_search():
    res = client.get("/api/redistribution/suppliers?medicine_id=med_pcm&requested_qty=20&owner_id=phc_valparai")
    assert res.status_code == 200
    data = res.json()
    assert data["total_suppliers_found"] > 0
    tiers = [s["tier_name"] for s in data["suppliers"]]
    assert len(tiers) > 0

def test_smart_redistribution_and_supplier_response():
    # 1. Trigger auto-search for a shortage
    res = client.post("/api/redistribution/auto-search", json={
        "medicine_id": "med_pcm",
        "requested_qty": 30,
        "urgency": "HIGH",
        "requester_owner_id": "phc_valparai",
        "requester_owner_type": "facility"
    })
    assert res.status_code == 200
    data = res.json()
    trf_id = data.get("transfer_id")
    assert trf_id is not None

    # 2. Supplier responds with ACCEPT (reserving stock atomically)
    res_acc = client.post(f"/api/transfers/{trf_id}/respond", json={
        "action": "ACCEPT"
    })
    assert res_acc.status_code == 200
    assert res_acc.json()["status"] in ("reserved", "RESERVED", "approved", "APPROVED")

def test_escalation_and_officer_approval():
    # 1. Fetch active escalations
    res_esc = client.get("/api/redistribution/escalations")
    assert res_esc.status_code == 200
    escalations = res_esc.json()
    assert len(escalations) > 0

    esc_trf = escalations[0]
    trf_id = esc_trf["id"]

    # 2. Officer approves transfer
    res_app = client.post(f"/api/transfers/{trf_id}/approve")
    assert res_app.status_code == 200
    assert res_app.json()["status"] == "approved"

def test_notifications_center():
    # 1. List notifications
    res = client.get("/api/notifications")
    assert res.status_code == 200
    data = res.json()
    assert "notifications" in data
    assert len(data["notifications"]) > 0

    notif_id = data["notifications"][0]["id"]

    # 2. Mark single notification read
    res_read = client.post(f"/api/notifications/{notif_id}/read")
    assert res_read.status_code == 200
    assert res_read.json()["status"] == "read"

    # 3. Mark all read
    res_all = client.post("/api/notifications/read-all")
    assert res_all.status_code == 200

def test_suppliers_and_purchase_orders():
    # 1. List suppliers
    res_sup = client.get("/api/suppliers")
    assert res_sup.status_code == 200
    assert len(res_sup.json()) >= 1

    # 2. List POs
    res_po = client.get("/api/purchase-orders")
    assert res_po.status_code == 200
    assert len(res_po.json()) >= 1

    # 3. Create PO
    sup_id = res_sup.json()[0]["id"]
    res_create = client.post("/api/purchase-orders", json={
        "supplier_id": sup_id,
        "medicine_id": "med_pcm",
        "quantity": 500,
        "unit_price": 2.10,
        "expected_delivery_date": "2026-03-15",
        "owner_type": "facility",
        "owner_id": "phc_valparai"
    })
    assert res_create.status_code == 200
    assert res_create.json()["status"] == "submitted"
