/**
 * Offline Sync & Queue Manager for StockWatch PHC
 * Coordinates IndexedDB offline actions, automatic background synchronization,
 * idempotency, conflict resolution, and exponential backoff retry.
 */

import {
  openIndexedDB,
  enqueueOfflineAction,
  getQueuedOfflineActions,
  updateQueuedActionStatus,
  removeQueuedAction,
  clearAllQueuedActions,
  saveInventoryToOfflineCache,
  getCachedInventory,
  updateLocalInventoryOptimistic,
  saveMedicinesToOfflineCache,
  searchCachedMedicines,
  savePatientSchedulesToCache,
  getCachedPatientSchedules,
  savePriceComparisonToCache,
  getCachedPriceComparison,
  clearSensitiveOfflineStorage,
  getDeviceId,
  OfflineActionItem,
  CachedInventoryItem,
  CachedMedicine,
  CachedPatientSchedule
} from './indexedDB';

export {
  enqueueOfflineAction,
  getQueuedOfflineActions,
  updateQueuedActionStatus,
  removeQueuedAction,
  clearAllQueuedActions,
  saveInventoryToOfflineCache,
  getCachedInventory,
  updateLocalInventoryOptimistic,
  saveMedicinesToOfflineCache,
  searchCachedMedicines,
  savePatientSchedulesToCache,
  getCachedPatientSchedules,
  savePriceComparisonToCache,
  getCachedPriceComparison,
  clearSensitiveOfflineStorage,
  getDeviceId
};

export type { OfflineActionItem, CachedInventoryItem, CachedMedicine, CachedPatientSchedule };

export interface SyncResult {
  synced: number;
  conflicts: number;
  failed: number;
  details: Array<{
    client_action_id: string;
    action_type: string;
    status: string;
    conflict_details?: string | null;
    server_resolved_stock?: number | null;
  }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTOMATIC SYNCHRONIZATION WITH EXPONENTIAL BACKOFF
// ─────────────────────────────────────────────────────────────────────────────

let isSyncInProgress = false;

/**
 * Flush and synchronize all queued actions to the backend
 * Uses /api/offline/sync batch endpoint with server-side validation and atomic transactions
 */
export async function flushOfflineQueue(
  onProgress?: (synced: number, total: number) => void
): Promise<SyncResult> {
  if (isSyncInProgress) {
    return { synced: 0, conflicts: 0, failed: 0, details: [] };
  }

  isSyncInProgress = true;
  const result: SyncResult = { synced: 0, conflicts: 0, failed: 0, details: [] };

  try {
    const queue = await getQueuedOfflineActions();
    const pendingActions = queue.filter(
      (item) => item.status === 'PENDING' || item.status === 'FAILED'
    );

    if (pendingActions.length === 0) {
      return result;
    }

    // Mark as SYNCING
    for (const a of pendingActions) {
      await updateQueuedActionStatus(a.client_action_id, 'SYNCING');
    }

    const payload = {
      device_id: getDeviceId(),
      actions: pendingActions.map((a) => ({
        client_action_id: a.client_action_id,
        client_timestamp: a.client_timestamp,
        action_type: a.action_type,
        user_id: a.user_id,
        facility_id: a.facility_id,
        device_id: a.device_id,
        base_stock: a.base_stock,
        payload: a.payload
      }))
    };

    const res = await fetch('/api/offline/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      // Mark as failed for retry
      for (const a of pendingActions) {
        await updateQueuedActionStatus(
          a.client_action_id,
          'FAILED',
          `Server returned HTTP ${res.status}`
        );
      }
      result.failed = pendingActions.length;
      return result;
    }

    const data = await res.json();
    const actionResults = data.results || [];

    for (const itemRes of actionResults) {
      result.details.push(itemRes);

      if (itemRes.status === 'SYNCED' || itemRes.status === 'ALREADY_SYNCED') {
        result.synced++;
        // Remove successfully committed actions from local queue
        await removeQueuedAction(itemRes.client_action_id);
      } else if (itemRes.status === 'CONFLICT_DETECTED') {
        result.conflicts++;
        await updateQueuedActionStatus(
          itemRes.client_action_id,
          'CONFLICT_DETECTED',
          'Conflict detected: Concurrent modifications on server',
          itemRes.conflict_details,
          itemRes
        );
      } else {
        result.failed++;
        await updateQueuedActionStatus(
          itemRes.client_action_id,
          'FAILED',
          itemRes.conflict_details || 'Sync error',
          itemRes.conflict_details
        );
      }
    }

    // Refresh bootstrap data into local cache if sync committed changes
    if (result.synced > 0) {
      await refreshOfflineBootstrapData();
    }
  } catch (err: any) {
    console.warn('Network unreachable during offline queue flush:', err);
    // Mark as failed
    const queue = await getQueuedOfflineActions();
    for (const a of queue) {
      if (a.status === 'SYNCING') {
        await updateQueuedActionStatus(a.client_action_id, 'FAILED', err?.message || 'Network error');
      }
    }
    result.failed = queue.length;
  } finally {
    isSyncInProgress = false;
  }

  return result;
}

/**
 * Retry offline synchronization using exponential backoff
 */
export async function syncWithExponentialBackoff(
  maxRetries = 3,
  baseDelayMs = 1000
): Promise<SyncResult> {
  let attempt = 0;
  let delay = baseDelayMs;

  while (attempt < maxRetries) {
    try {
      const res = await flushOfflineQueue();
      if (res.synced > 0 || res.conflicts > 0) {
        return res;
      }
      if (res.failed === 0) {
        return res; // Empty queue
      }
    } catch (e) {
      // transient failure
    }

    attempt++;
    if (attempt < maxRetries) {
      await new Promise((r) => setTimeout(r, delay));
      delay *= 2; // exponential backoff: 1s, 2s, 4s
    }
  }

  return { synced: 0, conflicts: 0, failed: 0, details: [] };
}

/**
 * Fetch and download latest authorized inventory and reference data for offline use
 */
export async function refreshOfflineBootstrapData(facilityId?: string): Promise<boolean> {
  try {
    const url = facilityId
      ? `/api/offline/bootstrap-data?facility_id=${encodeURIComponent(facilityId)}`
      : '/api/offline/bootstrap-data';

    const res = await fetch(url);
    if (!res.ok) return false;

    const data = await res.json();

    if (data.inventory && Array.isArray(data.inventory)) {
      await saveInventoryToOfflineCache(data.inventory);
    }
    if (data.medicines && Array.isArray(data.medicines)) {
      await saveMedicinesToOfflineCache(data.medicines);
    }
    if (data.schedules && Array.isArray(data.schedules)) {
      await savePatientSchedulesToCache(data.schedules);
    }

    return true;
  } catch (err) {
    console.warn('Could not refresh offline bootstrap data', err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BACKWARD COMPATIBILITY SHIM FOR LEGACY CODE
// ─────────────────────────────────────────────────────────────────────────────

export interface QueuedTransaction {
  id: string;
  centre_id: string;
  medicine_id: string;
  type: string;
  qty: number;
  batch: string;
  expiry: string;
  user: string;
  timestamp: number;
}

const LEGACY_STORAGE_KEY = 'stockwatch_offline_tx_queue';

export function getOfflineQueue(): QueuedTransaction[] {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function addToOfflineQueue(tx: Omit<QueuedTransaction, 'id' | 'timestamp'>): QueuedTransaction {
  const queue = getOfflineQueue();
  const queuedItem: QueuedTransaction = {
    ...tx,
    id: 'queued_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    timestamp: Date.now()
  };
  queue.push(queuedItem);
  try {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {}

  // Also seamlessly enqueue into the new native IndexedDB engine!
  enqueueOfflineAction({
    action_type: tx.type === 'receive' ? 'RECEIVE' : tx.type === 'adjust' ? 'STOCK_ADJUST' : 'DISPENSE',
    user_id: tx.user,
    user_name: tx.user,
    user_role: 'pharmacist',
    facility_id: tx.centre_id,
    device_id: getDeviceId(),
    payload: {
      centre_id: tx.centre_id,
      medicine_id: tx.medicine_id,
      type: tx.type,
      qty: tx.qty,
      batch: tx.batch,
      expiry: tx.expiry,
      user: tx.user
    }
  }).catch(() => {});

  return queuedItem;
}

export function clearFromOfflineQueue(id: string): void {
  const queue = getOfflineQueue().filter((item) => item.id !== id);
  try {
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {}
}
