import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, select
from backend.app.main import app
from backend.app.database import engine
from backend import models
from backend.audit_ledger import record_auditable_event, verify_ledger_integrity

client = TestClient(app)

@pytest.fixture(scope="module")
def setup_db():
    from backend.seed import seed_all
    seed_all()
    yield

def test_audit_ledger_genesis_and_chain(setup_db):
    """Test sequential SHA-256 hash chaining of audit events from genesis"""
    with Session(engine) as session:
        entries = session.exec(select(models.AuditLog).order_by(models.AuditLog.sequence_number.asc())).all()
        assert len(entries) >= 3

        # Genesis block verification
        genesis = entries[0]
        assert genesis.sequence_number == 1
        assert genesis.prev_hash == "0" * 64
        assert len(genesis.entry_hash) == 64
        assert genesis.digital_signature is not None

        # Verify chaining between consecutive blocks
        for i in range(1, len(entries)):
            assert entries[i].sequence_number == entries[i-1].sequence_number + 1
            assert entries[i].prev_hash == entries[i-1].entry_hash
            assert len(entries[i].entry_hash) == 64

    # API verification endpoint
    res = client.post("/api/audit/verify-chain")
    assert res.status_code == 200
    report = res.json()
    assert report["is_valid"] is True
    assert report["status"] == "VERIFIED_VALID"
    assert report["total_blocks"] >= 3
    assert "SHA-256" in report["algorithm"]

def test_tamper_detection(setup_db):
    """Test that unauthorized alteration of historical audit records is immediately detected"""
    with Session(engine) as session:
        entry = session.exec(select(models.AuditLog).where(models.AuditLog.sequence_number == 2)).first()
        original_details = entry.details
        
        # Tamper with details
        entry.details = "ATTACKER ALTERED RECORD: Illegal stock modification"
        session.add(entry)
        session.commit()

    # Verify that the cryptographic auditor catches the tampering
    res = client.post("/api/audit/verify-chain")
    assert res.status_code == 200
    report = res.json()
    assert report["is_valid"] is False
    assert report["status"] == "PAYLOAD_TAMPERED"
    assert report["compromised_block"] == 2
    assert "tampering detected" in report["failure_reason"].lower()

    # Restore data integrity
    with Session(engine) as session:
        entry = session.exec(select(models.AuditLog).where(models.AuditLog.sequence_number == 2)).first()
        entry.details = original_details
        session.add(entry)
        session.commit()

    # Re-verify that chain is once again integral
    clean_res = client.post("/api/audit/verify-chain")
    assert clean_res.status_code == 200
    assert clean_res.json()["is_valid"] is True

def test_prometheus_metrics_endpoint(setup_db):
    """Test Prometheus service metrics endpoint for infrastructure observability"""
    res = client.get("/api/metrics")
    assert res.status_code == 200
    content = res.text
    assert "stockwatch_centres_monitored_total" in content
    assert "stockwatch_medicines_catalog_total" in content
    assert "stockwatch_critical_alerts_total" in content
    assert "stockwatch_audit_ledger_blocks_total" in content

def test_csv_template_download():
    """Test CSV inventory template download endpoint"""
    res = client.get("/api/inventory/csv/template")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert "attachment" in res.headers["content-disposition"]
    lines = res.text.strip().split("\n")
    assert len(lines) >= 2
    headers = lines[0].split(",")
    assert "medicine_name" in headers
    assert "quantity" in headers
    assert "batch_number" in headers
    assert "expiry_date" in headers
