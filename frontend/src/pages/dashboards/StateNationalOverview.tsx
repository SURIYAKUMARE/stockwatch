/**
 * StateNationalOverview — shared dashboard for state_officer and national_officer roles.
 * Pulls real data from /api/analytics/state and /api/analytics/national.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  MapPin, Activity, RefreshCw, AlertTriangle,
  TrendingUp, BarChart3, ShieldAlert, ChevronRight, Info
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import type { Language } from '../../i18n';
import type { UserRole } from '../../types/auth';
import type { KPIData, AlertItem } from '../../types';
import { TierBadge } from '../../components/TierBadge';

interface DistrictRow {
  district: string;
  facilities: number;
  critical_items: number;
  avg_cover_days: number;
  essential_availability_pct: number;
}

interface StateRow {
  state: string;
  districts: number;
  critical_items: number;
  avg_cover_days: number;
  essential_availability_pct: number;
}

interface Props {
  role: UserRole;
  lang: Language;
  alerts: AlertItem[];
  kpiData: KPIData | null;
  isLoading: boolean;
}

export function StateNationalOverview({ role, lang, alerts, kpiData, isLoading }: Props) {
  const isTa = lang === 'ta';
  const isNational = role === 'national_officer';

  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  const load = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const url = isNational ? '/api/analytics/national' : '/api/analytics/state?state_id=TN';
      const res = await fetch(url);
      if (res.ok) setAnalyticsData(await res.json());
    } catch { /* ignore */ }
    setLoadingAnalytics(false);
  }, [isNational]);

  useEffect(() => { load(); }, [load]);

  const criticalAlerts = alerts.filter(a => a.tier === 'CRITICAL').slice(0, 5);
  const subunits: (DistrictRow | StateRow)[] = isNational
    ? (analyticsData?.states ?? [])
    : (analyticsData?.districts ?? []);

  const chartData = subunits.slice(0, 8).map((s: any) => ({
    name: s.district ?? s.state,
    critical: s.critical_items ?? 0,
    cover: s.avg_cover_days ?? 0,
  }));

  const scopeLabel = isNational
    ? (isTa ? 'தேசிய கண்ணோட்டம் — இந்தியா' : 'National Overview — India')
    : (isTa ? 'மாநில கண்ணோட்டம் — தமிழ்நாடு' : 'State Overview — Tamil Nadu');

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#14202B] flex items-center gap-2">
            <MapPin size={16} className="text-[#0F6B6B]" />
            {scopeLabel}
          </h2>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            {isNational
              ? (isTa ? 'அனைத்து மாநிலங்களின் மருந்து கிடைக்கும் தன்மை கண்காணிப்பு.' : 'Aggregate medicine availability monitoring across all states.')
              : (isTa ? 'தமிழ்நாட்டின் அனைத்து மாவட்டங்களின் கண்காணிப்பு.' : 'Medicine supply health across all districts in Tamil Nadu.')}
          </p>
          <div className="mt-1.5 text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-0.5 w-fit">
            {isTa ? 'டெமோ — உண்மையான மாநில தரவு அல்ல' : 'Demo — not real state-level data'}
          </div>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#5B6B7A] border border-[#E3E8EE] rounded-xl hover:bg-[#F7F9FB]">
          <RefreshCw size={13} className={loadingAnalytics ? 'animate-spin' : ''} />
          {isTa ? 'புதுப்பி' : 'Refresh'}
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: isNational ? (isTa ? 'ஆபத்தில் மாநிலங்கள்' : 'States at Risk') : (isTa ? 'ஆபத்தில் மாவட்டங்கள்' : 'Districts at Risk'),
            value: analyticsData ? (isNational ? analyticsData.states_at_risk : analyticsData.districts_at_risk) ?? 1 : '—',
            accent: 'text-orange-600',
          },
          {
            label: isTa ? 'ஆபத்தான பொருட்கள்' : 'Critical Items',
            value: kpiData?.critical_items ?? 0,
            accent: 'text-red-700',
          },
          {
            label: isTa ? 'சராசரி இருப்பு நாட்கள்' : 'Avg Days Cover',
            value: kpiData?.avg_days_of_cover ? `${kpiData.avg_days_of_cover}d` : '—',
            accent: 'text-[#0F6B6B]',
          },
          {
            label: isTa ? 'அத்தியாவசிய மருந்து கிடைக்கும் தன்மை' : 'Essential Drug Index',
            value: analyticsData ? `${analyticsData.essential_availability_pct ?? analyticsData.national_essential_drug_index ?? 92}%` : '—',
            accent: 'text-emerald-700',
          },
        ].map(k => (
          <div key={k.label} className="bg-white p-4 rounded-xl border border-[#E3E8EE] shadow-sm">
            <div className="text-xs text-[#5B6B7A]">{k.label}</div>
            <div className={`text-2xl font-bold tabular-nums mt-1 ${k.accent}`}>{k.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-[#E3E8EE] shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-bold text-[#14202B]">
            {isNational
              ? (isTa ? 'மாநிலவாரி ஆபத்தான பொருட்கள்' : 'Critical Items by State')
              : (isTa ? 'மாவட்டவாரி ஆபத்தான பொருட்கள்' : 'Critical Items by District')}
          </h3>
          {loadingAnalytics ? (
            <div className="h-48 flex items-center justify-center text-xs text-[#5B6B7A] gap-2">
              <RefreshCw size={13} className="animate-spin text-[#0F6B6B]" />
              {isTa ? 'தரவு ஏற்றுகிறது…' : 'Loading analytics…'}
            </div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#5B6B7A' }} />
                  <YAxis tick={{ fontSize: 10, fill: '#5B6B7A' }} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                  <Bar dataKey="critical" name="Critical Items" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={_.critical > 0 ? '#C62828' : '#2E7D32'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Critical alerts panel */}
        <div className="bg-white rounded-xl border border-[#E3E8EE] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E3E8EE] flex items-center gap-2">
            <ShieldAlert size={14} className="text-red-600" />
            <span className="text-xs font-bold text-[#14202B]">{isTa ? 'ஆபத்தான எச்சரிக்கைகள்' : 'Critical Alerts'}</span>
          </div>
          {isLoading ? (
            <div className="p-6 text-xs text-[#5B6B7A] flex items-center gap-2">
              <RefreshCw size={13} className="animate-spin" /> Loading…
            </div>
          ) : criticalAlerts.length === 0 ? (
            <div className="p-6 text-center text-xs text-emerald-700">
              No critical alerts.
            </div>
          ) : (
            <div className="divide-y divide-[#E3E8EE]">
              {criticalAlerts.map(a => (
                <div key={a.id} className="px-4 py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] font-bold text-[#14202B]">{a.centre_name}</div>
                    <TierBadge tier={a.tier} size="sm" lang={lang} />
                  </div>
                  <div className="text-[11px] text-[#0F6B6B] font-semibold">{a.medicine_name}</div>
                  <div className="text-[10px] text-[#5B6B7A] line-clamp-2">{a.reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sub-unit table */}
      {!loadingAnalytics && subunits.length > 0 && (
        <div className="bg-white rounded-xl border border-[#E3E8EE] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-[#E3E8EE]">
            <span className="text-xs font-bold text-[#14202B]">
              {isNational ? (isTa ? 'மாநிலவாரி நிலை' : 'State-wise Status') : (isTa ? 'மாவட்டவாரி நிலை' : 'District-wise Status')}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#F7F9FB] text-[11px] text-[#5B6B7A] font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4 text-left">{isNational ? (isTa ? 'மாநிலம்' : 'State') : (isTa ? 'மாவட்டம்' : 'District')}</th>
                  <th className="py-3 px-4 text-center">{isTa ? 'மையங்கள்' : 'Facilities'}</th>
                  <th className="py-3 px-4 text-center">{isTa ? 'ஆபத்தான பொருட்கள்' : 'Critical'}</th>
                  <th className="py-3 px-4 text-center">{isTa ? 'சராசரி இருப்பு' : 'Avg Cover'}</th>
                  <th className="py-3 px-4 text-center">{isTa ? 'அத்தியாவசியம்' : 'Essential %'}</th>
                  <th className="py-3 px-4 text-center">{isTa ? 'நிலை' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E8EE]">
                {subunits.map((row: any, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-[#14202B]">{row.district ?? row.state}</td>
                    <td className="py-3 px-4 text-center tabular-nums">{row.facilities ?? row.districts ?? '—'}</td>
                    <td className="py-3 px-4 text-center tabular-nums">
                      {(row.critical_items ?? 0) > 0
                        ? <span className="font-bold text-red-700">{row.critical_items}</span>
                        : <span className="text-emerald-700 font-semibold">0</span>}
                    </td>
                    <td className="py-3 px-4 text-center tabular-nums font-semibold">{row.avg_cover_days ?? '—'}d</td>
                    <td className="py-3 px-4 text-center tabular-nums">{row.essential_availability_pct ?? '—'}%</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        (row.critical_items ?? 0) > 0
                          ? 'bg-red-100 text-red-700 border border-red-200'
                          : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                      }`}>
                        {(row.critical_items ?? 0) > 0 ? (isTa ? 'நடவடிக்கை தேவை' : 'Action Needed') : (isTa ? 'சாதாரண' : 'Normal')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 flex items-start gap-2">
        <Info size={14} className="shrink-0 mt-0.5 text-blue-500" />
        <p>{isTa
          ? 'இந்த டாஷ்போர்டு டெமோ தரவை காட்டுகிறது. உண்மையான அமலாக்கத்தில், மாநில மற்றும் தேசிய அதிகாரிகள் அனைத்து மாவட்டங்களிலும் கீழிறங்கி பார்க்கலாம்.'
          : 'This dashboard shows demo data scaled for illustration. In production, state and national officers can drill down from national → state → district → facility with real-time aggregation.'
        }</p>
      </div>
    </div>
  );
}
