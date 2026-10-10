from sqlmodel import SQLModel, Field
import uuid
from datetime import datetime, timezone
from typing import Optional
from enum import Enum

def get_utc_now():
    return datetime.now(timezone.utc)

class RoleEnum(str, Enum):
    patient = "patient"
    pharmacist = "pharmacist"
    chc_facility = "chc_facility"
    district_officer = "district_officer"
    state_officer = "state_officer"
    national_officer = "national_officer"
    # Legacy alias
    block_officer = "block_officer"

class TransactionType(str, Enum):
    dispense = "dispense"
    receive = "receive"
    adjust = "adjust"
    transfer_in = "transfer_in"
    transfer_out = "transfer_out"

class AlertTier(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    WATCH = "WATCH"
    SAFE = "SAFE"
    BLIND_SPOT = "BLIND_SPOT"

# ================= LEGACY / BACKWARD-COMPATIBLE MODELS =================
class Centre(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    block: str
    district: str
    lat: float
    lng: float
    is_stale: bool = False
    updated_at: datetime = Field(default_factory=get_utc_now)

class Medicine(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    unit: str
    safety_days: int
    shelf_life_days: int
    essential: bool = True

class StockLevel(SQLModel, table=True):
    centre_id: str = Field(foreign_key="centre.id", primary_key=True)
    medicine_id: str = Field(foreign_key="medicine.id", primary_key=True)
    current_stock: int
    updated_at: datetime = Field(default_factory=get_utc_now)

class Transaction(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    centre_id: str = Field(foreign_key="centre.id")
    medicine_id: str = Field(foreign_key="medicine.id")
    type: str # dispense, receive, adjust
    qty: int
    batch: str = "BTH-DEFAULT"
    expiry: str = "2027-12-31"
    ts: datetime = Field(default_factory=get_utc_now)
    user: str = "PHC Pharmacist"

class SupplyParam(SQLModel, table=True):
    centre_id: str = Field(foreign_key="centre.id", primary_key=True)
    medicine_id: str = Field(foreign_key="medicine.id", primary_key=True)
    lead_time_days: int = 5
    next_indent_date: str # ISO date string YYYY-MM-DD
    indent_cycle_days: int = 30

class Alert(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    centre_id: str = Field(foreign_key="centre.id")
    medicine_id: str = Field(foreign_key="medicine.id")
    tier: str # CRITICAL, HIGH, WATCH, SAFE, BLIND_SPOT
    urgency: int
    probability: float = 0.0
    predicted_date: str # YYYY-MM-DD
    range_low: str # YYYY-MM-DD
    range_high: str # YYYY-MM-DD
    latest_safe_action_date: str = "" # YYYY-MM-DD
    days_of_cover: float = 0.0
    velocity: float = 0.0
    trend: float = 1.0
    trend_pct: float = 0.0
    recommended_order_qty: int = 0
    patient_impact: int = 0
    reason: str = ""
    reason_ta: str = ""
    status: str = "NEW" # NEW, ACKNOWLEDGED, EMERGENCY_INDENT, TRANSFER_INITIATED, RESOLVED, MONITOR
    created_at: datetime = Field(default_factory=get_utc_now)

class AlertEvent(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    alert_id: str = Field(foreign_key="alert.id")
    action: str # ACKNOWLEDGED, EMERGENCY_INDENT, TRANSFER_APPROVED, RESOLVED, DISPATCHED
    timestamp: datetime = Field(default_factory=get_utc_now)
    user: str = "Officer"
    notes: str = ""

class DailyPatient(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    centre_id: str = Field(foreign_key="centre.id")
    date: str # YYYY-MM-DD
    count: int

# ================= NEW PRODUCTION-SCALE IDENTITY & RBAC =================
class User(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    username: str
    name: Optional[str] = None
    email: Optional[str] = None
    password_hash: str = ""
    role: str = "pharmacist" # patient, pharmacist, chc_facility, district_officer, state_officer, national_officer
    centre_id: Optional[str] = None # backward-compat
    account_status: str = "ACTIVE" # ACTIVE, PENDING_VERIFICATION, SUSPENDED
    created_at: datetime = Field(default_factory=get_utc_now)

class UserScope(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="user.id")
    state_id: Optional[str] = None
    district_id: Optional[str] = None
    facility_id: Optional[str] = None
    pharmacy_id: Optional[str] = None

# ================= CANONICAL MEDICINE CATALOGUE =================
class CanonicalMedicine(SQLModel, table=True):
    id: str = Field(primary_key=True)
    canonical_name: str
    generic_name: str
    brand_name: Optional[str] = None
    strength: str
    dosage_form: str
    unit: str
    manufacturer: Optional[str] = None
    essential: bool = True
    verification_status: str = "VERIFIED" # VERIFIED, PENDING_REVIEW, REJECTED
    created_at: datetime = Field(default_factory=get_utc_now)

class MedicineAlias(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    medicine_id: str = Field(foreign_key="canonicalmedicine.id")
    alias: str
    normalized_alias: str
    alias_type: str = "BRAND" # BRAND, SPELLING, LOCAL_SYNONYM

# ================= FACILITIES & PHARMACIES =================
class Facility(SQLModel, table=True):
    id: str = Field(primary_key=True)
    facility_code: str
    facility_name: str
    facility_type: str = "phc" # sub_centre, phc, chc
    parent_facility_id: Optional[str] = None
    block: str
    district_id: str
    state_id: str
    lat: float
    lng: float
    verification_status: str = "VERIFIED"
    is_stale: bool = False
    updated_at: datetime = Field(default_factory=get_utc_now)

class Pharmacy(SQLModel, table=True):
    id: str = Field(primary_key=True)
    pharmacy_code: str
    pharmacy_name: str
    address: str
    district_id: str
    state_id: str
    lat: float
    lng: float
    registration_number: str
    contact_phone: str
    verification_status: str = "VERIFIED" # VERIFIED, PENDING_VERIFICATION
    data_source: str = "VERIFIED_PHARMACY" # LIVE_INTEGRATION, VERIFIED_PHARMACY, MANUALLY_REPORTED, DEMO_DATA, STALE, UNKNOWN
    updated_at: datetime = Field(default_factory=get_utc_now)

# ================= MULTI-OWNER INVENTORY & BATCHES =================
class InventoryBalance(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    owner_type: str = "facility" # facility, pharmacy
    owner_id: str
    medicine_id: str
    quantity_on_hand: int
    quantity_reserved: int = 0
    last_verified_at: datetime = Field(default_factory=get_utc_now)
    version: int = 1

class MedicineBatch(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    owner_type: str = "facility" # facility, pharmacy
    owner_id: str
    medicine_id: str
    batch_number: str
    expiry_date: str # YYYY-MM-DD
    received_quantity: int
    current_quantity: int
    supplier_name: Optional[str] = None
    created_at: datetime = Field(default_factory=get_utc_now)

class InventoryTransaction(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    transaction_reference: str
    owner_type: str = "facility" # facility, pharmacy
    owner_id: str
    medicine_id: str
    batch_id: Optional[str] = None
    transaction_type: str = "dispense" # dispense, receive, adjust, transfer_in, transfer_out
    quantity: int
    source: str = "MANUAL" # MANUAL, CSV_IMPORT, SYSTEM_TRANSFER
    created_by: str = "System"
    reason: Optional[str] = None
    idempotency_key: Optional[str] = None
    created_at: datetime = Field(default_factory=get_utc_now)

# ================= TRANSFERS, ENQUIRIES & AUDITING =================
class TransferOrder(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    transfer_reference: str
    from_owner_type: str = "facility"
    from_owner_id: str
    to_owner_type: str = "facility"
    to_owner_id: str
    medicine_id: str
    quantity: int
    distance_km: float = 0.0
    transit_minutes: int = 0
    status: str = "REQUESTED" # REQUESTED, APPROVED, REJECTED, DISPATCHED, RECEIVED, CANCELLED
    created_by: str = "Pharmacist"
    approved_by: Optional[str] = None
    dispatched_at: Optional[datetime] = None
    received_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=get_utc_now)

class AvailabilityEnquiry(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    pharmacy_id: str
    medicine_id: str
    patient_name: str
    patient_phone: str
    requested_quantity: int = 1
    status: str = "PENDING" # PENDING, CONFIRMED, OUT_OF_STOCK
    confirmed_by: Optional[str] = None
    created_at: datetime = Field(default_factory=get_utc_now)

class AuditLog(SQLModel, table=True):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    action: str # STOCK_ADJUST, TRANSFER_APPROVE, CATALOGUE_MERGE, CSV_IMPORT, LOGIN, PERMISSION_CHANGE
    entity_type: str
    entity_id: str
    user_id: str
    user_role: str
    details: str = ""
    created_at: datetime = Field(default_factory=get_utc_now)
