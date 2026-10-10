import React, { useState } from 'react';
import {
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  WifiOff,
  RefreshCw
} from 'lucide-react';
import { Centre, Medicine, UrgencyTier } from '../types';
import { translations, Language } from '../i18n';
import { TierBadge } from './TierBadge';
import { addToOfflineQueue } from '../db/offlineQueue';

interface StockEntryProps {
  centres: Centre[];
  medicines: Medicine[];
  lang: Language;
  isOnline: boolean;
  onTransactionSuccess: (result: any) => void;
  onRefreshData: () => void;
}

export const StockEntry: React.FC<StockEntryProps> = ({
  centres,
  medicines,
  lang,
  isOnline,
  onTransactionSuccess,
  onRefreshData
}) => {
  const t = translations[lang];

  const [selectedCentre, setSelectedCentre] = useState<string>(centres[0]?.id || 'phc_valparai');
  const [selectedMedicine, setSelectedMedicine] = useState<string>(medicines[0]?.id || 'med_pcm');
  const [activeTab, setActiveTab] = useState<'dispense' | 'receive' | 'adjust'>('dispense');
  const [quantity, setQuantity] = useState<number>(10);
  const [batchNo, setBatchNo] = useState<string>('BTH-2026-09');
  const [expiryDate, setExpiryDate] = useState<string>('2027-12-31');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [updatedForecast, setUpdatedForecast] = useState<any | null>(null);

  // Data Quality Guard confirmation modal state
  const [guardWarning, setGuardWarning] = useState<string | null>(null);

  const handleSubmit = async (overrideConfirm: boolean = false) => {
    if (quantity <= 0) return;
    setIsSubmitting(true);
    setGuardWarning(null);

    const payload = {
      centre_id: selectedCentre,
      medicine_id: selectedMedicine,
      type: activeTab,
      qty: quantity,
      batch: batchNo,
      expiry: expiryDate,
      user: 'PHC Pharmacist',
      confirmed: overrideConfirm
    };

    if (!isOnline) {
      // Save to IndexedDB / localStorage queue
      addToOfflineQueue(payload);
      setIsSubmitting(false);
      setUpdatedForecast({
        offline: true,
        message: 'Saved to local device. Will sync automatically upon reconnection.'
      });
      return;
    }

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.requires_confirmation) {
        setGuardWarning(data.message);
        setIsSubmitting(false);
        return;
      }

      if (!res.ok) {
        alert(data.detail || 'Transaction failed');
        setIsSubmitting(false);
        return;
      }

      setUpdatedForecast(data);
      onTransactionSuccess(data);
      onRefreshData();
    } catch (e) {
      // Network failed during send -> queue offline
      addToOfflineQueue(payload);
      setUpdatedForecast({
        offline: true,
        message: 'Network offline. Saved to device queue.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-[#14202B]">
          {t.entry_title}
        </h2>
        <p className="text-xs text-[#5B6B7A] mt-0.5">
          {t.entry_subtitle}
        </p>
      </div>

      {/* Main Form Card */}
      <div className="bg-white rounded-lg border border-[#E3E8EE] p-6 shadow-xs space-y-6">
        {/* Transaction Type Tabs */}
        <div className="flex border-b border-[#E3E8EE] gap-2">
          <button
            onClick={() => setActiveTab('dispense')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'dispense'
                ? 'border-[#0F6B6B] text-[#0F6B6B]'
                : 'border-transparent text-[#5B6B7A] hover:text-[#14202B]'
            }`}
          >
            {t.tab_dispense}
          </button>
          <button
            onClick={() => setActiveTab('receive')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'receive'
                ? 'border-[#0F6B6B] text-[#0F6B6B]'
                : 'border-transparent text-[#5B6B7A] hover:text-[#14202B]'
            }`}
          >
            {t.tab_receive}
          </button>
          <button
            onClick={() => setActiveTab('adjust')}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === 'adjust'
                ? 'border-[#0F6B6B] text-[#0F6B6B]'
                : 'border-transparent text-[#5B6B7A] hover:text-[#14202B]'
            }`}
          >
            {t.tab_adjust}
          </button>
        </div>

        {/* Form Fields Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Centre Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#14202B] mb-1.5">
              {t.field_centre}
            </label>
            <select
              value={selectedCentre}
              onChange={(e) => setSelectedCentre(e.target.value)}
              className="w-full text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-md px-3 py-2 text-[#14202B] font-medium focus:outline-hidden focus:ring-1 focus:ring-[#0F6B6B]"
            >
              {centres.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.block})
                </option>
              ))}
            </select>
          </div>

          {/* Medicine Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#14202B] mb-1.5">
              {t.field_medicine}
            </label>
            <select
              value={selectedMedicine}
              onChange={(e) => setSelectedMedicine(e.target.value)}
              className="w-full text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-md px-3 py-2 text-[#14202B] font-medium focus:outline-hidden focus:ring-1 focus:ring-[#0F6B6B]"
            >
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Quantity Stepper */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-[#14202B] mb-1.5">
              {t.field_quantity}
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 5))}
                className="w-10 h-10 rounded-md border border-[#E3E8EE] bg-[#F7F9FB] text-[#14202B] flex items-center justify-center hover:bg-gray-100 font-bold"
              >
                <Minus size={16} />
              </button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-32 h-10 text-center font-bold text-base bg-[#F7F9FB] border border-[#E3E8EE] rounded-md tabular-nums focus:outline-hidden focus:ring-1 focus:ring-[#0F6B6B]"
              />
              <button
                type="button"
                onClick={() => setQuantity(quantity + 5)}
                className="w-10 h-10 rounded-md border border-[#E3E8EE] bg-[#F7F9FB] text-[#14202B] flex items-center justify-center hover:bg-gray-100 font-bold"
              >
                <Plus size={16} />
              </button>
              <div className="flex gap-1.5 text-xs">
                {[10, 25, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setQuantity(amt)}
                    className="px-2.5 py-1 rounded-sm border border-[#E3E8EE] hover:bg-[#F7F9FB] text-[#5B6B7A] font-medium"
                  >
                    +{amt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Batch & Expiry */}
          <div>
            <label className="block text-xs font-semibold text-[#14202B] mb-1.5">
              {t.field_batch}
            </label>
            <input
              type="text"
              value={batchNo}
              onChange={(e) => setBatchNo(e.target.value)}
              className="w-full text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-md px-3 py-2 text-[#14202B] font-mono focus:outline-hidden focus:ring-1 focus:ring-[#0F6B6B]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#14202B] mb-1.5">
              {t.field_expiry}
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-md px-3 py-2 text-[#14202B] focus:outline-hidden focus:ring-1 focus:ring-[#0F6B6B]"
            />
          </div>
        </div>

        {/* Data Quality Guard Warning Modal */}
        {guardWarning && (
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-300 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
              <AlertTriangle size={16} className="text-amber-600" />
              <span>Data-Quality Guard Flag</span>
            </div>
            <p className="text-xs text-amber-800">
              {guardWarning}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => handleSubmit(true)}
                className="px-3 py-1.5 bg-amber-700 text-white text-xs font-bold rounded-md hover:bg-amber-800"
              >
                Confirm Intentional Entry
              </button>
              <button
                onClick={() => setGuardWarning(null)}
                className="px-3 py-1.5 bg-white text-[#5B6B7A] border border-amber-300 text-xs font-medium rounded-md"
              >
                Cancel & Review
              </button>
            </div>
          </div>
        )}

        {/* Big Submit Button */}
        <button
          onClick={() => handleSubmit(false)}
          disabled={isSubmitting}
          className="w-full py-3.5 bg-[#0F6B6B] hover:bg-[#0a4f4f] text-white font-bold text-sm rounded-lg transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isSubmitting ? (
            <RefreshCw size={16} className="animate-spin" />
          ) : (
            <CheckCircle2 size={16} />
          )}
          <span>{t.btn_submit_entry}</span>
        </button>
      </div>

      {/* Live "Forecast Updated" Card */}
      {updatedForecast && (
        <div className="bg-white rounded-lg border border-teal-200 p-5 shadow-xs bg-gradient-to-br from-teal-50/40 to-white space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0F6B6B]">
              <Sparkles size={16} />
              <span>{t.forecast_updated_title}</span>
            </div>
            {updatedForecast.forecast && (
              <TierBadge tier={updatedForecast.forecast.tier} size="sm" lang={lang} />
            )}
          </div>

          {updatedForecast.offline ? (
            <div className="text-xs text-amber-800 bg-amber-50 p-3 rounded-md border border-amber-200 flex items-center gap-2">
              <WifiOff size={16} />
              <span>{updatedForecast.message}</span>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 pt-1 text-center">
              <div className="bg-white p-2.5 rounded-md border border-[#E3E8EE]">
                <div className="text-[10px] text-[#5B6B7A]">Updated Stock</div>
                <div className="text-base font-bold text-[#14202B] tabular-nums mt-0.5">
                  {updatedForecast.new_stock}
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-md border border-[#E3E8EE]">
                <div className="text-[10px] text-[#5B6B7A]">Days of Cover</div>
                <div className="text-base font-bold text-[#14202B] tabular-nums mt-0.5">
                  {updatedForecast.forecast?.days_of_cover}d
                </div>
              </div>
              <div className="bg-white p-2.5 rounded-md border border-[#E3E8EE]">
                <div className="text-[10px] text-[#5B6B7A]">Predicted Out (Est)</div>
                <div className="text-xs font-bold text-rose-700 mt-1">
                  {updatedForecast.forecast?.predicted_stockout_date}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
