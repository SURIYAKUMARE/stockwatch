import React, { useState, useEffect } from 'react';
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
  ExternalLink,
  ShieldCheck,
  Calendar,
  Check,
  X,
  BellRing,
  Pill,
  BookOpen,
  Plus,
  Navigation
} from 'lucide-react';
import type { Language } from '../../i18n';
import type { AppScreen } from '../../components/nav/AppShell';
import {
  savePriceComparisonToCache,
  getCachedPriceComparison,
  enqueueOfflineAction,
  getDeviceId,
  getCachedPatientSchedules,
  savePatientSchedulesToCache
} from '../../db/offlineQueue';

interface PriceComparisonSource {
  facility_id: string;
  facility_name: string;
  facility_type: string;
  address: string;
  contact_phone: string;
  distance_km: number;
  lat: number;
  lng: number;
  directions_url: string;
  quantity_available: number;
  availability_status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  price_inr: string;
  unit_price_raw: number;
  pricing_type: string;
  is_verified: boolean;
  data_source: string;
  last_updated: string;
}

interface ClinicalMonograph {
  id: string;
  generic_name: string;
  brand_names: string;
  active_ingredients: string;
  strength: string;
  dosage_form: string;
  route_of_administration: string;
  approved_indications: string;
  common_side_effects: string;
  serious_warnings: string;
  contraindications: string;
  drug_interactions: string;
  storage_instructions: string;
  prescription_status: string;
  source: string;
}

interface MedicationScheduleItem {
  id: string;
  medicine_name: string;
  strength: string;
  dosage_form: string;
  dose_quantity: string;
  frequency_per_day: number;
  schedule_times: string[];
  times_with_status: { time: string; status: 'TAKEN' | 'SKIPPED' | 'SNOOZED' | 'PENDING' }[];
  start_date: string;
  end_date?: string;
  prescribed_instructions: string;
  doctor_name?: string;
  status: string;
}

interface PatientDashboardProps {
  activeScreen?: AppScreen;
  lang: Language;
}

export function PatientDashboard({ activeScreen, lang }: PatientDashboardProps) {
  const isTa = lang === 'ta';

  // Medicine Search & Price Comparison State
  const [searchQuery, setSearchQuery] = useState('Paracetamol');
  const [selectedMedId, setSelectedMedId] = useState('med_pcm');
  const [comparisonData, setComparisonData] = useState<{
    medicine_name: string;
    strength: string;
    dosage_form: string;
    sources: PriceComparisonSource[];
  } | null>(null);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);

  // Clinical Monograph Modal
  const [selectedMonograph, setSelectedMonograph] = useState<ClinicalMonograph | null>(null);
  const [isLoadingMonograph, setIsLoadingMonograph] = useState(false);

  // Medication Reminders State
  const [reminders, setReminders] = useState<MedicationScheduleItem[]>([]);
  const [adherenceReport, setAdherenceReport] = useState<{
    adherence_percentage: number;
    current_streak_days: number;
    doses_taken: number;
    doses_skipped: number;
    doses_snoozed: number;
    adherence_rating: string;
  } | null>(null);
  const [isLoadingReminders, setIsLoadingReminders] = useState(false);
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);

  // New Reminder Form State
  const [newMedName, setNewMedName] = useState('');
  const [newDose, setNewDose] = useState('1 tablet');
  const [newTime, setNewTime] = useState('08:00');
  const [newInstructions, setNewInstructions] = useState('Take with water after breakfast');
  const [isOfflinePricing, setIsOfflinePricing] = useState(false);
  const [offlineCachedTime, setOfflineCachedTime] = useState<string | null>(null);

  // Fetch Price Comparison Data with Offline IndexedDB Fallback
  const fetchPriceComparison = async (medQuery: string) => {
    setIsLoadingSearch(true);
    try {
      const res = await fetch(`/api/patient/medicines/compare?medicine_name=${encodeURIComponent(medQuery)}`);
      if (res.ok) {
        const json = await res.json();
        setComparisonData(json);
        setIsOfflinePricing(false);
        if (json.sources && Array.isArray(json.sources)) {
          savePriceComparisonToCache(medQuery, json.sources).catch(() => {});
        }
      } else {
        throw new Error('Network error');
      }
    } catch (err) {
      // Fallback to IndexedDB offline price cache
      const cached = await getCachedPriceComparison(medQuery);
      if (cached && cached.sources) {
        setComparisonData({
          medicine_name: medQuery,
          strength: 'Standard',
          dosage_form: 'Various',
          sources: cached.sources
        });
        setIsOfflinePricing(true);
        setOfflineCachedTime(new Date(cached.cached_at).toLocaleTimeString());
      }
    } finally {
      setIsLoadingSearch(false);
    }
  };

  // Fetch Verified Clinical Monograph
  const fetchMonograph = async (medId: string) => {
    setIsLoadingMonograph(true);
    try {
      const res = await fetch(`/api/patient/medicines/${medId}/info`);
      if (res.ok) {
        const json = await res.json();
        setSelectedMonograph(json);
      }
    } catch (err) {
      console.error('Failed to fetch monograph', err);
    } finally {
      setIsLoadingMonograph(false);
    }
  };

  // Fetch Reminders & Adherence with Offline IndexedDB Fallback
  const fetchRemindersData = async () => {
    setIsLoadingReminders(true);
    try {
      const [remRes, adhRes] = await Promise.all([
        fetch('/api/patient/reminders'),
        fetch('/api/patient/adherence')
      ]);
      if (remRes.ok) {
        const remJson = await remRes.json();
        setReminders(remJson.schedules || []);
        if (remJson.schedules) {
          savePatientSchedulesToCache(remJson.schedules).catch(() => {});
        }
      }
      if (adhRes.ok) {
        const adhJson = await adhRes.json();
        setAdherenceReport(adhJson);
      }
    } catch (err) {
      // Fallback to IndexedDB offline schedules
      const cachedSchedules = await getCachedPatientSchedules();
      if (cachedSchedules && cachedSchedules.length > 0) {
        setReminders(cachedSchedules as any);
      }
    } finally {
      setIsLoadingReminders(false);
    }
  };

  // Handle reminder action: TAKEN, SKIPPED, SNOOZED with Offline Queue Fallback
  const handleReminderAction = async (scheduleId: string, time: string, action: 'TAKEN' | 'SKIPPED' | 'SNOOZED') => {
    const todayStr = new Date().toISOString().split('T')[0];
    const scheduledTime = `${todayStr} ${time}`;

    // Optimistically update reminder status locally
    setReminders((prev) =>
      prev.map((sch) => {
        if (sch.id === scheduleId && sch.times_with_status) {
          return {
            ...sch,
            times_with_status: sch.times_with_status.map((t) =>
              t.time === time ? { ...t, status: action } : t
            )
          };
        }
        return sch;
      })
    );

    try {
      const res = await fetch(`/api/patient/reminders/${scheduleId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, scheduled_time: scheduledTime })
      });
      if (!res.ok) throw new Error('Offline');
      await fetchRemindersData();
    } catch (err) {
      // Offline fallback: Queue into IndexedDB action queue
      await enqueueOfflineAction({
        action_type: 'PATIENT_REMINDER_LOG',
        user_id: 'patient_demo',
        user_name: 'Patient (Self)',
        user_role: 'patient',
        facility_id: 'coimbatore',
        device_id: getDeviceId(),
        payload: {
          schedule_id: scheduleId,
          patient_id: 'patient_demo',
          action,
          scheduled_time: scheduledTime
        }
      });
    }
  };

  // Create new medication reminder
  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim()) return;

    try {
      const res = await fetch('/api/patient/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine_name: newMedName,
          dose_quantity: newDose,
          frequency_per_day: 1,
          schedule_times: [newTime],
          start_date: new Date().toISOString().split('T')[0],
          prescribed_instructions: newInstructions
        })
      });
      if (res.ok) {
        setShowAddReminderModal(false);
        setNewMedName('');
        await fetchRemindersData();
      }
    } catch (err) {
      console.error('Failed to create reminder', err);
    }
  };

  useEffect(() => {
    fetchPriceComparison(searchQuery);
    fetchRemindersData();
  }, []);

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      {/* ── Subheader / Quick Mode Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E3E8EE] shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-[#14202B] flex items-center gap-2">
            <Pill className="text-[#0F6B6B]" size={20} />
            {isTa ? 'நோயாளி உதவி மையம் & மருந்து வழிகாட்டி' : 'Patient Care & Medicine Availability Network'}
          </h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            {isTa
              ? 'அருகிலுள்ள மருந்தகங்கள், விலைகள், கூகிள் மேப்ஸ் வழிகள் மற்றும் உங்கள் மருந்து நினைவூட்டல்கள்.'
              : 'Search nearby verified pharmacies, compare prices, get Google Maps directions, and track your daily prescriptions.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchMonograph('med_pcm')}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E3E8EE] text-[#14202B] hover:bg-[#F7F9FB] flex items-center gap-1.5 transition-colors"
          >
            <BookOpen size={14} className="text-[#0F6B6B]" />
            <span>Drug Monographs</span>
          </button>
          <button
            onClick={() => setShowAddReminderModal(true)}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#0F6B6B] text-white hover:bg-[#0a4f4f] flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Plus size={14} />
            <span>Add Reminder</span>
          </button>
        </div>
      </div>

      {/* ── Adherence Tracker Strip ── */}
      {adherenceReport && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl p-4">
          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider">Adherence Rate</span>
            <div className="text-xl font-extrabold text-[#0F6B6B]">
              {adherenceReport.adherence_percentage}%
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded-sm">
              {adherenceReport.adherence_rating}
            </span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider">Current Streak</span>
            <div className="text-xl font-extrabold text-[#14202B]">
              {adherenceReport.current_streak_days} Days
            </div>
            <span className="text-[10px] text-[#5B6B7A]">Consistent medication</span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider">Doses Taken</span>
            <div className="text-xl font-extrabold text-emerald-700">
              {adherenceReport.doses_taken}
            </div>
            <span className="text-[10px] text-[#5B6B7A]">Confirmed on time</span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider">Skipped / Snoozed</span>
            <div className="text-xl font-extrabold text-amber-700">
              {adherenceReport.doses_skipped + adherenceReport.doses_snoozed}
            </div>
            <span className="text-[10px] text-[#5B6B7A]">{adherenceReport.doses_snoozed} snoozed · {adherenceReport.doses_skipped} missed</span>
          </div>
        </div>
      )}

      {/* ── Medication Reminders Section ── */}
      <div className="bg-white rounded-xl border border-[#E3E8EE] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE]">
          <div className="flex items-center gap-2">
            <Calendar className="text-[#0F6B6B]" size={18} />
            <h2 className="text-sm font-bold text-[#14202B]">
              {isTa ? 'இன்றைய மருந்து அட்டவணை' : "Today's Medication Schedule & Reminders"}
            </h2>
          </div>
          <span className="text-xs text-[#5B6B7A] font-medium">
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>

        {reminders.length === 0 ? (
          <div className="text-center py-6 text-xs text-[#5B6B7A]">
            No scheduled medications for today. Click "Add Reminder" to set up your prescription schedule.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reminders.map((sched) => (
              <div key={sched.id} className="border border-[#E3E8EE] rounded-xl p-4 bg-[#F7F9FB] space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#14202B]">{sched.medicine_name}</h3>
                    <p className="text-xs text-[#5B6B7A]">{sched.dose_quantity} · {sched.prescribed_instructions}</p>
                    {sched.doctor_name && (
                      <p className="text-[10px] text-teal-800 font-semibold mt-0.5">Prescribed by {sched.doctor_name}</p>
                    )}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-[#0F6B6B]">
                    Active
                  </span>
                </div>

                <div className="space-y-2 pt-1 border-t border-[#E3E8EE]">
                  {sched.times_with_status.map((t, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-[#E3E8EE] text-xs">
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-[#5B6B7A]" />
                        <span className="font-bold text-[#14202B]">{t.time}</span>
                      </div>

                      {t.status === 'TAKEN' ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <Check size={12} /> Taken
                        </span>
                      ) : t.status === 'SKIPPED' ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                          <X size={12} /> Skipped
                        </span>
                      ) : t.status === 'SNOOZED' ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <Clock size={12} /> Snoozed (+30m)
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleReminderAction(sched.id, t.time, 'TAKEN')}
                            className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-md transition-colors flex items-center gap-1"
                          >
                            <Check size={11} /> Take
                          </button>
                          <button
                            onClick={() => handleReminderAction(sched.id, t.time, 'SNOOZED')}
                            className="px-2 py-1 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] rounded-md transition-colors flex items-center gap-1"
                          >
                            <BellRing size={11} /> Snooze
                          </button>
                          <button
                            onClick={() => handleReminderAction(sched.id, t.time, 'SKIPPED')}
                            className="px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-[10px] rounded-md transition-colors"
                          >
                            Skip
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Medicine Search & Price Comparison Finder ── */}
      <div className="bg-white rounded-xl border border-[#E3E8EE] p-5 shadow-xs space-y-4">
        <div>
          <h2 className="text-sm font-bold text-[#14202B] flex items-center gap-2">
            <Search className="text-[#0F6B6B]" size={16} />
            <span>Medicine Availability & Price Comparison (Google Maps Integrated)</span>
          </h2>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            Compare prices and real-time availability across retail chemists and government PHCs with turn-by-turn directions.
          </p>
        </div>

        {/* Search Bar & Quick Pills */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5B6B7A]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchPriceComparison(searchQuery)}
              placeholder="Search by generic, brand (e.g., Dolo, Metformin, Amoxil)..."
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[#E3E8EE] focus:outline-hidden focus:ring-1 focus:ring-[#0F6B6B]"
            />
          </div>
          <button
            onClick={() => fetchPriceComparison(searchQuery)}
            disabled={isLoadingSearch}
            className="px-4 py-2.5 bg-[#0F6B6B] hover:bg-[#0a4f4f] text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
          >
            {isLoadingSearch ? <RefreshCw size={14} className="animate-spin" /> : <Search size={14} />}
            <span>Compare Availability</span>
          </button>
        </div>

        {/* Quick EDL Medicine Pills */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-[11px] font-semibold text-[#5B6B7A] mr-1">Popular EDL Drugs:</span>
          {['Paracetamol', 'Metformin', 'Amoxicillin', 'Amlodipine', 'ORS', 'Azithromycin'].map((m) => (
            <button
              key={m}
              onClick={() => {
                setSearchQuery(m);
                fetchPriceComparison(m);
              }}
              className="px-2.5 py-1 text-[11px] rounded-full border border-[#E3E8EE] bg-[#F7F9FB] hover:border-[#0F6B6B] hover:text-[#0F6B6B] text-[#5B6B7A] font-medium transition-colors"
            >
              {m}
            </button>
          ))}
        </div>

        {/* Price & Availability Comparison Table */}
        {comparisonData && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between bg-teal-50/70 p-3 rounded-lg border border-teal-100">
              <div>
                <span className="text-xs font-bold text-[#14202B]">{comparisonData.medicine_name}</span>
                <span className="text-xs text-[#5B6B7A] ml-2">({comparisonData.strength} · {comparisonData.dosage_form})</span>
              </div>
              <button
                onClick={() => fetchMonograph(selectedMedId || 'med_pcm')}
                className="text-xs text-[#0F6B6B] hover:underline font-bold flex items-center gap-1"
              >
                <BookOpen size={13} />
                <span>Clinical Drug Monograph</span>
              </button>
            </div>

            {isOfflinePricing && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2 font-medium">
                <AlertTriangle size={15} className="text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong>Cached Offline Pricing (Retrieved {offlineCachedTime || 'earlier'}):</strong> Displaying previously saved pharmacy prices and addresses. Live availability and real-time counter quotes cannot be verified without an internet connection.
                </div>
              </div>
            )}

            <div className="overflow-x-auto border border-[#E3E8EE] rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F9FB] border-b border-[#E3E8EE] text-[#5B6B7A] uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Facility / Pharmacy</th>
                    <th className="py-2.5 px-3">Distance</th>
                    <th className="py-2.5 px-3">Availability</th>
                    <th className="py-2.5 px-3">Price</th>
                    <th className="py-2.5 px-3">Verified Source</th>
                    <th className="py-2.5 px-4 text-right">Directions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E8EE]">
                  {comparisonData.sources.map((s) => (
                    <tr key={s.facility_id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#14202B]">{s.facility_name}</div>
                        <div className="text-[11px] text-[#5B6B7A]">{s.address}</div>
                      </td>
                      <td className="py-3 px-3 tabular-nums font-semibold text-[#14202B]">
                        {s.distance_km} km
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          s.availability_status === 'IN_STOCK' ? 'bg-emerald-100 text-emerald-800' :
                          s.availability_status === 'LOW_STOCK' ? 'bg-amber-100 text-amber-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {s.availability_status === 'IN_STOCK' ? `In Stock (${s.quantity_available})` :
                           s.availability_status === 'LOW_STOCK' ? `Low Stock (${s.quantity_available})` :
                           'Out of Stock'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-[#0F6B6B]">{s.price_inr}</div>
                        <div className="text-[10px] text-[#5B6B7A]">{s.pricing_type}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                          <ShieldCheck size={13} />
                          {s.is_verified ? 'Verified Partner' : 'Govt PHC'}
                        </span>
                        <span className="text-[10px] text-[#5B6B7A] block">{s.last_updated}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <a
                          href={s.directions_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0F6B6B]/10 hover:bg-[#0F6B6B]/20 text-[#0F6B6B] font-bold text-[11px] transition-colors"
                        >
                          <Navigation size={12} />
                          <span>Google Maps</span>
                          <ExternalLink size={10} />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ── Verified Drug Monograph Modal ── */}
      {selectedMonograph && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-[#E3E8EE] animate-in fade-in duration-200">
            <div className="p-5 border-b border-[#E3E8EE] flex items-center justify-between">
              <div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  selectedMonograph.prescription_status === 'OTC' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {selectedMonograph.prescription_status} Medication
                </span>
                <h3 className="text-base font-bold text-[#14202B] mt-1">{selectedMonograph.generic_name}</h3>
                <p className="text-xs text-[#5B6B7A]">Common Brands: {selectedMonograph.brand_names}</p>
              </div>
              <button
                onClick={() => setSelectedMonograph(null)}
                className="p-1 rounded-lg hover:bg-gray-100 text-[#5B6B7A]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs text-[#14202B]">
              <div className="grid grid-cols-2 gap-3 bg-[#F7F9FB] p-3 rounded-xl border border-[#E3E8EE]">
                <div>
                  <span className="text-[10px] font-bold text-[#5B6B7A] uppercase">Strength & Dosage Form</span>
                  <div className="font-semibold">{selectedMonograph.strength} · {selectedMonograph.dosage_form}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[#5B6B7A] uppercase">Route of Administration</span>
                  <div className="font-semibold">{selectedMonograph.route_of_administration}</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-[#0F6B6B] mb-1">Approved Clinical Indications</h4>
                <p className="leading-relaxed text-[#5B6B7A]">{selectedMonograph.approved_indications}</p>
              </div>

              <div>
                <h4 className="font-bold text-amber-700 mb-1">Common Side Effects</h4>
                <p className="leading-relaxed text-[#5B6B7A]">{selectedMonograph.common_side_effects}</p>
              </div>

              <div className="bg-rose-50 border border-rose-200 rounded-xl p-3">
                <h4 className="font-bold text-rose-800 mb-1 flex items-center gap-1.5">
                  <AlertTriangle size={14} />
                  <span>Important Warnings & Precautions</span>
                </h4>
                <p className="leading-relaxed text-rose-900">{selectedMonograph.serious_warnings}</p>
              </div>

              <div>
                <h4 className="font-bold text-red-700 mb-1">Contraindications</h4>
                <p className="leading-relaxed text-[#5B6B7A]">{selectedMonograph.contraindications}</p>
              </div>

              <div>
                <h4 className="font-bold text-[#14202B] mb-1">Storage Instructions</h4>
                <p className="leading-relaxed text-[#5B6B7A]">{selectedMonograph.storage_instructions}</p>
              </div>

              <div className="text-[10px] text-[#5B6B7A] pt-2 border-t border-[#E3E8EE] italic">
                Source: {selectedMonograph.source}. Information verified against CDSCO and National EDL standards.
              </div>
            </div>

            <div className="p-4 border-t border-[#E3E8EE] bg-[#F7F9FB] flex justify-end">
              <button
                onClick={() => setSelectedMonograph(null)}
                className="px-4 py-2 bg-[#0F6B6B] hover:bg-[#0a4f4f] text-white font-bold text-xs rounded-xl"
              >
                Close Monograph
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Reminder Modal ── */}
      {showAddReminderModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E3E8EE] p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3E8EE]">
              <h3 className="text-sm font-bold text-[#14202B]">Add Medication Reminder</h3>
              <button onClick={() => setShowAddReminderModal(false)} className="text-[#5B6B7A]">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateReminder} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#14202B] mb-1">Medicine Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Metformin 500mg, Cetirizine"
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0F6B6B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#14202B] mb-1">Dose Quantity</label>
                  <input
                    type="text"
                    value={newDose}
                    onChange={(e) => setNewDose(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0F6B6B]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#14202B] mb-1">Time of Day</label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0F6B6B]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#14202B] mb-1">Instructions</label>
                <input
                  type="text"
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0F6B6B]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E3E8EE]">
                <button
                  type="button"
                  onClick={() => setShowAddReminderModal(false)}
                  className="px-3 py-2 border border-[#E3E8EE] text-[#5B6B7A] font-semibold rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0F6B6B] hover:bg-[#0a4f4f] text-white font-bold rounded-lg shadow-xs"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
