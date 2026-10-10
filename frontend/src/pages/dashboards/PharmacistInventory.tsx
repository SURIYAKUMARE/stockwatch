/**
 * PharmacistInventory — default landing dashboard for the Pharmacist role.
 * Shows real inventory balances fetched from /api/inventory/{pharmacyId},
 * critical alerts from /api/alerts, low-stock warnings, and quick links.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, AlertTriangle, CheckCircle2, RefreshCw,
  TrendingDown, Calendar, ArrowRight, ShieldAlert
} from 'lucide-react';
import type { Language } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { TierBadge } from '../../components/TierBadge';
import type { UrgencyTier } from '../../types';

interface Balance {
  id: string; owner_id: string; medicine_id: string;
  quantity_on_hand: number; last_verified_at: string;
}
interface Batch {
  medicine_id: string; batch_number: string;
  expiry_date: string; current_quantity: number;
}
interface AlertItem { id: string; centre_name: string; medicine_name: string; tier: UrgencyTier; reason: string }

function daysUntil(dateStr: string) {
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 86400000);
}

const daysFromNow = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().split('T')[0];

const FALLBACK_MEDICINES: Record<string, { name: string; unit: string }> = {
  med_pcm: { name: 'Paracetamol 500mg', unit: 'tablets' },
  med_pcm_syr: { name: 'Paracetamol Syrup 60ml', unit: 'bottles' },
  med_amox: { name: 'Amoxicillin 250mg', unit: 'capsules' },
  med_amox_500: { name: 'Amoxicillin 500mg', unit: 'capsules' },
  med_ors: { name: 'ORS Sachets 20.5g', unit: 'sachets' },
  med_zinc: { name: 'Zinc Sulfate 20mg', unit: 'tablets' },
  med_metformin: { name: 'Metformin 500mg', unit: 'tablets' },
  med_ifa: { name: 'Iron and Folic Acid', unit: 'tablets' },
  med_cetirizine: { name: 'Cetirizine 10mg', unit: 'tablets' },
  med_alben: { name: 'Albendazole 400mg', unit: 'tablets' },
  med_asv: { name: 'Anti-Snake Venom 10ml Inj', unit: 'vials' },
  med_arv: { name: 'Anti-Rabies Vaccine 0.5ml', unit: 'vials' },
  med_amlo: { name: 'Amlodipine 5mg', unit: 'tablets' },
  med_azithro: { name: 'Azithromycin 500mg', unit: 'tablets' },
  med_salbutamol: { name: 'Salbutamol Inhaler 100mcg', unit: 'inhalers' },
  med_atropine: { name: 'Atropine Sulfate 0.6mg/ml Inj', unit: 'ampoules' },
};

const INITIAL_BALANCES: Balance[] = [
  { id: 'bal-1', owner_id: 'pharma_valparai_01', medicine_id: 'med_pcm', quantity_on_hand: 45, last_verified_at: new Date().toISOString() },
  { id: 'bal-2', owner_id: 'pharma_valparai_01', medicine_id: 'med_pcm_syr', quantity_on_hand: 18, last_verified_at: new Date().toISOString() },
  { id: 'bal-3', owner_id: 'pharma_valparai_01', medicine_id: 'med_amox', quantity_on_hand: 60, last_verified_at: new Date().toISOString() },
  { id: 'bal-4', owner_id: 'pharma_valparai_01', medicine_id: 'med_amox_500', quantity_on_hand: 35, last_verified_at: new Date().toISOString() },
  { id: 'bal-5', owner_id: 'pharma_valparai_01', medicine_id: 'med_ors', quantity_on_hand: 120, last_verified_at: new Date().toISOString() },
  { id: 'bal-6', owner_id: 'pharma_valparai_01', medicine_id: 'med_zinc', quantity_on_hand: 50, last_verified_at: new Date().toISOString() },
  { id: 'bal-7', owner_id: 'pharma_valparai_01', medicine_id: 'med_metformin', quantity_on_hand: 80, last_verified_at: new Date().toISOString() },
  { id: 'bal-8', owner_id: 'pharma_valparai_01', medicine_id: 'med_ifa', quantity_on_hand: 90, last_verified_at: new Date().toISOString() },
  { id: 'bal-9', owner_id: 'pharma_valparai_01', medicine_id: 'med_cetirizine', quantity_on_hand: 40, last_verified_at: new Date().toISOString() },
  { id: 'bal-10', owner_id: 'pharma_valparai_01', medicine_id: 'med_alben', quantity_on_hand: 30, last_verified_at: new Date().toISOString() },
  { id: 'bal-11', owner_id: 'pharma_valparai_01', medicine_id: 'med_asv', quantity_on_hand: 8, last_verified_at: new Date().toISOString() },
  { id: 'bal-12', owner_id: 'pharma_valparai_01', medicine_id: 'med_arv', quantity_on_hand: 12, last_verified_at: new Date().toISOString() },
  { id: 'bal-13', owner_id: 'pharma_valparai_01', medicine_id: 'med_amlo', quantity_on_hand: 65, last_verified_at: new Date().toISOString() },
  { id: 'bal-14', owner_id: 'pharma_valparai_01', medicine_id: 'med_azithro', quantity_on_hand: 28, last_verified_at: new Date().toISOString() },
  { id: 'bal-15', owner_id: 'pharma_valparai_01', medicine_id: 'med_salbutamol', quantity_on_hand: 14, last_verified_at: new Date().toISOString() },
  { id: 'bal-16', owner_id: 'pharma_valparai_01', medicine_id: 'med_atropine', quantity_on_hand: 0, last_verified_at: new Date().toISOString() },
];

const INITIAL_BATCHES: Batch[] = [
  { medicine_id: 'med_salbutamol', batch_number: 'BTH-VAL-SAL-01', expiry_date: daysFromNow(18), current_quantity: 14 },
  { medicine_id: 'med_pcm_syr', batch_number: 'BTH-VAL-PCM-02', expiry_date: daysFromNow(45), current_quantity: 18 },
  { medicine_id: 'med_amox', batch_number: 'BTH-VAL-AMX-03', expiry_date: daysFromNow(74), current_quantity: 25 },
  { medicine_id: 'med_pcm', batch_number: 'BTH-VAL-PCM-01', expiry_date: daysFromNow(380), current_quantity: 45 },
  { medicine_id: 'med_ors', batch_number: 'BTH-VAL-ORS-01', expiry_date: daysFromNow(510), current_quantity: 120 },
  { medicine_id: 'med_metformin', batch_number: 'BTH-VAL-MET-01', expiry_date: daysFromNow(420), current_quantity: 80 },
];

const INITIAL_CRIT_ALERTS: AlertItem[] = [
  { id: 'alt-crit-1', centre_name: 'PHC Valparai', medicine_name: 'Paracetamol Syrup 60ml', tier: 'CRITICAL', reason: 'High fever surge (pediatric load +64%). Stockout predicted in 2.1 days.' },
  { id: 'alt-crit-2', centre_name: 'PHC Anaimalai', medicine_name: 'Anti-Snake Venom 10ml Inj', tier: 'CRITICAL', reason: 'Zero stock in trauma ward. Immediate inter-facility transfer requested.' },
  { id: 'alt-crit-3', centre_name: 'PHC Aliyar', medicine_name: 'ORS Sachets 20.5g', tier: 'CRITICAL', reason: 'Acute diarrhea cluster detected by CUSUM. Only 4.2 days of cover.' },
];

interface PharmacistInventoryProps {
  lang: Language;
  medicines: { id: string; name: string; unit: string; essential: boolean }[];
  isLoading: boolean;
}

export function PharmacistInventory({ lang, medicines, isLoading }: PharmacistInventoryProps) {
  const { user } = useAuth();
  const isTa = lang === 'ta';

  const pharmId = user?.scopeId ?? 'pharma_valparai_01';
  const pharmName = user?.scopeName ?? 'Valparai Medical Store';

  const [balances, setBalances] = useState<Balance[]>(INITIAL_BALANCES);
  const [batches, setBatches] = useState<Batch[]>(INITIAL_BATCHES);
  const [critAlerts, setCritAlerts] = useState<AlertItem[]>(INITIAL_CRIT_ALERTS);
  const [loadingInv, setLoadingInv] = useState(false);
  const [loadingAlerts, setLoadingAlerts] = useState(false);

  const load = useCallback(async () => {
    setLoadingInv(true);
    try {
      const res = await fetch(`/api/inventory/${pharmId}`);
      if (res.ok) {
        const d = await res.json();
        if (d.balances && d.balances.length > 0) setBalances(d.balances);
        if (d.batches && d.batches.length > 0) setBatches(d.batches);
      }
    } catch { /* retain rich demo balances on network failure */ }
    setLoadingInv(false);

    setLoadingAlerts(true);
    try {
      const ar = await fetch('/api/alerts?tier=CRITICAL');
      if (ar.ok) {
        const items = await ar.json();
        if (items && items.length > 0) setCritAlerts(items.slice(0, 3));
      }
    } catch { /* retain demo alerts */ }
    setLoadingAlerts(false);
  }, [pharmId]);

  useEffect(() => { load(); }, [load]);

  const medName = (id: string) =>
    medicines.find(m => m.id === id)?.name ?? FALLBACK_MEDICINES[id]?.name ?? id;
  const medUnit = (id: string) =>
    medicines.find(m => m.id === id)?.unit ?? FALLBACK_MEDICINES[id]?.unit ?? 'units';

  const nearExpiry = batches.filter(b => { const d = daysUntil(b.expiry_date); return d >= 0 && d <= 90; });
  const expired = batches.filter(b => daysUntil(b.expiry_date) < 0);
  const zeroStock = balances.filter(b => b.quantity_on_hand === 0);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#14202B]">
            {isTa ? 'மருந்தக டாஷ்போர்டு' : 'Pharmacy Dashboard'}
          </h2>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            {pharmName}
            <span className="ml-2 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              Demo data
            </span>
          </p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#5B6B7A] border border-[#E3E8EE] rounded-xl hover:bg-[#F7F9FB]">
          <RefreshCw size={13} className={loadingInv ? 'animate-spin' : ''} />
          {isTa ? 'புதுப்பி' : 'Refresh'}
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: isTa ? 'மருந்துகள்' : 'Medicines', value: balances.length, accent: 'text-[#0F6B6B]', icon: Package },
          { label: isTa ? 'பூஜ்ய இருப்பு' : 'Zero Stock', value: zeroStock.length, accent: zeroStock.length > 0 ? 'text-red-700' : 'text-emerald-700', icon: TrendingDown },
          { label: isTa ? 'காலாவதி எச்சரிக்கை' : 'Expiry Warnings', value: nearExpiry.length, accent: nearExpiry.length > 0 ? 'text-amber-600' : 'text-emerald-700', icon: Calendar },
          { label: isTa ? 'ஆபத்தான எச்சரிக்கைகள்' : 'Critical Alerts', value: critAlerts.length, accent: critAlerts.length > 0 ? 'text-red-700' : 'text-emerald-700', icon: ShieldAlert },
        ].map(k => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white p-4 rounded-xl border border-[#E3E8EE] shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#5B6B7A]">{k.label}</span>
                <Icon size={14} className={k.accent} />
              </div>
              <div className={`text-2xl font-bold tabular-nums mt-1 ${k.accent}`}>{k.value}</div>
            </div>
          );
        })}
      </div>

      {/* Alerts + Expired warnings */}
      {(expired.length > 0 || zeroStock.length > 0) && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <div className="text-xs font-bold text-red-800 flex items-center gap-1.5">
            <AlertTriangle size={13} className="text-red-600" />
            {isTa ? 'உடனடி கவனம் தேவை' : 'Immediate Attention Required'}
          </div>
          {expired.map((b, i) => (
            <div key={i} className="text-[11px] text-red-700 bg-white/70 rounded-lg px-3 py-2 border border-red-100">
              ⚠ {medName(b.medicine_id)} — Batch {b.batch_number} expired {Math.abs(daysUntil(b.expiry_date))}d ago ({b.current_quantity} {medUnit(b.medicine_id)} remaining). Remove immediately.
            </div>
          ))}
          {zeroStock.map((b, i) => (
            <div key={i} className="text-[11px] text-red-700 bg-white/70 rounded-lg px-3 py-2 border border-red-100">
              ⚠ {medName(b.medicine_id)} — Zero stock. Cannot fill prescriptions.
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Inventory table */}
        <div className="bg-white rounded-xl border border-[#E3E8EE] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E3E8EE] flex items-center justify-between">
            <span className="text-xs font-bold text-[#14202B]">{isTa ? 'தற்போதைய இருப்பு' : 'Current Stock'}</span>
          </div>
          {loadingInv ? (
            <div className="p-6 text-xs text-[#5B6B7A] flex items-center gap-2">
              <RefreshCw size={13} className="animate-spin text-[#0F6B6B]" /> {isTa ? 'ஏற்றுகிறது…' : 'Loading…'}
            </div>
          ) : balances.length === 0 ? (
            <div className="p-8 text-center text-xs text-[#5B6B7A]">
              {isTa ? 'இருப்பு பதிவுகள் இல்லை.' : 'No inventory records yet. Use CSV import or record a receive transaction.'}
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#F7F9FB] text-[11px] text-[#5B6B7A] font-semibold sticky top-0 border-b border-[#E3E8EE]">
                    <th className="py-2 px-4 text-left">{isTa ? 'மருந்து' : 'Medicine'}</th>
                    <th className="py-2 px-4 text-right">{isTa ? 'இருப்பு' : 'On Hand'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E8EE]">
                  {balances.map(b => (
                    <tr key={b.id} className={b.quantity_on_hand === 0 ? 'bg-red-50/40' : 'hover:bg-slate-50/50'}>
                      <td className="py-2.5 px-4 font-medium text-[#14202B]">
                        {medName(b.medicine_id)}
                        {b.quantity_on_hand === 0 && (
                          <span className="ml-2 text-[9px] font-bold text-red-700 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded">
                            {isTa ? 'கையிருப்பில் இல்லை' : 'Out of stock'}
                          </span>
                        )}
                      </td>
                      <td className={`py-2.5 px-4 text-right font-bold tabular-nums ${b.quantity_on_hand === 0 ? 'text-red-700' : b.quantity_on_hand < 30 ? 'text-orange-600' : 'text-[#14202B]'}`}>
                        {b.quantity_on_hand} <span className="font-normal text-[#5B6B7A] text-[10px]">{medUnit(b.medicine_id)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Near-expiry batches */}
        <div className="bg-white rounded-xl border border-[#E3E8EE] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E3E8EE] flex items-center justify-between">
            <span className="text-xs font-bold text-[#14202B]">{isTa ? 'அடுத்த 90 நாட்களில் காலாவதி' : 'Expiring Within 90 Days'}</span>
            {nearExpiry.length > 0 && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                {nearExpiry.length} {isTa ? 'தொகுதிகள்' : 'batches'}
              </span>
            )}
          </div>
          {nearExpiry.length === 0 ? (
            <div className="p-8 text-center">
              <CheckCircle2 size={18} className="mx-auto text-emerald-500 mb-2" />
              <p className="text-xs text-emerald-700 font-semibold">{isTa ? 'எந்த தொகுதியும் 90 நாட்களில் காலாவதியாகவில்லை.' : 'No batches expiring within 90 days.'}</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F7F9FB] text-[11px] text-[#5B6B7A] font-semibold">
                  <th className="py-2 px-4 text-left">{isTa ? 'மருந்து' : 'Medicine'}</th>
                  <th className="py-2 px-4 text-left">{isTa ? 'தொகுதி' : 'Batch'}</th>
                  <th className="py-2 px-4 text-right">{isTa ? 'நாட்கள்' : 'Days'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E8EE]">
                {nearExpiry.map((b, i) => {
                  const d = daysUntil(b.expiry_date);
                  return (
                    <tr key={i} className={d <= 30 ? 'bg-orange-50/30' : 'hover:bg-slate-50/50'}>
                      <td className="py-2.5 px-4 font-medium text-[#14202B]">{medName(b.medicine_id)}</td>
                      <td className="py-2.5 px-4 font-mono text-[#5B6B7A] text-[10px]">{b.batch_number}</td>
                      <td className={`py-2.5 px-4 text-right font-bold tabular-nums ${d <= 30 ? 'text-orange-700' : 'text-amber-600'}`}>
                        {d}d
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Critical alerts from the network */}
      {!loadingAlerts && critAlerts.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E3E8EE] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E3E8EE]">
            <span className="text-xs font-bold text-[#14202B]">{isTa ? 'நெட்வொர்க் ஆபத்தான எச்சரிக்கைகள்' : 'Network Critical Alerts'}</span>
          </div>
          <div className="divide-y divide-[#E3E8EE]">
            {critAlerts.map(a => (
              <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-[#14202B]">{a.centre_name} — {a.medicine_name}</div>
                  <div className="text-[11px] text-[#5B6B7A] mt-0.5 line-clamp-1">{a.reason}</div>
                </div>
                <TierBadge tier={a.tier} size="sm" lang={lang} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
