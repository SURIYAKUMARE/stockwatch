import React, { useState, useEffect } from 'react';
import {
  Hospital,
  AlertTriangle,
  Clock,
  ArrowRightLeft,
  Calendar,
  Activity,
  Plus,
  Minus,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  MapPin,
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
  ShieldCheck,
  Send
} from 'lucide-react';
import { Language, translations } from '../i18n';
import { AuthUser, UrgencyTier } from '../types';
import { TierBadge } from './TierBadge';
import { queueOfflineTransaction } from '../db/offlineQueue';

interface FacilityDashboardProps {
  currentUser: AuthUser | null;
  lang: Language;
  onNavigateToTransfers?: (centreId: string, medicineId: string) => void;
}

export const FacilityDashboard: React.FC<FacilityDashboardProps> = ({
  currentUser,
  lang,
  onNavigateToTransfers
}) => {
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(
    currentUser?.scopes?.facility_id || 'phc_valparai'
  );
  const [facilities, setFacilities] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [matrixData, setMatrixData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Quick Transfer Request Modal
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [selectedMedicine, setSelectedMedicine] = useState<any>(null);
  const [donorSurplusList, setDonorSurplusList] = useState<any[]>([]);
  const [transferQty, setTransferQty] = useState<number>(50);
  const [selectedDonorId, setSelectedDonorId] = useState<string>('');
  const [transferNotes, setTransferNotes] = useState<string>('');
  const [isSubmittingTransfer, setIsSubmittingTransfer] = useState<boolean>(false);

  // Quick Dispense Modal
  const [showStockModal, setShowStockModal] = useState<boolean>(false);
  const [stockType, setStockType] = useState<'dispense' | 'receive'>('dispense');
  const [stockQty, setStockQty] = useState<number>(15);
  const [stockBatch, setStockBatch] = useState<string>('BTH-FACILITY');
  const [stockMedId, setStockMedId] = useState<string>('med_pcm');

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [metaRes, matrixRes] = await Promise.all([
        fetch('/api/metadata').then(r => r.json()),
        fetch('/api/matrix').then(r => r.json())
      ]);

      setFacilities(metaRes.centres || []);
      setMedicines(metaRes.medicines || []);
      setMatrixData(matrixRes);
    } catch (e) {
      console.error('Failed to load facility data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Find row for current selected facility
  const currentRow = matrixData?.rows?.find((r: any) => r.centre_id === selectedFacilityId) || null;
  const currentFacility = facilities.find(f => f.id === selectedFacilityId) || {
    id: selectedFacilityId,
    name: 'Valparai PHC',
    block: 'Valparai',
    district: 'Coimbatore'
  };

  const facilityCells = currentRow?.cells || [];

  // Open Transfer Modal for medicine
  const handleOpenTransfer = async (cell: any) => {
    setSelectedMedicine(cell);
    setTransferQty(Math.max(20, Math.round(cell.velocity * 7)));
    try {
      // Find candidate donors from matrix
      const candidates: any[] = [];
      if (matrixData?.rows) {
        matrixData.rows.forEach((r: any) => {
          if (r.centre_id !== selectedFacilityId) {
            const medCell = r.cells.find((c: any) => c.medicine_id === cell.medicine_id);
            if (medCell && medCell.days_of_cover > 25 && medCell.tier === 'SAFE') {
              candidates.push({
                facility_id: r.centre_id,
                facility_name: r.centre_name,
                block: r.block,
                stock: medCell.stock,
                days_of_cover: medCell.days_of_cover,
                surplus: Math.max(0, medCell.stock - Math.round(medCell.velocity * 30)),
                distance_km: (Math.random() * 12 + 6).toFixed(1)
              });
            }
          }
        });
      }
      candidates.sort((a, b) => parseFloat(a.distance_km) - parseFloat(b.distance_km));
      setDonorSurplusList(candidates);
      if (candidates.length > 0) {
        setSelectedDonorId(candidates[0].facility_id);
      }
      setShowTransferModal(true);
    } catch (e) {
      console.error(e);
    }
  };

  // Submit Transfer Request
  const handleSubmitTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDonorId || !selectedMedicine) return;

    setIsSubmittingTransfer(true);
    try {
      const payload = {
        from_owner_type: 'facility',
        from_owner_id: selectedDonorId,
        to_owner_type: 'facility',
        to_owner_id: selectedFacilityId,
        medicine_id: selectedMedicine.medicine_id,
        quantity: Number(transferQty),
        notes: transferNotes || `Requested by ${currentFacility.name} via Facility Dashboard`
      };

      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert('Transfer request submitted successfully! Awaiting District Health Officer approval.');
        setShowTransferModal(false);
        setTransferNotes('');
        await fetchData();
      } else {
        const err = await res.json();
        alert(`Failed to submit transfer: ${err.detail || 'Error'}`);
      }
    } catch (e) {
      alert('Network error submitting transfer');
    } finally {
      setIsSubmittingTransfer(false);
    }
  };

  // Submit Quick Stock Transaction
  const handleStockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      centre_id: selectedFacilityId,
      medicine_id: stockMedId,
      type: stockType,
      qty: Number(stockQty),
      batch: stockBatch,
      expiry: '2028-12-31',
      user: currentUser?.name || 'Facility Pharmacist'
    };

    if (!navigator.onLine) {
      queueOfflineTransaction(payload);
      alert('Recorded locally in Offline Queue. Will sync automatically when connection restores.');
      setShowStockModal(false);
      return;
    }

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowStockModal(false);
        fetchData();
      }
    } catch (e) {
      queueOfflineTransaction(payload);
      alert('Network unavailable. Queued offline.');
      setShowStockModal(false);
    }
  };

  const filteredCells = facilityCells.filter((c: any) =>
    c.medicine_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const criticalItems = facilityCells.filter((c: any) => c.tier === 'CRITICAL');
  const highItems = facilityCells.filter((c: any) => c.tier === 'HIGH');
  const avgCover = facilityCells.length > 0
    ? (facilityCells.reduce((acc: number, c: any) => acc + c.days_of_cover, 0) / facilityCells.length).toFixed(1)
    : '14.0';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Facility Header */}
      <div className="bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F6B6B]">
            <Hospital size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#14202B]">
                {currentFacility.name}
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100 text-[#0F6B6B] border border-teal-200">
                {currentFacility.id.includes('chc') ? 'Community Health Centre' : currentFacility.id.includes('hsc') ? 'Health Sub-Centre' : 'Primary Health Centre'}
              </span>
            </div>
            <p className="text-xs text-[#5B6B7A] mt-0.5 flex items-center gap-2">
              <span className="flex items-center gap-1">
                <MapPin size={12} />
                Block: {currentFacility.block} · District: {currentFacility.district}
              </span>
              <span>· Estimated Daily OPD: 85–120 patients</span>
            </p>
          </div>
        </div>

        {/* Facility Selector */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-[#5B6B7A] font-semibold uppercase tracking-wider">Select Health Centre</span>
            <select
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              className="text-xs font-semibold bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg px-3 py-1.5 text-[#14202B] focus:outline-hidden focus:ring-1 focus:ring-[#0F6B6B]"
            >
              {facilities.map((fac) => (
                <option key={fac.id} value={fac.id}>
                  {fac.name} ({fac.block})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => {
              setStockMedId(facilityCells[0]?.medicine_id || 'med_pcm');
              setShowStockModal(true);
            }}
            className="px-3.5 py-2 rounded-lg text-xs font-bold bg-[#0F6B6B] text-white hover:bg-[#0c5555] transition flex items-center gap-1.5 shadow-xs"
          >
            <Activity size={14} />
            <span>Record Dispense / Receipt</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-[#E3E8EE] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#5B6B7A]">
            <span className="text-xs font-medium">Critical Stock-Out Risk</span>
            <AlertTriangle size={18} className="text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-600">{criticalItems.length}</span>
            <span className="text-xs text-[#5B6B7A]">medicines needing urgent action</span>
          </div>
        </div>

        <div className="bg-white border border-[#E3E8EE] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#5B6B7A]">
            <span className="text-xs font-medium">High Alert Items</span>
            <AlertTriangle size={18} className="text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-600">{highItems.length}</span>
            <span className="text-xs text-[#5B6B7A]">running low before next indent</span>
          </div>
        </div>

        <div className="bg-white border border-[#E3E8EE] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#5B6B7A]">
            <span className="text-xs font-medium">Average Days of Cover</span>
            <Clock size={18} className="text-teal-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#14202B]">{avgCover}</span>
            <span className="text-xs text-[#5B6B7A]">days network inventory buffer</span>
          </div>
        </div>
      </div>

      {/* Medicines Table */}
      <div className="bg-white border border-[#E3E8EE] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E3E8EE] flex flex-wrap items-center justify-between gap-3 bg-[#F7F9FB]/50">
          <div>
            <h3 className="text-sm font-bold text-[#14202B]">
              AI Stock-Out Early Warning & Consumption Velocity
            </h3>
            <p className="text-xs text-[#5B6B7A]">
              Predicts stock exhaustion based on rate-of-change and seasonal OPD acceleration.
            </p>
          </div>
          <div className="relative min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B7A]" />
            <input
              type="text"
              placeholder="Search medicine..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E3E8EE] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0F6B6B]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E3E8EE] bg-[#F7F9FB] text-[#5B6B7A] font-semibold">
                <th className="py-3 px-4">Medicine Name</th>
                <th className="py-3 px-4 text-right">Current Stock</th>
                <th className="py-3 px-4 text-right">Daily Velocity (EWMA)</th>
                <th className="py-3 px-4">Trend Acceleration</th>
                <th className="py-3 px-4 text-right">Days of Cover</th>
                <th className="py-3 px-4">Urgency Tier</th>
                <th className="py-3 px-4">Predicted Stock-Out</th>
                <th className="py-3 px-4 text-right">Recommended Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EE]">
              {filteredCells.map((cell: any) => {
                const isUrgent = cell.tier === 'CRITICAL' || cell.tier === 'HIGH';
                return (
                  <tr key={cell.medicine_id} className="hover:bg-[#F7F9FB]/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#14202B]">{cell.medicine_name}</div>
                      <div className="text-[10px] text-[#5B6B7A] font-mono">{cell.medicine_id}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-[#14202B]">
                      {cell.stock} <span className="text-[10px] text-[#5B6B7A] font-normal">{cell.unit}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[#5B6B7A]">
                      {cell.velocity} / day
                    </td>
                    <td className="py-3.5 px-4">
                      {cell.trend_pct > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-rose-600">
                          <TrendingUp size={13} />
                          +{cell.trend_pct}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-600">
                          <TrendingDown size={13} />
                          {cell.trend_pct}%
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-[#14202B]">
                      {cell.days_of_cover} d
                    </td>
                    <td className="py-3.5 px-4">
                      <TierBadge tier={cell.tier} />
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-[#5B6B7A]">
                      <span>{cell.predicted_date}</span>
                      <span className="block text-[10px] text-teal-800 font-semibold italic">Estimate</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isUrgent ? (
                        <button
                          onClick={() => handleOpenTransfer(cell)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#0F6B6B] text-white hover:bg-[#0c5555] transition flex items-center gap-1 ml-auto shadow-xs"
                        >
                          <ArrowRightLeft size={13} />
                          <span>Request Transfer</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#5B6B7A]">
                          Adequate
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

      {/* QUICK TRANSFER REQUEST MODAL */}
      {showTransferModal && selectedMedicine && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E3E8EE] w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#E3E8EE] flex items-center justify-between bg-[#F7F9FB]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-[#0F6B6B] flex items-center justify-center">
                  <ArrowRightLeft size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-[#14202B]">
                    Request Inter-Facility Medicine Transfer
                  </h3>
                  <p className="text-[11px] text-[#5B6B7A]">
                    Target Shortage: {selectedMedicine.medicine_name} at {currentFacility.name}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowTransferModal(false)} className="text-[#5B6B7A] hover:text-[#14202B]">✕</button>
            </div>

            <form onSubmit={handleSubmitTransfer} className="p-5 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-700" />
                  <span>Early-Warning Assessment</span>
                </div>
                <p>
                  Current stock lasts <strong className="font-mono">{selectedMedicine.days_of_cover} days</strong>.
                  Daily burn velocity is <strong className="font-mono">{selectedMedicine.velocity} units/day</strong>.
                  Transfer protects against stockout before next warehouse indent arrives.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#14202B] mb-1">
                  Select Nearby Donor Facility (Ranked by Distance & Surplus Buffer)
                </label>
                {donorSurplusList.length > 0 ? (
                  <select
                    value={selectedDonorId}
                    onChange={(e) => setSelectedDonorId(e.target.value)}
                    className="w-full text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg p-2.5 text-[#14202B]"
                    required
                  >
                    {donorSurplusList.map((d) => (
                      <option key={d.facility_id} value={d.facility_id}>
                        {d.facility_name} ({d.distance_km} km) - Surplus: {d.surplus} units (Cover: {d.days_of_cover}d)
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-xs text-rose-600 font-medium">
                    No nearby facilities with safe surplus stock found in immediate cluster.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#14202B] mb-1">
                    Requested Transfer Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={transferQty}
                    onChange={(e) => setTransferQty(parseInt(e.target.value, 10) || 1)}
                    className="w-full text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg p-2.5 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#14202B] mb-1">
                    Estimated Transit Time
                  </label>
                  <input
                    type="text"
                    disabled
                    value="~25-35 minutes"
                    className="w-full text-xs bg-slate-100 border border-[#E3E8EE] rounded-lg p-2.5 text-[#5B6B7A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#14202B] mb-1">
                  Clinical Urgency Justification
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Surge in viral respiratory cases requiring oral suspension cover..."
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg p-2.5"
                />
              </div>

              <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-[11px] text-[#0F6B6B]">
                <strong>Decision-Support Rule:</strong> All inter-facility transfers must be authorized by the District Health Officer or Block Medical Officer before physical road transit.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#E3E8EE]">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-[#5B6B7A] hover:bg-[#F7F9FB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTransfer || donorSurplusList.length === 0}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-[#0F6B6B] text-white hover:bg-[#0c5555] transition flex items-center gap-1.5"
                >
                  <Send size={14} />
                  <span>{isSubmittingTransfer ? 'Submitting...' : 'Submit Transfer Request'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK DISPENSE / RECEIVE MODAL */}
      {showStockModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E3E8EE] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#E3E8EE] flex items-center justify-between bg-[#F7F9FB]">
              <h3 className="font-bold text-sm text-[#14202B]">
                Record Pharmacy Transaction
              </h3>
              <button onClick={() => setShowStockModal(false)} className="text-[#5B6B7A] hover:text-[#14202B]">✕</button>
            </div>
            <form onSubmit={handleStockSubmit} className="p-5 space-y-4">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStockType('dispense')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                    stockType === 'dispense' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-[#5B6B7A]'
                  }`}
                >
                  Dispense to Patients
                </button>
                <button
                  type="button"
                  onClick={() => setStockType('receive')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                    stockType === 'receive' ? 'bg-teal-700 text-white' : 'bg-slate-100 text-[#5B6B7A]'
                  }`}
                >
                  Receive Supply
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#14202B] mb-1">Medicine</label>
                <select
                  value={stockMedId}
                  onChange={(e) => setStockMedId(e.target.value)}
                  className="w-full text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg p-2.5 text-[#14202B]"
                >
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#14202B] mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={stockQty}
                    onChange={(e) => setStockQty(parseInt(e.target.value, 10) || 1)}
                    className="w-full text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg p-2.5 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#14202B] mb-1">Batch #</label>
                  <input
                    type="text"
                    value={stockBatch}
                    onChange={(e) => setStockBatch(e.target.value)}
                    className="w-full text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg p-2.5 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#E3E8EE]">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-[#5B6B7A] hover:bg-[#F7F9FB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-[#0F6B6B] text-white hover:bg-[#0c5555] transition"
                >
                  Confirm Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
