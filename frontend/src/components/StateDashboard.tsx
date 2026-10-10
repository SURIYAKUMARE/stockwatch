import React, { useState, useEffect } from 'react';
import {
  Building,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  MapPin,
  ArrowRightLeft,
  FileCheck,
  ShieldAlert,
  BarChart2,
  RefreshCw,
  Search,
  ExternalLink
} from 'lucide-react';
import { Language, translations } from '../i18n';
import { StateAnalyticsData, AuthUser } from '../types';

interface StateDashboardProps {
  currentUser: AuthUser | null;
  lang: Language;
  onDrillDownToDistrict?: (districtId: string) => void;
}

export const StateDashboard: React.FC<StateDashboardProps> = ({
  currentUser,
  lang,
  onDrillDownToDistrict
}) => {
  const [data, setData] = useState<StateAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedState, setSelectedState] = useState<string>('TN');
  const [searchDistrict, setSearchDistrict] = useState<string>('');

  const fetchStateAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/analytics/state?state_id=${selectedState}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to load state analytics', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStateAnalytics();
  }, [selectedState]);

  const districts = data?.districts || [];
  const filteredDistricts = districts.filter(d =>
    d.name.toLowerCase().includes(searchDistrict.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F6B6B]">
            <Building size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#14202B]">
                Tamil Nadu State Health Directorate
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                State Health Officer View
              </span>
            </div>
            <p className="text-xs text-[#5B6B7A] mt-0.5">
              Directorate of Public Health & Preventive Medicine · Chennai HQ · Western Zone Surveillance
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStateAnalytics}
            disabled={isLoading}
            className="p-2 border border-[#E3E8EE] rounded-lg text-[#5B6B7A] hover:bg-[#F7F9FB] hover:text-[#0F6B6B] transition"
            title="Refresh analytics"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => alert('Emergency State Replenishment Directive dispatched to TNMSC Central Warehouse.')}
            className="px-3.5 py-2 rounded-lg text-xs font-bold bg-[#0F6B6B] text-white hover:bg-[#0c5555] transition shadow-xs"
          >
            Issue State Buffer Directive
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white border border-[#E3E8EE] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#5B6B7A]">
            <span className="text-xs font-medium">Monitored Facilities</span>
            <Building size={16} className="text-[#0F6B6B]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#14202B]">
              {data?.total_facilities || 61}
            </span>
            <span className="text-xs text-[#5B6B7A]">across 5 districts</span>
          </div>
        </div>

        <div className="bg-white border border-[#E3E8EE] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#5B6B7A]">
            <span className="text-xs font-medium">Critical Shortages</span>
            <AlertTriangle size={16} className="text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-600">
              {data?.total_critical_items || 6}
            </span>
            <span className="text-xs text-[#5B6B7A]">items &lt; 3 days cover</span>
          </div>
        </div>

        <div className="bg-white border border-[#E3E8EE] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#5B6B7A]">
            <span className="text-xs font-medium">State Avg Cover</span>
            <Clock size={16} className="text-teal-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#14202B]">
              {data?.state_avg_cover_days || 13.9}
            </span>
            <span className="text-xs text-[#5B6B7A]">days supply</span>
          </div>
        </div>

        <div className="bg-white border border-[#E3E8EE] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#5B6B7A]">
            <span className="text-xs font-medium">Reporting Compliance</span>
            <FileCheck size={16} className="text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-700">
              {data?.reporting_compliance_pct || 96.6}%
            </span>
            <span className="text-xs text-[#5B6B7A]">daily stock updates</span>
          </div>
        </div>

        <div className="bg-white border border-[#E3E8EE] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#5B6B7A]">
            <span className="text-xs font-medium">Essential Availability</span>
            <CheckCircle2 size={16} className="text-teal-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#0F6B6B]">
              {data?.essential_availability_pct || 94.2}%
            </span>
            <span className="text-xs text-[#5B6B7A]">EDL compliance</span>
          </div>
        </div>
      </div>

      {/* District Shortage & Compliance Table */}
      <div className="bg-white border border-[#E3E8EE] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E3E8EE] flex flex-wrap items-center justify-between gap-3 bg-[#F7F9FB]/50">
          <div>
            <h3 className="text-sm font-bold text-[#14202B]">
              District Health Office Performance & Stock Risk Index
            </h3>
            <p className="text-xs text-[#5B6B7A]">
              Comparative stock-out risk, compliance adherence, and facility cover across revenue districts.
            </p>
          </div>
          <div className="relative min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B7A]" />
            <input
              type="text"
              placeholder="Search district..."
              value={searchDistrict}
              onChange={(e) => setSearchDistrict(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E3E8EE] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0F6B6B]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E3E8EE] bg-[#F7F9FB] text-[#5B6B7A] font-semibold">
                <th className="py-3 px-4">District Name</th>
                <th className="py-3 px-4 text-right">Facilities</th>
                <th className="py-3 px-4 text-right">Critical Shortages</th>
                <th className="py-3 px-4 text-right">Avg Days Cover</th>
                <th className="py-3 px-4 text-right">Reporting Compliance</th>
                <th className="py-3 px-4">Risk Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EE]">
              {filteredDistricts.map((d) => {
                const isRisk = d.critical_shortages > 0;
                return (
                  <tr key={d.id} className="hover:bg-[#F7F9FB]/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#14202B] text-sm">{d.name}</div>
                      <div className="text-[10px] text-[#5B6B7A]">HQ: {d.name} Collectorate</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#14202B]">
                      {d.total_facilities}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className={`font-mono font-bold text-sm ${
                        d.critical_shortages > 0 ? 'text-rose-600' : 'text-emerald-700'
                      }`}>
                        {d.critical_shortages}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#14202B]">
                      {d.avg_days_cover} d
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="w-16 bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              d.compliance_pct > 95 ? 'bg-emerald-600' : 'bg-amber-500'
                            }`}
                            style={{ width: `${d.compliance_pct}%` }}
                          />
                        </div>
                        <span className="font-mono font-medium text-[11px]">{d.compliance_pct}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {d.critical_shortages > 1 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          Urgent Support Needed
                        </span>
                      ) : d.critical_shortages === 1 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Shortage Watch
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Healthy Buffer
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onDrillDownToDistrict ? onDrillDownToDistrict(d.id) : alert(`Switching to ${d.name} District Command Center`)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#0F6B6B] hover:bg-teal-50 border border-teal-200 transition inline-flex items-center gap-1"
                      >
                        <span>Inspect District</span>
                        <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* State-Level Cross-District Balancing Panel */}
      <div className="bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={18} className="text-[#0F6B6B]" />
            <h3 className="text-sm font-bold text-[#14202B]">
              Inter-District Redistribution Recommendations
            </h3>
          </div>
          <span className="text-[11px] font-bold text-[#0F6B6B] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
            Algorithmic Optimization
          </span>
        </div>
        <p className="text-xs text-[#5B6B7A]">
          Identified high buffer surplus in Tiruppur District (18.5 days cover) capable of supplying deficit mountain centres in The Nilgiris District (9.8 days cover).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          <div className="p-3 bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[#14202B]">Tiruppur District → The Nilgiris District</div>
              <div className="text-[11px] text-[#5B6B7A]">Medicine: Amoxicillin 250mg · Recommended Qty: 400 bottles</div>
            </div>
            <button
              onClick={() => alert('Inter-district transfer directive created! Transferred to State Transport logistics.')}
              className="px-3 py-1.5 text-xs font-bold bg-[#0F6B6B] text-white rounded-lg hover:bg-[#0c5555] transition"
            >
              Authorize Transfer
            </button>
          </div>

          <div className="p-3 bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-[#14202B]">Salem District → Erode District</div>
              <div className="text-[11px] text-[#5B6B7A]">Medicine: Metformin 500mg · Recommended Qty: 600 strips</div>
            </div>
            <button
              onClick={() => alert('Inter-district transfer directive created! Transferred to State Transport logistics.')}
              className="px-3 py-1.5 text-xs font-bold bg-[#0F6B6B] text-white rounded-lg hover:bg-[#0c5555] transition"
            >
              Authorize Transfer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
