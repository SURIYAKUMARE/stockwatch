import React, { useState, useEffect, useCallback } from 'react';
import {
  Package, AlertTriangle, CheckCircle2, TrendingDown, TrendingUp,
  RefreshCw, Calendar, Layers, ArrowDown, ArrowUp, RotateCcw, Info
} from 'lucide-react';
import type { Language } from '../../i18n';
import { useAuth } from '../../context/AuthContext';
import { TierBadge } from '../../components/TierBadge';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Balance {
  id: string;
  owner_type: string;
  owner_id: string;
  medicine_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  last_verified_at: string;
  version: number;
}

interface Batch {
  id: string;
  owner_type: string;
  owner_id: string;
  medicine_id: string;
  batch_number: string;
  expiry_date: string;
  received_quantity: number;
  current_quantity: number;
  supplier_name?: string;
  created_at: string;
}

interface MedMeta { id: string; name: string; unit: string; essential: boolean }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntilExpiry(expiryDate: string): number {
  const today = new Date();
  const exp = new Date(expiryDate);
  return Math.round((exp.getTime() - today.getTime()) / 86_400_000);
}

function ExpiryStatus({ days }: { days: number }) {
  if (days < 0)
    return <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Expired</span>;
  if (days <= 30)
    return <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">Expires in {days}d</span>;
  if (days <= 90)
    return <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Expires in {days}d</span>;
  return <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Good ({days}d left)</span>;
}

// ─── Transaction entry modal ─────────────────────────────────────────────────

function TransactionPanel({
  ownerId, ownerType, medicines, lang,
  onSuccess
}: {
  ownerId: string;
  ownerType: string;
  medicines: MedMeta[];
  lang: Language;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const [txType, setTxType] = useState<'dispense' | 'receive' | 'adjust'>('dispense');
  const [medicineId, setMedicineId] = useState(medicines[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [batchNumber, setBatchNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('2027-12-31');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [guardWarning, setGuardWarning] = useState<string | null>(null);

  const isTa = lang === 'ta';

  const handleSubmit = async (confirmed = false) => {
    if (!medicineId || quantity < 0) return;
    setIsSubmitting(true);
    setGuardWarning(null);
    setResult(null);

    const idempKey = `TX-${ownerId}-${medicineId}-${txType}-${Date.now()}`;
    try {
      const res = await fetch('/api/inventory/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_type: ownerType,
          owner_id: ownerId,
          medicine_id: medicineId,
          batch_number: batchNumber || 'BTH-MANUAL',
          expiry_date: expiryDate,
          transaction_type: txType,
          quantity,
          source: 'MANUAL',
          reason: reason || undefined,
          idempotency_key: idempKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.detail || 'Transaction failed';
        if (errMsg.includes('Negative stock')) {
          setGuardWarning(errMsg);
        } else {
          setResult({ success: false, msg: errMsg });
        }
      } else {
        setResult({ success: true, msg: `Done. New balance: ${data.new_quantity_on_hand}` });
        setQuantity(1);
        setReason('');
        onSuccess();
      }
    } catch {
      setResult({ success: false, msg: 'Network error. Please retry.' });
    }
    setIsSubmitting(false);
  };

  const TAB_LABELS = {
    dispense: { en: '↓ Dispense (Out)', ta: '↓ வழங்குதல்', icon: TrendingDown, color: 'text-red-600' },
    receive:  { en: '↑ Receive (In)',   ta: '↑ பெறுதல்',  icon: TrendingUp,  color: 'text-emerald-600' },
    adjust:   { en: '⇄ Adjust',         ta: '⇄ சரிசெய்தல்', icon: RotateCcw, color: 'text-blue-600' },
  };

  return (
    <div className="bg-white rounded-xl border border-[#E3E8EE] p-5 shadow-sm space-y-4">
      <h3 className="text-sm font-bold text-[#14202B] flex items-center gap-2">
        <Package size={15} className="text-[#0F6B6B]" />
        {isTa ? 'இருப்பு பரிவர்த்தனை' : 'Record Inventory Transaction'}
      </h3>

      {/* Type tabs */}
      <div className="flex border-b border-[#E3E8EE] gap-1">
        {(['dispense', 'receive', 'adjust'] as const).map(t => {
          const meta = TAB_LABELS[t];
          const Icon = meta.icon;
          return (
            <button
              key={t}
              onClick={() => setTxType(t)}
              className={`flex items-center gap-1.5 pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
                txType === t
                  ? `border-[#0F6B6B] text-[#0F6B6B]`
                  : 'border-transparent text-[#5B6B7A] hover:text-[#14202B]'
              }`}
            >
              <Icon size={12} className={txType === t ? meta.color : ''} />
              {isTa ? meta.ta : meta.en}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Medicine */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#14202B]">
            {isTa ? 'மருந்து' : 'Medicine'}
          </label>
          <select
            value={medicineId}
            onChange={e => setMedicineId(e.target.value)}
            className="w-full text-xs border border-[#E3E8EE] rounded-xl px-3 py-2 bg-[#F7F9FB] text-[#14202B] focus:outline-none focus:ring-2 focus:ring-[#0F6B6B]"
          >
            {medicines.map(m => (
              <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
            ))}
          </select>
        </div>

        {/* Quantity */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#14202B]">
            {isTa ? 'அளவு' : 'Quantity'} {txType === 'adjust' ? (isTa ? '(புதிய மொத்தம்)' : '(new total)') : ''}
          </label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity(q => Math.max(0, q - 1))}
              className="w-9 h-9 rounded-lg border border-[#E3E8EE] bg-[#F7F9FB] flex items-center justify-center font-bold hover:bg-gray-100"
            >-</button>
            <input
              type="number"
              min={0}
              value={quantity}
              onChange={e => setQuantity(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-24 text-center font-bold text-sm border border-[#E3E8EE] rounded-xl px-2 py-1.5 bg-[#F7F9FB] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0F6B6B]"
            />
            <button
              type="button"
              onClick={() => setQuantity(q => q + 1)}
              className="w-9 h-9 rounded-lg border border-[#E3E8EE] bg-[#F7F9FB] flex items-center justify-center font-bold hover:bg-gray-100"
            >+</button>
          </div>
        </div>

        {/* Batch */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#14202B]">
            {isTa ? 'தொகுதி எண்' : 'Batch Number'} <span className="text-[#5B6B7A] font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={batchNumber}
            onChange={e => setBatchNumber(e.target.value)}
            placeholder="BTH-2025-XXX"
            className="w-full text-xs border border-[#E3E8EE] rounded-xl px-3 py-2 bg-[#F7F9FB] text-[#14202B] font-mono focus:outline-none focus:ring-2 focus:ring-[#0F6B6B]"
          />
        </div>

        {/* Expiry */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-[#14202B]">
            {isTa ? 'காலாவதி தேதி' : 'Expiry Date'}
          </label>
          <input
            type="date"
            value={expiryDate}
            onChange={e => setExpiryDate(e.target.value)}
            className="w-full text-xs border border-[#E3E8EE] rounded-xl px-3 py-2 bg-[#F7F9FB] text-[#14202B] focus:outline-none focus:ring-2 focus:ring-[#0F6B6B]"
          />
        </div>

        {/* Reason */}
        <div className="space-y-1 sm:col-span-2">
          <label className="text-xs font-semibold text-[#14202B]">
            {isTa ? 'காரணம்' : 'Reason / Note'} <span className="text-[#5B6B7A] font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder={isTa ? 'உதா: அட்டவணையிடப்பட்ட விநியோகம்' : 'e.g. Scheduled supply receipt, physical count correction'}
            className="w-full text-xs border border-[#E3E8EE] rounded-xl px-3 py-2 bg-[#F7F9FB] text-[#14202B] focus:outline-none focus:ring-2 focus:ring-[#0F6B6B]"
          />
        </div>
      </div>

      {/* Guard warning */}
      {guardWarning && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <AlertTriangle size={14} className="text-amber-600" />
            {isTa ? 'தரவு தர பாதுகாப்பு எச்சரிக்கை' : 'Data Quality Guard'}
          </div>
          <p className="text-xs text-amber-800">{guardWarning}</p>
          <div className="text-xs text-amber-700">{isTa ? 'நிரல் கடந்து செல்ல முடியாது.' : 'This transaction cannot proceed.'}</div>
        </div>
      )}

      {/* Result feedback */}
      {result && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-xs font-semibold border ${
          result.success ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {result.success ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {result.msg}
        </div>
      )}

      <button
        onClick={() => handleSubmit()}
        disabled={isSubmitting || quantity < 0}
        className="w-full py-3 bg-[#0F6B6B] hover:bg-[#0a4f4f] text-white font-bold text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isSubmitting ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
        {isSubmitting
          ? (isTa ? 'சமர்ப்பிக்கிறது…' : 'Submitting…')
          : (isTa ? 'பரிவர்த்தனையை பதிவு செய்' : 'Record Transaction')}
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface InventoryManagerProps {
  lang: Language;
  ownerId: string;
  ownerType?: 'facility' | 'pharmacy';
}

export function InventoryManager({ lang, ownerId, ownerType = 'facility' }: InventoryManagerProps) {
  const [balances, setBalances] = useState<Balance[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [medicines, setMedicines] = useState<MedMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'balances' | 'batches' | 'entry'>('balances');

  const isTa = lang === 'ta';

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [invRes, metaRes] = await Promise.all([
        fetch(`/api/inventory/${ownerId}`),
        fetch('/api/metadata'),
      ]);
      if (invRes.ok) {
        const invData = await invRes.json();
        setBalances(invData.balances ?? []);
        setBatches(invData.batches ?? []);
      }
      if (metaRes.ok) {
        const metaData = await metaRes.json();
        setMedicines(metaData.medicines ?? []);
      }
    } catch { /* ignore */ }
    setIsLoading(false);
  }, [ownerId]);

  useEffect(() => { load(); }, [load]);

  const medName = (id: string) => medicines.find(m => m.id === id)?.name ?? id;
  const medUnit = (id: string) => medicines.find(m => m.id === id)?.unit ?? 'units';

  const expiringBatches = batches.filter(b => daysUntilExpiry(b.expiry_date) <= 90);
  const expiredBatches = batches.filter(b => daysUntilExpiry(b.expiry_date) < 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#14202B] flex items-center gap-2">
            <Package size={16} className="text-[#0F6B6B]" />
            {isTa ? 'இருப்பு மேலாண்மை' : 'Inventory Management'}
          </h2>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            {isTa ? `உரிமையாளர்: ${ownerId}` : `Owner: ${ownerId} (${ownerType})`}
          </p>
        </div>
        {expiredBatches.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl">
            <AlertTriangle size={13} />
            {expiredBatches.length} {isTa ? 'காலாவதியான தொகுதிகள்' : 'expired batches'}
          </div>
        )}
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: isTa ? 'மருந்துகள்' : 'Medicines Tracked', value: balances.length, color: 'text-[#0F6B6B]' },
          { label: isTa ? 'காலாவதி எச்சரிக்கை' : 'Expiry Warnings (90d)', value: expiringBatches.length, color: expiringBatches.length > 0 ? 'text-amber-600' : 'text-emerald-700' },
          { label: isTa ? 'மொத்த இருப்பு யூனிட்' : 'Total Units on Hand', value: balances.reduce((s, b) => s + b.quantity_on_hand, 0), color: 'text-[#14202B]' },
        ].map(k => (
          <div key={k.label} className="bg-white p-4 rounded-xl border border-[#E3E8EE] shadow-sm">
            <div className="text-xs text-[#5B6B7A]">{k.label}</div>
            <div className={`text-2xl font-bold tabular-nums mt-1 ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F7F9FB] border border-[#E3E8EE] rounded-xl p-1 w-fit">
        {([
          { id: 'balances', label: isTa ? 'இருப்பு நிலை' : 'Stock Balances', count: balances.length },
          { id: 'batches',  label: isTa ? 'தொகுதி சரக்கு' : 'Batch Tracker',  count: batches.length },
          { id: 'entry',    label: isTa ? 'பரிவர்த்தனை பதிவு' : 'Record Transaction', count: null },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === tab.id ? 'bg-white text-[#14202B] shadow-sm' : 'text-[#5B6B7A] hover:text-[#14202B]'
            }`}
          >
            {tab.label}{tab.count !== null ? ` (${tab.count})` : ''}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-[#5B6B7A]">
          <RefreshCw size={14} className="animate-spin text-[#0F6B6B]" />
          {isTa ? 'ஏற்றப்படுகிறது…' : 'Loading inventory…'}
        </div>
      ) : (
        <>
          {/* ── Balances tab ── */}
          {activeTab === 'balances' && (
            <div className="bg-white rounded-xl border border-[#E3E8EE] overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F7F9FB] border-b border-[#E3E8EE] text-[11px] font-semibold text-[#5B6B7A] uppercase tracking-wider">
                    <th className="py-3 px-4">{isTa ? 'மருந்து' : 'Medicine'}</th>
                    <th className="py-3 px-4">{isTa ? 'கையிருப்பு' : 'On Hand'}</th>
                    <th className="py-3 px-4">{isTa ? 'ஒதுக்கீடு' : 'Reserved'}</th>
                    <th className="py-3 px-4">{isTa ? 'கடைசி சரிபார்ப்பு' : 'Last Verified'}</th>
                    <th className="py-3 px-4">{isTa ? 'பதிப்பு' : 'Ver.'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E8EE]">
                  {balances.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-xs text-[#5B6B7A]">
                        {isTa ? 'இருப்பு பதிவுகள் இல்லை.' : 'No inventory records for this owner.'}
                      </td>
                    </tr>
                  ) : balances.map(b => (
                    <tr key={b.id} className={`hover:bg-slate-50/50 ${b.quantity_on_hand === 0 ? 'bg-red-50/20' : ''}`}>
                      <td className="py-3 px-4 font-semibold text-[#14202B]">
                        <div>{medName(b.medicine_id)}</div>
                        <div className="text-[10px] text-[#5B6B7A] font-mono">{b.medicine_id}</div>
                      </td>
                      <td className="py-3 px-4 tabular-nums font-bold">
                        <span className={b.quantity_on_hand === 0 ? 'text-red-700' : b.quantity_on_hand < 50 ? 'text-orange-600' : 'text-[#14202B]'}>
                          {b.quantity_on_hand}
                        </span>
                        <span className="text-[10px] text-[#5B6B7A] ml-1">{medUnit(b.medicine_id)}</span>
                        {b.quantity_on_hand === 0 && (
                          <span className="ml-2 text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-full">
                            {isTa ? 'தீர்ந்தது' : 'ZERO STOCK'}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-[#5B6B7A]">{b.quantity_reserved}</td>
                      <td className="py-3 px-4 text-[#5B6B7A] text-[11px]">
                        {new Date(b.last_verified_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </td>
                      <td className="py-3 px-4 text-[#5B6B7A] tabular-nums">v{b.version}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Batches tab ── */}
          {activeTab === 'batches' && (
            <div className="space-y-4">
              {expiringBatches.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-2.5 text-xs text-amber-800">
                  <Calendar size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>{expiringBatches.length} {isTa ? 'தொகுதிகள்' : 'batches'}</strong>
                    {' '}{isTa ? '90 நாட்களில் காலாவதியாகும்.' : 'expiring within 90 days.'}{' '}
                    {isTa ? 'காலாவதியான மருந்துகளை அகற்றி பதிவு செய்யுங்கள்.' : 'Remove and record expired stock before distribution.'}
                  </span>
                </div>
              )}
              <div className="bg-white rounded-xl border border-[#E3E8EE] overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F7F9FB] border-b border-[#E3E8EE] text-[11px] font-semibold text-[#5B6B7A] uppercase tracking-wider">
                      <th className="py-3 px-4">{isTa ? 'மருந்து' : 'Medicine'}</th>
                      <th className="py-3 px-4">{isTa ? 'தொகுதி எண்' : 'Batch No.'}</th>
                      <th className="py-3 px-4">{isTa ? 'காலாவதி' : 'Expiry'}</th>
                      <th className="py-3 px-4">{isTa ? 'நிலை' : 'Status'}</th>
                      <th className="py-3 px-4">{isTa ? 'பெறப்பட்டது' : 'Received'}</th>
                      <th className="py-3 px-4">{isTa ? 'தற்போது' : 'Current'}</th>
                      <th className="py-3 px-4">{isTa ? 'விநியோகஸ்தர்' : 'Supplier'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E3E8EE]">
                    {batches.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-xs text-[#5B6B7A]">
                          {isTa ? 'தொகுதி பதிவுகள் இல்லை.' : 'No batch records found. Receive stock to create batch records.'}
                        </td>
                      </tr>
                    ) : batches.map(b => {
                      const days = daysUntilExpiry(b.expiry_date);
                      return (
                        <tr key={b.id} className={`hover:bg-slate-50/50 ${days < 0 ? 'bg-red-50/20' : days <= 30 ? 'bg-orange-50/20' : ''}`}>
                          <td className="py-3 px-4 font-semibold text-[#14202B]">{medName(b.medicine_id)}</td>
                          <td className="py-3 px-4 font-mono text-[#14202B]">{b.batch_number}</td>
                          <td className="py-3 px-4 tabular-nums text-[#5B6B7A]">{b.expiry_date}</td>
                          <td className="py-3 px-4"><ExpiryStatus days={days} /></td>
                          <td className="py-3 px-4 tabular-nums">{b.received_quantity}</td>
                          <td className="py-3 px-4 tabular-nums font-bold">{b.current_quantity}</td>
                          <td className="py-3 px-4 text-[#5B6B7A]">{b.supplier_name ?? '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Entry tab ── */}
          {activeTab === 'entry' && (
            <TransactionPanel
              ownerId={ownerId}
              ownerType={ownerType}
              medicines={medicines}
              lang={lang}
              onSuccess={load}
            />
          )}
        </>
      )}
    </div>
  );
}
