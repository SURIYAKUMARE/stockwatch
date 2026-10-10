import React from 'react';
import {
  ShieldAlert,
  Search,
  LogIn,
  Activity,
  ArrowRight,
  TrendingDown,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles
} from 'lucide-react';
import { Language } from '../i18n';

interface LandingPageProps {
  onExploreMedicines: () => void;
  onOpenLogin: (role?: string) => void;
  lang: Language;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onExploreMedicines,
  onOpenLogin,
  lang
}) => {
  return (
    <div className="min-h-screen bg-[#F7F9FB] text-[#14202B] flex flex-col font-sans select-none">
      {/* Top Navigation */}
      <header className="h-16 bg-white border-b border-[#E3E8EE] px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="StockWatch PHC Logo" className="w-10 h-10 object-contain rounded-xl shadow-xs" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base tracking-tight text-[#14202B]">
                StockWatch PHC
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-[#0F6B6B] border border-teal-200">
                SDG 3 · PS 6
              </span>
            </div>
            <p className="text-[11px] text-[#5B6B7A] leading-none font-medium">
              Intelligent Medicine Supply & Early-Warning Network
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onExploreMedicines}
            className="text-xs font-semibold px-3 py-2 rounded-lg text-[#0F6B6B] hover:bg-teal-50 transition flex items-center gap-1.5"
          >
            <Search size={15} />
            <span>Find Medicines</span>
          </button>
          <button
            onClick={() => onOpenLogin()}
            className="text-xs font-bold px-4 py-2 rounded-lg bg-[#0F6B6B] hover:bg-teal-800 text-white shadow-2xs transition flex items-center gap-1.5"
          >
            <LogIn size={15} />
            <span>Sign In / Officer Access</span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-14 px-6 max-w-6xl mx-auto w-full">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#0F6B6B] text-xs font-bold mb-4 shadow-3xs">
            <Sparkles size={14} />
            <span>Predict Shortages 4.8 Days Earlier Than Static Thresholds</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-[#14202B] leading-tight">
            Predict Medicine Shortages Before They Happen.
          </h1>

          <p className="mt-3.5 text-sm md:text-base text-[#5B6B7A] leading-relaxed">
            One intelligent network connecting patients, pharmacies, healthcare facilities,
            and health authorities to improve medicine availability across Tamil Nadu.
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3.5">
            <button
              onClick={onExploreMedicines}
              className="px-6 py-3 rounded-lg bg-[#0F6B6B] hover:bg-teal-800 text-white font-bold text-sm shadow-xs transition flex items-center gap-2"
            >
              <Search size={17} />
              <span>Explore Medicine Availability</span>
              <ArrowRight size={16} />
            </button>

            <button
              onClick={() => onOpenLogin('district_officer')}
              className="px-6 py-3 rounded-lg bg-white border border-[#E3E8EE] hover:bg-slate-50 text-[#14202B] font-bold text-sm shadow-2xs transition flex items-center gap-2"
            >
              <ShieldAlert size={17} className="text-[#0F6B6B]" />
              <span>Officer Login</span>
            </button>
          </div>
        </div>

        {/* Live System Preview Card */}
        <div className="mt-12 bg-white rounded-2xl border border-[#E3E8EE] p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between pb-4 border-b border-[#E3E8EE] gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-[#14202B]">
                Live Network Status: Coimbatore District & Region
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#5B6B7A]">
              <span className="px-2 py-0.5 rounded bg-slate-100 font-medium">12 PHCs</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 font-medium">2 CHCs</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 font-medium">5 Pharmacies</span>
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">EWMA α=0.3 Active</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-5">
            <div className="p-3.5 rounded-xl border border-red-200 bg-red-50/50">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#C62828] flex items-center gap-1">
                  <AlertTriangle size={14} /> CRITICAL STOCK-OUT
                </span>
                <span className="text-[10px] bg-red-200 text-red-900 font-bold px-1.5 py-0.5 rounded">1.8d Left</span>
              </div>
              <p className="text-xs font-bold text-[#14202B] mt-1.5">PHC Valparai</p>
              <p className="text-[11px] text-[#5B6B7A]">Paracetamol Syrup 60ml · 35 units</p>
              <p className="text-[10px] text-red-700 font-medium mt-1">Surge detected (+64% in 3 days)</p>
            </div>

            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                  <CheckCircle2 size={14} /> ELIGIBLE DONOR FOUND
                </span>
                <span className="text-[10px] bg-emerald-200 text-emerald-900 font-bold px-1.5 py-0.5 rounded">8.8 km</span>
              </div>
              <p className="text-xs font-bold text-[#14202B] mt-1.5">PHC Aliyar</p>
              <p className="text-[11px] text-[#5B6B7A]">Surplus: 120 units (Safety stock safe)</p>
              <p className="text-[10px] text-emerald-700 font-medium mt-1">22 min transit via hill corridor</p>
            </div>

            <div className="p-3.5 rounded-xl border border-teal-200 bg-teal-50/50">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#0F6B6B] flex items-center gap-1">
                  <TrendingDown size={14} /> LEAD TIME GAIN
                </span>
                <span className="text-[10px] bg-teal-200 text-teal-900 font-bold px-1.5 py-0.5 rounded">+4.8 Days</span>
              </div>
              <p className="text-xs font-bold text-[#14202B] mt-1.5">Early Detection Margin</p>
              <p className="text-[11px] text-[#5B6B7A]">Warns prior to supplier lead deficit</p>
              <p className="text-[10px] text-[#0F6B6B] font-medium mt-1">Verified on 90-day backtest</p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#5B6B7A] flex items-center gap-1">
                  <Clock size={14} /> DATA FRESHNESS
                </span>
                <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-1.5 py-0.5 rounded">Live</span>
              </div>
              <p className="text-xs font-bold text-[#14202B] mt-1.5">Transparent Sourcing</p>
              <p className="text-[11px] text-[#5B6B7A]">Tamil Nadu DHS + Retail Chemists</p>
              <p className="text-[10px] text-slate-600 font-medium mt-1">Blind spot flagging for stale PHCs</p>
            </div>
          </div>
        </div>

        {/* 6 Roles Grid */}
        <div className="mt-14">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-[#14202B]">
              One Unified Network. Six Specialized Decision Portals.
            </h2>
            <p className="text-xs text-[#5B6B7A] mt-1">
              Select your role to view real-time data, authorization controls, and workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Role 1 */}
            <div
              onClick={() => onExploreMedicines()}
              className="bg-white p-5 rounded-xl border border-[#E3E8EE] hover:border-teal-400 hover:shadow-xs transition cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-teal-50 text-[#0F6B6B] flex items-center justify-center font-bold text-sm mb-3">
                👤
              </div>
              <h3 className="font-bold text-sm text-[#14202B]">1. Patient / Customer</h3>
              <p className="text-xs text-[#5B6B7A] mt-1 leading-relaxed">
                Search essential medicines by generic/brand name, find nearby pharmacies on a map, view verified availability, and request confirmations.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F6B6B] mt-3">
                Explore Finder →
              </span>
            </div>

            {/* Role 2 */}
            <div
              onClick={() => onOpenLogin('pharmacist')}
              className="bg-white p-5 rounded-xl border border-[#E3E8EE] hover:border-teal-400 hover:shadow-xs transition cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-teal-50 text-[#0F6B6B] flex items-center justify-center font-bold text-sm mb-3">
                💊
              </div>
              <h3 className="font-bold text-sm text-[#14202B]">2. Retail Pharmacist</h3>
              <p className="text-xs text-[#5B6B7A] mt-1 leading-relaxed">
                Manage pharmacy stock, batch expiry tracking, idempotent CSV imports, customer enquiry confirmation, and safety stock threshold alarms.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F6B6B] mt-3">
                Pharmacist Portal →
              </span>
            </div>

            {/* Role 3 */}
            <div
              onClick={() => onOpenLogin('chc_facility')}
              className="bg-white p-5 rounded-xl border border-[#E3E8EE] hover:border-teal-400 hover:shadow-xs transition cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-teal-50 text-[#0F6B6B] flex items-center justify-center font-bold text-sm mb-3">
                🏥
              </div>
              <h3 className="font-bold text-sm text-[#14202B]">3. Health Sub-Centre / CHC / PHC</h3>
              <p className="text-xs text-[#5B6B7A] mt-1 leading-relaxed">
                Log dispensing, view AI days-of-cover predictions, find nearby surplus facilities, and submit inter-facility transfer requests.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F6B6B] mt-3">
                Facility Portal →
              </span>
            </div>

            {/* Role 4 */}
            <div
              onClick={() => onOpenLogin('district_officer')}
              className="bg-white p-5 rounded-xl border border-[#E3E8EE] hover:border-teal-400 hover:shadow-xs transition cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-teal-50 text-[#0F6B6B] flex items-center justify-center font-bold text-sm mb-3">
                🛡️
              </div>
              <h3 className="font-bold text-sm text-[#14202B]">4. District Health Officer</h3>
              <p className="text-xs text-[#5B6B7A] mt-1 leading-relaxed">
                District-wide stock-out risk heatmaps, priority urgency queues, review and approval of inter-PHC medicine transfers, and weekly A4 reports.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F6B6B] mt-3">
                District Command →
              </span>
            </div>

            {/* Role 5 */}
            <div
              onClick={() => onOpenLogin('state_officer')}
              className="bg-white p-5 rounded-xl border border-[#E3E8EE] hover:border-teal-400 hover:shadow-xs transition cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-teal-50 text-[#0F6B6B] flex items-center justify-center font-bold text-sm mb-3">
                🏛️
              </div>
              <h3 className="font-bold text-sm text-[#14202B]">5. State Health Officer</h3>
              <p className="text-xs text-[#5B6B7A] mt-1 leading-relaxed">
                State-wide district comparisons, shortage rankings across 38 districts, reporting compliance auditing, and emergency buffer procurement planning.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F6B6B] mt-3">
                State Dashboard →
              </span>
            </div>

            {/* Role 6 */}
            <div
              onClick={() => onOpenLogin('national_officer')}
              className="bg-white p-5 rounded-xl border border-[#E3E8EE] hover:border-teal-400 hover:shadow-xs transition cursor-pointer"
            >
              <div className="w-9 h-9 rounded-lg bg-teal-50 text-[#0F6B6B] flex items-center justify-center font-bold text-sm mb-3">
                🇮🇳
              </div>
              <h3 className="font-bold text-sm text-[#14202B]">6. National Health Officer</h3>
              <p className="text-xs text-[#5B6B7A] mt-1 leading-relaxed">
                National essential medicine availability index, inter-state supply resilience metrics, macro shortage clusters, and privacy-preserving analytics.
              </p>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F6B6B] mt-3">
                National Overview →
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-[#E3E8EE] py-6 px-6 text-center text-xs text-[#5B6B7A]">
        <div className="flex items-center justify-center gap-4 mb-2">
          <span>Sakthi Hackfest '26</span>
          <span>·</span>
          <span>Problem Statement 6</span>
          <span>·</span>
          <span>UN SDG 3: Good Health & Well-being</span>
        </div>
        <p className="text-[11px] text-slate-400">
          StockWatch PHC is a clinical decision-support platform. All medicine transfers and procurement actions require authorized human approval.
        </p>
      </footer>
    </div>
  );
};
