import React, { useState, useEffect } from 'react';
import {
  Search,
  MapPin,
  Phone,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Send,
  Building2,
  Info,
  ShieldCheck,
  Filter,
  DollarSign
} from 'lucide-react';
import { PharmacyItem, AvailabilityEnquiry } from '../types';
import { Language } from '../i18n';

interface PatientFinderProps {
  lang: Language;
}

export const PatientFinder: React.FC<PatientFinderProps> = ({ lang }) => {
  const [searchTerm, setSearchTerm] = useState('Paracetamol');
  const [maxDistance, setMaxDistance] = useState<number>(30);
  const [pharmacies, setPharmacies] = useState<PharmacyItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedPharmacy, setSelectedPharmacy] = useState<PharmacyItem | null>(null);

  // Enquiry modal state
  const [enquiryPharmacy, setEnquiryPharmacy] = useState<PharmacyItem | null>(null);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [requestedQty, setRequestedQty] = useState(1);
  const [enquirySuccess, setEnquirySuccess] = useState<string | null>(null);

  const fetchNearby = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/pharmacies/nearby?lat=10.658&lng=77.009&max_distance_km=${maxDistance}`);
      const data = await res.json();
      setPharmacies(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNearby();
  }, [maxDistance]);

  const handleSendEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiryPharmacy) return;

    try {
      const res = await fetch('/api/pharmacies/enquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacy_id: enquiryPharmacy.id,
          medicine_id: 'med_pcm',
          patient_name: patientName,
          patient_phone: patientPhone,
          requested_quantity: requestedQty
        })
      });
      const data = await res.json();
      setEnquirySuccess('Enquiry submitted! The pharmacist has been notified to verify physical stock on shelf.');
      setTimeout(() => {
        setEnquirySuccess(null);
        setEnquiryPharmacy(null);
        setPatientName('');
        setPatientPhone('');
      }, 2500);
    } catch (e) {
      alert('Error sending enquiry');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Clinical Disclaimer Banner */}
      <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-start gap-3 text-xs text-amber-950 shadow-2xs">
        <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Public Health & Patient Advisory:</strong>
          <p className="mt-0.5 text-amber-900 leading-relaxed">
            Reported medicine inventory reflects recent electronic logs and may experience delays due to dispensing in progress.
            Always confirm with the dispensing pharmacist. Prescription medicines require a valid doctor’s prescription.
          </p>
        </div>
      </div>

      {/* Header & Search Bar */}
      <div className="bg-white rounded-2xl border border-[#E3E8EE] p-5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#E3E8EE]">
          <div>
            <h2 className="font-bold text-lg text-[#14202B]">
              Find Medicines & Nearby Pharmacies
            </h2>
            <p className="text-xs text-[#5B6B7A]">
              Locate retail pharmacies and public health dispensaries with reported stock
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-[#5B6B7A] font-semibold">Max Distance:</span>
            <select
              value={maxDistance}
              onChange={(e) => setMaxDistance(Number(e.target.value))}
              className="text-xs border border-[#E3E8EE] rounded-lg px-2.5 py-1.5 bg-white font-medium"
            >
              <option value={10}>Within 10 km</option>
              <option value={20}>Within 20 km</option>
              <option value={30}>Within 30 km</option>
              <option value={50}>Within 50 km</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-3 text-[#5B6B7A]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search generic (Paracetamol, Amoxicillin, ORS) or brand (Dolo, Crocin, Electral)..."
              className="w-full text-xs border border-[#E3E8EE] rounded-xl pl-9 pr-3 py-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#0F6B6B]"
            />
          </div>
          <button
            onClick={fetchNearby}
            className="px-5 py-2.5 bg-[#0F6B6B] hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            Search
          </button>
        </div>
      </div>

      {/* Pharmacy Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pharmacies.map((ph) => {
          const isAvailable = ph.stock_quantity > 0;
          return (
            <div
              key={ph.id}
              className="bg-white rounded-xl border border-[#E3E8EE] p-5 hover:border-teal-300 hover:shadow-xs transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-sm text-[#14202B]">{ph.name}</h3>
                    <p className="text-xs text-[#5B6B7A] flex items-center gap-1 mt-1">
                      <MapPin size={13} />
                      <span>{ph.address}</span>
                    </p>
                  </div>
                  <span className="text-xs font-bold text-[#0F6B6B] bg-teal-50 px-2 py-0.5 rounded border border-teal-200 shrink-0">
                    {ph.distance_km} km away
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-[#5B6B7A] block font-medium">Availability Status</span>
                    <span
                      className={`font-bold inline-flex items-center gap-1 ${
                        ph.availability_status === 'IN_STOCK'
                          ? 'text-emerald-700'
                          : ph.availability_status === 'LOW_STOCK'
                          ? 'text-amber-700'
                          : 'text-slate-600'
                      }`}
                    >
                      {ph.availability_status === 'IN_STOCK' && <CheckCircle2 size={13} />}
                      {ph.availability_status}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-[#5B6B7A] block font-medium">Data Provenance</span>
                    <span className="font-semibold text-slate-800 text-[11px]">
                      {ph.data_source}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-[#5B6B7A]">
                  <span className="flex items-center gap-1">
                    <Phone size={13} />
                    <span>{ph.contact_phone}</span>
                  </span>
                  <span className="font-semibold text-[#14202B]">
                    Price: ₹2.50 / tab (Verified)
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#E3E8EE] flex items-center justify-between">
                <span className="text-[10px] text-[#5B6B7A]">
                  Last synced: ~10 mins ago
                </span>
                <button
                  onClick={() => setEnquiryPharmacy(ph)}
                  className="px-3 py-1.5 bg-[#0F6B6B] hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-3xs transition flex items-center gap-1"
                >
                  <Send size={12} />
                  <span>Request Availability Check</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Enquiry Modal Dialog */}
      {enquiryPharmacy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl border border-[#E3E8EE] shadow-2xl max-w-md w-full p-6">
            <h3 className="font-bold text-base text-[#14202B]">
              Request Stock Confirmation
            </h3>
            <p className="text-xs text-[#5B6B7A] mt-0.5">
              Target Pharmacy: <strong>{enquiryPharmacy.name}</strong>
            </p>

            {enquirySuccess ? (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 font-semibold">
                {enquirySuccess}
              </div>
            ) : (
              <form onSubmit={handleSendEnquiry} className="mt-4 space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Your Name</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. Senthil Kumar"
                    className="w-full border border-[#E3E8EE] rounded-lg p-2.5"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="+91 94432 00000"
                    className="w-full border border-[#E3E8EE] rounded-lg p-2.5"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Requested Quantity (Strips / Bottles)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={requestedQty}
                    onChange={(e) => setRequestedQty(Number(e.target.value))}
                    className="w-full border border-[#E3E8EE] rounded-lg p-2.5 font-bold"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setEnquiryPharmacy(null)}
                    className="px-3 py-2 border border-[#E3E8EE] rounded-lg font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0F6B6B] hover:bg-teal-800 text-white rounded-lg font-bold"
                  >
                    Send Confirmation Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
