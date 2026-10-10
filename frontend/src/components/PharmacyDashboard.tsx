import React, { useState, useEffect } from 'react';
import {
  Building2,
  Package,
  AlertTriangle,
  Clock,
  MessageSquare,
  UploadCloud,
  Plus,
  Minus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  FileText,
  RefreshCw,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Check,
  Info,
  WifiOff
} from 'lucide-react';
import { Language, translations } from '../i18n';
import { AuthUser } from '../types';
import {
  getCachedInventory,
  saveInventoryToOfflineCache,
  enqueueOfflineAction,
  updateLocalInventoryOptimistic,
  getDeviceId
} from '../db/offlineQueue';

interface PharmacyDashboardProps {
  currentUser: AuthUser | null;
  lang: Language;
}

interface InventoryItem {
  medicine_id: string;
  medicine_name: string;
  generic_name?: string;
  strength: string;
  dosage_form: string;
  quantity: number;
  price_inr?: string;
  last_updated: string;
}

interface BatchItem {
  id: string;
  medicine_id: string;
  batch_number: string;
  expiry_date: string;
  current_quantity: number;
}

interface CustomerEnquiry {
  id: string;
  pharmacy_id: string;
  medicine_id: string;
  patient_name: string;
  patient_phone: string;
  requested_quantity: number;
  status: 'PENDING' | 'CONFIRMED' | 'OUT_OF_STOCK';
  created_at: string;
}

export const PharmacyDashboard: React.FC<PharmacyDashboardProps> = ({
  currentUser,
  lang
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'enquiries' | 'import' | 'batches'>('inventory');
  const [pharmacyId, setPharmacyId] = useState<string>(
    currentUser?.scopes?.pharmacy_id || 'pharma_coimbatore_central'
  );
  const [pharmacyList, setPharmacyList] = useState<any[]>([]);
  const [pharmacyInfo, setPharmacyInfo] = useState<any>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [enquiries, setEnquiries] = useState<CustomerEnquiry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'safe'>('all');

  // Transaction Modal State
  const [showTxModal, setShowTxModal] = useState<boolean>(false);
  const [txType, setTxType] = useState<'dispense' | 'receive' | 'adjust'>('dispense');
  const [selectedMedId, setSelectedMedId] = useState<string>('');
  const [txQty, setTxQty] = useState<number>(10);
  const [txBatch, setTxBatch] = useState<string>('BTH-' + new Date().getFullYear());
  const [txExpiry, setTxExpiry] = useState<string>('2028-06-30');
  const [txReason, setTxReason] = useState<string>('');
  const [txSubmitting, setTxSubmitting] = useState<boolean>(false);

  // CSV Import State
  const [csvText, setCsvText] = useState<string>(
    `medicine_name,strength,dosage_form,batch_number,expiry_date,quantity\nParacetamol,500mg,tablet,BTH-CSV-901,2027-11-30,250\nAmoxicillin,500mg,capsule,BTH-CSV-902,2026-12-15,120\nMetformin,500mg,tablet,BTH-CSV-903,2028-03-31,300`
  );
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Offline PWA State
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(!navigator.onLine);
  const [lastCachedTimestamp, setLastCachedTimestamp] = useState<string | null>(null);
  const [showShortageModal, setShowShortageModal] = useState<boolean>(false);
  const [shortageMedId, setShortageMedId] = useState<string>('med_pcm');
  const [shortageQty, setShortageQty] = useState<number>(50);
  const [shortageUrgency, setShortageUrgency] = useState<string>('URGENT');
  const [offlineShortageIndents, setOfflineShortageIndents] = useState<any[]>([]);

  // Load pharmacies and current details
  const fetchPharmacyData = async () => {
    setIsLoading(true);
    try {
      const [phListRes, availRes, ownerRes, enqRes] = await Promise.all([
        fetch('/api/pharmacies').then(r => r.json()),
        fetch(`/api/pharmacies/${pharmacyId}/availability`).then(r => r.json()),
        fetch(`/api/inventory/${pharmacyId}`).then(r => r.json()),
        fetch(`/api/pharmacies/enquiry?pharmacy_id=${pharmacyId}`).then(r => r.json()).catch(() => [])
      ]);

      setPharmacyList(phListRes || []);
      if (availRes && availRes.pharmacy) {
        setPharmacyInfo(availRes.pharmacy);
        setInventory(availRes.inventory || []);

        // Cache into IndexedDB for offline operation
        if (availRes.inventory) {
          saveInventoryToOfflineCache(
            availRes.inventory.map((inv: any) => ({
              key: `${pharmacyId}_${inv.medicine_id}`,
              centre_id: pharmacyId,
              medicine_id: inv.medicine_id,
              medicine_name: inv.medicine_name,
              unit: 'units',
              current_stock: inv.quantity,
              last_cached_at: new Date().toISOString()
            }))
          ).catch(() => {});
        }
        setIsOfflineMode(false);
        setLastCachedTimestamp(new Date().toLocaleTimeString());
      }
      if (ownerRes && ownerRes.batches) {
        setBatches(ownerRes.batches);
      }
      if (Array.isArray(enqRes)) {
        setEnquiries(enqRes);
      }
    } catch (e) {
      console.warn('Network unreachable, reading cached pharmacy inventory from IndexedDB:', e);
      setIsOfflineMode(true);
      const cached = await getCachedInventory(pharmacyId);
      if (cached && cached.length > 0) {
        setInventory(
          cached.map((c) => ({
            medicine_id: c.medicine_id,
            medicine_name: c.medicine_name,
            strength: 'Standard',
            dosage_form: 'Various',
            quantity: c.current_stock,
            last_updated: c.last_cached_at ? new Date(c.last_cached_at).toLocaleTimeString() : 'Cached Offline'
          }))
        );
        setLastCachedTimestamp(cached[0]?.last_cached_at ? new Date(cached[0].last_cached_at).toLocaleTimeString() : 'Earlier');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPharmacyData();
  }, [pharmacyId]);

  // Handle Inventory Transaction
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedId) return;
    setTxSubmitting(true);

    if (!navigator.onLine) {
      // Offline mutation
      const delta = txType === 'receive' ? Number(txQty) : -Number(txQty);
      await updateLocalInventoryOptimistic(pharmacyId, selectedMedId, delta);
      const currentMed = inventory.find((i) => i.medicine_id === selectedMedId);
      const baseStock = currentMed ? currentMed.quantity : 0;

      await enqueueOfflineAction({
        action_type: txType === 'receive' ? 'RECEIVE' : txType === 'adjust' ? 'STOCK_ADJUST' : 'DISPENSE',
        user_id: currentUser?.username || 'Pharmacist',
        user_name: currentUser?.name || 'Pharmacist',
        user_role: 'pharmacist',
        facility_id: pharmacyId,
        device_id: getDeviceId(),
        base_stock: baseStock,
        payload: {
          centre_id: pharmacyId,
          medicine_id: selectedMedId,
          type: txType,
          qty: Number(txQty),
          batch: txBatch,
          expiry: txExpiry,
          user: currentUser?.name || 'Pharmacist'
        }
      });

      // Optimistic update of local inventory state
      setInventory((prev) =>
        prev.map((item) =>
          item.medicine_id === selectedMedId
            ? { ...item, quantity: Math.max(0, item.quantity + delta), last_updated: 'Pending Sync (Offline)' }
            : item
        )
      );

      setShowTxModal(false);
      setTxReason('');
      setTxSubmitting(false);
      alert('Stock mutation saved locally to IndexedDB queue with status "Pending Sync". Will auto-sync when connected.');
      return;
    }

    try {
      const payload = {
        owner_type: 'pharmacy',
        owner_id: pharmacyId,
        medicine_id: selectedMedId,
        batch_number: txBatch,
        expiry_date: txExpiry,
        transaction_type: txType,
        quantity: Number(txQty),
        source: 'PHARMACIST_PORTAL',
        reason: txReason || `${txType.toUpperCase()} via Pharmacist Dashboard`
      };

      const res = await fetch('/api/inventory/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowTxModal(false);
        setTxReason('');
        await fetchPharmacyData();
      } else {
        const err = await res.json();
        alert(`Transaction failed: ${err.detail || 'Error'}`);
      }
    } catch (err) {
      alert('Network error recording transaction');
    } finally {
      setTxSubmitting(false);
    }
  };

  // Handle Shortage Request (Supports Offline IndexedDB Queue)
  const handleCreateShortageRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shortageMedId) return;

    if (!navigator.onLine) {
      await enqueueOfflineAction({
        action_type: 'CREATE_SHORTAGE_REQUEST',
        user_id: currentUser?.username || 'Pharmacist',
        user_name: currentUser?.name || 'Pharmacist',
        user_role: 'pharmacist',
        facility_id: pharmacyId,
        device_id: getDeviceId(),
        payload: {
          centre_id: pharmacyId,
          medicine_id: shortageMedId,
          quantity: Number(shortageQty),
          urgency_level: shortageUrgency
        }
      });

      setOfflineShortageIndents((prev) => [
        {
          id: 'off_indent_' + Date.now(),
          medicine_id: shortageMedId,
          quantity: Number(shortageQty),
          urgency: shortageUrgency,
          status: 'PENDING_SYNC',
          created_at: new Date().toLocaleTimeString()
        },
        ...prev
      ]);

      setShowShortageModal(false);
      alert('Shortage request saved locally with status "Pending Sync". 6-Tier automated escalation to town, district, and state suppliers will initiate once online.');
      return;
    }

    try {
      const res = await fetch('/api/redistribution/auto-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shortage_facility_id: pharmacyId,
          medicine_id: shortageMedId,
          needed_quantity: Number(shortageQty),
          urgency: shortageUrgency
        })
      });
      if (res.ok) {
        setShowShortageModal(false);
        alert('Shortage request dispatched to smart redistribution network!');
      }
    } catch (e) {
      alert('Network error submitting shortage request');
    }
  };

  // Handle Enquiry Status
  const handleUpdateEnquiry = async (enquiryId: string, action: 'CONFIRM' | 'OUT_OF_STOCK') => {
    try {
      const res = await fetch(`/api/pharmacies/enquiry/${enquiryId}/confirm?action=${action}`, {
        method: 'POST'
      });
      if (res.ok) {
        fetchPharmacyData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Parse and Submit CSV
  const parseCSV = () => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return;
    const headers = lines[0].split(',').map(h => h.trim());
    const parsed = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length >= 6) {
        parsed.push({
          medicine_name: values[0],
          strength: values[1],
          dosage_form: values[2],
          batch_number: values[3],
          expiry_date: values[4],
          quantity: parseInt(values[5], 10) || 0,
          transaction_type: 'receive',
          idempotency_key: `CSV-${pharmacyId}-${values[3]}-${values[0]}`
        });
      }
    }
    setCsvPreview(parsed);
  };

  const handleExecuteImport = async () => {
    if (csvPreview.length === 0) return;
    setImportStatus('Importing rows idempotently...');
    try {
      const payload = {
        owner_type: 'pharmacy',
        owner_id: pharmacyId,
        rows: csvPreview
      };
      const res = await fetch('/api/inventory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        setImportStatus(`Success! Imported ${data.accepted_count} medicines. Rejected: ${data.rejected_count}`);
        fetchPharmacyData();
      } else {
        setImportStatus(`Import error: ${data.detail || 'Failed'}`);
      }
    } catch (e) {
      setImportStatus('Network error executing CSV import');
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesSearch = item.medicine_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.strength.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === 'low') return matchesSearch && item.quantity < 30;
    if (statusFilter === 'safe') return matchesSearch && item.quantity >= 30;
    return matchesSearch;
  });

  const totalStock = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockCount = inventory.filter(item => item.quantity < 30).length;
  const pendingEnquiriesCount = enquiries.filter(e => e.status === 'PENDING').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Offline Mode Alert */}
      {isOfflineMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <WifiOff size={18} className="text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">Offline Pharmacist Mode Active:</span> Viewing cached inventory snapshot
              {lastCachedTimestamp && ` (last synced ${new Date(lastCachedTimestamp).toLocaleTimeString()})`}.
              All stock adjustments, dispensations, and shortage requests are stored safely in local IndexedDB and will synchronize upon reconnection.
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-200 text-amber-900 tracking-wide">
            OFFLINE CACHED
          </span>
        </div>
      )}

      {/* Top Banner / Pharmacy Identity */}
      <div className="bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F6B6B]">
            <Building2 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#14202B]">
                {pharmacyInfo?.name || 'Retail Pharmacy Portal'}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                <ShieldCheck size={12} />
                Verified Licensed Outlet
              </span>
            </div>
            <p className="text-xs text-[#5B6B7A] mt-0.5">
              {pharmacyInfo?.address || 'Gandhipuram, Coimbatore'} · Contact: {pharmacyInfo?.phone || '+91 422 249 8110'}
            </p>
          </div>
        </div>

        {/* Pharmacy Selector (if multi-location or officer) */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-[#5B6B7A] font-semibold uppercase tracking-wider">Active Pharmacy</span>
            <select
              value={pharmacyId}
              onChange={(e) => setPharmacyId(e.target.value)}
              className="text-xs font-semibold bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg px-3 py-1.5 text-[#14202B] focus:outline-hidden focus:ring-1 focus:ring-[#0F6B6B]"
            >
              {pharmacyList.map((ph) => (
                <option key={ph.id} value={ph.id}>
                  {ph.pharmacy_name} ({ph.data_source})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchPharmacyData}
            disabled={isLoading}
            className="p-2 border border-[#E3E8EE] rounded-lg text-[#5B6B7A] hover:bg-[#F7F9FB] hover:text-[#0F6B6B] transition"
            title="Refresh inventory"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E3E8EE] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#5B6B7A]">
            <span className="text-xs font-medium">Total Stock on Hand</span>
            <Package size={18} className="text-[#0F6B6B]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#14202B]">{totalStock.toLocaleString()}</span>
            <span className="text-xs text-[#5B6B7A]">units across {inventory.length} items</span>
          </div>
        </div>

        <div className="bg-white border border-[#E3E8EE] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#5B6B7A]">
            <span className="text-xs font-medium">Low Stock Alerts</span>
            <AlertTriangle size={18} className="text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-600">{lowStockCount}</span>
            <span className="text-xs text-[#5B6B7A]">medicines below threshold</span>
          </div>
        </div>

        <div className="bg-white border border-[#E3E8EE] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#5B6B7A]">
            <span className="text-xs font-medium">Customer Inquiries</span>
            <MessageSquare size={18} className="text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-blue-600">{pendingEnquiriesCount}</span>
            <span className="text-xs text-[#5B6B7A]">pending verification</span>
          </div>
        </div>

        <div className="bg-white border border-[#E3E8EE] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#5B6B7A]">
            <span className="text-xs font-medium">Tracked Batches</span>
            <Layers size={18} className="text-teal-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#14202B]">{batches.length}</span>
            <span className="text-xs text-[#5B6B7A]">active lots with expiry</span>
          </div>
        </div>
      </div>

      {/* Tabs & Navigation */}
      <div className="flex items-center justify-between border-b border-[#E3E8EE] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === 'inventory'
                ? 'bg-[#0F6B6B] text-white shadow-xs'
                : 'text-[#5B6B7A] hover:bg-white'
            }`}
          >
            <Package size={15} />
            <span>Inventory Balances</span>
          </button>
          <button
            onClick={() => setActiveTab('enquiries')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition relative ${
              activeTab === 'enquiries'
                ? 'bg-[#0F6B6B] text-white shadow-xs'
                : 'text-[#5B6B7A] hover:bg-white'
            }`}
          >
            <MessageSquare size={15} />
            <span>Customer Inquiries</span>
            {pendingEnquiriesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {pendingEnquiriesCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('batches')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === 'batches'
                ? 'bg-[#0F6B6B] text-white shadow-xs'
                : 'text-[#5B6B7A] hover:bg-white'
            }`}
          >
            <Clock size={15} />
            <span>Batches & Expiry</span>
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === 'import'
                ? 'bg-[#0F6B6B] text-white shadow-xs'
                : 'text-[#5B6B7A] hover:bg-white'
            }`}
          >
            <UploadCloud size={15} />
            <span>Bulk CSV Import</span>
          </button>
        </div>

        {activeTab === 'inventory' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setTxType('dispense');
                setSelectedMedId(inventory[0]?.medicine_id || '');
                setShowTxModal(true);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 flex items-center gap-1.5"
            >
              <Minus size={14} />
              <span>Dispense Stock</span>
            </button>
            <button
              onClick={() => {
                setTxType('receive');
                setSelectedMedId(inventory[0]?.medicine_id || '');
                setShowTxModal(true);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-teal-50 text-[#0F6B6B] border border-teal-200 hover:bg-teal-100 flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Receive Shipment</span>
            </button>
            <button
              onClick={() => {
                setShortageMedId(inventory[0]?.medicine_id || 'med_pcm');
                setShowShortageModal(true);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1.5"
            >
              <FileText size={14} />
              <span>Create Shortage Indent</span>
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: INVENTORY BALANCES */}
      {activeTab === 'inventory' && (
        <div className="bg-white border border-[#E3E8EE] rounded-xl overflow-hidden shadow-xs">
          {/* Filter Bar */}
          <div className="p-4 border-b border-[#E3E8EE] flex flex-wrap items-center justify-between gap-3 bg-[#F7F9FB]/50">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B7A]" />
              <input
                type="text"
                placeholder="Search by medicine name, dosage or strength..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E3E8EE] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0F6B6B]"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#5B6B7A] font-medium">Filter:</span>
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium ${
                  statusFilter === 'all'
                    ? 'bg-[#0F6B6B] text-white'
                    : 'bg-white border border-[#E3E8EE] text-[#5B6B7A]'
                }`}
              >
                All Items ({inventory.length})
              </button>
              <button
                onClick={() => setStatusFilter('low')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium ${
                  statusFilter === 'low'
                    ? 'bg-amber-600 text-white'
                    : 'bg-white border border-[#E3E8EE] text-[#5B6B7A]'
                }`}
              >
                Low Stock (&lt;30)
              </button>
              <button
                onClick={() => setStatusFilter('safe')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium ${
                  statusFilter === 'safe'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white border border-[#E3E8EE] text-[#5B6B7A]'
                }`}
              >
                Adequate Stock
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E3E8EE] bg-[#F7F9FB] text-[#5B6B7A] font-semibold">
                  <th className="py-3 px-4">Medicine Name</th>
                  <th className="py-3 px-4">Strength & Form</th>
                  <th className="py-3 px-4 text-right">Available Stock</th>
                  <th className="py-3 px-4">Indication Price</th>
                  <th className="py-3 px-4">Availability Status</th>
                  <th className="py-3 px-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E8EE]">
                {filteredInventory.map((item) => {
                  const isLow = item.quantity < 30;
                  const isOut = item.quantity === 0;
                  return (
                    <tr key={item.medicine_id} className="hover:bg-[#F7F9FB]/60 transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#14202B]">{item.medicine_name}</div>
                        <div className="text-[10px] text-[#5B6B7A] font-mono">{item.medicine_id}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-[#14202B] font-mono text-[11px]">
                          {item.strength} · {item.dosage_form}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-mono font-bold text-sm ${
                          isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-emerald-700'
                        }`}>
                          {item.quantity.toLocaleString()}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#5B6B7A]">
                        {item.price_inr || '₹2.50 / tab'}
                      </td>
                      <td className="py-3 px-4">
                        {isOut ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Low Supply
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Available
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedMedId(item.medicine_id);
                              setTxType('dispense');
                              setShowTxModal(true);
                            }}
                            className="p-1.5 rounded hover:bg-rose-50 text-rose-600 transition"
                            title="Dispense"
                          >
                            <Minus size={14} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedMedId(item.medicine_id);
                              setTxType('receive');
                              setShowTxModal(true);
                            }}
                            className="p-1.5 rounded hover:bg-teal-50 text-[#0F6B6B] transition"
                            title="Receive stock"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredInventory.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-[#5B6B7A]">
                      No matching medicines found in current inventory.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CUSTOMER ENQUIRIES */}
      {activeTab === 'enquiries' && (
        <div className="bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#14202B]">Patient Availability Enquiries</h3>
              <p className="text-xs text-[#5B6B7A]">
                Confirm availability for patients before they travel to the pharmacy.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              {pendingEnquiriesCount} Action Needed
            </span>
          </div>

          <div className="divide-y divide-[#E3E8EE] border border-[#E3E8EE] rounded-lg overflow-hidden">
            {enquiries.map((enq) => (
              <div key={enq.id} className="p-4 flex flex-wrap items-center justify-between gap-4 hover:bg-[#F7F9FB]/50 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-[#14202B]">{enq.patient_name}</span>
                    <span className="text-xs font-mono text-[#5B6B7A]">({enq.patient_phone})</span>
                    <span className="text-[10px] text-[#5B6B7A]">
                      · Requested {new Date(enq.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-xs text-[#14202B]">
                    Medicine ID: <span className="font-semibold">{enq.medicine_id}</span> · Quantity: <span className="font-bold">{enq.requested_quantity} units</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {enq.status === 'PENDING' ? (
                    <>
                      <button
                        onClick={() => handleUpdateEnquiry(enq.id, 'CONFIRM')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-1"
                      >
                        <Check size={14} />
                        <span>Confirm Available</span>
                      </button>
                      <button
                        onClick={() => handleUpdateEnquiry(enq.id, 'OUT_OF_STOCK')}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition flex items-center gap-1"
                      >
                        <XCircle size={14} />
                        <span>Mark Out of Stock</span>
                      </button>
                    </>
                  ) : (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      enq.status === 'CONFIRMED'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-100 text-rose-800 border border-rose-200'
                    }`}>
                      {enq.status}
                    </span>
                  )}
                </div>
              </div>
            ))}

            {enquiries.length === 0 && (
              <div className="p-8 text-center text-[#5B6B7A] text-xs">
                No patient enquiries received yet. Enquiries submitted from the Patient Finder will appear here.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: BATCHES & EXPIRY */}
      {activeTab === 'batches' && (
        <div className="bg-white border border-[#E3E8EE] rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#E3E8EE] bg-[#F7F9FB]">
            <h3 className="text-sm font-bold text-[#14202B]">Batches & Expiry Management</h3>
            <p className="text-xs text-[#5B6B7A]">Audited lot numbers, receipt dates, and remaining quantities.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E3E8EE] bg-white text-[#5B6B7A] font-semibold">
                  <th className="py-3 px-4">Batch Number</th>
                  <th className="py-3 px-4">Medicine ID</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4 text-right">Remaining Units</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E8EE]">
                {batches.map((bch) => {
                  const exp = new Date(bch.expiry_date);
                  const isExpiringSoon = (exp.getTime() - Date.now()) < (90 * 24 * 60 * 60 * 1000);
                  return (
                    <tr key={bch.id || bch.batch_number} className="hover:bg-[#F7F9FB]/60 transition">
                      <td className="py-3 px-4 font-mono font-bold text-[#14202B]">{bch.batch_number}</td>
                      <td className="py-3 px-4 font-semibold text-[#0F6B6B]">{bch.medicine_id}</td>
                      <td className="py-3 px-4 text-[#5B6B7A] font-mono">{bch.expiry_date}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-sm text-[#14202B]">
                        {bch.current_quantity}
                      </td>
                      <td className="py-3 px-4">
                        {isExpiringSoon ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Expiring &lt;90 Days
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Safe Expiry
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: BULK CSV IMPORT */}
      {activeTab === 'import' && (
        <div className="bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#14202B]">Bulk CSV Inventory Ingestion</h3>
              <p className="text-xs text-[#5B6B7A]">
                Supports automated ERP sync, idempotent updates, and duplicate validation.
              </p>
            </div>
            <button
              onClick={parseCSV}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0F6B6B] text-white hover:bg-[#0c5555] transition"
            >
              Parse & Preview CSV
            </button>
          </div>

          <textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            rows={5}
            className="w-full font-mono text-xs p-3 bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0F6B6B]"
            placeholder="Paste CSV contents here..."
          />

          {csvPreview.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#14202B]">
                  Parsed Preview ({csvPreview.length} valid rows)
                </span>
                <button
                  onClick={handleExecuteImport}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-1.5"
                >
                  <UploadCloud size={15} />
                  <span>Execute Idempotent Import</span>
                </button>
              </div>

              <div className="border border-[#E3E8EE] rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-[#F7F9FB] text-[#5B6B7A]">
                    <tr className="border-b border-[#E3E8EE]">
                      <th className="p-2.5">Medicine</th>
                      <th className="p-2.5">Strength / Form</th>
                      <th className="p-2.5">Batch</th>
                      <th className="p-2.5">Expiry</th>
                      <th className="p-2.5 text-right">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E8EE]">
                    {csvPreview.map((row, i) => (
                      <tr key={i} className="hover:bg-[#F7F9FB]/50">
                        <td className="p-2.5 font-semibold text-[#14202B]">{row.medicine_name}</td>
                        <td className="p-2.5 text-[#5B6B7A]">{row.strength} · {row.dosage_form}</td>
                        <td className="p-2.5 font-mono text-[#5B6B7A]">{row.batch_number}</td>
                        <td className="p-2.5 font-mono text-[#5B6B7A]">{row.expiry_date}</td>
                        <td className="p-2.5 text-right font-mono font-bold text-teal-800">{row.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {importStatus && (
            <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs font-medium text-[#0F6B6B] flex items-center gap-2">
              <Info size={16} />
              <span>{importStatus}</span>
            </div>
          )}
        </div>
      )}

      {/* TRANSACTION MODAL */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E3E8EE] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#E3E8EE] flex items-center justify-between bg-[#F7F9FB]">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  txType === 'dispense' ? 'bg-rose-100 text-rose-700' : 'bg-teal-100 text-[#0F6B6B]'
                }`}>
                  {txType === 'dispense' ? <Minus size={16} /> : <Plus size={16} />}
                </div>
                <h3 className="font-bold text-sm text-[#14202B] capitalize">
                  {txType} Stock Record
                </h3>
              </div>
              <button
                onClick={() => setShowTxModal(false)}
                className="text-[#5B6B7A] hover:text-[#14202B]"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#14202B] mb-1">
                  Medicine Selection
                </label>
                <select
                  value={selectedMedId}
                  onChange={(e) => setSelectedMedId(e.target.value)}
                  className="w-full text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg p-2.5 text-[#14202B]"
                  required
                >
                  {inventory.map((m) => (
                    <option key={m.medicine_id} value={m.medicine_id}>
                      {m.medicine_name} ({m.strength}) - Current: {m.quantity}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#14202B] mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={txQty}
                    onChange={(e) => setTxQty(parseInt(e.target.value, 10) || 1)}
                    className="w-full text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg p-2.5 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#14202B] mb-1">
                    Batch Number
                  </label>
                  <input
                    type="text"
                    value={txBatch}
                    onChange={(e) => setTxBatch(e.target.value)}
                    className="w-full text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg p-2.5 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#14202B] mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={txExpiry}
                  onChange={(e) => setTxExpiry(e.target.value)}
                  className="w-full text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg p-2.5 font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#14202B] mb-1">
                  Clinical / Reason Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Daily OPD prescription dispensing"
                  value={txReason}
                  onChange={(e) => setTxReason(e.target.value)}
                  className="w-full text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg p-2.5"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#E3E8EE]">
                <button
                  type="button"
                  onClick={() => setShowTxModal(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-[#5B6B7A] hover:bg-[#F7F9FB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={txSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-[#0F6B6B] text-white hover:bg-[#0c5555] transition"
                >
                  {txSubmitting ? 'Recording...' : 'Confirm Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shortage Request Modal */}
      {showShortageModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E3E8EE] max-w-md w-full p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE]">
              <div>
                <h3 className="font-bold text-sm text-[#14202B]">Create Shortage Indent</h3>
                <p className="text-[11px] text-[#5B6B7A]">
                  {isOfflineMode
                    ? 'Request will queue offline with status "Pending Sync" and trigger 6-tier redistribution when online'
                    : 'Dispatches automated 6-tier replenishment across town, district, and state nodes'}
                </p>
              </div>
              <button
                onClick={() => setShowShortageModal(false)}
                className="p-1 rounded-lg hover:bg-[#F7F9FB] text-[#5B6B7A]"
              >
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateShortageRequest} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#14202B] mb-1">
                  Medicine
                </label>
                <select
                  value={shortageMedId}
                  onChange={(e) => setShortageMedId(e.target.value)}
                  className="w-full text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg p-2.5"
                  required
                >
                  {inventory.map((m) => (
                    <option key={m.medicine_id} value={m.medicine_id}>
                      {m.medicine_name} ({m.strength}) - Current: {m.quantity}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#14202B] mb-1">
                    Required Units
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={shortageQty}
                    onChange={(e) => setShortageQty(parseInt(e.target.value, 10) || 1)}
                    className="w-full text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg p-2.5 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#14202B] mb-1">
                    Urgency Level
                  </label>
                  <select
                    value={shortageUrgency}
                    onChange={(e) => setShortageUrgency(e.target.value)}
                    className="w-full text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg p-2.5"
                  >
                    <option value="ROUTINE">Routine (Normal restocking)</option>
                    <option value="URGENT">Urgent (Stock below minimum)</option>
                    <option value="CRITICAL">Critical (Stock zero / Life saving)</option>
                  </select>
                </div>
              </div>

              {isOfflineMode && (
                <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                  <WifiOff size={14} className="shrink-0 mt-0.5" />
                  <span>
                    Device is currently offline. This indent will be signed and stored in IndexedDB with an idempotency key.
                    Official town → district → state escalation begins automatically upon reconnection.
                  </span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#E3E8EE]">
                <button
                  type="button"
                  onClick={() => setShowShortageModal(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-[#5B6B7A] hover:bg-[#F7F9FB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-[#0F6B6B] text-white hover:bg-[#0c5555] transition"
                >
                  {isOfflineMode ? 'Queue Offline Indent' : 'Dispatch Shortage Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
