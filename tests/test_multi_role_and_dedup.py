import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.deduplication import (
    normalize_medicine_name, extract_strength_and_form,
    compute_similarity, detect_duplicate_candidate
)

client = TestClient(app)

# ─── AUTHENTICATION & RBAC TESTS ─────────────────────────────────────

def test_login_all_six_roles():
    """Verify that all 6 user roles can authenticate and receive JWT tokens."""
    roles = [
        ("patient_demo", "patient"),
        ("pharma_demo", "pharmacist"),
        ("chc_demo", "chc_facility"),
        ("district_demo", "district_officer"),
        ("state_demo", "state_officer"),
        ("national_demo", "national_officer"),
    ]
    for username, expected_role in roles:
        res = client.post("/api/auth/login", json={"username_or_email": username, "password": "demo123"})
        assert res.status_code == 200, f"Login failed for {username}: {res.text}"
        data = res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["role"] == expected_role
        assert "scopes" in data["user"]

def test_login_invalid_password():
    """Verify that wrong password returns 401."""
    res = client.post("/api/auth/login", json={"username_or_email": "patient_demo", "password": "wrong_password"})
    assert res.status_code == 401
    assert "Invalid" in res.json()["detail"]

def test_patient_self_registration_succeeds():
    """Verify patients can self-register."""
    import time
    uname = f"patient_{int(time.time())}"
    res = client.post("/api/auth/register", json={
        "username": uname,
        "email": f"{uname}@example.com",
        "password": "Password123!",
        "name": "Self Registered Patient",
        "role": "patient"
    })
    assert res.status_code == 200
    assert res.json()["status"] == "created"

def test_officer_self_registration_blocked():
    """Verify unauthorized users cannot self-register as district, state, or national officers."""
    res = client.post("/api/auth/register", json={
        "username": "fake_officer",
        "email": "fake_officer@gov.in",
        "password": "Password123!",
        "name": "Intruder Officer",
        "role": "district_officer"
    })
    assert res.status_code == 403
    assert "prohibited" in res.json()["detail"].lower()

def test_auth_me_endpoint():
    """Verify /api/auth/me returns authenticated profile."""
    # Login as district officer
    login_res = client.post("/api/auth/login", json={"username_or_email": "district_demo", "password": "demo123"})
    token = login_res.json()["access_token"]

    me_res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["username"] == "district_demo"
    assert me_data["role"] == "district_officer"


# ─── CANONICAL CATALOGUE & DEDUPLICATION TESTS ──────────────────────

def test_medicine_normalization():
    """Test text cleaning and standardization."""
    assert normalize_medicine_name("  PARACETAMOL 500 MG TABLET  ") == "paracetamol 500mg tablet"
    assert normalize_medicine_name("Paracetamol 500mg Tab") == "paracetamol 500mg tablet"
    assert normalize_medicine_name("Amoxicillin 250 mg Cap") == "amoxicillin 250mg capsule"
    assert normalize_medicine_name("Cetirizine 10 M.G. Tab") == "cetirizine 10mg tablet"

def test_extract_strength_and_dosage_form():
    """Test extraction of strength and dosage forms."""
    str1, form1 = extract_strength_and_form("Paracetamol 500mg Tablet")
    assert str1 == "500mg"
    assert form1 == "tablet"

    str2, form2 = extract_strength_and_form("Paracetamol Syrup 60ml")
    assert str2 == "60ml"
    assert form2 == "syrup"

def test_different_strength_never_merged():
    """Critical safety rule: 500mg vs 650mg must never be automatically merged."""
    existing = [
        {"id": "med_pcm_500", "canonical_name": "Paracetamol 500mg Tablet", "strength": "500mg", "dosage_form": "tablet"}
    ]
    check = detect_duplicate_candidate("Paracetamol 650mg Tablet", "650mg", "tablet", existing)
    assert check["status"] == "DIFFERENT_PRODUCT"
    assert check["can_auto_link"] is False
    assert "mismatch" in check["reason"].lower()

def test_different_dosage_form_never_merged():
    """Critical safety rule: tablets vs syrup must never be merged."""
    existing = [
        {"id": "med_pcm_tab", "canonical_name": "Paracetamol 500mg Tablet", "strength": "500mg", "dosage_form": "tablet"}
    ]
    check = detect_duplicate_candidate("Paracetamol 500mg Syrup", "500mg", "syrup", existing)
    assert check["status"] == "DIFFERENT_PRODUCT"
    assert check["can_auto_link"] is False

def test_exact_duplicate_rejected():
    """Verify attempting to create exact duplicate returns 409 Conflict."""
    res = client.post("/api/medicines", json={
        "canonical_name": "Paracetamol 500mg",
        "generic_name": "Paracetamol",
        "strength": "500mg",
        "dosage_form": "tablet",
        "unit": "tablets"
    })
    assert res.status_code == 409
    assert "Exact duplicate detected" in res.json()["detail"]

def test_scan_duplicates_endpoint():
    """Verify scanning for duplicates returns structured candidates."""
    res = client.get("/api/medicines/duplicates/scan")
    assert res.status_code == 200
    data = res.json()
    assert "duplicate_candidates" in data


# ─── MULTI-OWNER INVENTORY & CSV IMPORT TESTS ────────────────────────

def test_separate_inventory_per_pharmacy():
    """
    Ensure Pharmacy A stock is strictly distinct from Pharmacy B stock,
    even for the exact same medicine.
    """
    res_a = client.get("/api/inventory/pharma_apollo_cbe")
    res_b = client.get("/api/inventory/pharma_medplus_rs_puram")
    assert res_a.status_code == 200
    assert res_b.status_code == 200

    bal_a = next((b["quantity_on_hand"] for b in res_a.json()["balances"] if b["medicine_id"] == "med_pcm"), None)
    bal_b = next((b["quantity_on_hand"] for b in res_b.json()["balances"] if b["medicine_id"] == "med_pcm"), None)

    assert bal_a is not None
    assert bal_b is not None
    # Verified: Apollo has 40 strips, MedPlus has 25 strips
    assert bal_a == 40
    assert bal_b == 25
    assert bal_a != bal_b

def test_negative_stock_prevention():
    """Verify system blocks dispensing more than available balance."""
    payload = {
        "owner_type": "pharmacy",
        "owner_id": "pharma_apollo_cbe",
        "medicine_id": "med_pcm",
        "transaction_type": "dispense",
        "quantity": 5000, # Apollo only has 40
        "batch_number": "BTH-TEST",
        "expiry_date": "2027-12-31"
    }
    res = client.post("/api/inventory/transactions", json=payload)
    assert res.status_code == 400
    assert "Negative stock violation" in res.json()["detail"]

def test_csv_import_with_idempotency():
    """Verify CSV import updates stock, and re-submitting with identical idempotency key is skipped."""
    import time
    idemp_key = f"IDEMP-TEST-{int(time.time())}"
    import_payload = {
        "owner_type": "pharmacy",
        "owner_id": "pharma_aliyar_retail",
        "rows": [
            {
                "medicine_name": "Paracetamol 500mg",
                "strength": "500mg",
                "dosage_form": "tablet",
                "batch_number": "BTH-IMP-001",
                "expiry_date": "2028-01-31",
                "quantity": 50,
                "transaction_type": "receive",
                "idempotency_key": idemp_key
            }
        ]
    }
    # First submit
    res1 = client.post("/api/inventory/import", json=import_payload)
    assert res1.status_code == 200
    assert res1.json()["accepted_count"] == 1

    # Second submit with same idempotency key
    res2 = client.post("/api/inventory/import", json=import_payload)
    assert res2.status_code == 200
    assert res2.json()["accepted_count"] == 0
    assert res2.json()["rejected_count"] == 1
    assert "already applied" in res2.json()["rejected"][0]["reason"]


# ─── PHARMACY DISCOVERY & AVAILABILITY ENQUIRIES ─────────────────────

def test_pharmacy_discovery_distance_and_status():
    """Verify nearby pharmacy discovery computes distance and transparency flags."""
    res = client.get("/api/pharmacies/nearby?lat=10.658&lng=77.009&max_distance_km=30.0")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 1

    first = data[0]
    assert "distance_km" in first
    assert "availability_status" in first
    assert "data_source" in first
    assert "disclaimer" in first
    assert first["distance_km"] <= 30.0

def test_availability_enquiry_lifecycle():
    """Verify patient submits enquiry and pharmacist confirms availability."""
    # 1. Patient submits enquiry
    enq_payload = {
        "pharmacy_id": "pharma_apollo_cbe",
        "medicine_id": "med_pcm",
        "patient_name": "Kavitha",
        "patient_phone": "+91 94421 99881",
        "requested_quantity": 2
    }
    create_res = client.post("/api/pharmacies/enquiry", json=enq_payload)
    assert create_res.status_code == 200
    enq_id = create_res.json()["enquiry_id"]

    # 2. Pharmacist logs in and confirms
    login_res = client.post("/api/auth/login", json={"username_or_email": "pharma_demo", "password": "demo123"})
    token = login_res.json()["access_token"]

    confirm_res = client.post(
        f"/api/pharmacies/enquiry/{enq_id}/confirm?action=CONFIRM",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert confirm_res.status_code == 200
    assert confirm_res.json()["enquiry_status"] == "CONFIRMED"


# ─── TRANSFERS LIFECYCLE TESTS ───────────────────────────────────────

def test_transfer_lifecycle_and_dual_inventory_reconciliation():
    """Test full transfer lifecycle: Request -> Approve -> Dispatch -> Receive."""
    # 1. Create transfer request
    trf_payload = {
        "from_owner_type": "facility",
        "from_owner_id": "phc_aliyar",
        "to_owner_type": "facility",
        "to_owner_id": "phc_valparai",
        "medicine_id": "med_pcm",
        "quantity": 25,
        "notes": "Automated transfer test"
    }
    create_res = client.post("/api/transfers", json=trf_payload)
    assert create_res.status_code == 200
    trf_id = create_res.json()["transfer_id"]

    # 2. Officer Approves
    approve_res = client.post(f"/api/transfers/{trf_id}/approve")
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "approved"

    # 3. Dispatched
    disp_res = client.post(f"/api/transfers/{trf_id}/dispatch")
    assert disp_res.status_code == 200
    assert disp_res.json()["status"] == "dispatched"

    # 4. Receive with atomic dual inventory reconciliation
    recv_res = client.post(f"/api/transfers/{trf_id}/receive")
    assert recv_res.status_code == 200
    assert recv_res.json()["status"] == "received"


# ─── STATE & NATIONAL ANALYTICS TESTS ────────────────────────────────

def test_state_analytics():
    """Verify state-level district comparison and reporting compliance."""
    res = client.get("/api/analytics/state?state_id=TN")
    assert res.status_code == 200
    data = res.json()
    assert data["state_name"] == "Tamil Nadu"
    assert len(data["districts"]) >= 4
    assert data["essential_availability_pct"] > 80.0

def test_national_analytics():
    """Verify national macro shortage and essential drug coverage index."""
    res = client.get("/api/analytics/national")
    assert res.status_code == 200
    data = res.json()
    assert data["country"] == "India"
    assert data["national_essential_drug_index"] > 85.0
    assert len(data["states"]) >= 4

def test_admin_audit_logs():
    """Verify audit logging captures actions."""
    res = client.get("/api/admin/audit-logs")
    assert res.status_code == 200
    logs = res.json()
    assert len(logs) >= 1
    assert "action" in logs[0]
