import React, { useState } from 'react';
import {
  Search,
  MapPin,
  AlertTriangle,
  Info,
  Star,
  StarOff,
  Phone,
  Clock,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import type { Language } from '../../i18n';
import type { AppScreen } from '../../components/nav/AppShell';

// ─── Demo pharmacy data (clearly labelled as demo) ────────────────────────────

interface DemoPharmacy {
  id: string;
  name: string;
  address: string;
  distance_km: number;
  phone: string;
  isVerified: boolean;
  lastUpdate: string;
  dataSource: 'demo';
}

const DEMO_PHARMACIES: DemoPharmacy[] = [
  { id: 'ph1', name: 'Valparai Medical Store', address: 'Main Road, Valparai, Coimbatore – 642127', distance_km: 0.4, phone: '+91 98765 43210', isVerified: true, lastUpdate: '2 hours ago', dataSource: 'demo' },
  { id: 'ph2', name: 'Aliyar Pharma', address: 'Aliyar Dam Rd, Anaimalai Block', distance_km: 8.8, phone: '+91 98765 11111', isVerified: true, lastUpdate: '5 hours ago', dataSource: 'demo' },
  { id: 'ph3', name: 'Pollachi Health Centre Pharmacy', address: 'Nehru St, Pollachi, Coimbatore', distance_km: 14.2, phone: '+91 98765 22222', isVerified: false, lastUpdate: '1 day ago', dataSource: 'demo' },
];

interface DemoMedAvailability {
  pharmacyId: string;
  pharmacyName: string;
  medicine: string;
  strength: string;
  qty: number;
  freshness: 'recent' | 'stale' | 'unknown';
  price?: string;
}

const DEMO_AVAILABILITY: DemoMedAvailability[] = [
  { pharmacyId: 'ph1', pharmacyName: 'Valparai Medical Store', medicine: 'Paracetamol', strength: '500mg Tablet', qty: 40, freshness: 'recent', price: '₹2/strip' },
  { pharmacyId: 'ph2', pharmacyName: 'Aliyar Pharma', medicine: 'Paracetamol', strength: '500mg Tablet', qty: 25, freshness: 'stale', price: '₹2/strip' },
  { pharmacyId: 'ph1', pharmacyName: 'Valparai Medical Store', medicine: 'ORS Sachets', strength: '20.5g', qty: 120, freshness: 'recent', price: '₹5/sachet' },
  { pharmacyId: 'ph3', pharmacyName: 'Pollachi HC Pharmacy', medicine: 'Amoxicillin', strength: '250mg Capsule', qty: 0, freshness: 'stale' },
];

const FRESHNESS_LABEL: Record<string, { label: string; color: string }> = {
  recent: { label: 'Recently verified', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  stale: { label: 'May be outdated', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  unknown: { label: 'Unknown freshness', color: 'text-gray-600 bg-gray-50 border-gray-200' },
};

interface PatientDashboardProps {
  activeScreen: AppScreen;
  lang: Language;
}

export function PatientDashboard({ activeScreen, lang }: PatientDashboardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [savedPharmacies, setSavedPharmacies] = useState<string[]>(['ph1']);

  const isTa = lang === 'ta';

  const filteredAvailability = DEMO_AVAILABILITY.filter(a =>
    !searchQuery || a.medicine.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.strength.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleSave = (id: string) =>
    setSavedPharmacies(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  if (activeScreen === 'saved_pharmacies') {
    const saved = DEMO_PHARMACIES.filter(p => savedPharmacies.includes(p.id));
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <h2 className="text-base font-bold text-[#14202B]">
          {isTa ? 'சேமித்த மருந்தகங்கள்' : 'Saved Pharmacies'}
        </h2>
        {saved.length === 0 ? (
          <div className="text-xs text-[#5B6B7A] text-center py-12">No saved pharmacies yet.</div>
        ) : saved.map(p => <PharmacyCard key={p.id} pharmacy={p} isSaved onToggleSave={toggleSave} isTa={isTa} />)}
      </div>
    );
  }

  if (activeScreen === 'nearby_pharmacies') {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <div>
          <h2 className="text-base font-bold text-[#14202B]">
            {isTa ? 'அருகிலுள்ள மருந்தகங்கள்' : 'Nearby Participating Pharmacies'}
          </h2>
          <DemoDataBanner isTa={isTa} />
        </div>
        {DEMO_PHARMACIES.map(p => (
          <PharmacyCard key={p.id} pharmacy={p} isSaved={savedPharmacies.includes(p.id)} onToggleSave={toggleSave} isTa={isTa} />
        ))}
      </div>
    );
  }

  if (activeScreen === 'my_enquiries') {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-4">
        <h2 className="text-base font-bold text-[#14202B]">{isTa ? 'என் கேள்விகள்' : 'My Previous Enquiries'}</h2>
        <div className="bg-white border border-[#E3E8EE] rounded-xl p-8 text-center text-xs text-[#5B6B7A]">
          No past enquiries. Search for a medicine to send an availability request.
        </div>
      </div>
    );
  }

  // Default: medicine search
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-[#14202B]">
          {isTa ? 'மருந்து கிடைக்கும் இடத்தை தேடுக' : 'Find Medicine Availability'}
        </h2>
        <p className="text-xs text-[#5B6B7A] mt-0.5">
          {isTa
            ? 'அருகிலுள்ள மருந்தகங்களில் மருந்து கிடைக்கிறதா என்று பாருங்கள்.'
            : 'Check which nearby pharmacies have your medicine in stock.'}
        </p>
        <DemoDataBanner isTa={isTa} />
      </div>

      {/* Search */}
      <div className="relative max-w-xl">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6B7A]" />
        <input
          type="search"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={isTa ? 'மருந்து பெயரை தேடுங்கள்…' : 'Search medicine name, brand, or ingredient…'}
          className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-[#E3E8EE] bg-white text-[#14202B] focus:outline-none focus:ring-2 focus:ring-[#0F6B6B] shadow-sm"
        />
      </div>

      {/* Availability cards */}
      <div className="space-y-3">
        {filteredAvailability.length === 0 ? (
          <div className="bg-white border border-[#E3E8EE] rounded-xl p-10 text-center text-xs text-[#5B6B7A]">
            No results for "{searchQuery}". Try a different medicine name.
          </div>
        ) : filteredAvailability.map((a, i) => {
          const f = FRESHNESS_LABEL[a.freshness];
          return (
            <div key={i} className="bg-white border border-[#E3E8EE] rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-[#14202B]">{a.medicine}</h3>
                  <div className="text-xs text-[#5B6B7A]">{a.strength}</div>
                </div>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${f.color}`}>
                  {f.label}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-[#5B6B7A]">
                  <MapPin size={13} className="text-[#0F6B6B]" />
                  <span className="font-semibold text-[#14202B]">{a.pharmacyName}</span>
                </div>
                {a.price && (
                  <span className="font-semibold text-[#0F6B6B]">{a.price}</span>
                )}
              </div>

              {a.qty > 0 ? (
                <div className="flex items-center gap-2 text-xs">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span className="text-emerald-700 font-semibold">
                    {isTa ? `${a.qty} யூனிட் கிடைக்கிறது (டெமோ தரவு)` : `${a.qty} units reported in stock (Demo data)`}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs">
                  <AlertTriangle size={13} className="text-amber-600" />
                  <span className="text-amber-800 font-semibold">
                    {isTa ? 'இருப்பு இல்லை என தெரிவிக்கப்பட்டுள்ளது' : 'Reported as out of stock'}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-[#E3E8EE]">
                <button className="text-xs font-semibold text-[#0F6B6B] hover:underline flex items-center gap-1">
                  <Phone size={12} />
                  {isTa ? 'மருந்தகத்தை தொடர்பு கொள்' : 'Contact Pharmacy'}
                </button>
                <button className="text-xs text-[#5B6B7A] hover:text-[#0F6B6B] flex items-center gap-1">
                  <Clock size={12} />
                  {isTa ? 'உறுதிப்படுத்தலை கோரு' : 'Request confirmation'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-2.5 text-xs text-amber-800">
        <Info size={15} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          {isTa
            ? 'இருப்பு தகவல் காலதாமதமாக இருக்கலாம். மருந்தகத்தை தொடர்பு கொண்டு உறுதிப்படுத்திக்கொள்ளுங்கள். பரிந்துரைக்கப்பட்ட மருந்துகளுக்கு மருத்துவரின் ஆலோசனை பெறவும்.'
            : 'Stock information may be delayed. Always confirm availability directly with the pharmacy before travelling. Consult a qualified doctor for prescription medicines. Never rely solely on this app for medical decisions.'}
        </p>
      </div>
    </div>
  );
}

function DemoDataBanner({ isTa }: { isTa: boolean }) {
  return (
    <div className="mt-2 flex items-center gap-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1 w-fit font-semibold">
      <AlertTriangle size={11} />
      {isTa ? 'டெமோ தரவு — உண்மையான இருப்பு அல்ல' : 'Demo data — not real pharmacy inventory'}
    </div>
  );
}

function PharmacyCard({
  pharmacy, isSaved, onToggleSave, isTa,
}: { pharmacy: DemoPharmacy; isSaved: boolean; onToggleSave: (id: string) => void; isTa: boolean }) {
  return (
    <div className="bg-white border border-[#E3E8EE] rounded-xl p-4 shadow-sm space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#14202B]">{pharmacy.name}</h3>
            {pharmacy.isVerified && (
              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                {isTa ? 'சரிபார்க்கப்பட்டது' : 'Verified'}
              </span>
            )}
            <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full font-semibold">
              Demo
            </span>
          </div>
          <div className="text-xs text-[#5B6B7A] mt-0.5">{pharmacy.address}</div>
        </div>
        <button onClick={() => onToggleSave(pharmacy.id)} className="text-[#5B6B7A] hover:text-amber-500 transition-colors">
          {isSaved ? <Star size={16} className="text-amber-400 fill-amber-400" /> : <StarOff size={16} />}
        </button>
      </div>
      <div className="flex items-center gap-4 text-xs text-[#5B6B7A]">
        <span className="flex items-center gap-1"><MapPin size={12} className="text-[#0F6B6B]" />{pharmacy.distance_km} km</span>
        <span className="flex items-center gap-1"><Phone size={12} />{pharmacy.phone}</span>
        <span className="flex items-center gap-1"><Clock size={12} />Updated {pharmacy.lastUpdate}</span>
      </div>
    </div>
  );
}
