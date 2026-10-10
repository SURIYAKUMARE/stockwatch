/**
 * IndexedDB Native Storage Engine for StockWatch PHC Offline PWA
 * Provides robust offline storage for:
 * 1. Cached Inventory with timestamp and optimistic local balance
 * 2. Offline Action Queue with unique client_action_id, idempotency, and conflict states
 * 3. Canonical EDL Medicine Catalogue & CDSCO Monographs
 * 4. Patient Medication Schedules & Offline Reminder Logs
 * 5. Cached Price Comparisons & Saved Pharmacies
 */

export interface OfflineActionItem {
  client_action_id: string;
  client_timestamp: string;
  action_type:
    | 'DISPENSE'
    | 'RECEIVE'
    | 'STOCK_ADJUST'
    | 'CREATE_SHORTAGE_REQUEST'
    | 'TRANSFER_RECORD'
    | 'PATIENT_REMINDER_LOG';
  user_id: string;
  user_name: string;
  user_role: string;
  facility_id: string;
  device_id: string;
  base_stock?: number;
  payload: Record<string, any>;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'CONFLICT_DETECTED';
  retry_count: number;
  error_message?: string | null;
  conflict_details?: string | null;
  server_response?: any;
}

export interface CachedInventoryItem {
  key: string; // centre_id_medicine_id
  centre_id: string;
  medicine_id: string;
  medicine_name: string;
  unit: string;
  current_stock: number;
  days_of_cover?: number;
  tier?: string;
  last_cached_at: string;
  is_unsynced_local?: boolean;
}

export interface CachedMedicine {
  id: string;
  name: string;
  generic_name?: string;
  unit: string;
  essential: boolean;
  dosage_form?: string;
  strength?: string;
  last_cached_at: string;
}

export interface CachedPatientSchedule {
  id: string;
  patient_id: string;
  medicine_name: string;
  strength: string;
  dosage_form: string;
  dose_quantity: string;
  schedule_times: string[];
  prescribed_instructions?: string;
  last_cached_at: string;
}

export interface CachedPriceComparison {
  query: string;
  sources: any[];
  cached_at: string;
}

const DB_NAME = 'stockwatch_phc_offline_v1';
const DB_VERSION = 1;

/**
 * Get or initialize persistent Device ID
 */
export function getDeviceId(): string {
  try {
    let devId = localStorage.getItem('stockwatch_device_id');
    if (!devId) {
      devId = 'dev_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
      localStorage.setItem('stockwatch_device_id', devId);
    }
    return devId;
  } catch (e) {
    return 'dev_fallback_' + Date.now();
  }
}

/**
 * Open or upgrade IndexedDB database
 */
export function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Inventory Store
      if (!db.objectStoreNames.contains('inventory')) {
        const store = db.createObjectStore('inventory', { keyPath: 'key' });
        store.createIndex('centre_id', 'centre_id', { unique: false });
        store.createIndex('medicine_id', 'medicine_id', { unique: false });
      }

      // 2. Action Queue Store
      if (!db.objectStoreNames.contains('action_queue')) {
        const store = db.createObjectStore('action_queue', { keyPath: 'client_action_id' });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('client_timestamp', 'client_timestamp', { unique: false });
        store.createIndex('action_type', 'action_type', { unique: false });
      }

      // 3. Medicines Store
      if (!db.objectStoreNames.contains('medicines')) {
        db.createObjectStore('medicines', { keyPath: 'id' });
      }

      // 4. Patient Schedules Store
      if (!db.objectStoreNames.contains('patient_schedules')) {
        const store = db.createObjectStore('patient_schedules', { keyPath: 'id' });
        store.createIndex('patient_id', 'patient_id', { unique: false });
      }

      // 5. Price Comparisons Store
      if (!db.objectStoreNames.contains('price_comparisons')) {
        db.createObjectStore('price_comparisons', { keyPath: 'query' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY CACHING & OPTIMISTIC LOCAL UPDATES
// ─────────────────────────────────────────────────────────────────────────────

export async function saveInventoryToOfflineCache(items: CachedInventoryItem[]): Promise<void> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('inventory', 'readwrite');
    const store = tx.objectStore('inventory');
    const now = new Date().toISOString();

    for (const item of items) {
      store.put({
        ...item,
        last_cached_at: now
      });
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedInventory(centreId?: string): Promise<CachedInventoryItem[]> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('inventory', 'readonly');
    const store = tx.objectStore('inventory');

    if (centreId) {
      const index = store.index('centre_id');
      const req = index.getAll(centreId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    } else {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    }
  });
}

export async function updateLocalInventoryOptimistic(
  centreId: string,
  medicineId: string,
  delta: number
): Promise<CachedInventoryItem | null> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('inventory', 'readwrite');
    const store = tx.objectStore('inventory');
    const key = `${centreId}_${medicineId}`;

    const getReq = store.get(key);
    getReq.onsuccess = () => {
      const existing: CachedInventoryItem | undefined = getReq.result;
      if (!existing) {
        resolve(null);
        return;
      }

      const updated: CachedInventoryItem = {
        ...existing,
        current_stock: Math.max(0, existing.current_stock + delta),
        is_unsynced_local: true,
        last_cached_at: new Date().toISOString()
      };

      store.put(updated);
      resolve(updated);
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// OFFLINE ACTIONS QUEUE & CONFLICT TRACKING
// ─────────────────────────────────────────────────────────────────────────────

export async function enqueueOfflineAction(
  action: Omit<OfflineActionItem, 'client_action_id' | 'client_timestamp' | 'retry_count' | 'status'>
): Promise<OfflineActionItem> {
  const db = await openIndexedDB();
  const queuedItem: OfflineActionItem = {
    ...action,
    client_action_id: 'act_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 9),
    client_timestamp: new Date().toISOString(),
    retry_count: 0,
    status: 'PENDING'
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('action_queue', 'readwrite');
    const store = tx.objectStore('action_queue');
    const req = store.put(queuedItem);

    req.onsuccess = () => resolve(queuedItem);
    req.onerror = () => reject(req.error);
  });
}

export async function getQueuedOfflineActions(): Promise<OfflineActionItem[]> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('action_queue', 'readonly');
    const store = tx.objectStore('action_queue');
    const req = store.getAll();

    req.onsuccess = () => {
      const list = (req.result || []) as OfflineActionItem[];
      // Sort oldest first for FIFO ordered synchronization
      list.sort((a, b) => new Date(a.client_timestamp).getTime() - new Date(b.client_timestamp).getTime());
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function updateQueuedActionStatus(
  client_action_id: string,
  status: OfflineActionItem['status'],
  error_message?: string | null,
  conflict_details?: string | null,
  server_response?: any
): Promise<void> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('action_queue', 'readwrite');
    const store = tx.objectStore('action_queue');
    const getReq = store.get(client_action_id);

    getReq.onsuccess = () => {
      const item: OfflineActionItem | undefined = getReq.result;
      if (!item) {
        resolve();
        return;
      }

      item.status = status;
      if (status === 'FAILED') item.retry_count = (item.retry_count || 0) + 1;
      if (error_message !== undefined) item.error_message = error_message;
      if (conflict_details !== undefined) item.conflict_details = conflict_details;
      if (server_response !== undefined) item.server_response = server_response;

      store.put(item);
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

export async function removeQueuedAction(client_action_id: string): Promise<void> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('action_queue', 'readwrite');
    const store = tx.objectStore('action_queue');
    const req = store.delete(client_action_id);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearAllQueuedActions(): Promise<void> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('action_queue', 'readwrite');
    const store = tx.objectStore('action_queue');
    const req = store.clear();

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CANONICAL MEDICINES CATALOGUE OFFLINE CACHE
// ─────────────────────────────────────────────────────────────────────────────

export async function saveMedicinesToOfflineCache(medicines: CachedMedicine[]): Promise<void> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('medicines', 'readwrite');
    const store = tx.objectStore('medicines');
    const now = new Date().toISOString();

    for (const med of medicines) {
      store.put({ ...med, last_cached_at: now });
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function searchCachedMedicines(query: string): Promise<CachedMedicine[]> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('medicines', 'readonly');
    const store = tx.objectStore('medicines');
    const req = store.getAll();

    req.onsuccess = () => {
      const all = (req.result || []) as CachedMedicine[];
      if (!query.trim()) {
        resolve(all.slice(0, 20));
        return;
      }
      const q = query.toLowerCase().trim();
      const filtered = all.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.generic_name && m.generic_name.toLowerCase().includes(q))
      );
      resolve(filtered);
    };
    req.onerror = () => reject(req.error);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT SCHEDULES & REMINDERS CACHE
// ─────────────────────────────────────────────────────────────────────────────

export async function savePatientSchedulesToCache(schedules: CachedPatientSchedule[]): Promise<void> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('patient_schedules', 'readwrite');
    const store = tx.objectStore('patient_schedules');
    const now = new Date().toISOString();

    for (const sch of schedules) {
      store.put({ ...sch, last_cached_at: now });
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedPatientSchedules(patientId?: string): Promise<CachedPatientSchedule[]> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('patient_schedules', 'readonly');
    const store = tx.objectStore('patient_schedules');

    if (patientId) {
      const index = store.index('patient_id');
      const req = index.getAll(patientId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    } else {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PRICE COMPARISON CACHING (OFFLINE STALE DATA AWARE)
// ─────────────────────────────────────────────────────────────────────────────

export async function savePriceComparisonToCache(query: string, sources: any[]): Promise<void> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('price_comparisons', 'readwrite');
    const store = tx.objectStore('price_comparisons');

    store.put({
      query: query.toLowerCase().trim(),
      sources,
      cached_at: new Date().toISOString()
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedPriceComparison(query: string): Promise<CachedPriceComparison | null> {
  const db = await openIndexedDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('price_comparisons', 'readonly');
    const store = tx.objectStore('price_comparisons');
    const req = store.get(query.toLowerCase().trim());

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY & PRIVACY PURGE ON LOGOUT
// ─────────────────────────────────────────────────────────────────────────────

export async function clearSensitiveOfflineStorage(currentUserId?: string): Promise<void> {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction(['action_queue', 'patient_schedules'], 'readwrite');
    tx.objectStore('patient_schedules').clear();

    // If an action has already synced, clear it
    const queueStore = tx.objectStore('action_queue');
    const req = queueStore.getAll();
    req.onsuccess = () => {
      const actions = (req.result || []) as OfflineActionItem[];
      for (const a of actions) {
        if (a.status === 'SYNCED' || (currentUserId && a.user_id === currentUserId && a.status !== 'PENDING')) {
          queueStore.delete(a.client_action_id);
        }
      }
    };
  } catch (err) {
    console.warn('Could not complete full IndexedDB cache purge:', err);
  }
}
