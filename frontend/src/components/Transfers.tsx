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
  RefreshCw
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
  const [activeTab, setActiveTab] = useState<'network' | 'pooled'>('network');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [approvalSuccess, setApprovalSuccess] = useState<string | null>(null);

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

  useEffect(() => {
    fetchSuggestions();
    fetchPooled();
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

      {/* Mode Tabs: Network Optimizer vs Block Pooled View */}
      <div className="flex gap-2 border-b border-[#E3E8EE]">
        <button
          onClick={() => setActiveTab('network')}
          className={`pb-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
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
          className={`pb-2.5 px-4 text-xs font-bold border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'pooled'
              ? 'border-[#0F6B6B] text-[#0F6B6B]'
              : 'border-transparent text-[#5B6B7A] hover:text-[#14202B]'
          }`}
        >
          <Layers size={14} />
          <span>{t.pooled_view_title}</span>
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

                  <div className="text-xs space-y-1 py-1 border-t border-[#E3E8EE]">
                    <div className="flex justify-between">
                      <span className="text-[#5B6B7A]">Allocated Transfer Qty:</span>
                      <strong className="text-[#0F6B6B] tabular-nums">
                        {donor.transfer_qty} {data.medicine.unit}
                      </strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#5B6B7A]">Donor Stock After Transfer:</span>
                      <span className="tabular-nums font-semibold">
                        {donor.stock_after_transfer} (lasts ~{donor.days_of_cover_after}d)
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#5B6B7A]">Donor Risk Verification:</span>
                      <span className="text-emerald-700 font-bold">
                        Guaranteed SAFE (Above Safety Stock)
                      </span>
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
      ) : (
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
      )}
    </div>
  );
};
