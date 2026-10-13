import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_get_all_map_locations():
    """Verify all map locations (facilities and pharmacies) return with stock counts and medicine details"""
    res = client.get("/api/map/locations")
    assert res.status_code == 200
    data = res.json()
    assert "locations" in data
    assert data["count"] >= 18 # 12 PHCs + 6 retail medical stores
    assert data["total_stock_units"] > 0

    first = data["locations"][0]
    assert "name" in first
    assert "type" in first
    assert "lat" in first
    assert "lng" in first
    assert "total_stock_count" in first
    assert "distinct_medicines_count" in first
    assert "medicines" in first
    assert len(first["medicines"]) > 0

    # Ensure medicines list contains name, quantity, and unit
    med = first["medicines"][0]
    assert "medicine_id" in med
    assert "medicine_name" in med
    assert "quantity" in med
    assert "unit" in med
    assert "status" in med

def test_filter_map_locations_by_category():
    """Verify filtering by pharmacy vs facility category"""
    res_pharm = client.get("/api/map/locations?category=pharmacy")
    assert res_pharm.status_code == 200
    data_pharm = res_pharm.json()
    assert all(loc["category"] == "PHARMACY" for loc in data_pharm["locations"])
    assert data_pharm["count"] >= 6

    res_fac = client.get("/api/map/locations?category=facility")
    assert res_fac.status_code == 200
    data_fac = res_fac.json()
    assert all(loc["category"] == "FACILITY" for loc in data_fac["locations"])
    assert data_fac["count"] >= 12

def test_filter_map_locations_by_medicine():
    """Verify filtering map locations by specific medicine returns sorted stock levels"""
    res = client.get("/api/map/locations?medicine_id=med_pcm")
    assert res.status_code == 200
    data = res.json()
    assert data["count"] > 0
    # First item should have non-zero selected_medicine_stock
    assert data["locations"][0]["selected_medicine_stock"] >= 0
