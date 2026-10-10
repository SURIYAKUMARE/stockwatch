import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select
import uuid
import json

from backend.app.main import app
from backend.app.database import engine, get_session
from backend import models

client = TestClient(app)

@pytest.fixture(scope="module")
def setup_db():
    from backend.seed import seed_all
    seed_all()
    yield

def test_offline_bootstrap_data(setup_db):
    """Test downloading authorized reference and initial inventory bundle for offline caching"""
    response = client.get("/api/offline/bootstrap-data?facility_id=phc_valparai")
    assert response.status_code == 200
    data = response.json()
    assert "centres" in data
    assert "medicines" in data
    assert "inventory" in data
    assert "server_timestamp" in data
    assert len(data["centres"]) > 0
    assert len(data["medicines"]) > 0
    # Check that inventory items have key, centre_id, medicine_id, and current_stock
    assert len(data["inventory"]) > 0
    inv = data["inventory"][0]
    assert "key" in inv
    assert "current_stock" in inv

def test_offline_dispense_sync_and_idempotency(setup_db):
    """Test offline stock dispense synchronization and strict idempotency"""
    with Session(engine) as session:
        stock = session.exec(
            select(models.StockLevel).where(
                models.StockLevel.centre_id == "phc_valparai",
                models.StockLevel.medicine_id == "med_pcm"
            )
        ).first()
        initial_stock = stock.current_stock

    action_id = f"act_test_{uuid.uuid4()}"
    dispense_qty = 5

    payload = {
        "device_id": "test_device_01",
        "actions": [
            {
                "client_action_id": action_id,
                "client_timestamp": "2026-10-11T01:00:00Z",
                "action_type": "DISPENSE",
                "user_id": "usr_phc_demo",
                "facility_id": "phc_valparai",
                "device_id": "test_device_01",
                "base_stock": initial_stock,
                "payload": {
                    "centre_id": "phc_valparai",
                    "medicine_id": "med_pcm",
                    "qty": dispense_qty,
                    "batch": "BTH-OFFLINE-01",
                    "expiry": "2027-12-31"
                }
            }
        ]
    }

    # 1. First sync commit
    res = client.post("/api/offline/sync", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["synced_count"] == 1
    assert data["results"][0]["status"] == "SYNCED"
    assert data["results"][0]["server_resolved_stock"] == initial_stock - dispense_qty

    with Session(engine) as session:
        updated_stock = session.exec(
            select(models.StockLevel).where(
                models.StockLevel.centre_id == "phc_valparai",
                models.StockLevel.medicine_id == "med_pcm"
            )
        ).first().current_stock
        assert updated_stock == initial_stock - dispense_qty

    # 2. Duplicate sync attempt with exact same client_action_id (Testing Idempotency on network retry)
    res_retry = client.post("/api/offline/sync", json=payload)
    assert res_retry.status_code == 200
    retry_data = res_retry.json()
    assert retry_data["results"][0]["status"] == "ALREADY_SYNCED"

    # Confirm stock was NOT deducted again on retry
    with Session(engine) as session:
        final_stock = session.exec(
            select(models.StockLevel).where(
                models.StockLevel.centre_id == "phc_valparai",
                models.StockLevel.medicine_id == "med_pcm"
            )
        ).first().current_stock
        assert final_stock == initial_stock - dispense_qty

def test_offline_conflict_insufficient_stock(setup_db):
    """Test conflict detection when offline dispense requests more than available stock"""
    with Session(engine) as session:
        stock = session.exec(
            select(models.StockLevel).where(
                models.StockLevel.centre_id == "phc_valparai",
                models.StockLevel.medicine_id == "med_pcm"
            )
        ).first()
        available = stock.current_stock

    excess_qty = available + 500
    action_id = f"act_conflict_{uuid.uuid4()}"

    payload = {
        "device_id": "test_device_02",
        "actions": [
            {
                "client_action_id": action_id,
                "client_timestamp": "2026-10-11T01:10:00Z",
                "action_type": "DISPENSE",
                "user_id": "usr_phc_demo",
                "facility_id": "phc_valparai",
                "device_id": "test_device_02",
                "base_stock": available,
                "payload": {
                    "centre_id": "phc_valparai",
                    "medicine_id": "med_pcm",
                    "qty": excess_qty
                }
            }
        ]
    }

    res = client.post("/api/offline/sync", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["conflicts_count"] == 1
    assert data["results"][0]["status"] == "CONFLICT_DETECTED"
    assert "Insufficient stock" in data["results"][0]["conflict_details"]

    # Verify physical stock was NOT driven negative
    with Session(engine) as session:
        unchanged_stock = session.exec(
            select(models.StockLevel).where(
                models.StockLevel.centre_id == "phc_valparai",
                models.StockLevel.medicine_id == "med_pcm"
            )
        ).first().current_stock
        assert unchanged_stock == available

def test_offline_conflict_stale_stock_adjust(setup_db):
    """Test conflict detection when offline STOCK_ADJUST would overwrite newer modifications"""
    action_id = f"act_stale_adj_{uuid.uuid4()}"
    with Session(engine) as session:
        stock = session.exec(
            select(models.StockLevel).where(
                models.StockLevel.centre_id == "phc_valparai",
                models.StockLevel.medicine_id == "med_pcm"
            )
        ).first()
        current_server_stock = stock.current_stock

    # Client claims base stock was 999 (stale / out-of-sync observed value)
    payload = {
        "device_id": "test_device_03",
        "actions": [
            {
                "client_action_id": action_id,
                "client_timestamp": "2026-10-11T01:15:00Z",
                "action_type": "STOCK_ADJUST",
                "user_id": "usr_phc_demo",
                "facility_id": "phc_valparai",
                "device_id": "test_device_03",
                "base_stock": 999, # Stale base mismatch
                "payload": {
                    "centre_id": "phc_valparai",
                    "medicine_id": "med_pcm",
                    "qty": 50
                }
            }
        ]
    }

    res = client.post("/api/offline/sync", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["conflicts_count"] == 1
    assert data["results"][0]["status"] == "CONFLICT_DETECTED"
    assert "Stale offline count prevented" in data["results"][0]["conflict_details"]

def test_offline_create_shortage_request(setup_db):
    """Test offline creation and delayed sync of an emergency medicine shortage request"""
    action_id = f"act_shortage_{uuid.uuid4()}"

    payload = {
        "device_id": "test_device_04",
        "actions": [
            {
                "client_action_id": action_id,
                "client_timestamp": "2026-10-11T01:20:00Z",
                "action_type": "CREATE_SHORTAGE_REQUEST",
                "user_id": "usr_phc_demo",
                "facility_id": "phc_valparai",
                "device_id": "test_device_04",
                "payload": {
                    "centre_id": "phc_valparai",
                    "medicine_id": "med_pcm_syr",
                    "quantity": 30,
                    "urgency_level": "URGENT"
                }
            }
        ]
    }

    res = client.post("/api/offline/sync", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["synced_count"] == 1
    assert data["results"][0]["status"] == "SYNCED"
    assert "transfer_order_id" in data["results"][0]

def test_offline_patient_reminder_sync(setup_db):
    """Test offline patient dose action (TAKEN/SKIPPED) synchronization"""
    action_id = f"act_reminder_{uuid.uuid4()}"

    payload = {
        "device_id": "test_device_pat",
        "actions": [
            {
                "client_action_id": action_id,
                "client_timestamp": "2026-10-11T01:25:00Z",
                "action_type": "PATIENT_REMINDER_LOG",
                "user_id": "patient_demo",
                "facility_id": "coimbatore",
                "device_id": "test_device_pat",
                "payload": {
                    "schedule_id": "sch_demo_pcm",
                    "patient_id": "patient_demo",
                    "action": "TAKEN",
                    "scheduled_time": "2026-10-11 08:00"
                }
            }
        ]
    }

    res = client.post("/api/offline/sync", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["synced_count"] == 1
    assert data["results"][0]["status"] == "SYNCED"

def test_resolve_offline_conflict(setup_db):
    """Test supervisor conflict resolution endpoint"""
    # Create an action with conflict first
    action_id = f"act_to_resolve_{uuid.uuid4()}"
    payload = {
        "device_id": "test_device_05",
        "actions": [
            {
                "client_action_id": action_id,
                "client_timestamp": "2026-10-11T01:30:00Z",
                "action_type": "STOCK_ADJUST",
                "user_id": "usr_phc_demo",
                "facility_id": "phc_valparai",
                "device_id": "test_device_05",
                "base_stock": 777,
                "payload": { "centre_id": "phc_valparai", "medicine_id": "med_pcm", "qty": 40 }
            }
        ]
    }
    client.post("/api/offline/sync", json=payload)

    # Now supervisor resolves conflict
    resolve_res = client.post(
        "/api/offline/resolve-conflict",
        json={
            "client_action_id": action_id,
            "resolution_choice": "ACCEPT_SERVER",
            "notes": "Verified against physical register"
        }
    )
    assert resolve_res.status_code == 200
    assert resolve_res.json()["status"] == "resolved"

def test_list_offline_actions_audit(setup_db):
    """Test retrieving immutable audit trail of offline synchronized actions"""
    res = client.get("/api/offline/actions?facility_id=phc_valparai")
    assert res.status_code == 200
    data = res.json()
    assert "actions" in data
    assert len(data["actions"]) > 0
