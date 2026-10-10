import React, { useState, useEffect } from 'react';
import {
  Globe,
  ShieldAlert,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Building2,
  Layers,
  ArrowRightLeft,
  FileText
} from 'lucide-react';
import { Language, translations } from '../i18n';
import { NationalAnalyticsData, AuthUser } from '../types';

interface NationalDashboardProps {
  currentUser: AuthUser | null;
  lang: Language;
}

export const NationalDashboard: React.FC<NationalDashboardProps> = ({
  currentUser,
  lang
}) => {
  const [data, setData] = useState<NationalAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchState, setSearchState] = useState<string>('');

  const fetchNationalAnalytics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/analytics/national');
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error('Failed to load national analytics', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNationalAnalytics();
  }, []);

  const states = data?.states || [];
  const filteredStates = states.filter(s =>
    s.state_name.toLowerCase().includes(searchState.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F6B6B]">
            <Globe size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#14202B]">
                Ministry of Health & Family Welfare · National Portal
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                National Health Mission (NHM) Surveillance
              </span>
            </div>
            <p className="text-xs text-[#5B6B7A] mt-0.5">
              Unified Public Health Logistics Monitoring · Nirman Bhawan, New Delhi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchNationalAnalytics}
            disabled={isLoading}
            className="p-2 border border-[#E3E8EE] rounded-lg text-[#5B6B7A] hover:bg-[#F7F9FB] hover:text-[#0F6B6B] transition"
            title="Refresh national statistics"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => alert('Exporting National Supply Chain Surveillance Report (PDF / CSV)')}
            className="px-3.5 py-2 rounded-lg text-xs font-bold bg-[#0F6B6B] text-white hover:bg-[#0c5555] transition shadow-xs flex items-center gap-1.5"
          >
            <FileText size={14} />
            <span>Export National Dossier</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E3E8EE] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#5B6B7A]">
            <span className="text-xs font-medium">Facilities Monitored</span>
            <Building2 size={16} className="text-[#0F6B6B]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#14202B]">
              {(data?.total_monitored_facilities || 9950).toLocaleString()}
            </span>
            <span className="text-xs text-[#5B6B7A]">Sub-Centres, PHCs & CHCs</span>
          </div>
        </div>

        <div className="bg-white border border-[#E3E8EE] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#5B6B7A]">
            <span className="text-xs font-medium">National Essential Drug Index</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-700">
              {data?.national_essential_drug_index || 91.7}%
            </span>
            <span className="text-xs text-[#5B6B7A]">coverage benchmark</span>
          </div>
        </div>

        <div className="bg-white border border-[#E3E8EE] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#5B6B7A]">
            <span className="text-xs font-medium">Critical Shortage Clusters</span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-amber-600">
              {data?.critical_shortage_clusters || 4}
            </span>
            <span className="text-xs text-[#5B6B7A]">regional zones flagged</span>
          </div>
        </div>

        <div className="bg-white border border-[#E3E8EE] rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-[#5B6B7A]">
            <span className="text-xs font-medium">Stockout Prevention Rate</span>
            <TrendingUp size={16} className="text-teal-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-[#0F6B6B]">
              {data?.macro_stockout_prevention_rate || 93.4}%
            </span>
            <span className="text-xs text-[#5B6B7A]">early actions successful</span>
          </div>
        </div>
      </div>

      {/* State-by-State Risk Matrix */}
      <div className="bg-white border border-[#E3E8EE] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E3E8EE] flex flex-wrap items-center justify-between gap-3 bg-[#F7F9FB]/50">
          <div>
            <h3 className="text-sm font-bold text-[#14202B]">
              State-by-State Health Logistics Surveillance
            </h3>
            <p className="text-xs text-[#5B6B7A]">
              Real-time stockout risk scores, essential medicine coverage, and active interstate logistics.
            </p>
          </div>
          <div className="relative min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B7A]" />
            <input
              type="text"
              placeholder="Search state..."
              value={searchState}
              onChange={(e) => setSearchState(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E3E8EE] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0F6B6B]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E3E8EE] bg-[#F7F9FB] text-[#5B6B7A] font-semibold">
                <th className="py-3 px-4">State</th>
                <th className="py-3 px-4 text-right">Facilities</th>
                <th className="py-3 px-4">Stockout Risk Index (0–100)</th>
                <th className="py-3 px-4 text-right">Essential Drug Coverage</th>
                <th className="py-3 px-4 text-right">Active Transfers</th>
                <th className="py-3 px-4">Tier Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EE]">
              {filteredStates.map((s) => {
                const isHighRisk = s.stockout_risk_score >= 25;
                const isModerate = s.stockout_risk_score >= 15;
                return (
                  <tr key={s.state_id} className="hover:bg-[#F7F9FB]/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#14202B] text-sm">{s.state_name}</div>
                      <div className="text-[10px] text-[#5B6B7A] font-mono">Code: {s.state_id}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#14202B]">
                      {s.facilities.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isHighRisk ? 'bg-rose-600' : isModerate ? 'bg-amber-500' : 'bg-emerald-600'
                            }`}
                            style={{ width: `${s.stockout_risk_score * 3}%` }}
                          />
                        </div>
                        <span className="font-mono font-bold text-xs">{s.stockout_risk_score}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#0F6B6B]">
                      {s.essential_cover_pct}%
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-[#14202B]">
                      {s.active_transfers}
                    </td>
                    <td className="py-3.5 px-4">
                      {isHighRisk ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          Priority Attention
                        </span>
                      ) : isModerate ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Moderate Watch
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Stable Operations
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

      {/* Strategic Central Buffer Allocation Card */}
      <div className="bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={18} className="text-[#0F6B6B]" />
            <h3 className="text-sm font-bold text-[#14202B]">
              National Strategic Reserve Allocations (CMSS Buffer)
            </h3>
          </div>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Active Central Reserve
          </span>
        </div>
        <p className="text-xs text-[#5B6B7A]">
          Automated supply triggers for seasonal surges (monsoon vector-borne illnesses, respiratory viral spikes).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="p-3 bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg">
            <div className="text-xs font-bold text-[#14202B]">Southern Zone Buffer (Chennai Depot)</div>
            <div className="text-[11px] text-[#5B6B7A] mt-1">Paracetamol Syrup & ORS Reserve: 45,000 units</div>
            <div className="mt-2 text-[10px] text-emerald-700 font-semibold">● Ready for Immediate Dispatch</div>
          </div>
          <div className="p-3 bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg">
            <div className="text-xs font-bold text-[#14202B]">Western Zone Buffer (Pune Depot)</div>
            <div className="text-[11px] text-[#5B6B7A] mt-1">Amoxicillin 250mg & Cefixime: 32,000 units</div>
            <div className="mt-2 text-[10px] text-emerald-700 font-semibold">● Ready for Immediate Dispatch</div>
          </div>
          <div className="p-3 bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg">
            <div className="text-xs font-bold text-[#14202B]">Northern Zone Buffer (Karnal Depot)</div>
            <div className="text-[11px] text-[#5B6B7A] mt-1">Metformin & Iron Folic Acid: 68,000 units</div>
            <div className="mt-2 text-[10px] text-emerald-700 font-semibold">● Ready for Immediate Dispatch</div>
          </div>
        </div>
      </div>
    </div>
  );
};
