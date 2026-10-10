import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import init_db
from backend.seed import run_seed

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_db():
    init_db()
    run_seed()

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_metadata():
    res = client.get("/api/metadata")
    assert res.status_code == 200
    data = res.json()
    assert len(data["centres"]) == 12
    assert len(data["medicines"]) >= 8  # seed now includes 9 canonical medicines

def test_kpi_strip():
    res = client.get("/api/kpis")
    assert res.status_code == 200
    data = res.json()
    assert data["critical_items"] >= 1
    assert data["centres_at_risk"] >= 1
    assert "early_warning_lead_time_gained" in data

def test_matrix_heatmap():
    res = client.get("/api/matrix")
    assert res.status_code == 200
    data = res.json()
    assert len(data["rows"]) == 12
    assert len(data["medicines"]) >= 8  # seed now has 9 medicines

    # Verify planted CRITICAL scenario: PHC Valparai + Paracetamol syrup (med_pcm_syr)
    valparai_row = next(r for r in data["rows"] if r["centre_id"] == "phc_valparai")
    # At least one critical medicine in Valparai
    critical_cells = [c for c in valparai_row["cells"] if c["tier"] == "CRITICAL"]
    assert len(critical_cells) >= 1, "PHC Valparai should have at least one CRITICAL medicine"

    # Verify planted STALE centre: PHC Kinathukadavu
    kinath_row = next(r for r in data["rows"] if r["centre_id"] == "phc_kinathukadavu")
    assert kinath_row["is_stale"] is True
    for c in kinath_row["cells"]:
        assert c["tier"] == "BLIND_SPOT"

def test_transfer_suggestions_and_donor_ranking():
    # Use the planted shortage: PHC Valparai needs Paracetamol Syrup (med_pcm_syr)
    res = client.get("/api/transfers/suggest?centre=phc_valparai&medicine=med_pcm_syr")
    assert res.status_code == 200
    data = res.json()
    donors = data["suggested_donors"]
    assert len(donors) >= 1

    # First donor should be PHC Aliyar (seeded surplus of 420) or PHC Samathur (280)
    top_donor = donors[0]
    assert top_donor["donor_id"] in ("phc_aliyar", "phc_samathur", "phc_anaimalai", "phc_pollachi_rural")
    assert top_donor["distance_km"] < 50.0  # within district
    assert top_donor["surplus"] > 0
    assert top_donor["tier_after_transfer"] in ("SAFE", "WATCH")

def test_approve_transfer():
    # Approve a transfer of 50 units from the top donor to PHC Valparai for med_pcm_syr
    # First get the top donor
    sug_res = client.get("/api/transfers/suggest?centre=phc_valparai&medicine=med_pcm_syr")
    sug_data = sug_res.json()
    top_donor = sug_data["suggested_donors"][0]
    donor_id = top_donor["donor_id"]

    initial_recipient_stock = sug_data["shortage_centre"]["current_stock"]

    payload = {
        "donor_id": donor_id,
        "recipient_id": "phc_valparai",
        "medicine_id": "med_pcm_syr",
        "qty": 50,
        "user_name": "Dr. Rajesh (DDHS)"
    }
    res = client.post("/api/transfers/approve", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["transferred_qty"] == 50
    # Recipient should have initial stock + 50
    assert data["recipient"]["new_stock"] == initial_recipient_stock + 50

def test_data_quality_guard_negative_stock():
    # Get current stock first, then try to dispense more than that
    matrix_res = client.get("/api/matrix")
    matrix_data = matrix_res.json()
    valparai_row = next(r for r in matrix_data["rows"] if r["centre_id"] == "phc_valparai")
    # Find the first medicine cell with some stock
    target_cell = next((c for c in valparai_row["cells"] if c["stock"] > 0), valparai_row["cells"][0])
    med_id = target_cell["medicine_id"]
    current_stock = target_cell["stock"]

    payload = {
        "centre_id": "phc_valparai",
        "medicine_id": med_id,
        "type": "dispense",
        "qty": current_stock + 500,  # definitely more than available
        "confirmed": False
    }
    res = client.post("/api/transactions", json=payload)
    assert res.status_code == 400
    assert "Data Quality Guard" in res.json()["detail"]

def test_valid_transaction_instant_recompute():
    # Get current stock for a known medicine at valparai
    matrix_res = client.get("/api/matrix")
    matrix_data = matrix_res.json()
    valparai_row = next(r for r in matrix_data["rows"] if r["centre_id"] == "phc_valparai")
    target_cell = next((c for c in valparai_row["cells"] if c["stock"] >= 10), None)
    assert target_cell is not None, "Need at least one medicine with stock >= 10 at Valparai"

    payload = {
        "centre_id": "phc_valparai",
        "medicine_id": target_cell["medicine_id"],
        "type": "dispense",
        "qty": 10,
        "confirmed": True
    }
    res = client.post("/api/transactions", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["new_stock"] == target_cell["stock"] - 10
    assert "forecast" in data
    assert "predicted_stockout_date" in data["forecast"]

def test_backtest_endpoint():
    res = client.get("/api/backtest")
    assert res.status_code == 200
    data = res.json()
    assert data["mean_lead_days_gained"] >= 4.0
    assert data["stockouts_averted"] >= 3
    assert len(data["historical_events"]) >= 3

def test_weekly_report():
    res = client.get("/api/report/weekly")
    assert res.status_code == 200
    data = res.json()
    assert "Weekly Medicine Action" in data["report_title"]
    assert len(data["centre_reports"]) >= 1
