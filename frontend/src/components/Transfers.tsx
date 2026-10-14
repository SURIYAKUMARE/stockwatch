import React, { useState, useEffect } from 'react';
import {
  Truck,
  MapPin,
  CheckCircle2,
  Clock,
  Navigation,
  Sliders,
  Layers,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  ArrowLeftRight,
  RefreshCw,
  Zap,
  Check,
  X,
  Send,
  PackageCheck,
  Building,
  RotateCcw,
  ShieldAlert
} from 'lucide-react';
import {
  Centre,
  Medicine,
  TransferSuggestionsData,
  DonorCandidate
} from '../types';
import { translations, Language } from '../i18n';
import { TierBadge } from './TierBadge';
import { LeafletMap } from './LeafletMap';

interface TransfersProps {
  centres: Centre[];
  medicines: Medicine[];
  initialShortageCentreId?: string;
  initialMedicineId?: string;
  lang: Language;
  onRefreshData: () => void;
}

export const Transfers: React.FC<TransfersProps> = ({
  centres,
  medicines,
  initialShortageCentreId,
  initialMedicineId,
  lang,
  onRefreshData
}) => {
  const t = translations[lang];

  const [mapMode, setMapMode] = useState<'leaflet' | 'schematic'>('leaflet');

  const [shortageCentreId, setShortageCentreId] = useState<string>(
    initialShortageCentreId || 'phc_valparai'
  );
  const [medicineId, setMedicineId] = useState<string>(
    initialMedicineId || 'med_pcm'
  );
  const [data, setData] = useState<TransferSuggestionsData | null>(null);
  const [pooledData, setPooledData] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'network' | 'pooled' | 'smart_engine'>('network');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [approvalSuccess, setApprovalSuccess] = useState<string | null>(null);

  // Smart Redistribution Engine State
  const [escalatedOrders, setEscalatedOrders] = useState<any[]>([]);
  const [allTransfers, setAllTransfers] = useState<any[]>([]);
  const [smartSearchQty, setSmartSearchQty] = useState<number>(50);
  const [smartUrgency, setSmartUrgency] = useState<string>('HIGH');
  const [isTriggeringAutoSearch, setIsTriggeringAutoSearch] = useState<boolean>(false);
  const [searchResultDossier, setSearchResultDossier] = useState<any | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // What-If Panel Sliders
  const [consumptionShiftPct, setConsumptionShiftPct] = useState<number>(0);
  const [supplierDelayDays, setSupplierDelayDays] = useState<number>(0);

  const fetchSuggestions = () => {
    setIsLoading(true);
    fetch(`/api/transfers/suggest?centre=${shortageCentreId}&medicine=${medicineId}`)
      .then((res) => res.json())
      .then((json) => {
        setData(json);
        setIsLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setIsLoading(false);
      });
  };

  const fetchPooled = () => {
    fetch('/api/transfers/pooled')
      .then((res) => res.json())
      .then((json) => setPooledData(json))
      .catch((e) => console.error(e));
  };

  const fetchEscalations = () => {
    fetch('/api/redistribution/escalations')
      .then((res) => res.json())
      .then((json) => setEscalatedOrders(Array.isArray(json) ? json : []))
      .catch((e) => console.error(e));

    fetch('/api/transfers')
      .then((res) => res.json())
      .then((json) => setAllTransfers(Array.isArray(json) ? json : []))
      .catch((e) => console.error(e));
  };

  useEffect(() => {
    if (initialShortageCentreId) {
      setShortageCentreId(initialShortageCentreId);
    }
    if (initialMedicineId) {
      setMedicineId(initialMedicineId);
    }
  }, [initialShortageCentreId, initialMedicineId]);

  useEffect(() => {
    fetchSuggestions();
    fetchPooled();
    fetchEscalations();
  }, [shortageCentreId, medicineId]);

  const handleApproveTransfer = async (donor: DonorCandidate) => {
    if (!donor.transfer_qty || donor.transfer_qty <= 0) return;
    setIsApproving(true);
    setApprovalSuccess(null);

    try {
      const res = await fetch('/api/transfers/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          donor_id: donor.donor_id,
          recipient_id: shortageCentreId,
          medicine_id: medicineId,
          qty: donor.transfer_qty,
          user_name: 'Dr. Rajesh (DDHS Coimbatore Approval)'
        })
      });
      const result = await res.json();
      if (result.success) {
        setApprovalSuccess(
          `Successfully approved transfer of ${result.transferred_qty} ${data?.medicine.unit} from ${result.donor.name} to ${result.recipient.name}!`
        );
        onRefreshData();
        fetchSuggestions();
        fetchPooled();
      } else {
        alert(result.error || 'Transfer failed');
      }
    } catch (e) {
      alert('Network error approving transfer');
    } finally {
      setIsApproving(false);
    }
  };

  // Trigger Hierarchical Smart Redistribution Auto-Search
  const handleTriggerAutoSearch = async () => {
    setIsTriggeringAutoSearch(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/redistribution/auto-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine_id: medicineId,
          requested_qty: smartSearchQty,
          urgency: smartUrgency,
          requester_owner_id: shortageCentreId,
          requester_owner_type: 'facility',
          notes: `Automatic multi-tier shortage request from ${shortageCentreId}`
        })
      });
      const json = await res.json();
      setSearchResultDossier(json);
      setActionMessage(json.message || 'Auto-search executed successfully.');
      fetchEscalations();
    } catch (e) {
      alert('Failed to trigger smart redistribution search');
    } finally {
      setIsTriggeringAutoSearch(false);
    }
  };

  // Supplier Offer Response: ACCEPT, REJECT, COUNTER
  const handleOfferResponse = async (transferId: string, action: 'ACCEPT' | 'REJECT' | 'COUNTER', counterQty?: number, reason?: string) => {
    try {
      const res = await fetch(`/api/transfers/${transferId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          counter_qty: counterQty,
          rejection_reason: reason || 'Stock committed to local community camp'
        })
      });
      const json = await res.json();
      setActionMessage(json.message || `Action ${action} recorded.`);
      fetchEscalations();
      onRefreshData();
    } catch (e) {
      alert('Failed to respond to offer');
    }
  };

  // Officer Approval for Escalated Transfers
  const handleOfficerApprove = async (transferId: string) => {
    try {
      const res = await fetch(`/api/transfers/${transferId}/approve`, { method: 'POST' });
      if (res.ok) {
        setActionMessage('Transfer approved by authorized officer. Stock reserved for dispatch.');
        fetchEscalations();
        onRefreshData();
      }
    } catch (e) {
      alert('Failed to approve transfer');
    }
  };

  // Dispatch Transfer
  const handleDispatchOrder = async (transferId: string) => {
    try {
      const res = await fetch(`/api/transfers/${transferId}/dispatch`, { method: 'POST' });
      if (res.ok) {
        setActionMessage('Transfer order dispatched. Courier transport in transit.');
        fetchEscalations();
        onRefreshData();
      }
    } catch (e) {
      alert('Failed to dispatch transfer');
    }
  };

  // Receive Transfer (Atomically updates donor & recipient balances)
  const handleReceiveOrder = async (transferId: string) => {
    try {
      const res = await fetch(`/api/transfers/${transferId}/receive`, { method: 'POST' });
      if (res.ok) {
        setActionMessage('Stock received & verified! Recipient inventory balance updated atomically.');
        fetchEscalations();
        onRefreshData();
      }
    } catch (e) {
      alert('Failed to receive transfer');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Success Banner */}
      {approvalSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-lg text-xs font-semibold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{approvalSuccess}</span>
          </div>
          <button
            onClick={() => setApprovalSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Screen Header & Top Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E3E8EE] shadow-xs">
        <div>
          <h2 className="text-base font-bold text-[#14202B]">
            {t.transfer_title}
          </h2>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            {t.transfer_subtitle}
          </p>
        </div>

        {/* Dual Selectors */}
        <div className="flex items-center gap-3">
          <select
            value={shortageCentreId}
            onChange={(e) => setShortageCentreId(e.target.value)}
            className="text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-md px-3 py-2 text-[#14202B] font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#0F6B6B]"
          >
            {centres.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} (Shortage Centre)
              </option>
            ))}
          </select>

          <select
            value={medicineId}
            onChange={(e) => setMedicineId(e.target.value)}
            className="text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-md px-3 py-2 text-[#14202B] font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#0F6B6B]"
          >
            {medicines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mode Tabs: Network Optimizer vs Block Pooled View vs Smart Engine */}
      <div className="flex gap-2 border-b border-[#E3E8EE] overflow-x-auto">
        <button
          onClick={() => setActiveTab('network')}
          className={`pb-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'network'
              ? 'border-[#0F6B6B] text-[#0F6B6B]'
              : 'border-transparent text-[#5B6B7A] hover:text-[#14202B]'
          }`}
        >
          <Truck size={14} />
          <span>Point-to-Point Donor Optimizer</span>
        </button>
        <button
          onClick={() => setActiveTab('pooled')}
          className={`pb-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'pooled'
              ? 'border-[#0F6B6B] text-[#0F6B6B]'
              : 'border-transparent text-[#5B6B7A] hover:text-[#14202B]'
          }`}
        >
          <Layers size={14} />
          <span>{t.pooled_view_title}</span>
        </button>
        <button
          onClick={() => setActiveTab('smart_engine')}
          className={`pb-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'smart_engine'
              ? 'border-[#0F6B6B] text-[#0F6B6B]'
              : 'border-transparent text-[#5B6B7A] hover:text-[#14202B]'
          }`}
        >
          <Zap size={14} className="text-amber-500" />
          <span>Smart Redistribution Engine & Escalations</span>
          {escalatedOrders.length > 0 && (
            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-[10px] rounded-full font-extrabold">
              {escalatedOrders.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'network' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: Map & What-If Panel (2 cols) */}
          <div className="xl:col-span-2 space-y-6">
            {/* Interactive Network Map Visualization */}
            <div className="bg-white rounded-lg border border-[#E3E8EE] p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#14202B] flex items-center gap-1.5">
                    <Navigation size={15} className="text-[#0F6B6B]" />
                    <span>District Spatial Network & Donor Routing</span>
                  </h3>
                  <p className="text-xs text-[#5B6B7A] mt-0.5">
                    Haversine distance and road transit time proxy (~35 km/h rural mountain transit).
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1 bg-[#F7F9FB] border border-[#E3E8EE] p-0.5 rounded-md">
                    <button
                      onClick={() => setMapMode('leaflet')}
                      className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                        mapMode === 'leaflet'
                          ? 'bg-[#0F6B6B] text-white shadow-xs'
                          : 'text-[#5B6B7A] hover:text-[#14202B]'
                      }`}
                    >
                      Tile Map (Leaflet)
                    </button>
                    <button
                      onClick={() => setMapMode('schematic')}
                      className={`px-2 py-1 rounded text-[11px] font-bold transition-colors ${
                        mapMode === 'schematic'
                          ? 'bg-[#0F6B6B] text-white shadow-xs'
                          : 'text-[#5B6B7A] hover:text-[#14202B]'
                      }`}
                    >
                      Schematic
                    </button>
                  </div>
                  <span className="flex items-center gap-1 text-red-600 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600" /> Shortage
                  </span>
                  <span className="flex items-center gap-1 text-teal-700 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-teal-600" /> Verified Donors
                  </span>
                </div>
              </div>

              {/* Spatial Routing Map Component */}
              {mapMode === 'leaflet' ? (
                <LeafletMap
                  shortageCentre={data?.shortage_centre}
                  donors={data?.suggested_donors}
                />
              ) : (
                <div className="relative h-72 w-full bg-slate-900 rounded-lg overflow-hidden border border-slate-800 p-4">
                <svg className="w-full h-full" viewBox="0 0 600 280">
                  {/* Background grid lines */}
                  <defs>
                    <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
                      <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                    </pattern>
                  </defs>
                  <rect width="100%" height="100%" fill="url(#grid)" />

                  {/* Connecting Transit Paths */}
                  {data?.suggested_donors.map((donor, idx) => {
                    const donorX = 350 + (idx * 60);
                    const donorY = 60 + (idx * 55);
                    return (
                      <g key={donor.donor_id}>
                        <line
                          x1="180"
                          y1="150"
                          x2={donorX}
                          y2={donorY}
                          stroke="#14B8A6"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          className="animate-pulse"
                        />
                        <text
                          x={(180 + donorX) / 2}
                          y={(150 + donorY) / 2 - 6}
                          fill="#99F6E4"
                          fontSize="10"
                          fontWeight="bold"
                          textAnchor="middle"
                        >
                          {donor.distance_km} km ({donor.road_time_mins}m)
                        </text>
                      </g>
                    );
                  })}

                  {/* Shortage Centre Pin (Red) */}
                  <g transform="translate(180, 150)">
                    <circle r="18" fill="#EF4444" fillOpacity="0.25" className="animate-ping" />
                    <circle r="10" fill="#DC2626" />
                    <circle r="4" fill="#FFFFFF" />
                    <text x="0" y="24" fill="#FCA5A5" fontSize="11" fontWeight="bold" textAnchor="middle">
                      {data?.shortage_centre.name}
                    </text>
                    <text x="0" y="36" fill="#FFFFFF" fontSize="9" textAnchor="middle">
                      Need: {data?.shortage_centre.needed_qty} {data?.medicine.unit}
                    </text>
                  </g>

                  {/* Donor Centre Pins (Teal) */}
                  {data?.suggested_donors.map((donor, idx) => {
                    const donorX = 350 + (idx * 60);
                    const donorY = 60 + (idx * 55);
                    return (
                      <g key={donor.donor_id} transform={`translate(${donorX}, ${donorY})`}>
                        <circle r="9" fill="#0D9488" />
                        <circle r="3.5" fill="#FFFFFF" />
                        <text x="14" y="2" fill="#FFFFFF" fontSize="10" fontWeight="bold">
                          {donor.donor_name}
                        </text>
                        <text x="14" y="14" fill="#5EEAD4" fontSize="9">
                          Surplus: +{donor.surplus} {data?.medicine.unit}
                        </text>
                      </g>
                    );
                  })}
                </svg>

                <div className="absolute bottom-2 left-2 text-[10px] text-slate-400 bg-slate-950/80 px-2 py-1 rounded-sm">
                  GPS Coordinates: Anaimalai & Coimbatore District Network
                </div>
              </div>
              )}
            </div>

            {/* What-If Live Sensitivity Sliders */}
            <div className="bg-white rounded-lg border border-[#E3E8EE] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E3E8EE]">
                <h3 className="text-xs font-bold text-[#14202B] flex items-center gap-1.5 uppercase tracking-wider text-[#5B6B7A]">
                  <Sliders size={14} className="text-[#0F6B6B]" />
                  <span>{t.what_if_title}</span>
                </h3>
                <span className="text-[11px] text-[#0F6B6B] font-semibold">
                  Live Dynamic Sensitivity
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-[#14202B]">{t.slider_consumption}:</span>
                    <span className="font-bold tabular-nums text-teal-800">
                      {consumptionShiftPct > 0 ? '+' : ''}{consumptionShiftPct}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="-40"
                    max="60"
                    step="5"
                    value={consumptionShiftPct}
                    onChange={(e) => setConsumptionShiftPct(parseInt(e.target.value))}
                    className="w-full accent-[#0F6B6B]"
                  />
                  <div className="flex justify-between text-[10px] text-[#5B6B7A] mt-0.5">
                    <span>-40% (Drop)</span>
                    <span>0% (Baseline)</span>
                    <span>+60% (Fever Epidemic)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-[#14202B]">{t.slider_supplier_delay}:</span>
                    <span className="font-bold tabular-nums text-rose-700">
                      +{supplierDelayDays} days
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="14"
                    step="1"
                    value={supplierDelayDays}
                    onChange={(e) => setSupplierDelayDays(parseInt(e.target.value))}
                    className="w-full accent-rose-600"
                  />
                  <div className="flex justify-between text-[10px] text-[#5B6B7A] mt-0.5">
                    <span>0d (On Time)</span>
                    <span>+7d (Depot Delay)</span>
                    <span>+14d (Emergency Halt)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Ranked Donor Cards (1 col) */}
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg border border-[#E3E8EE] shadow-xs space-y-1">
              <h3 className="text-sm font-bold text-[#14202B]">
                {t.donor_cards_title}
              </h3>
              <p className="text-xs text-[#5B6B7A]">
                Ranked by shortest road-transit distance and surplus availability.
              </p>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-xs text-[#5B6B7A] animate-pulse">
                Computing donor safety buffers...
              </div>
            ) : data?.suggested_donors.length === 0 ? (
              <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-xs text-amber-900">
                No donors within safety buffer. All network centres near threshold. Emergency Indent required.
              </div>
            ) : (
              data?.suggested_donors.map((donor, idx) => (
                <div
                  key={donor.donor_id}
                  className="bg-white rounded-lg border border-[#E3E8EE] hover:border-[#0F6B6B] p-4 shadow-xs space-y-3 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-teal-100 text-[#0F6B6B] text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <h4 className="text-xs font-bold text-[#14202B]">
                        {donor.donor_name}
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded-sm">
                      {donor.distance_km} km · ~{donor.road_time_mins} min
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="bg-[#F7F9FB] p-2 rounded-md">
                      <span className="text-[10px] text-[#5B6B7A]">On-Hand Stock</span>
                      <div className="font-bold text-[#14202B] tabular-nums">
                        {donor.current_stock} {data.medicine.unit}
                      </div>
                    </div>
                    <div className="bg-[#F7F9FB] p-2 rounded-md">
                      <span className="text-[10px] text-[#5B6B7A]">Safety Threshold</span>
                      <div className="font-bold text-[#14202B] tabular-nums">
                        {donor.safety_stock} {data.medicine.unit}
                      </div>
                    </div>
                  </div>

                  {/* Bilateral Transfer Impact: Effect on BOTH Centres */}
                  <div className="bg-[#F0FDF4] border border-emerald-200 rounded-lg p-3 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-[11px] font-bold text-emerald-900 border-b border-emerald-200 pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <ArrowLeftRight size={13} className="text-emerald-700" />
                        <span>Bilateral Transfer Impact (Both Centres)</span>
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold tabular-nums">
                        +{donor.transfer_qty} {data.medicine.unit} Shift
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {/* Recipient Centre (Shortage Solved) */}
                      <div className="bg-white p-2 rounded-md border border-emerald-100 space-y-1">
                        <div className="text-[10px] font-bold text-red-700 uppercase truncate">
                          Shortage: {data.shortage_centre.name}
                        </div>
                        <div className="text-[#5B6B7A] text-[10px]">
                          Stock: <span className="line-through text-red-500">{donor.recipient_stock_before ?? data.shortage_centre.current_stock}</span> → <strong className="text-emerald-700">{donor.recipient_stock_after ?? (data.shortage_centre.current_stock + (donor.transfer_qty || 0))}</strong>
                        </div>
                        <div className="text-[#5B6B7A] text-[10px]">
                          Cover: <span className="text-red-500 font-semibold">{donor.recipient_days_of_cover_before ?? data.shortage_centre.days_of_cover ?? 4}d</span> → <strong className="text-emerald-700">{donor.recipient_days_of_cover_after ?? 18}d</strong>
                        </div>
                        <div className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded-sm inline-block">
                          ✓ Stockout Averted
                        </div>
                      </div>

                      {/* Donor Centre (Safety Buffer Preserved) */}
                      <div className="bg-white p-2 rounded-md border border-emerald-100 space-y-1">
                        <div className="text-[10px] font-bold text-teal-800 uppercase truncate">
                          Donor: {donor.donor_name}
                        </div>
                        <div className="text-[#5B6B7A] text-[10px]">
                          Stock: <span className="text-slate-500">{donor.current_stock}</span> → <strong className="text-[#14202B]">{donor.stock_after_transfer}</strong>
                        </div>
                        <div className="text-[#5B6B7A] text-[10px]">
                          Cover: <span className="text-slate-500">{donor.donor_days_of_cover_before ?? Math.round(donor.current_stock / donor.velocity)}d</span> → <strong className="text-[#0F6B6B]">{donor.days_of_cover_after}d</strong>
                        </div>
                        <div className="text-[9px] font-bold text-teal-700 bg-teal-50 px-1 py-0.5 rounded-sm inline-block">
                          ✓ Buffer Preserved (SAFE)
                        </div>
                      </div>
                    </div>

                    <div className="text-[10px] text-[#5B6B7A] flex items-center justify-between pt-1 border-t border-emerald-100">
                      <span>Transit: <strong>{donor.distance_km} km</strong> (~{donor.road_time_mins} min road)</span>
                      <span className="text-emerald-800 font-semibold">Net cover gained: +{donor.days_of_cover_gained ?? 14}d</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleApproveTransfer(donor)}
                    disabled={isApproving}
                    className="w-full py-2 bg-[#0F6B6B] hover:bg-[#0a4f4f] text-white text-xs font-bold rounded-md transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 size={14} />
                    <span>Approve {donor.transfer_qty} {data.medicine.unit} Transfer</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : activeTab === 'pooled' ? (
        /* Block-Level Pooled View */
        <div className="bg-white rounded-lg border border-[#E3E8EE] p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-[#14202B]">
              Pooled Inventory vs Collective Demand by Block
            </h3>
            <p className="text-xs text-[#5B6B7A] mt-0.5">
              Aggregated stock cushions across PHC facilities within the same administrative block.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pooledData.map((blk) => (
              <div key={blk.block} className="border border-[#E3E8EE] rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[#E3E8EE]">
                  <h4 className="text-sm font-bold text-[#14202B]">
                    {blk.block} Block ({blk.centre_count} PHCs)
                  </h4>
                  <span className="text-xs font-semibold text-[#0F6B6B]">
                    Coimbatore District
                  </span>
                </div>

                <div className="space-y-2.5">
                  {blk.medicines.map((m: any) => (
                    <div key={m.medicine_id} className="flex items-center justify-between text-xs p-2 rounded-md bg-[#F7F9FB]">
                      <div>
                        <div className="font-semibold text-[#14202B]">{m.medicine_name}</div>
                        <div className="text-[10px] text-[#5B6B7A]">
                          Burn: {m.pooled_daily_burn}/day · Cover: ~{m.days_of_pooled_cover} days
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold tabular-nums text-[#14202B]">
                          {m.pooled_stock} {m.unit}
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${
                          m.balance_status === 'Shortage'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {m.balance_status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Smart Hierarchical Redistribution Engine & Officer Escalations */
        <div className="space-y-6">
          {/* Header Action Card */}
          <div className="bg-gradient-to-r from-teal-900 to-[#0F6B6B] text-white rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-300 bg-white/10 px-2 py-0.5 rounded-full">
                  Real-Time Automation Engine
                </span>
                <h3 className="text-base font-bold mt-1 text-white flex items-center gap-2">
                  <Zap size={18} className="text-amber-400" />
                  <span>Hierarchical Multi-Tier Medicine Redistribution</span>
                </h3>
                <p className="text-xs text-teal-100 max-w-2xl mt-0.5">
                  Automated fallback searching: Town network (&lt;5km) → Nearby town pharmacies (&lt;15km) → District facilities (&lt;50km) → State warehouses (&lt;250km) → National channels.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTriggerAutoSearch}
                  disabled={isTriggeringAutoSearch}
                  className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {isTriggeringAutoSearch ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  <span>Trigger Auto-Search for Shortage</span>
                </button>
              </div>
            </div>

            {/* Quick configuration row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-white/15 text-xs">
              <div className="bg-white/10 rounded-lg p-2.5">
                <span className="text-[10px] text-teal-200 uppercase font-semibold">Shortage Facility</span>
                <div className="font-bold text-white mt-0.5">{centres.find(c => c.id === shortageCentreId)?.name || shortageCentreId}</div>
              </div>
              <div className="bg-white/10 rounded-lg p-2.5">
                <span className="text-[10px] text-teal-200 uppercase font-semibold">Medicine & Requested Units</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-bold text-white">{medicines.find(m => m.id === medicineId)?.name || medicineId}</span>
                  <input
                    type="number"
                    value={smartSearchQty}
                    onChange={e => setSmartSearchQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 px-1.5 py-0.5 text-xs rounded bg-white text-[#14202B] font-bold text-center"
                  />
                </div>
              </div>
              <div className="bg-white/10 rounded-lg p-2.5">
                <span className="text-[10px] text-teal-200 uppercase font-semibold">Urgency Classification</span>
                <div className="flex gap-1.5 mt-0.5">
                  {(['ROUTINE', 'URGENT', 'CRITICAL'] as const).map(u => (
                    <button
                      key={u}
                      onClick={() => setSmartUrgency(u)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                        smartUrgency === u
                          ? u === 'CRITICAL' ? 'bg-red-500 text-white' : 'bg-amber-400 text-slate-950'
                          : 'bg-white/20 text-teal-100 hover:bg-white/30'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Message Banner */}
          {actionMessage && (
            <div className="bg-teal-50 border border-teal-300 text-teal-900 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={16} className="text-teal-600" />
                <span>{actionMessage}</span>
              </div>
              <button onClick={() => setActionMessage(null)} className="text-[#5B6B7A] hover:text-[#14202B]">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Section 1: Active Officer Escalation Dossiers */}
          <div className="bg-white rounded-xl border border-[#E3E8EE] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE]">
              <div>
                <h4 className="text-sm font-bold text-[#14202B] flex items-center gap-2">
                  <ShieldAlert size={16} className="text-red-600" />
                  <span>Administrative Escalation Dossiers (Awaiting Officer Approval)</span>
                </h4>
                <p className="text-xs text-[#5B6B7A] mt-0.5">
                  Shortages unresolved by local pharmacies automatically escalate up the health hierarchy with verified audit dossiers.
                </p>
              </div>
              <span className="px-2.5 py-1 bg-red-50 text-red-700 text-xs font-bold rounded-lg border border-red-200">
                {escalatedOrders.length} Pending Review
              </span>
            </div>

            {escalatedOrders.length === 0 ? (
              <div className="text-center py-6 text-xs text-[#5B6B7A]">
                No pending escalation dossiers. All local inter-facility transfers resolved within SLA.
              </div>
            ) : (
              <div className="space-y-3">
                {escalatedOrders.map(esc => (
                  <div key={esc.id} className="border border-red-200 bg-red-50/30 rounded-xl p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-red-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#14202B]">{esc.medicine_name}</span>
                          <span className="text-xs text-[#5B6B7A]">({esc.strength} · {esc.dosage_form})</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-100 text-red-800">
                            {esc.urgency_level}
                          </span>
                        </div>
                        <div className="text-xs text-[#5B6B7A] mt-0.5">
                          Reference: <span className="font-mono font-semibold">{esc.transfer_reference}</span> · Created: {esc.created_at}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#14202B] bg-white px-3 py-1 rounded-lg border border-[#E3E8EE]">
                          Qty: {esc.quantity} units
                        </span>
                        {esc.status === 'APPROVED' ? (
                          <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-lg">
                            Approved
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOfficerApprove(esc.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                          >
                            <Check size={13} />
                            <span>Approve Redistribution</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Escalation Dossier Audit Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs bg-white p-3 rounded-lg border border-[#E3E8EE]">
                      <div>
                        <span className="text-[10px] text-[#5B6B7A] uppercase font-bold">Requesting Facility</span>
                        <div className="font-semibold text-[#14202B]">{esc.to_owner_id} ({esc.to_owner_type})</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#5B6B7A] uppercase font-bold">Escalation Tier & Role</span>
                        <div className="font-semibold text-rose-700">Tier: {esc.escalation_level} · Role: {esc.current_owner_role}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-[#5B6B7A] uppercase font-bold">Officer Approval Flag</span>
                        <div className="font-semibold text-amber-700">{esc.requires_officer_approval ? 'Required' : 'Granted'}</div>
                      </div>
                    </div>

                    {esc.rejection_reasons && esc.rejection_reasons.length > 0 && (
                      <div className="text-xs bg-amber-50 border border-amber-200 rounded-lg p-2.5 space-y-1">
                        <span className="text-[10px] font-bold text-amber-900 uppercase">Prior Supplier Rejections:</span>
                        <ul className="list-disc pl-4 text-[11px] text-amber-800 space-y-0.5">
                          {esc.rejection_reasons.map((r: string, idx: number) => (
                            <li key={idx}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Complete Transfer Lifecycle Monitor */}
          <div className="bg-white rounded-xl border border-[#E3E8EE] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE]">
              <div>
                <h4 className="text-sm font-bold text-[#14202B]">
                  Transfer Lifecycle & Atomic Stock Reservations
                </h4>
                <p className="text-xs text-[#5B6B7A] mt-0.5">
                  Tracks status: Created → Offered → Accepted → Reserved → Dispatched → Received.
                </p>
              </div>
              <button
                onClick={fetchEscalations}
                className="text-xs text-[#0F6B6B] hover:underline font-bold flex items-center gap-1"
              >
                <RefreshCw size={13} />
                <span>Refresh Status</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-[#E3E8EE] rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F9FB] border-b border-[#E3E8EE] text-[#5B6B7A] uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-3">Reference</th>
                    <th className="py-2.5 px-3">From (Supplier / PHC)</th>
                    <th className="py-2.5 px-3">To (Recipient)</th>
                    <th className="py-2.5 px-3">Qty</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Stock Reserved</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E8EE]">
                  {allTransfers.map((trf) => (
                    <tr key={trf.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-[#14202B]">{trf.transfer_reference}</td>
                      <td className="py-3 px-3 text-[#14202B] font-semibold">{trf.from_owner_id}</td>
                      <td className="py-3 px-3 text-[#14202B] font-semibold">{trf.to_owner_id}</td>
                      <td className="py-3 px-3 tabular-nums font-bold text-[#0F6B6B]">{trf.quantity}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          trf.status === 'RECEIVED' ? 'bg-emerald-100 text-emerald-800' :
                          trf.status === 'DISPATCHED' ? 'bg-blue-100 text-blue-800' :
                          trf.status === 'RESERVED' || trf.status === 'APPROVED' ? 'bg-teal-100 text-[#0F6B6B]' :
                          trf.status === 'OFFERED' ? 'bg-amber-100 text-amber-800' :
                          trf.status === 'ESCALATED' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {trf.status}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {trf.stock_reserved ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <ShieldCheck size={13} />
                            <span>Atomic Lock</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {trf.status === 'OFFERED' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOfferResponse(trf.id, 'ACCEPT')}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px]"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleOfferResponse(trf.id, 'REJECT')}
                              className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded font-bold text-[10px]"
                            >
                              Reject & Fallback
                            </button>
                          </div>
                        )}
                        {(trf.status === 'APPROVED' || trf.status === 'RESERVED') && (
                          <button
                            onClick={() => handleDispatchOrder(trf.id)}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[10px]"
                          >
                            Dispatch
                          </button>
                        )}
                        {trf.status === 'DISPATCHED' && (
                          <button
                            onClick={() => handleReceiveOrder(trf.id)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-bold text-[10px]"
                          >
                            Verify & Receive
                          </button>
                        )}
                        {trf.status === 'RECEIVED' && (
                          <span className="text-[11px] text-emerald-700 font-semibold">Completed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
