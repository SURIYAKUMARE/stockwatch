import React, { useState, useEffect } from 'react';
import {
  X,
  Wifi,
  WifiOff,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  ShieldAlert,
  Smartphone,
  HardDrive
} from 'lucide-react';
import {
  getQueuedOfflineActions,
  removeQueuedAction,
  clearAllQueuedActions,
  flushOfflineQueue,
  syncWithExponentialBackoff,
  getDeviceId,
  OfflineActionItem,
  clearSensitiveOfflineStorage
} from '../db/offlineQueue';

interface OfflineQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  onSyncComplete?: () => void;
}

export const OfflineQueueModal: React.FC<OfflineQueueModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  onSyncComplete
}) => {
  const [actions, setActions] = useState<OfflineActionItem[]>([]);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const deviceId = getDeviceId();

  const loadActions = async () => {
    try {
      const list = await getQueuedOfflineActions();
      setActions(list);
    } catch (e) {
      console.error('Failed to load queued offline actions', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadActions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSyncNow = async () => {
    if (!isOnline) {
      setSyncFeedback('Cannot sync while offline. Please connect to internet.');
      return;
    }
    setIsSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await syncWithExponentialBackoff(3, 1000);
      let msg = `Sync completed: ${res.synced} committed`;
      if (res.conflicts > 0) msg += `, ${res.conflicts} conflicts detected`;
      if (res.failed > 0) msg += `, ${res.failed} temporary failures (queued for retry)`;
      setSyncFeedback(msg);
      await loadActions();
      if (onSyncComplete) onSyncComplete();
    } catch (err: any) {
      setSyncFeedback(`Sync failed: ${err?.message || 'Network error'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRemoveItem = async (clientActionId: string) => {
    await removeQueuedAction(clientActionId);
    await loadActions();
  };

  const handleClearAll = async () => {
    if (window.confirm('Clear all queued offline actions? Unsynced changes will be lost.')) {
      await clearAllQueuedActions();
      await loadActions();
    }
  };

  const handlePurgeSensitive = async () => {
    await clearSensitiveOfflineStorage();
    await loadActions();
    alert('Sensitive offline cache and completed logs purged from this device.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-[#E3E8EE] flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E3E8EE] flex items-center justify-between bg-[#F7F9FB]">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {isOnline ? <Wifi size={20} /> : <WifiOff size={20} />}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#14202B]">
                Offline Action Queue & Synchronization
              </h2>
              <div className="flex items-center gap-2 text-xs text-[#5B6B7A] mt-0.5">
                <span>Status:</span>
                <span className={`font-bold ${isOnline ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {isOnline ? 'Connected (Live Network)' : 'Offline (Local Storage Engine)'}
                </span>
                <span>•</span>
                <span className="font-mono text-[11px] bg-slate-100 px-1.5 py-0.5 rounded-xs">
                  Device: {deviceId.substring(0, 14)}...
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#5B6B7A] hover:bg-slate-200 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sync Feedback Message */}
        {syncFeedback && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs text-[#0F6B6B] flex items-center justify-between font-medium">
            <span>{syncFeedback}</span>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-xs font-bold hover:underline ml-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#14202B] uppercase tracking-wider">
              Queued Actions ({actions.length})
            </span>
            <div className="flex items-center gap-2">
              {actions.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-md font-medium transition"
                >
                  Clear Queue
                </button>
              )}
              <button
                onClick={handleSyncNow}
                disabled={isSyncing || actions.length === 0 || !isOnline}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0F6B6B] text-white hover:bg-[#0c5555] disabled:opacity-50 flex items-center gap-1.5 shadow-xs transition"
              >
                <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? 'Synchronizing...' : 'Sync Now'}</span>
              </button>
            </div>
          </div>

          {actions.length === 0 ? (
            <div className="py-12 text-center text-[#5B6B7A] bg-slate-50 rounded-xl border border-dashed border-[#E3E8EE]">
              <CheckCircle2 size={36} className="mx-auto text-emerald-600 mb-2" />
              <p className="text-sm font-bold text-[#14202B]">Offline Queue Clean & Synced</p>
              <p className="text-xs text-[#5B6B7A] mt-1">
                All inventory mutations, requests, and medication actions have been validated and committed on the server.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {actions.map((act) => (
                <div
                  key={act.client_action_id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    act.status === 'CONFLICT_DETECTED'
                      ? 'border-rose-300 bg-rose-50/50'
                      : act.status === 'FAILED'
                      ? 'border-amber-300 bg-amber-50/40'
                      : 'border-[#E3E8EE] bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#0F6B6B]/10 text-[#0F6B6B] uppercase">
                          {act.action_type.replace(/_/g, ' ')}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          act.status === 'CONFLICT_DETECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : act.status === 'FAILED'
                            ? 'bg-amber-100 text-amber-800'
                            : act.status === 'SYNCING'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {act.status}
                        </span>
                        {act.retry_count > 0 && (
                          <span className="text-[10px] text-[#5B6B7A]">
                            (Retried: {act.retry_count}x)
                          </span>
                        )}
                      </div>

                      <div className="mt-1.5 text-xs text-[#14202B] font-medium">
                        {act.action_type === 'DISPENSE' && (
                          <span>Dispensed {act.payload.qty} units of <strong>{act.payload.medicine_id}</strong> at {act.facility_id}</span>
                        )}
                        {act.action_type === 'RECEIVE' && (
                          <span>Received {act.payload.qty} units of <strong>{act.payload.medicine_id}</strong></span>
                        )}
                        {act.action_type === 'STOCK_ADJUST' && (
                          <span>Physical audit adjusted stock to {act.payload.qty} units</span>
                        )}
                        {act.action_type === 'CREATE_SHORTAGE_REQUEST' && (
                          <span>Created shortage request for {act.payload.quantity} units of <strong>{act.payload.medicine_id}</strong></span>
                        )}
                        {act.action_type === 'PATIENT_REMINDER_LOG' && (
                          <span>Patient recorded dose action: <strong>{act.payload.action}</strong></span>
                        )}
                      </div>

                      {act.conflict_details && (
                        <div className="mt-2 p-2 rounded-lg bg-rose-100/70 border border-rose-200 text-xs text-rose-800 flex items-start gap-1.5">
                          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                          <span>{act.conflict_details}</span>
                        </div>
                      )}

                      <div className="mt-2 flex items-center gap-3 text-[11px] text-[#5B6B7A]">
                        <span>Timestamp: {new Date(act.client_timestamp).toLocaleTimeString()}</span>
                        <span>•</span>
                        <span>User: {act.user_name}</span>
                        {act.base_stock !== undefined && (
                          <>
                            <span>•</span>
                            <span>Observed Base Stock: {act.base_stock}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveItem(act.client_action_id)}
                      className="p-1 rounded-md text-[#5B6B7A] hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Discard action"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Privacy & Security Notice */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-[#E3E8EE] space-y-2 text-xs text-[#5B6B7A]">
            <div className="flex items-center gap-2 font-bold text-[#14202B]">
              <HardDrive size={14} className="text-[#0F6B6B]" />
              <span>Offline Security & Device Privacy Notice</span>
            </div>
            <p>
              Offline data stored on this browser utilizes encrypted-at-rest device storage where supported. On shared or public terminals, uncommitted records may remain accessible. Please lock your device or purge cache upon signing out.
            </p>
            <button
              onClick={handlePurgeSensitive}
              className="text-xs font-semibold text-[#0F6B6B] hover:underline"
            >
              Purge sensitive local data from this device
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#E3E8EE] bg-[#F7F9FB] flex items-center justify-between">
          <div className="text-[11px] text-[#5B6B7A]">
            Automatic retry with exponential backoff enabled.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-[#E3E8EE] text-[#14202B] hover:bg-slate-50 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
