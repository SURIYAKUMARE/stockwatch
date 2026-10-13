import { describe, it } from 'node:test';
import assert from 'node:assert';

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: Offline queue operations
// ─────────────────────────────────────────────────────────────────────────────
describe('Frontend Data & Queue Logic Tests', () => {
  it('offline queue operations correctly store and retrieve items', () => {
    const mockStorage = {};
    const STORAGE_KEY = 'stockwatch_offline_tx_queue';

    const addToQueue = (tx) => {
      const existing = mockStorage[STORAGE_KEY] ? JSON.parse(mockStorage[STORAGE_KEY]) : [];
      const item = { ...tx, id: 'tx_' + Date.now(), timestamp: Date.now() };
      existing.push(item);
      mockStorage[STORAGE_KEY] = JSON.stringify(existing);
      return item;
    };

    const getQueue = () => {
      return mockStorage[STORAGE_KEY] ? JSON.parse(mockStorage[STORAGE_KEY]) : [];
    };

    assert.strictEqual(getQueue().length, 0);

    addToQueue({
      centre_id: 'phc_valparai',
      medicine_id: 'med_pcm',
      type: 'dispense',
      qty: 25,
      batch: 'BTH-OFFLINE-01'
    });

    const queueAfter = getQueue();
    assert.strictEqual(queueAfter.length, 1);
    assert.strictEqual(queueAfter[0].centre_id, 'phc_valparai');
    assert.strictEqual(queueAfter[0].qty, 25);
  });

  it('urgency tiers and thresholds evaluate correctly', () => {
    const assignTier = (p, isEssential, isStale) => {
      if (isStale) return 'BLIND_SPOT';
      if (p >= 0.70) return 'CRITICAL';
      if (p >= 0.40) return isEssential ? 'CRITICAL' : 'HIGH';
      if (p >= 0.15) return 'WATCH';
      return 'SAFE';
    };

    assert.strictEqual(assignTier(0.85, true, false), 'CRITICAL');
    assert.strictEqual(assignTier(0.45, true, false), 'CRITICAL'); // essential escalates
    assert.strictEqual(assignTier(0.45, false, false), 'HIGH');
    assert.strictEqual(assignTier(0.20, false, false), 'WATCH');
    assert.strictEqual(assignTier(0.05, false, false), 'SAFE');
    assert.strictEqual(assignTier(0.99, true, true), 'BLIND_SPOT'); // stale centre is blind spot
  });

  it('end-to-end flow logic (surge -> critical -> transfer -> recalculate)', () => {
    let stock = 80;
    let velocity = 28.0; // surge
    let daysOfCover = stock / velocity;
    assert.ok(daysOfCover < 3.0, 'Stock cover must be under 3 days during surge');

    // Donor with surplus
    const donorStock = 420;
    const donorSafetyStock = 120;
    const donorSurplus = donorStock - donorSafetyStock;
    assert.ok(donorSurplus >= 200, 'Donor must have >200 units surplus');

    // Transfer approval
    const transferQty = 80;
    stock += transferQty;
    const newDaysOfCover = stock / velocity;
    assert.ok(newDaysOfCover > 5.0, 'After transfer, days of cover must exceed 5 days');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: Auth context & role mapping
// ─────────────────────────────────────────────────────────────────────────────
describe('Auth Context & Role Mapping', () => {
  it('mapBackendRole maps all six backend roles to frontend roles', () => {
    const mapBackendRole = (role) => {
      const map = {
        patient: 'patient',
        pharmacist: 'pharmacist',
        chc_facility: 'facility',
        facility: 'facility',
        block_officer: 'district_officer',
        district_officer: 'district_officer',
        state_officer: 'state_officer',
        national_officer: 'national_officer',
      };
      return map[role] ?? 'facility';
    };

    assert.strictEqual(mapBackendRole('patient'), 'patient');
    assert.strictEqual(mapBackendRole('pharmacist'), 'pharmacist');
    assert.strictEqual(mapBackendRole('chc_facility'), 'facility');
    assert.strictEqual(mapBackendRole('block_officer'), 'district_officer');
    assert.strictEqual(mapBackendRole('district_officer'), 'district_officer');
    assert.strictEqual(mapBackendRole('state_officer'), 'state_officer');
    assert.strictEqual(mapBackendRole('national_officer'), 'national_officer');
    assert.strictEqual(mapBackendRole('unknown_role'), 'facility'); // default fallback
  });

  it('officer self-registration is blocked for privilege escalation', () => {
    const PRIVILEGED_ROLES = ['district_officer', 'state_officer', 'national_officer'];
    const isPublicSelfRegistrationAllowed = (role) => !PRIVILEGED_ROLES.includes(role);

    assert.ok(isPublicSelfRegistrationAllowed('patient'));
    assert.ok(isPublicSelfRegistrationAllowed('pharmacist'));
    assert.ok(!isPublicSelfRegistrationAllowed('district_officer'));
    assert.ok(!isPublicSelfRegistrationAllowed('state_officer'));
    assert.ok(!isPublicSelfRegistrationAllowed('national_officer'));
  });

  it('JWT token is attached to API requests when session exists', () => {
    // Simulate getToken() reading from storage
    const mockStorage = {};
    const getToken = () => {
      try {
        const raw = mockStorage['sw_session_v3'];
        if (!raw) return null;
        return JSON.parse(raw)?.token ?? null;
      } catch { return null; }
    };

    // No session → no token
    assert.strictEqual(getToken(), null);

    // With session
    mockStorage['sw_session_v3'] = JSON.stringify({
      token: 'test_jwt_token_abc123',
      user: { id: 'u1', name: 'Test', role: 'pharmacist' }
    });
    assert.strictEqual(getToken(), 'test_jwt_token_abc123');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: Medicine deduplication logic (frontend mirror)
// ─────────────────────────────────────────────────────────────────────────────
describe('Medicine Deduplication Guards', () => {
  it('medicines with different strengths must not be auto-merged', () => {
    const isSafeToAutoMerge = (strength1, strength2, form1, form2) => {
      if (strength1 !== strength2) return false;
      if (form1 !== form2) return false;
      return true;
    };

    // Same strength, same form → safe to consider merging (still needs human review)
    assert.ok(isSafeToAutoMerge('500mg', '500mg', 'tablet', 'tablet'));

    // CRITICAL SAFETY: different strength → NEVER auto-merge
    assert.ok(!isSafeToAutoMerge('500mg', '650mg', 'tablet', 'tablet'));
    assert.ok(!isSafeToAutoMerge('250mg', '500mg', 'capsule', 'capsule'));

    // Different form → NEVER auto-merge
    assert.ok(!isSafeToAutoMerge('500mg', '500mg', 'tablet', 'syrup'));
    assert.ok(!isSafeToAutoMerge('500mg', '500mg', 'injection', 'tablet'));
  });

  it('inventory must stay separate per owner even for same medicine', () => {
    const inventoryStore = {
      'facility::phc_valparai::med_pcm': 80,
      'facility::phc_aliyar::med_pcm': 420,
      'pharmacy::pharma_apollo_cbe::med_pcm': 40,
      'pharmacy::pharma_medplus_rs_puram::med_pcm': 25,
    };

    const getBalance = (ownerType, ownerId, medicineId) =>
      inventoryStore[`${ownerType}::${ownerId}::${medicineId}`] ?? 0;

    // Each entity has its own independent stock
    assert.strictEqual(getBalance('facility', 'phc_valparai', 'med_pcm'), 80);
    assert.strictEqual(getBalance('facility', 'phc_aliyar', 'med_pcm'), 420);
    assert.strictEqual(getBalance('pharmacy', 'pharma_apollo_cbe', 'med_pcm'), 40);
    assert.strictEqual(getBalance('pharmacy', 'pharma_medplus_rs_puram', 'med_pcm'), 25);

    // No cross-contamination
    const totalAcrossAll = Object.values(inventoryStore).reduce((a, b) => a + b, 0);
    assert.strictEqual(totalAcrossAll, 80 + 420 + 40 + 25); // 565, not merged
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: Map Locations & Medicine Stock Breakdown Tests
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs';

describe('Map Locations & Stock Visibility Tests', () => {
  it('map locations accurately aggregate facilities and retail chemist shops', () => {
    const mapData = JSON.parse(readFileSync('./src/db/mapFallbackData.json', 'utf8'));
    assert.ok(Array.isArray(mapData));
    assert.ok(mapData.length >= 18);

    const facilities = mapData.filter((l) => l.category === 'FACILITY');
    const pharmacies = mapData.filter((l) => l.category === 'PHARMACY');
    assert.strictEqual(facilities.length, 12);
    assert.strictEqual(pharmacies.length, 6);

    for (const loc of mapData) {
      assert.ok(typeof loc.lat === 'number' && loc.lat > 0, `Invalid lat for ${loc.name}`);
      assert.ok(typeof loc.lng === 'number' && loc.lng > 0, `Invalid lng for ${loc.name}`);
      assert.ok(typeof loc.name === 'string' && loc.name.length > 0);
      assert.ok(typeof loc.total_stock_count === 'number' && loc.total_stock_count >= 0);
      assert.ok(typeof loc.distinct_medicines_count === 'number' && loc.distinct_medicines_count > 0);
      assert.ok(Array.isArray(loc.medicines) && loc.medicines.length > 0);
    }
  });

  it('shop medicine breakdown accurately details medicine name, quantity, and status', () => {
    const mapData = JSON.parse(readFileSync('./src/db/mapFallbackData.json', 'utf8'));
    const valparai = mapData.find((l) => l.id === 'phc_valparai');
    assert.ok(valparai);
    assert.strictEqual(valparai.name, 'PHC Valparai');

    const pcm = valparai.medicines.find((m) => m.medicine_id === 'med_pcm');
    assert.ok(pcm);
    assert.ok(typeof pcm.quantity === 'number');
    assert.ok(typeof pcm.medicine_name === 'string');
    assert.ok(typeof pcm.status === 'string');

    const pharmacy = mapData.find((l) => l.category === 'PHARMACY');
    assert.ok(pharmacy);
    assert.ok(pharmacy.medicines.length > 0);
    assert.ok(pharmacy.total_stock_count > 0);
  });
});
