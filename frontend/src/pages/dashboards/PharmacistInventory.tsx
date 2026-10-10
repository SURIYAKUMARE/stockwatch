import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, TrendingDown, AlertTriangle, Package, RefreshCw } from 'lucide-react';
import type { Language } from '../../i18n';

interface PharmacistInventoryProps {
  lang: Language;
  medicines: { id: string; name: string; unit: string; essential: boolean }[];
  isLoading: boolean;
}

export function PharmacistInventory({ lang, medicines, isLoading }: PharmacistInventoryProps) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const isTa = lang === 'ta';

  useEffect(() => {
    fetch('/api/alerts?tier=CRITICAL')
      .then(r => r.json())
      .then(d => { setAlerts(d || []); setLoadingAlerts(false); })
      .catch(() => setLoadingAlerts(false));
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-base font-bold text-[#14202B] flex items-center gap-2">
          <Package size={16} className="text-[#0F6B6B]" />
          {isTa ? 'மருந்தக இருப்பு' : 'Pharmacy Inventory Dashboard'}
        </h2>
        <p className="text-xs text-[#5B6B7A] mt-0.5">
          {isTa ? 'உங்கள் மருந்தகத்தின் இருப்பு நிலை.' : 'Current stock levels and low-stock alerts for your pharmacy.'}
        </p>
        <div className="mt-2 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 w-fit">
          Demo data — Valparai Medical Store (simulated)
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: isTa ? 'மொத்த மருந்துகள்' : 'Total Medicines', value: medicines.length, color: 'text-[#14202B]' },
          { label: isTa ? 'குறைந்த இருப்பு' : 'Low Stock Items', value: 3, color: 'text-orange-600' },
          { label: isTa ? 'காலாவதி எச்சரிக்கை' : 'Expiry Warnings', value: 1, color: 'text-amber-600' },
          { label: isTa ? 'இன்று விற்பனை' : "Today's Dispenses", value: 42, color: 'text-[#0F6B6B]' },
        ].map(k => (
          <div key={k.label} className="bg-white p-4 rounded-xl border border-[#E3E8EE] shadow-sm">
            <div className="text-xs text-[#5B6B7A]">{k.label}</div>
            <div className={`text-2xl font-bold tabular-nums mt-1 ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Medicine list */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-[#5B6B7A]">
          <RefreshCw size={14} className="animate-spin text-[#0F6B6B]" /> Loading…
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E3E8EE] overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[#E3E8EE]">
            <h3 className="text-sm font-bold text-[#14202B]">
              {isTa ? 'இருப்பு பட்டியல்' : 'Stock List (Demo)'}
            </h3>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F7F9FB] border-b border-[#E3E8EE] text-[11px] font-semibold text-[#5B6B7A] uppercase tracking-wider">
                <th className="py-3 px-4">{isTa ? 'மருந்து' : 'Medicine'}</th>
                <th className="py-3 px-4">{isTa ? 'இருப்பு' : 'On Hand'}</th>
                <th className="py-3 px-4">{isTa ? 'நிலை' : 'Status'}</th>
                <th className="py-3 px-4">{isTa ? 'அத்தியாவசியம்' : 'Essential'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EE]">
              {medicines.map((m, i) => {
                // Simulated stock for demo
                const demoStock = [80, 350, 120, 200, 95, 180, 60, 850][i % 8];
                const isLow = demoStock < 100;
                return (
                  <tr key={m.id} className={`hover:bg-slate-50/50 ${isLow ? 'bg-orange-50/30' : ''}`}>
                    <td className="py-3 px-4 font-semibold text-[#14202B]">
                      <div className="flex items-center gap-2">
                        {isLow && <AlertTriangle size={12} className="text-orange-500" />}
                        {m.name}
                      </div>
                    </td>
                    <td className="py-3 px-4 tabular-nums font-bold">
                      <span className={isLow ? 'text-orange-700' : 'text-[#14202B]'}>
                        {demoStock} {m.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isLow
                          ? 'bg-orange-100 text-orange-800 border border-orange-200'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      }`}>
                        {isLow ? (isTa ? 'குறைந்த இருப்பு' : 'Low Stock') : (isTa ? 'போதுமானது' : 'Adequate')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#5B6B7A]">
                      {m.essential ? (
                        <span className="text-emerald-700 font-semibold">{isTa ? 'ஆம்' : 'Yes'}</span>
                      ) : (isTa ? 'இல்லை' : 'No')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Critical alerts preview */}
      {!loadingAlerts && alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <div className="text-xs font-bold text-red-800 flex items-center gap-1.5">
            <AlertTriangle size={14} className="text-red-600" />
            {isTa ? 'ஆபத்தான எச்சரிக்கைகள்' : 'Critical Alerts Requiring Action'}
          </div>
          {alerts.slice(0, 2).map(a => (
            <div key={a.id} className="text-[11px] text-red-700 bg-white/70 rounded-lg px-3 py-2 border border-red-200">
              <strong>{a.centre_name}</strong> — {a.medicine_name}: {a.reason}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
