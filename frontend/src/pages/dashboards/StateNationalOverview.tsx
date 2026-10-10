import React from 'react';
import {
  TrendingUp,
  ShieldAlert,
  MapPin,
  Activity,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import type { Language } from '../../i18n';
import type { UserRole } from '../../types/auth';
import type { KPIData, AlertItem } from '../../types';

interface StateNationalOverviewProps {
  role: UserRole;
  lang: Language;
  alerts: AlertItem[];
  kpiData: KPIData | null;
  isLoading: boolean;
}

export function StateNationalOverview({ role, lang, alerts, kpiData, isLoading }: StateNationalOverviewProps) {
  const isTa = lang === 'ta';
  const isNational = role === 'national_officer';

  const scopeLabel = isNational
    ? (isTa ? 'தேசிய கண்ணோட்டம்' : 'National Overview')
    : (isTa ? 'மாநில கண்ணோட்டம் — தமிழ்நாடு' : 'State Overview — Tamil Nadu');

  const criticalAlerts = alerts.filter(a => a.tier === 'CRITICAL');
  const highAlerts = alerts.filter(a => a.tier === 'HIGH');

  if (isLoading) {
    return (
      <div className="p-8 flex items-center gap-2 text-xs text-[#5B6B7A]">
        <RefreshCw size={14} className="animate-spin text-[#0F6B6B]" />
        Loading overview…
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-base font-bold text-[#14202B] flex items-center gap-2">
          <MapPin size={16} className="text-[#0F6B6B]" />
          {scopeLabel}
        </h2>
        <p className="text-xs text-[#5B6B7A] mt-0.5">
          {isNational
            ? (isTa ? 'அனைத்து மாநிலங்களின் மருந்து தட்டுப்பாடு நிலை.' : 'Medicine shortage status across all states. Drill down to district level.')
            : (isTa ? 'தமிழ்நாட்டில் உள்ள அனைத்து மாவட்டங்களின் நிலை.' : 'Medicine availability status across all districts in Tamil Nadu.')}
        </p>
        <div className="mt-1.5 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 w-fit">
          {isTa ? 'டெமோ தரவு — கோவை மாவட்டத்தின் பெருக்கிய மதிப்புகள்' : 'Demo data — Coimbatore district data scaled for illustration'}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: isNational ? (isTa ? 'மாநிலங்கள் ஆபத்தில்' : 'States at Risk') : (isTa ? 'மாவட்டங்கள் ஆபத்தில்' : 'Districts at Risk'),
            value: isNational ? '3' : '1',
            color: 'text-orange-600',
          },
          {
            label: isTa ? 'ஆபத்தான பொருட்கள்' : 'Critical Items',
            value: String(kpiData?.critical_items ?? 0),
            color: 'text-red-700',
          },
          {
            label: isTa ? 'சராசரி இருப்பு நாட்கள்' : 'Avg Days of Cover',
            value: `${kpiData?.avg_days_of_cover ?? 0}d`,
            color: 'text-[#0F6B6B]',
          },
          {
            label: isTa ? 'முன்கூட்டிய எச்சரிக்கை அவகாசம்' : 'Early Warning Gain',
            value: kpiData?.early_warning_lead_time_gained ?? '4.8d',
            color: 'text-emerald-700',
          },
        ].map(k => (
          <div key={k.label} className="bg-white p-4 rounded-xl border border-[#E3E8EE] shadow-sm">
            <div className="text-xs text-[#5B6B7A]">{k.label}</div>
            <div className={`text-2xl font-bold tabular-nums mt-1 ${k.color}`}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Mock district/state table */}
      <div className="bg-white rounded-xl border border-[#E3E8EE] overflow-hidden shadow-sm">
        <div className="p-4 border-b border-[#E3E8EE]">
          <h3 className="text-sm font-bold text-[#14202B]">
            {isNational
              ? (isTa ? 'மாநிலவாரியான நிலை (டெமோ)' : 'State-wise Status (Demo)')
              : (isTa ? 'மாவட்டவாரியான நிலை (டெமோ)' : 'District-wise Status (Demo)')}
          </h3>
        </div>
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#F7F9FB] border-b border-[#E3E8EE] text-[11px] font-semibold text-[#5B6B7A] uppercase tracking-wider">
              <th className="py-3 px-4">{isNational ? 'State' : 'District'}</th>
              <th className="py-3 px-4">{isTa ? 'மையங்கள்' : 'Facilities'}</th>
              <th className="py-3 px-4">{isTa ? 'ஆபத்தான பொருட்கள்' : 'Critical Items'}</th>
              <th className="py-3 px-4">{isTa ? 'சராசரி இருப்பு' : 'Avg Cover'}</th>
              <th className="py-3 px-4">{isTa ? 'நிலை' : 'Status'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E3E8EE]">
            {(isNational ? [
              { name: 'Tamil Nadu', facilities: 18, critical: criticalAlerts.length, cover: kpiData?.avg_days_of_cover ?? 18 },
              { name: 'Karnataka', facilities: 22, critical: 1, cover: 21 },
              { name: 'Maharashtra', facilities: 35, critical: 3, cover: 14 },
            ] : [
              { name: 'Coimbatore', facilities: 12, critical: criticalAlerts.length, cover: kpiData?.avg_days_of_cover ?? 18 },
              { name: 'Tirunelveli', facilities: 14, critical: 1, cover: 22 },
              { name: 'Salem', facilities: 16, critical: 0, cover: 27 },
            ]).map(row => (
              <tr key={row.name} className="hover:bg-slate-50/50">
                <td className="py-3 px-4 font-semibold text-[#14202B]">{row.name}</td>
                <td className="py-3 px-4 tabular-nums text-[#5B6B7A]">{row.facilities}</td>
                <td className="py-3 px-4 tabular-nums">
                  {row.critical > 0 ? (
                    <span className="flex items-center gap-1 text-red-700 font-bold">
                      <AlertTriangle size={12} /> {row.critical}
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-semibold">0</span>
                  )}
                </td>
                <td className="py-3 px-4 tabular-nums font-semibold">{row.cover}d</td>
                <td className="py-3 px-4">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    row.critical > 0
                      ? 'bg-red-100 text-red-700 border border-red-200'
                      : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                  }`}>
                    {row.critical > 0 ? 'Action Required' : 'Normal'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800">
        <strong>Phase 5 expansion:</strong> Full state and national dashboards with drill-down from national → state → district → facility, procurement planning, and cross-district transfer analytics.
      </div>
    </div>
  );
}
