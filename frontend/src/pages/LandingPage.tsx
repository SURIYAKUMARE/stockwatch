import React from 'react';
import {
  HeartPulse,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  MapPin,
  Users,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Eye,
} from 'lucide-react';

interface LandingPageProps {
  onGoToLogin: () => void;
  onGoToRegister: () => void;
  lang: 'en' | 'ta';
}

const ROLES = [
  { icon: Users, label: 'Patient / Customer', desc: 'Find nearby medicine availability', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { icon: ShieldAlert, label: 'Pharmacist', desc: 'Manage pharmacy inventory & alerts', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { icon: HeartPulse, label: 'Health Facility / CHC', desc: 'Track PHC / CHC stock & forecasts', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { icon: MapPin, label: 'District Officer', desc: 'Coordinate district-wide supply', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { icon: Activity, label: 'State Officer', desc: 'Monitor state-level availability', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { icon: TrendingUp, label: 'National Officer', desc: 'National medicine supply overview', color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

const FEATURES = [
  {
    icon: Activity,
    title: 'Velocity-Based Forecasting',
    desc: 'Predicts shortages by watching how fast stock is falling — not just how much is left. Monte Carlo simulation gives P10/P50/P90 stockout dates.',
  },
  {
    icon: ShieldAlert,
    title: 'Actionable Early Alerts',
    desc: 'CRITICAL / HIGH / WATCH tiers fire with enough lead time to act within government monthly indent cycles.',
  },
  {
    icon: MapPin,
    title: 'Inter-Facility Transfer Network',
    desc: 'Automatically identifies nearby donor facilities with verified surplus and recommends safe, distance-ranked transfers.',
  },
  {
    icon: Users,
    title: 'Six-Role Access Control',
    desc: 'Patients, pharmacists, CHC staff, district, state, and national officers each see only what they need — no more, no less.',
  },
];

// Small mock dashboard preview cards
function PreviewCard({ tier, centre, medicine, cover }: { tier: string; centre: string; medicine: string; cover: string }) {
  const colours: Record<string, string> = {
    CRITICAL: 'border-l-[#C62828] bg-red-50',
    HIGH: 'border-l-[#EF6C00] bg-orange-50',
    WATCH: 'border-l-[#F9A825] bg-amber-50',
    SAFE: 'border-l-[#2E7D32] bg-emerald-50',
  };
  const labels: Record<string, string> = {
    CRITICAL: 'text-red-700',
    HIGH: 'text-orange-700',
    WATCH: 'text-amber-700',
    SAFE: 'text-emerald-700',
  };
  return (
    <div className={`border-l-4 rounded-lg px-3 py-2.5 ${colours[tier]} shadow-sm`}>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-[10px] font-bold uppercase tracking-wide ${labels[tier]}`}>{tier}</span>
        <span className="text-[10px] text-[#5B6B7A] tabular-nums">{cover}</span>
      </div>
      <div className="text-xs font-bold text-[#14202B]">{centre}</div>
      <div className="text-[11px] text-[#5B6B7A]">{medicine}</div>
    </div>
  );
}

export function LandingPage({ onGoToLogin, onGoToRegister, lang }: LandingPageProps) {
  const isTa = lang === 'ta';

  return (
    <div className="min-h-screen bg-[#F7F9FB] flex flex-col">
      {/* ── Top Nav ── */}
      <header className="bg-white border-b border-[#E3E8EE] sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0F6B6B] flex items-center justify-center text-white shadow-sm">
              <HeartPulse size={18} />
            </div>
            <div>
              <span className="text-sm font-bold text-[#14202B]">StockWatch PHC</span>
              <span className="hidden md:inline text-xs text-[#5B6B7A] ml-2">
                {isTa ? 'மருந்து தட்டுப்பாடு முன்கூட்டிய எச்சரிக்கை' : 'Medicine Supply Early-Warning Network'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#5B6B7A] hidden md:block">
              National Health Mission · Production Platform · SDG 3
            </span>
            <button
              onClick={onGoToLogin}
              className="px-4 py-1.5 text-xs font-bold text-[#0F6B6B] border border-[#0F6B6B] rounded-lg hover:bg-[#0F6B6B] hover:text-white transition-colors"
            >
              {isTa ? 'உள்நுழை' : 'Sign In'}
            </button>
            <button
              onClick={onGoToRegister}
              className="px-4 py-1.5 text-xs font-bold text-white bg-[#0F6B6B] rounded-lg hover:bg-[#0a4f4f] transition-colors shadow-sm"
            >
              {isTa ? 'பதிவு செய்க' : 'Register'}
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left: copy */}
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-[#0F6B6B] bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            {isTa ? 'SDG 3: நல்ல ஆரோக்கியம் & நலன்' : 'SDG 3: Good Health & Well-Being'}
          </div>

          <h1 className="text-4xl lg:text-5xl font-extrabold text-[#14202B] leading-tight tracking-tight">
            {isTa
              ? 'மருந்து தட்டுப்பாட்டை நேரத்திற்கு முன்பே கண்டறியுங்கள்.'
              : <>Predict Medicine Shortages<br /><span className="text-[#0F6B6B]">Before They Happen.</span></>}
          </h1>

          <p className="text-[#5B6B7A] text-base leading-relaxed max-w-lg">
            {isTa
              ? 'நோயாளர்கள், மருந்தகங்கள், சுகாதார நிலையங்கள் மற்றும் அரசு அதிகாரிகளை ஒரே நெட்வொர்க்கில் இணைக்கும் ஒரு அறிவார்ந்த அமைப்பு.'
              : 'One intelligent network connecting patients, pharmacies, healthcare facilities, and health authorities to improve essential medicine availability across India.'}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onGoToRegister}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-[#0F6B6B] hover:bg-[#0a4f4f] text-white font-bold text-sm rounded-xl shadow-md transition-all hover:shadow-lg"
            >
              {isTa ? 'மருந்து கிடைக்கும் இடத்தை கண்டறிக' : 'Explore Medicine Availability'}
              <ArrowRight size={16} />
            </button>
            <button
              onClick={onGoToLogin}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-[#E3E8EE] text-[#14202B] font-bold text-sm rounded-xl hover:border-[#0F6B6B] hover:text-[#0F6B6B] transition-colors shadow-sm"
            >
              {isTa ? 'அதிகாரி உள்நுழைவு' : 'Officer Login'}
            </button>
          </div>

          {/* Verified Roles Quick Reference */}
          <div className="bg-teal-50/60 border border-teal-200 rounded-xl p-4 text-xs space-y-1.5">
            <div className="font-bold text-teal-900 flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-[#0F6B6B]" />
              {isTa ? 'சரிபார்க்கப்பட்ட அதிகாரப்பூர்வ கணக்குகள்' : 'Verified Clinical & Officer Roles (Password: demo1234)'}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-teal-950 font-mono">
              {[
                ['patient@demo.stockwatch', 'Patient'],
                ['pharmacist@demo.stockwatch', 'Pharmacist'],
                ['facility@demo.stockwatch', 'Facility Staff'],
                ['district@demo.stockwatch', 'District Officer'],
                ['state@demo.stockwatch', 'State Officer'],
                ['national@demo.stockwatch', 'National Officer'],
              ].map(([email, label]) => (
                <div key={email} className="flex flex-col">
                  <span className="text-[10px] font-semibold text-amber-700">{label}</span>
                  <span className="text-[10px] break-all">{email}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: mock dashboard preview */}
        <div className="relative">
          <div className="bg-white rounded-2xl border border-[#E3E8EE] shadow-xl p-5 space-y-4">
            {/* Mock top nav */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE]">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-[#0F6B6B] flex items-center justify-center">
                  <HeartPulse size={12} className="text-white" />
                </div>
                <span className="text-xs font-bold text-[#14202B]">StockWatch PHC</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live · 12 PHCs Online
              </div>
            </div>

            {/* Mock KPI strip */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Centres at Risk', value: '4', accent: 'text-orange-600' },
                { label: 'Critical Items', value: '2', accent: 'text-red-700' },
                { label: 'Days Cover Avg', value: '18.3d', accent: 'text-[#0F6B6B]' },
              ].map(k => (
                <div key={k.label} className="bg-[#F7F9FB] p-2.5 rounded-lg border border-[#E3E8EE]">
                  <div className="text-[9px] text-[#5B6B7A]">{k.label}</div>
                  <div className={`text-base font-bold tabular-nums mt-0.5 ${k.accent}`}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Mock alert cards */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold text-[#5B6B7A] uppercase tracking-wide">Priority Alerts — Act Today</div>
              <PreviewCard tier="CRITICAL" centre="PHC Valparai" medicine="Paracetamol syrup" cover="~2.5d cover" />
              <PreviewCard tier="HIGH" centre="PHC Anaimalai" medicine="ORS Sachets" cover="~6d cover" />
              <PreviewCard tier="WATCH" centre="PHC Kottur" medicine="Amoxicillin 250mg" cover="~11d cover" />
              <PreviewCard tier="SAFE" centre="PHC Aliyar" medicine="Metformin 500mg" cover="~28d cover" />
            </div>

            {/* Mock disclaimer */}
            <div className="text-[9px] text-[#5B6B7A] border-t border-[#E3E8EE] pt-2 italic">
              All forecasts are Estimates. Officer approval required for all replenishment actions.
            </div>
          </div>

          {/* Decorative background blob */}
          <div className="absolute -z-10 -top-8 -right-8 w-48 h-48 bg-teal-100 rounded-full blur-3xl opacity-50" />
          <div className="absolute -z-10 -bottom-8 -left-8 w-32 h-32 bg-orange-100 rounded-full blur-2xl opacity-50" />
        </div>
      </section>

      {/* ── Role Cards ── */}
      <section className="bg-white border-t border-[#E3E8EE] py-14">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-[#14202B]">
              {isTa ? 'அனைத்து பாத்திரங்களையும் ஒரே நெட்வொர்க்கில்' : 'All Roles. One Network.'}
            </h2>
            <p className="text-sm text-[#5B6B7A] mt-2">
              {isTa
                ? 'ஒவ்வொரு பாத்திரமும் தேவையான தகவலையே காண்கிறது'
                : 'Every role sees only what they need — nothing more, nothing less.'}
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {ROLES.map(r => {
              const Icon = r.icon;
              return (
                <button
                  key={r.label}
                  onClick={onGoToLogin}
                  className={`flex flex-col items-center text-center p-4 rounded-xl border ${r.color} hover:shadow-md transition-all group`}
                >
                  <Icon size={22} className="mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-xs font-bold">{r.label}</div>
                  <div className="text-[10px] mt-1 opacity-75">{r.desc}</div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="max-w-7xl mx-auto px-6 py-14">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-[#14202B]">
            {isTa ? 'முக்கிய அம்சங்கள்' : 'Key Capabilities'}
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map(f => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="bg-white p-5 rounded-xl border border-[#E3E8EE] shadow-sm hover:shadow-md transition-shadow space-y-3">
                <div className="w-10 h-10 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center">
                  <Icon size={20} className="text-[#0F6B6B]" />
                </div>
                <h3 className="text-sm font-bold text-[#14202B]">{f.title}</h3>
                <p className="text-xs text-[#5B6B7A] leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Ethics banner ── */}
      <section className="bg-[#0F6B6B] text-white py-10">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-teal-200 text-sm font-semibold">
            <Eye size={16} />
            <span>{isTa ? 'முடிவெடுக்கும் ஆதரவு மட்டுமே' : 'Decision Support Only'}</span>
          </div>
          <p className="text-sm text-teal-100 leading-relaxed max-w-2xl mx-auto">
            {isTa
              ? 'StockWatch PHC ஒரு மருத்துவ முடிவெடுக்கும் ஆதரவு அமைப்பு. அனைத்து மருந்து இடமாற்றங்கள் மற்றும் அவசர கொள்முதல் முடிவுகளுக்கும் அங்கீகரிக்கப்பட்ட மருத்துவ அலுவலரின் ஒப்புதல் தேவை.'
              : 'StockWatch PHC is a clinical decision-support system only. All medicine transfers, emergency indents, and stock adjustments require explicit approval from an authorized Medical Officer. Forecasts are estimates and must never be acted on without human review.'}
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#14202B] text-[#5B6B7A] text-xs py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <HeartPulse size={14} className="text-[#0F6B6B]" />
            <span className="font-semibold text-white">StockWatch PHC</span>
            <span>· Production Health Network · SDG 3: Good Health & Well-Being</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Real-Time Healthcare Intelligence Platform</span>
            <span>·</span>
            <button onClick={onGoToLogin} className="text-teal-400 hover:text-teal-300 font-semibold">
              Sign In
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
