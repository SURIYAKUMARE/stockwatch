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

const STORAGE_KEY = 'stockwatch_offline_tx_queue';

export function getOfflineQueue(): QueuedTransaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read offline queue from storage', e);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to save to offline queue', e);
  }
  return queuedItem;
}

export function clearFromOfflineQueue(id: string): void {
  const queue = getOfflineQueue().filter(item => item.id !== id);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error('Failed to update offline queue', e);
  }
}

export async function flushOfflineQueue(onItemSynced?: (id: string) => void): Promise<{ synced: number; failed: number }> {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;

  for (const item of [...queue]) {
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centre_id: item.centre_id,
          medicine_id: item.medicine_id,
          type: item.type,
          qty: item.qty,
          batch: item.batch,
          expiry: item.expiry,
          user: item.user + ' (Offline Sync)',
          confirmed: true
        })
      });

      if (res.ok) {
        clearFromOfflineQueue(item.id);
        synced++;
        if (onItemSynced) onItemSynced(item.id);
      } else {
        failed++;
      }
    } catch (e) {
      console.warn('Network still unreachable during queue flush', e);
      failed++;
      break; // stop flushing if still offline
    }
  }

  return { synced, failed };
}
