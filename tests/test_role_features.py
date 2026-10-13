import pytest
from fastapi.testclient import TestClient
from backend.main import app
from backend.app.database import engine, init_db
from sqlmodel import Session, select
from backend import models

init_db()

client = TestClient(app)

def test_patient_appointments_flow():
    # 1. Get initial appointments
    res = client.get("/api/patient/appointments?patient_id=user_patient_01")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 2
    assert "token_number" in data[0]

    # 2. Book a new appointment
    new_apt = {
        "facility_id": "phc_valparai",
        "department": "Pediatrics",
        "doctor_name": "Dr. S. Kulanthaivel, MBBS",
        "appointment_date": "2026-10-25",
        "appointment_time": "10:00 AM",
        "symptoms": "Child fever and rash",
        "patient_name": "Kavitha Murugan",
        "patient_phone": "+91 98421 12345"
    }
    create_res = client.post("/api/patient/appointments", json=new_apt)
    assert create_res.status_code == 200
    created = create_res.json()
    assert created["department"] == "Pediatrics"
    assert created["status"] == "CONFIRMED"
    apt_id = created["id"]

    # 3. Cancel the appointment
    cancel_res = client.post(f"/api/patient/appointments/{apt_id}/cancel")
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"

def test_patient_medical_records_flow():
    # 1. Get records
    res = client.get("/api/patient/records?patient_id=user_patient_01")
    assert res.status_code == 200
    records = res.json()
    assert len(records) >= 2
    assert records[0]["record_type"] in ("PRESCRIPTION", "LAB_REPORT")

    # 2. Create a new medical record
    new_rec = {
        "facility_id": "phc_valparai",
        "record_type": "PRESCRIPTION",
        "title": "Follow-up Hypertension Review",
        "doctor_name": "Dr. S. Kulanthaivel, MBBS",
        "record_date": "2026-10-20",
        "diagnosis": "Stage 1 Essential Hypertension",
        "medicines_prescribed": [
            {"name": "Amlodipine 5mg", "dosage": "1 tablet OD", "duration": "30 days", "instructions": "Morning after food"}
        ],
        "lab_results": {"Blood Pressure": "138/88 mmHg"},
        "notes": "Monitor BP bi-weekly."
    }
    create_res = client.post("/api/patient/records", json=new_rec)
    assert create_res.status_code == 200
    assert create_res.json()["title"] == "Follow-up Hypertension Review"

def test_retail_pharmacy_billing_flow():
    # 1. Post a POS billing invoice
    billing_payload = {
        "pharmacy_id": "pharma_valparai_01",
        "patient_name": "R. Selvam",
        "patient_phone": "+91 98765 43210",
        "doctor_name": "Dr. Raman, MBBS",
        "items": [
            {
                "medicine_id": "med_pcm",
                "medicine_name": "Paracetamol 500mg Tab",
                "batch": "BTH-TEST-01",
                "qty": 30,
                "unit_price": 2.0,
                "gst_rate": 12.0
            }
        ],
        "payment_mode": "UPI"
    }
    res = client.post("/api/pharmacy/billing", json=billing_payload)
    assert res.status_code == 200
    invoice = res.json()
    assert invoice["invoice_number"].startswith("INV-2026-")
    assert invoice["subtotal"] == 60.0
    assert invoice["total_amount"] == 67.2 # 60 + 12% GST

    # 2. Fetch invoices
    list_res = client.get("/api/pharmacy/invoices?pharmacy_id=pharma_valparai_01")
    assert list_res.status_code == 200
    invoices = list_res.json()
    assert len(invoices) >= 1

def test_cold_chain_and_adr_flow():
    # 1. Get cold chain logs
    cc_res = client.get("/api/facility/cold-chain?facility_id=phc_valparai")
    assert cc_res.status_code == 200
    logs = cc_res.json()
    assert len(logs) >= 1

    # 2. Post normal cold chain reading
    log_payload = {
        "facility_id": "phc_valparai",
        "equipment_id": "ILR-01",
        "equipment_type": "ILR",
        "temperature_celsius": 4.5,
        "power_source": "MAINS",
        "notes": "Daily morning check"
    }
    create_cc = client.post("/api/facility/cold-chain", json=log_payload)
    assert create_cc.status_code == 200
    assert create_cc.json()["is_excursion"] is False

    # 3. Post excursion cold chain reading
    excursion_payload = {
        "facility_id": "phc_valparai",
        "equipment_id": "ILR-01",
        "equipment_type": "ILR",
        "temperature_celsius": 13.5,
        "power_source": "MAINS",
        "notes": "Power outage excursion"
    }
    create_exc = client.post("/api/facility/cold-chain", json=excursion_payload)
    assert create_exc.status_code == 200
    assert create_exc.json()["is_excursion"] is True
    assert create_exc.json()["excursion_severity"] == "CRITICAL"

    # 4. ADR Report
    adr_payload = {
        "facility_id": "phc_valparai",
        "patient_age": 35,
        "patient_gender": "Male",
        "medicine_id": "med_pcm",
        "batch_number": "BTH-PCM-2026",
        "reaction_description": "Mild urticaria and pruritus",
        "onset_date": "2026-10-12",
        "severity": "MILD",
        "outcome": "RECOVERED",
        "action_taken": "DOSE_REDUCED"
    }
    adr_res = client.post("/api/facility/adr", json=adr_payload)
    assert adr_res.status_code == 200
    assert adr_res.json()["report_reference"].startswith("ADR-2026-")

def test_chc_clinical_operations_flow():
    # 1. CHC Referrals
    ref_payload = {
        "patient_name": "Govindasamy K.",
        "patient_age": 62,
        "patient_gender": "Male",
        "from_facility_id": "phc_valparai",
        "to_facility_id": "chc_pollachi",
        "referral_reason": "Severe acute respiratory distress",
        "urgency": "EMERGENCY",
        "clinical_notes": "Oxygen saturation 88% on room air"
    }
    create_ref = client.post("/api/chc/referrals", json=ref_payload)
    assert create_ref.status_code == 200
    ref_data = create_ref.json()
    assert ref_data["status"] == "REFERRED"
    ref_id = ref_data["id"]

    # Update status
    update_ref = client.post(f"/api/chc/referrals/{ref_id}/status", json={"status": "ADMITTED", "notes": "Admitted to ICU Bed 2"})
    assert update_ref.status_code == 200
    assert update_ref.json()["status"] == "ADMITTED"

    # 2. CHC Beds
    beds_res = client.get("/api/chc/beds?facility_id=chc_pollachi")
    assert beds_res.status_code == 200
    beds = beds_res.json()
    assert len(beds) >= 4

    # Update bed
    bed_update = {
        "facility_id": "chc_pollachi",
        "ward_name": "General Male Ward",
        "total_beds": 20,
        "occupied_beds": 16,
        "oxygen_supported_beds": 8,
        "ventilator_beds": 0
    }
    bed_res = client.post("/api/chc/beds/update", json=bed_update)
    assert bed_res.status_code == 200
    assert bed_res.json()["occupied_beds"] == 16

    # 3. CHC Duty Roster
    roster_res = client.get("/api/chc/roster?facility_id=chc_pollachi")
    assert roster_res.status_code == 200
    roster = roster_res.json()
    assert len(roster) >= 4

def test_surveillance_and_national_reserves():
    # 1. District Surveillance
    surv_res = client.get("/api/district/surveillance?district_id=coimbatore")
    assert surv_res.status_code == 200
    surv_data = surv_res.json()
    assert len(surv_data) >= 2

    # 2. Consolidated Indents
    indent_res = client.get("/api/district/indents/consolidate?district_id=coimbatore")
    assert indent_res.status_code == 200
    assert "consolidated_indents" in indent_res.json()

    # 3. National Strategic Reserves
    res_res = client.get("/api/national/reserves")
    assert res_res.status_code == 200
    reserves = res_res.json()
    assert len(reserves) >= 3
    assert "depot_code" in reserves[0]

    # 4. National Procurement & Pharmacovigilance
    proc_res = client.get("/api/national/procurement")
    assert proc_res.status_code == 200
    assert "active_central_contracts" in proc_res.json()

    pharma_res = client.get("/api/national/pharmacovigilance")
    assert pharma_res.status_code == 200
    assert "total_reported_events" in pharma_res.json()
