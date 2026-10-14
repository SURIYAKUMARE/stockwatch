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
  Navigation,
  FileText,
  Stethoscope,
  Trash2,
  CalendarCheck,
  Send,
  MessageSquare,
  ClipboardPen,
  HelpCircle,
  Store
} from 'lucide-react';
import type { Language } from '../../i18n';
import type { AppScreen } from '../../components/nav/AppShell';
import type { Appointment, MedicalRecord, MapLocationItem, AvailabilityEnquiry } from '../../types';
import { LeafletMap } from '../../components/LeafletMap';
import {
  FALLBACK_APPOINTMENTS,
  FALLBACK_MEDICAL_RECORDS,
  FALLBACK_MAP_LOCATIONS,
  FALLBACK_ENQUIRIES
} from '../../db/demoFallbackData';
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

  // Navigation tab state synced with activeScreen
  const [activeTab, setActiveTab] = useState<'search' | 'appointments' | 'records' | 'reminders' | 'enquiries'>('search');

  // Availability Enquiries State
  const [enquiries, setEnquiries] = useState<AvailabilityEnquiry[]>(() => {
    const saved = localStorage.getItem('stockwatch_patient_enquiries');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* ignore */ }
    }
    return FALLBACK_ENQUIRIES;
  });
  const [isLoadingEnquiries, setIsLoadingEnquiries] = useState(false);
  const [showNewEnquiryModal, setShowNewEnquiryModal] = useState(false);
  const [enquiryPharmacyId, setEnquiryPharmacyId] = useState('pharma_apollo_cbe');
  const [enquiryMedicineId, setEnquiryMedicineId] = useState('med_pcm');
  const [enquiryQty, setEnquiryQty] = useState(1);
  const [enquiryNotes, setEnquiryNotes] = useState('');
  const [enquiryPatientName, setEnquiryPatientName] = useState('Kavitha Murugan');
  const [enquiryPatientPhone, setEnquiryPatientPhone] = useState('+91 98421 12345');
  const [enquirySuccessMsg, setEnquirySuccessMsg] = useState<string | null>(null);
  const [enquiryFilterStatus, setEnquiryFilterStatus] = useState<string>('ALL');

  // Appointments State
  const [appointments, setAppointments] = useState<Appointment[]>(FALLBACK_APPOINTMENTS as any);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [showBookAptModal, setShowBookAptModal] = useState(false);
  const [aptDepartment, setAptDepartment] = useState('General OPD');
  const [aptFacilityId, setAptFacilityId] = useState('phc_valparai');
  const [aptDate, setAptDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [aptTime, setAptTime] = useState('10:00 AM');
  const [aptDoctor, setAptDoctor] = useState('Dr. S. Kulanthaivel, MBBS');
  const [aptSymptoms, setAptSymptoms] = useState('');
  const [aptPatientName, setAptPatientName] = useState('Kavitha Murugan');
  const [aptPhone, setAptPhone] = useState('+91 98421 12345');

  // Medical Records State
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>(FALLBACK_MEDICAL_RECORDS as any);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [showAddRecordModal, setShowAddRecordModal] = useState(false);
  const [recTitle, setRecTitle] = useState('');
  const [recType, setRecType] = useState<'PRESCRIPTION' | 'LAB_REPORT'>('PRESCRIPTION');
  const [recDoctor, setRecDoctor] = useState('Dr. S. Kulanthaivel, MBBS');
  const [recDate, setRecDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [recDiagnosis, setRecDiagnosis] = useState('');
  const [recNotes, setRecNotes] = useState('');

  // New Reminder Form State
  const [newMedName, setNewMedName] = useState('');
  const [newDose, setNewDose] = useState('1 tablet');
  const [newTime, setNewTime] = useState('08:00');
  const [newInstructions, setNewInstructions] = useState('Take with water after breakfast');
  const [isOfflinePricing, setIsOfflinePricing] = useState(false);
  const [offlineCachedTime, setOfflineCachedTime] = useState<string | null>(null);
  const [searchDisplayMode, setSearchDisplayMode] = useState<'LIST' | 'MAP'>('LIST');
  const [mapLocations, setMapLocations] = useState<MapLocationItem[]>(FALLBACK_MAP_LOCATIONS);
  const [selectedMapLocId, setSelectedMapLocId] = useState<string>('pharma_valparai_01');

  // Sync activeScreen with activeTab & map mode
  useEffect(() => {
    if (activeScreen === 'appointments') setActiveTab('appointments');
    else if (activeScreen === 'medical_records') setActiveTab('records');
    else if (activeScreen === 'my_enquiries') setActiveTab('enquiries');
    else if (activeScreen === 'nearby_pharmacies') {
      setActiveTab('search');
      setSearchDisplayMode('MAP');
    }
    else if (activeScreen === 'saved_pharmacies') {
      setActiveTab('search');
    }
    else if (activeScreen === 'medicine_search') {
      setActiveTab('search');
      setSearchDisplayMode('LIST');
    }
  }, [activeScreen]);

  const fetchMapLocations = async () => {
    try {
      const res = await fetch('/api/map/locations');
      if (res.ok) {
        const data = await res.json();
        if (data.locations && data.locations.length > 0) {
          setMapLocations(data.locations);
        }
      }
    } catch {
      setMapLocations(FALLBACK_MAP_LOCATIONS);
    }
  };

  const fetchAppointments = async () => {
    setIsLoadingAppointments(true);
    try {
      const res = await fetch('/api/patient/appointments');
      if (res.ok) {
        const data = await res.json();
        setAppointments(data);
      }
    } catch {
      setAppointments(FALLBACK_APPOINTMENTS as any);
    } finally {
      setIsLoadingAppointments(false);
    }
  };

  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/patient/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility_id: aptFacilityId,
          department: aptDepartment,
          doctor_name: aptDoctor,
          appointment_date: aptDate,
          appointment_time: aptTime,
          symptoms: aptSymptoms,
          patient_name: aptPatientName,
          patient_phone: aptPhone
        })
      });
      if (res.ok) {
        setShowBookAptModal(false);
        setAptSymptoms('');
        await fetchAppointments();
      }
    } catch {
      const newApt: Appointment = {
        id: 'apt-' + Date.now(),
        patient_id: 'user_patient_01',
        patient_name: aptPatientName,
        patient_phone: aptPhone,
        facility_id: aptFacilityId,
        department: aptDepartment,
        doctor_name: aptDoctor,
        appointment_date: aptDate,
        appointment_time: aptTime,
        symptoms: aptSymptoms,
        status: 'CONFIRMED',
        token_number: 'OPD-' + (Math.floor(Math.random() * 900) + 100),
        created_at: new Date().toISOString()
      };
      setAppointments(prev => [newApt, ...prev]);
      setShowBookAptModal(false);
    }
  };

  const handleCancelAppointment = async (id: string) => {
    try {
      await fetch(`/api/patient/appointments/${id}/cancel`, { method: 'POST' });
      fetchAppointments();
    } catch {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: 'CANCELLED' } : a));
    }
  };

  const fetchRecords = async () => {
    setIsLoadingRecords(true);
    try {
      const res = await fetch('/api/patient/records');
      if (res.ok) {
        const data = await res.json();
        try {
          const localBills = JSON.parse(localStorage.getItem('stockwatch_patient_records') || '[]');
          const existingIds = new Set(data.map((r: any) => r.id));
          const uniqueLocal = localBills.filter((b: any) => !existingIds.has(b.id));
          setMedicalRecords([...uniqueLocal, ...data]);
        } catch {
          setMedicalRecords(data);
        }
      }
    } catch {
      try {
        const localBills = JSON.parse(localStorage.getItem('stockwatch_patient_records') || '[]');
        setMedicalRecords([...localBills, ...(FALLBACK_MEDICAL_RECORDS as any)]);
      } catch {
        setMedicalRecords(FALLBACK_MEDICAL_RECORDS as any);
      }
    } finally {
      setIsLoadingRecords(false);
    }
  };

  useEffect(() => {
    const handleBillAdded = () => {
      fetchRecords();
      fetchRemindersData();
    };
    window.addEventListener('stockwatch_patient_record_added', handleBillAdded);
    return () => window.removeEventListener('stockwatch_patient_record_added', handleBillAdded);
  }, []);

  const handleAddDispensedToSchedule = async (medName: string, instructions?: string) => {
    const cleanName = medName.replace(/\(.*?\)/g, '').trim();
    const newSchItem: MedicationScheduleItem = {
      id: 'sch-' + Date.now(),
      medicine_name: cleanName,
      strength: 'Standard Dosage',
      dosage_form: 'Tablet / Dose',
      dose_quantity: '1 unit',
      frequency_per_day: 2,
      schedule_times: ['08:00', '20:00'],
      times_with_status: [
        { time: '08:00', status: 'PENDING' },
        { time: '20:00', status: 'PENDING' }
      ],
      start_date: new Date().toISOString().split('T')[0],
      prescribed_instructions: instructions || 'Dispensed by Retail Pharmacy. Take with water after food.',
      status: 'ACTIVE'
    };

    setReminders((prev) => [newSchItem, ...prev]);
    setActiveTab('reminders');
    try {
      await fetch('/api/patient/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicine_name: cleanName,
          strength: 'Standard Dosage',
          dosage_form: 'Tablet / Dose',
          dose_quantity: '1 unit',
          frequency_per_day: 2,
          schedule_times: ['08:00', '20:00'],
          start_date: new Date().toISOString().split('T')[0],
          prescribed_instructions: instructions || 'Dispensed by Retail Pharmacy.'
        })
      });
    } catch {
      // offline fallback
    }
  };

  const handleAddRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/patient/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility_id: aptFacilityId,
          record_type: recType,
          title: recTitle,
          doctor_name: recDoctor,
          record_date: recDate,
          diagnosis: recDiagnosis,
          medicines_prescribed: [],
          lab_results: {},
          notes: recNotes
        })
      });
      if (res.ok) {
        setShowAddRecordModal(false);
        setRecTitle('');
        setRecNotes('');
        await fetchRecords();
      }
    } catch {
      const newRec: MedicalRecord = {
        id: 'rec-' + Date.now(),
        patient_id: 'user_patient_01',
        record_type: recType,
        title: recTitle,
        doctor_name: recDoctor,
        record_date: recDate,
        diagnosis: recDiagnosis,
        notes: recNotes,
        created_at: new Date().toISOString()
      };
      setMedicalRecords(prev => [newRec, ...prev]);
      setShowAddRecordModal(false);
    }
  };

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

  const fetchEnquiries = async () => {
    setIsLoadingEnquiries(true);
    try {
      const res = await fetch('/api/patient/enquiries');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setEnquiries(data);
          localStorage.setItem('stockwatch_patient_enquiries', JSON.stringify(data));
          return;
        }
      }
    } catch (e) {
      console.warn('Using local fallback enquiries', e);
    } finally {
      setIsLoadingEnquiries(false);
    }
  };

  const handleSubmitEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetLoc = mapLocations.find((l) => l.id === enquiryPharmacyId);
    const targetName =
      targetLoc?.name ||
      (enquiryPharmacyId === 'pharma_apollo_cbe'
        ? 'Apollo Pharmacy - Gandhipuram'
        : enquiryPharmacyId === 'pharma_kovai_valparai'
        ? 'Kovai Medicals - Valparai Bazaar'
        : 'PHC Valparai Dispensary');

    const medMap: Record<string, string> = {
      med_pcm: 'Paracetamol 500mg (Dolo 650)',
      med_pcm_syr: 'Paracetamol Syrup 60ml Pediatric',
      med_amox: 'Amoxicillin 250mg Capsules',
      med_amox_500: 'Amoxicillin 500mg Capsules',
      med_ors: 'ORS Sachets 20.5g',
      med_zinc: 'Zinc Sulfate 20mg',
      med_metformin: 'Metformin 500mg Tablets',
      med_cetirizine: 'Cetirizine 10mg Tablets',
      med_asv: 'Anti-Snake Venom 10ml Inj',
      med_arv: 'Anti-Rabies Vaccine 0.5ml'
    };
    const medName = medMap[enquiryMedicineId] || comparisonData?.medicine_name || enquiryMedicineId;

    const newEnqObj: AvailabilityEnquiry = {
      id: 'enq-' + Date.now(),
      pharmacy_id: enquiryPharmacyId,
      pharmacy_name: targetName,
      medicine_id: enquiryMedicineId,
      medicine_name: medName,
      patient_name: enquiryPatientName,
      patient_phone: enquiryPatientPhone,
      requested_quantity: Number(enquiryQty) || 1,
      status: 'PENDING',
      notes: enquiryNotes || 'Checking medicine stock availability on shelf',
      reply_notes: 'Under review by on-duty chemist. Physical shelf check in progress.',
      created_at: new Date().toISOString()
    };

    try {
      const res = await fetch('/api/patient/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pharmacy_id: enquiryPharmacyId,
          medicine_id: enquiryMedicineId,
          patient_name: enquiryPatientName,
          patient_phone: enquiryPatientPhone,
          requested_quantity: Number(enquiryQty) || 1,
          notes: enquiryNotes
        })
      });
      if (res.ok) {
        const savedEnq = await res.json();
        setEnquiries((prev) => {
          const updated = [savedEnq, ...prev];
          localStorage.setItem('stockwatch_patient_enquiries', JSON.stringify(updated));
          return updated;
        });
      } else {
        setEnquiries((prev) => {
          const updated = [newEnqObj, ...prev];
          localStorage.setItem('stockwatch_patient_enquiries', JSON.stringify(updated));
          return updated;
        });
      }
    } catch {
      setEnquiries((prev) => {
        const updated = [newEnqObj, ...prev];
        localStorage.setItem('stockwatch_patient_enquiries', JSON.stringify(updated));
        return updated;
      });
    }

    setEnquirySuccessMsg(`Enquiry submitted to ${targetName}!`);
    setTimeout(() => {
      setShowNewEnquiryModal(false);
      setEnquirySuccessMsg(null);
      setEnquiryNotes('');
    }, 1200);
  };

  const handleResolveEnquiry = async (id: string) => {
    try {
      await fetch(`/api/patient/enquiries/${id}/resolve`, { method: 'POST' });
    } catch {
      // local fallback
    }
    setEnquiries((prev) => {
      const updated = prev.map((e) =>
        e.id === id ? { ...e, status: 'RESOLVED' as const, reply_notes: 'Resolved and collected by patient.' } : e
      );
      localStorage.setItem('stockwatch_patient_enquiries', JSON.stringify(updated));
      return updated;
    });
  };

  const handleOpenEnquiryForSource = (s: PriceComparisonSource) => {
    setEnquiryPharmacyId(s.facility_id);
    if (selectedMedId) setEnquiryMedicineId(selectedMedId);
    setShowNewEnquiryModal(true);
  };

  useEffect(() => {
    fetchPriceComparison(searchQuery);
    fetchRemindersData();
    fetchAppointments();
    fetchRecords();
    fetchMapLocations();
    fetchEnquiries();
  }, []);

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      {/* ── Subheader / Quick Mode Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-[#E3E8EE] shadow-xs">
        <div>
          <h1 className="text-lg font-bold text-[#14202B] flex items-center gap-2">
            <Pill className="text-[#0F6B6B]" size={20} />
            {isTa ? 'நோயாளி உதவி மையம் & விரிவான சுகாதார சேவைகள்' : 'Patient Care & Integrated Healthcare Network'}
          </h1>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            {isTa
              ? 'அருகிலுள்ள மருந்தகங்கள், OPD முன்பதிவுகள், மருத்துவ பதிவுகள் மற்றும் மருந்து நினைவூட்டல்கள்.'
              : 'Book OPD appointments, view digital lab reports & prescriptions, find essential medicines, and track daily schedules.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'appointments' ? (
            <button
              onClick={() => setShowBookAptModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#0F6B6B] text-white hover:bg-[#0a4f4f] flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <CalendarCheck size={14} />
              <span>Book Appointment</span>
            </button>
          ) : activeTab === 'records' ? (
            <button
              onClick={() => setShowAddRecordModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#0F6B6B] text-white hover:bg-[#0a4f4f] flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus size={14} />
              <span>Add Health Record</span>
            </button>
          ) : activeTab === 'reminders' ? (
            <button
              onClick={() => setShowAddReminderModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#0F6B6B] text-white hover:bg-[#0a4f4f] flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Plus size={14} />
              <span>Add Reminder</span>
            </button>
          ) : activeTab === 'enquiries' ? (
            <button
              onClick={() => setShowNewEnquiryModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#0F6B6B] text-white hover:bg-[#0a4f4f] flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Send size={14} />
              <span>Submit New Enquiry</span>
            </button>
          ) : (
            <button
              onClick={() => fetchMonograph('med_pcm')}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-[#E3E8EE] text-[#14202B] hover:bg-[#F7F9FB] flex items-center gap-1.5 transition-colors"
            >
              <BookOpen size={14} className="text-[#0F6B6B]" />
              <span>Drug Monographs</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Patient Portal Navigation Tabs ── */}
      <div className="flex border-b border-[#E3E8EE] bg-white rounded-xl p-1.5 shadow-2xs gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'search'
              ? 'bg-[#0F6B6B] text-white shadow-xs'
              : 'text-[#5B6B7A] hover:bg-[#F7F9FB] hover:text-[#14202B]'
          }`}
        >
          <Search size={15} />
          <span>{isTa ? 'மருந்து தேடல் & விலை ஒப்பீடு' : 'Find Medicines & Stores'}</span>
        </button>

        <button
          onClick={() => setActiveTab('appointments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'appointments'
              ? 'bg-[#0F6B6B] text-white shadow-xs'
              : 'text-[#5B6B7A] hover:bg-[#F7F9FB] hover:text-[#14202B]'
          }`}
        >
          <CalendarCheck size={15} />
          <span>{isTa ? 'OPD முன்பதிவுகள்' : 'OPD Appointments'}</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
            activeTab === 'appointments' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'
          }`}>
            {appointments.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('records')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'records'
              ? 'bg-[#0F6B6B] text-white shadow-xs'
              : 'text-[#5B6B7A] hover:bg-[#F7F9FB] hover:text-[#14202B]'
          }`}
        >
          <FileText size={15} />
          <span>{isTa ? 'சுகாதார பதிவுகள் & மருந்து சீட்டுகள்' : 'Digital Health Records'}</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
            activeTab === 'records' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'
          }`}>
            {medicalRecords.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('reminders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'reminders'
              ? 'bg-[#0F6B6B] text-white shadow-xs'
              : 'text-[#5B6B7A] hover:bg-[#F7F9FB] hover:text-[#14202B]'
          }`}
        >
          <BellRing size={15} />
          <span>{isTa ? 'மருந்து அட்டவணை' : 'Daily Medication Schedule'}</span>
        </button>

        <button
          onClick={() => setActiveTab('enquiries')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'enquiries'
              ? 'bg-[#0F6B6B] text-white shadow-xs'
              : 'text-[#5B6B7A] hover:bg-[#F7F9FB] hover:text-[#14202B]'
          }`}
        >
          <ClipboardPen size={15} />
          <span>{isTa ? 'என் கேள்விகள் & இருப்பு நிலை' : 'My Enquiries'}</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
            activeTab === 'enquiries' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'
          }`}>
            {enquiries.length}
          </span>
        </button>
      </div>

      {/* ── SECTION 1: OPD APPOINTMENTS TAB ── */}
      {activeTab === 'appointments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl p-4">
            <div>
              <h2 className="text-sm font-bold text-[#14202B]">Active Outpatient (OPD) Consultations</h2>
              <p className="text-xs text-[#5B6B7A]">Confirmed bookings at Primary Health Centres & Community Health Centres.</p>
            </div>
            <button
              onClick={() => setShowBookAptModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#0F6B6B] text-white hover:bg-[#0a4f4f] flex items-center gap-1.5"
            >
              <CalendarCheck size={14} />
              <span>Book OPD Token</span>
            </button>
          </div>

          {appointments.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E3E8EE] p-8 text-center text-xs text-[#5B6B7A]">
              No active appointments found. Click "Book OPD Token" to schedule your consultation.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appointments.map((apt) => (
                <div key={apt.id} className="bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md font-mono font-extrabold text-xs bg-[#0F6B6B] text-white">
                          {apt.token_number}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          apt.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' :
                          apt.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                          'bg-rose-100 text-rose-800'
                        }`}>
                          {apt.status}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-[#14202B] mt-2">{apt.department}</h3>
                      <p className="text-xs font-semibold text-[#0F6B6B]">{apt.doctor_name}</p>
                    </div>

                    {apt.status === 'CONFIRMED' && (
                      <button
                        onClick={() => handleCancelAppointment(apt.id)}
                        className="text-xs font-medium text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 flex items-center gap-1"
                      >
                        <Trash2 size={13} />
                        <span>Cancel</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-[#F7F9FB] p-3 rounded-lg text-xs">
                    <div>
                      <span className="text-[10px] text-[#5B6B7A] block font-semibold">Scheduled Date</span>
                      <span className="font-bold text-[#14202B]">{apt.appointment_date}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#5B6B7A] block font-semibold">Appointment Time</span>
                      <span className="font-bold text-[#14202B]">{apt.appointment_time}</span>
                    </div>
                    <div className="col-span-2 mt-1">
                      <span className="text-[10px] text-[#5B6B7A] block font-semibold">Reported Symptoms</span>
                      <span className="text-[#14202B]">{apt.symptoms || 'General wellness checkup'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SECTION 2: DIGITAL HEALTH RECORDS TAB ── */}
      {activeTab === 'records' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl p-4">
            <div>
              <h2 className="text-sm font-bold text-[#14202B]">Digital Health Records & Verified Prescriptions</h2>
              <p className="text-xs text-[#5B6B7A]">Personal medical history, OPD prescriptions, and diagnostic lab reports.</p>
            </div>
            <button
              onClick={() => setShowAddRecordModal(true)}
              className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-[#0F6B6B] text-white hover:bg-[#0a4f4f] flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Add Record</span>
            </button>
          </div>

          {medicalRecords.length === 0 ? (
            <div className="bg-white rounded-xl border border-[#E3E8EE] p-8 text-center text-xs text-[#5B6B7A]">
              No digital health records found.
            </div>
          ) : (
            <div className="space-y-4">
              {medicalRecords.map((rec) => {
                const isPharmacyBill = rec.record_type === 'PHARMACY_BILL';
                return (
                  <div
                    key={rec.id}
                    className={`bg-white border rounded-xl p-5 shadow-xs space-y-4 transition-all ${
                      isPharmacyBill ? 'border-amber-300 ring-1 ring-amber-100' : 'border-[#E3E8EE]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-3 border-b border-[#E3E8EE]">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 ${
                            isPharmacyBill
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : rec.record_type === 'PRESCRIPTION'
                              ? 'bg-teal-100 text-teal-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {isPharmacyBill ? '🧾 Retail Pharmacy Bill & POS Dispensed' : rec.record_type}
                          </span>
                          <span className="text-xs text-[#5B6B7A]">{rec.record_date}</span>
                        </div>
                        <h3 className="text-sm font-bold text-[#14202B] mt-1.5 flex items-center gap-1.5">
                          {rec.title}
                        </h3>
                        <p className="text-xs text-[#5B6B7A]">
                          {isPharmacyBill ? 'Dispensing Chemist / RMP:' : 'Consulting Physician:'}{' '}
                          <strong className="text-[#14202B]">{rec.doctor_name}</strong>
                        </p>
                      </div>

                      {isPharmacyBill && (
                        <div className="flex items-center gap-1.5 self-start sm:self-auto">
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[#E3E8EE] hover:bg-slate-50 text-[#14202B] flex items-center gap-1"
                          >
                            <span>Print Bill</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {rec.diagnosis && (
                      <div className={`text-xs p-3 rounded-lg border ${
                        isPharmacyBill
                          ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      }`}>
                        <strong>{isPharmacyBill ? 'Transaction Summary:' : 'Clinical Diagnosis:'}</strong> {rec.diagnosis}
                      </div>
                    )}

                    {rec.medicines_prescribed && rec.medicines_prescribed.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-[#14202B]">
                            {isPharmacyBill ? 'Dispensed Medications (FEFO Tracked)' : 'Prescribed Medications'}
                          </h4>
                          {isPharmacyBill && (
                            <span className="text-[10px] text-[#0F6B6B] font-bold">
                              Click "+ Daily Schedule" to auto-add dosage reminders
                            </span>
                          )}
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border border-[#E3E8EE] rounded-lg overflow-hidden">
                            <thead className="bg-[#F7F9FB] text-[#5B6B7A] font-semibold border-b border-[#E3E8EE]">
                              <tr>
                                <th className="py-2 px-3">Medicine</th>
                                <th className="py-2 px-3">Quantity / Dose</th>
                                <th className="py-2 px-3">Instructions / Pricing</th>
                                <th className="py-2 px-3 text-right">Schedule Reminder</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E3E8EE]">
                              {rec.medicines_prescribed.map((m: any, idx: number) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                  <td className="py-2.5 px-3 font-bold text-[#14202B]">{m.name}</td>
                                  <td className="py-2.5 px-3 text-[#5B6B7A]">{m.dosage}</td>
                                  <td className="py-2.5 px-3 text-[#0F6B6B] font-medium">{m.instructions || m.duration}</td>
                                  <td className="py-2.5 px-3 text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleAddDispensedToSchedule(m.name, m.instructions)}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#0F6B6B] text-white hover:bg-[#0a4f4f] font-bold text-[10px] shadow-2xs transition"
                                    >
                                      <Plus size={11} />
                                      <span>+ Daily Schedule</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {rec.lab_results && Object.keys(rec.lab_results).length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-[#14202B]">
                          {isPharmacyBill ? 'Official GST Tax Invoice Details' : 'Diagnostic Laboratory Findings'}
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {Object.entries(rec.lab_results).map(([param, val]: [string, any], idx) => (
                            <div key={idx} className="bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg p-2.5 text-xs">
                              <span className="text-[10px] text-[#5B6B7A] font-semibold block">{param}</span>
                              <span className="font-bold text-[#14202B]">{String(val)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {rec.notes && (
                      <div className="text-xs text-[#5B6B7A] bg-gray-50 p-3 rounded-lg border border-gray-200">
                        <strong>{isPharmacyBill ? 'Counter Dispense Notes:' : 'Physician Advice:'}</strong> {rec.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── SECTION 3: REMINDERS TAB OR DEFAULT STRIP ── */}
      {(activeTab === 'reminders' || activeTab === 'search') && adherenceReport && (
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

      {/* ── Medication Reminders (shown when reminders tab active, or as quick section) ── */}
      {activeTab === 'reminders' && (
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
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleLogDose(sched.id, t.time, 'TAKEN')}
                              className="px-2 py-1 rounded-md bg-[#0F6B6B] hover:bg-[#0a4f4f] text-white font-bold text-[10px] flex items-center gap-1 transition-colors"
                            >
                              <Check size={11} />
                              <span>Take</span>
                            </button>
                            <button
                              onClick={() => handleLogDose(sched.id, t.time, 'SKIPPED')}
                              className="px-2 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 font-semibold text-[10px] transition-colors"
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
      )}

      {/* ── SECTION 4: MEDICINE & PRICE FINDER (SEARCH TAB) ── */}
      {activeTab === 'search' && (
        <div className="bg-white rounded-xl border border-[#E3E8EE] p-5 shadow-xs space-y-4">
        {/* Search Header with Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E3E8EE]">
          <div>
            <h2 className="text-sm font-bold text-[#14202B] flex items-center gap-2">
              <Search className="text-[#0F6B6B]" size={16} />
              <span>Medicine Availability & Nearby Pharmacies (Interactive Map)</span>
            </h2>
            <p className="text-xs text-[#5B6B7A] mt-0.5">
              Compare prices and real-time stock across government PHCs and licensed retail chemists with live geospatial locator.
            </p>
          </div>
          <div className="flex items-center gap-1.5 bg-[#F7F9FB] p-1 rounded-lg border border-[#E3E8EE] shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSearchDisplayMode('LIST')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${
                searchDisplayMode === 'LIST'
                  ? 'bg-[#0F6B6B] text-white shadow-xs'
                  : 'text-[#5B6B7A] hover:text-[#14202B]'
              }`}
            >
              Store List
            </button>
            <button
              type="button"
              onClick={() => setSearchDisplayMode('MAP')}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition flex items-center gap-1.5 ${
                searchDisplayMode === 'MAP'
                  ? 'bg-[#0F6B6B] text-white shadow-xs'
                  : 'text-[#5B6B7A] hover:text-[#14202B]'
              }`}
            >
              <MapPin size={13} />
              <span>Nearby Map ({mapLocations.length})</span>
            </button>
          </div>
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

        {/* Content: Either Interactive Map or Comparison Table */}
        {searchDisplayMode === 'MAP' ? (
          <div className="space-y-4 pt-2">
            <LeafletMap
              locations={mapLocations}
              selectedLocationId={selectedMapLocId}
              onSelectLocation={(id) => setSelectedMapLocId(id)}
              height={420}
            />
            {(() => {
              const sel = mapLocations.find((l) => l.id === selectedMapLocId) || mapLocations[0];
              if (!sel) return null;
              return (
                <div className="bg-[#F7F9FB] border border-[#E3E8EE] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${
                        sel.category === 'PHARMACY' ? 'bg-purple-100 text-purple-800' : 'bg-teal-100 text-teal-800'
                      }`}>
                        {sel.type_label}
                      </span>
                      <span className="text-xs font-bold text-[#14202B]">{sel.name}</span>
                    </div>
                    <p className="text-xs text-[#5B6B7A] mt-1">📍 {sel.address}</p>
                    <div className="text-[11px] text-teal-800 font-semibold mt-1">
                      Total Stock: {sel.total_stock_count?.toLocaleString()} units · {sel.distinct_medicines_count} distinct medicines
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {sel.phone && (
                      <a
                        href={`tel:${sel.phone}`}
                        className="px-3 py-1.5 bg-white border border-[#E3E8EE] rounded-lg text-xs font-bold text-[#14202B] hover:bg-slate-50 flex items-center gap-1.5"
                      >
                        <Phone size={13} className="text-[#0F6B6B]" />
                        <span>Call Store</span>
                      </a>
                    )}
                    <a
                      href={sel.directions_url || `https://www.google.com/maps/dir/?api=1&destination=${sel.lat},${sel.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 bg-[#0F6B6B] text-white rounded-lg text-xs font-bold hover:bg-[#0a4f4f] flex items-center gap-1.5 shadow-xs"
                    >
                      <Navigation size={13} />
                      <span>Directions</span>
                      <ExternalLink size={11} />
                    </a>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          comparisonData && (
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
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEnquiryForSource(s)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-[#0F6B6B] border border-teal-200 font-bold text-[11px] transition-colors"
                              title="Ask availability at this pharmacy"
                            >
                              <MessageSquare size={11} />
                              <span>Enquire</span>
                            </button>
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
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>
      )}

      {/* ── SECTION 5: PATIENT ENQUIRIES & STOCK VERIFICATION (MY ENQUIRIES TAB) ── */}
      {activeTab === 'enquiries' && (
        <div className="space-y-4">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-teal-50 border border-teal-200 rounded-xl p-4">
            <div>
              <h2 className="text-sm font-bold text-[#14202B] flex items-center gap-2">
                <ClipboardPen className="text-[#0F6B6B]" size={17} />
                <span>Medicine Availability Enquiries & Reservation Requests</span>
              </h2>
              <p className="text-xs text-[#5B6B7A] mt-0.5">
                Submit stock queries directly to PHC dispensaries and local retail chemists. Pharmacists verify physical shelf inventory in real-time and reserve bottles/strips under your name.
              </p>
            </div>
            <button
              onClick={() => setShowNewEnquiryModal(true)}
              className="px-3.5 py-2 text-xs font-bold rounded-lg bg-[#0F6B6B] text-white hover:bg-[#0a4f4f] flex items-center gap-1.5 shadow-xs shrink-0 transition-colors"
            >
              <Send size={14} />
              <span>+ New Stock Enquiry</span>
            </button>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-[#E3E8EE] shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-[#5B6B7A] tracking-wider">Total Enquiries</span>
              <div className="text-xl font-bold font-mono text-[#14202B] mt-1">{enquiries.length}</div>
              <span className="text-[10px] text-[#5B6B7A]">Lifetime requests</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-[#E3E8EE] shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-emerald-600 tracking-wider">Stock Confirmed</span>
              <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
                {enquiries.filter((e) => e.status === 'CONFIRMED').length}
              </div>
              <span className="text-[10px] text-emerald-700">Reserved for pickup</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-[#E3E8EE] shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-amber-600 tracking-wider">Awaiting Verification</span>
              <div className="text-xl font-bold font-mono text-amber-600 mt-1">
                {enquiries.filter((e) => e.status === 'PENDING').length}
              </div>
              <span className="text-[10px] text-amber-700">Chemist reviewing shelf</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-[#E3E8EE] shadow-2xs">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Resolved / Collected</span>
              <div className="text-xl font-bold font-mono text-slate-700 mt-1">
                {enquiries.filter((e) => e.status === 'RESOLVED').length}
              </div>
              <span className="text-[10px] text-slate-500">Dispensed to patient</span>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { id: 'ALL', label: 'All Enquiries', count: enquiries.length },
              { id: 'CONFIRMED', label: 'Confirmed & Reserved', count: enquiries.filter((e) => e.status === 'CONFIRMED').length },
              { id: 'PENDING', label: 'Pending Review', count: enquiries.filter((e) => e.status === 'PENDING').length },
              { id: 'RESOLVED', label: 'Completed', count: enquiries.filter((e) => e.status === 'RESOLVED').length },
              { id: 'OUT_OF_STOCK', label: 'Out of Stock', count: enquiries.filter((e) => e.status === 'OUT_OF_STOCK').length }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setEnquiryFilterStatus(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                  enquiryFilterStatus === f.id
                    ? 'bg-[#0F6B6B] text-white shadow-xs'
                    : 'bg-white border border-[#E3E8EE] text-[#5B6B7A] hover:bg-slate-50 hover:text-[#14202B]'
                }`}
              >
                <span>{f.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  enquiryFilterStatus === f.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-[#5B6B7A]'
                }`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {/* Enquiries List */}
          {(() => {
            const filteredEnquiries = enquiries.filter((e) =>
              enquiryFilterStatus === 'ALL' ? true : e.status === enquiryFilterStatus
            );

            if (filteredEnquiries.length === 0) {
              return (
                <div className="bg-white rounded-xl border border-[#E3E8EE] p-10 text-center space-y-3">
                  <div className="w-12 h-12 bg-teal-50 text-[#0F6B6B] rounded-full flex items-center justify-center mx-auto">
                    <MessageSquare size={22} />
                  </div>
                  <h3 className="text-sm font-bold text-[#14202B]">No Enquiries Found</h3>
                  <p className="text-xs text-[#5B6B7A] max-w-md mx-auto">
                    {enquiryFilterStatus === 'ALL'
                      ? 'You have not submitted any stock availability enquiries yet. Submit an enquiry to check if a medicine is physically in stock at a nearby dispensary.'
                      : `No enquiries currently match the status "${enquiryFilterStatus}".`}
                  </p>
                  <button
                    onClick={() => setShowNewEnquiryModal(true)}
                    className="px-4 py-2 bg-[#0F6B6B] text-white rounded-lg text-xs font-bold hover:bg-[#0a4f4f] transition-colors shadow-xs"
                  >
                    + Submit New Enquiry
                  </button>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {filteredEnquiries.map((enq) => {
                  const isConfirmed = enq.status === 'CONFIRMED';
                  const isPending = enq.status === 'PENDING';
                  const isOutOfStock = enq.status === 'OUT_OF_STOCK';
                  const isResolved = enq.status === 'RESOLVED';

                  return (
                    <div
                      key={enq.id}
                      className={`bg-white rounded-xl border p-4.5 shadow-2xs space-y-3 transition-all hover:shadow-xs ${
                        isConfirmed
                          ? 'border-emerald-200'
                          : isPending
                          ? 'border-amber-200'
                          : isOutOfStock
                          ? 'border-rose-200'
                          : 'border-[#E3E8EE]'
                      }`}
                    >
                      {/* Top Row: Store & Status */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F1F5F9] pb-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isConfirmed
                                ? 'bg-emerald-100 text-emerald-800'
                                : isPending
                                ? 'bg-amber-100 text-amber-800'
                                : isOutOfStock
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            <Store size={16} />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-[#14202B]">
                              {enq.pharmacy_name || enq.pharmacy_id}
                            </h3>
                            <span className="text-[11px] text-[#5B6B7A] flex items-center gap-1">
                              <Clock size={12} />
                              Submitted:{' '}
                              {new Date(enq.created_at).toLocaleString([], {
                                dateStyle: 'medium',
                                timeStyle: 'short'
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="self-start sm:self-auto">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 ${
                              isConfirmed
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : isPending
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : isOutOfStock
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {isConfirmed && <CheckCircle2 size={13} className="text-emerald-700" />}
                            {isPending && <Clock size={13} className="text-amber-700 animate-spin" />}
                            {isOutOfStock && <X size={13} className="text-rose-700" />}
                            {isResolved && <Check size={13} className="text-slate-700" />}
                            <span>
                              {isConfirmed
                                ? 'Stock Verified & Reserved'
                                : isPending
                                ? 'Pending Pharmacist Check'
                                : isOutOfStock
                                ? 'Stock Out of Hand'
                                : 'Collected / Resolved'}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Middle: Medicine Details & Query */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-[#F8FAFC] p-3 rounded-lg border border-[#E2E8F0] space-y-1">
                          <div className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider">
                            Medicine Requested
                          </div>
                          <div className="font-bold text-[#14202B] text-sm flex items-center gap-1.5">
                            <Pill size={15} className="text-[#0F6B6B]" />
                            <span>{enq.medicine_name || enq.medicine_id}</span>
                          </div>
                          <div className="text-[11px] text-[#475569]">
                            Quantity: <strong>{enq.requested_quantity || 1} units</strong> · Patient:{' '}
                            <strong>{enq.patient_name}</strong> ({enq.patient_phone})
                          </div>
                          {enq.notes && (
                            <div className="text-[11px] text-[#334155] pt-1 border-t border-[#E2E8F0] italic">
                              "{enq.notes}"
                            </div>
                          )}
                        </div>

                        {/* Chemist Verified Response */}
                        <div
                          className={`p-3 rounded-lg border space-y-1 ${
                            isConfirmed
                              ? 'bg-emerald-50/70 border-emerald-200'
                              : isPending
                              ? 'bg-amber-50/70 border-amber-200'
                              : isOutOfStock
                              ? 'bg-rose-50/70 border-rose-200'
                              : 'bg-slate-50 border-slate-200'
                          }`}
                        >
                          <div className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider">
                            Pharmacist Response
                          </div>
                          <div className="text-xs font-semibold text-[#14202B] leading-relaxed">
                            {enq.reply_notes ||
                              (isConfirmed
                                ? 'Physical shelf stock verified. Medicines are reserved at the counter for 24 hours.'
                                : isPending
                                ? 'Enquiry submitted to dispensary terminal. On-duty chemist is verifying physical shelf count.'
                                : isOutOfStock
                                ? 'Item is temporarily out of stock. Alternative stores suggested in network.'
                                : 'Completed.')}
                          </div>
                          {enq.confirmed_by && (
                            <div className="text-[10px] text-[#64748B] pt-1 border-t border-[#E2E8F0]">
                              Verified by: <strong className="text-[#334155]">{enq.confirmed_by}</strong>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bottom Action Buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F1F5F9]">
                        <div className="text-[11px] text-[#64748B]">
                          Enquiry Ref:{' '}
                          <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">{enq.id}</code>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMapLocId(enq.pharmacy_id);
                              setActiveTab('search');
                              setSearchDisplayMode('MAP');
                            }}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-[#E3E8EE] hover:bg-slate-50 text-[#334155] flex items-center gap-1"
                          >
                            <MapPin size={12} className="text-[#0F6B6B]" />
                            <span>View on Map</span>
                          </button>

                          {isConfirmed && (
                            <button
                              type="button"
                              onClick={() => handleResolveEnquiry(enq.id)}
                              className="px-3 py-1 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-2xs transition-colors"
                            >
                              <Check size={12} />
                              <span>Mark as Collected</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

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

      {/* ── Book OPD Appointment Modal ── */}
      {showBookAptModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E3E8EE] p-5 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3E8EE]">
              <div>
                <h3 className="text-sm font-bold text-[#14202B]">Book OPD Consultation Token</h3>
                <p className="text-[11px] text-[#5B6B7A]">Select department, doctor, and preferred time slot.</p>
              </div>
              <button onClick={() => setShowBookAptModal(false)} className="text-[#5B6B7A] p-1 rounded-md hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleBookAppointment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#14202B] mb-1">Health Facility</label>
                <select
                  value={aptFacilityId}
                  onChange={(e) => setAptFacilityId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg bg-white"
                >
                  <option value="phc_valparai">PHC Valparai (Hill Station Primary Centre)</option>
                  <option value="phc_aliyar">PHC Aliyar (Anaimalai Valley)</option>
                  <option value="phc_anaimalai">PHC Anaimalai Town</option>
                  <option value="chc_pollachi">Community Health Centre Pollachi Central</option>
                  <option value="phc_kottur">PHC Kottur</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#14202B] mb-1">Clinical Department</label>
                  <select
                    value={aptDepartment}
                    onChange={(e) => setAptDepartment(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg bg-white"
                  >
                    <option value="General OPD">General OPD</option>
                    <option value="Pediatrics">Pediatrics & Child Health</option>
                    <option value="Maternal Health">Maternal & Antenatal (MCH)</option>
                    <option value="NCD Clinic">NCD (Diabetes & BP Clinic)</option>
                    <option value="Dental">Dental OPD</option>
                    <option value="AYUSH / Siddha">AYUSH / Siddha</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#14202B] mb-1">Doctor / Medical Officer</label>
                  <input
                    type="text"
                    value={aptDoctor}
                    onChange={(e) => setAptDoctor(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#14202B] mb-1">Appointment Date</label>
                  <input
                    type="date"
                    required
                    value={aptDate}
                    onChange={(e) => setAptDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#14202B] mb-1">Time Slot</label>
                  <select
                    value={aptTime}
                    onChange={(e) => setAptTime(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg bg-white"
                  >
                    <option value="09:00 AM">09:00 AM</option>
                    <option value="09:30 AM">09:30 AM</option>
                    <option value="10:00 AM">10:00 AM</option>
                    <option value="10:30 AM">10:30 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="11:30 AM">11:30 AM</option>
                    <option value="02:30 PM">02:30 PM</option>
                    <option value="03:30 PM">03:30 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#14202B] mb-1">Patient Name & Phone</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    value={aptPatientName}
                    onChange={(e) => setAptPatientName(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                  />
                  <input
                    type="text"
                    required
                    value={aptPhone}
                    onChange={(e) => setAptPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#14202B] mb-1">Symptoms / Primary Complaint</label>
                <textarea
                  rows={2}
                  placeholder="e.g., Continuous dry cough for 3 days, low grade fever, mild wheezing"
                  value={aptSymptoms}
                  onChange={(e) => setAptSymptoms(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E3E8EE]">
                <button
                  type="button"
                  onClick={() => setShowBookAptModal(false)}
                  className="px-3 py-2 border border-[#E3E8EE] text-[#5B6B7A] font-semibold rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0F6B6B] hover:bg-[#0a4f4f] text-white font-bold rounded-lg shadow-xs"
                >
                  Confirm OPD Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Digital Health Record Modal ── */}
      {showAddRecordModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E3E8EE] p-5 space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-2 border-b border-[#E3E8EE]">
              <div>
                <h3 className="text-sm font-bold text-[#14202B]">Add Digital Health Record</h3>
                <p className="text-[11px] text-[#5B6B7A]">Save personal consultation, prescription, or diagnostic report.</p>
              </div>
              <button onClick={() => setShowAddRecordModal(false)} className="text-[#5B6B7A] p-1 rounded-md hover:bg-gray-100">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddRecord} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#14202B] mb-1">Record Type</label>
                  <select
                    value={recType}
                    onChange={(e: any) => setRecType(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg bg-white"
                  >
                    <option value="PRESCRIPTION">Prescription</option>
                    <option value="LAB_REPORT">Lab Report</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#14202B] mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={recDate}
                    onChange={(e) => setRecDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#14202B] mb-1">Record Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Follow-up Diabetes Review, Lipid Profile Test"
                  value={recTitle}
                  onChange={(e) => setRecTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#14202B] mb-1">Physician Name</label>
                  <input
                    type="text"
                    value={recDoctor}
                    onChange={(e) => setRecDoctor(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#14202B] mb-1">Diagnosis</label>
                  <input
                    type="text"
                    placeholder="e.g. Essential Hypertension"
                    value={recDiagnosis}
                    onChange={(e) => setRecDiagnosis(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#14202B] mb-1">Physician Advice / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Doctor instructions, dietary recommendations, warning signs..."
                  value={recNotes}
                  onChange={(e) => setRecNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E3E8EE]">
                <button
                  type="button"
                  onClick={() => setShowAddRecordModal(false)}
                  className="px-3 py-2 border border-[#E3E8EE] text-[#5B6B7A] font-semibold rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0F6B6B] hover:bg-[#0a4f4f] text-white font-bold rounded-lg shadow-xs"
                >
                  Save Health Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Submit New Stock Enquiry Modal ── */}
      {showNewEnquiryModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-[#E3E8EE] animate-in fade-in duration-200">
            <div className="p-5 border-b border-[#E3E8EE] flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#14202B] flex items-center gap-2">
                  <ClipboardPen size={18} className="text-[#0F6B6B]" />
                  <span>Submit Medicine Availability Enquiry</span>
                </h3>
                <p className="text-xs text-[#5B6B7A] mt-0.5">
                  Direct inquiry to pharmacy or PHC dispensary terminal for physical stock verification.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowNewEnquiryModal(false);
                  setEnquirySuccessMsg(null);
                }}
                className="p-1 rounded-lg hover:bg-gray-100 text-[#5B6B7A]"
              >
                <X size={18} />
              </button>
            </div>

            {enquirySuccessMsg ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <h4 className="text-sm font-bold text-emerald-900">{enquirySuccessMsg}</h4>
                <p className="text-xs text-emerald-700">
                  The pharmacist has received your inquiry and will update stock confirmation shortly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitEnquiry} className="p-5 space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-[#14202B] mb-1">Target Pharmacy / PHC Dispensary</label>
                  <select
                    value={enquiryPharmacyId}
                    onChange={(e) => setEnquiryPharmacyId(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg bg-white"
                  >
                    {mapLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.type_label} - {loc.block || loc.district || 'Coimbatore'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#14202B] mb-1">Medicine Name</label>
                    <select
                      value={enquiryMedicineId}
                      onChange={(e) => setEnquiryMedicineId(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg bg-white"
                    >
                      <option value="med_pcm">Paracetamol 500mg (Dolo 650)</option>
                      <option value="med_pcm_syr">Paracetamol Syrup 60ml Pediatric</option>
                      <option value="med_amox">Amoxicillin 250mg Capsules</option>
                      <option value="med_amox_500">Amoxicillin 500mg Capsules</option>
                      <option value="med_ors">ORS Sachets 20.5g</option>
                      <option value="med_zinc">Zinc Sulfate 20mg</option>
                      <option value="med_metformin">Metformin 500mg</option>
                      <option value="med_cetirizine">Cetirizine 10mg</option>
                      <option value="med_asv">Anti-Snake Venom 10ml Inj</option>
                      <option value="med_arv">Anti-Rabies Vaccine 0.5ml</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-[#14202B] mb-1">Quantity Needed</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={enquiryQty}
                      onChange={(e) => setEnquiryQty(Number(e.target.value))}
                      className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-[#14202B] mb-1">Your Full Name</label>
                    <input
                      type="text"
                      value={enquiryPatientName}
                      onChange={(e) => setEnquiryPatientName(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-[#14202B] mb-1">Contact Phone</label>
                    <input
                      type="tel"
                      value={enquiryPatientPhone}
                      onChange={(e) => setEnquiryPatientPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#14202B] mb-1">Enquiry Question / Notes</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Please check shelf stock for pediatric fever syrup. Can you reserve 1 bottle for evening pickup?"
                    value={enquiryNotes}
                    onChange={(e) => setEnquiryNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-[#E3E8EE] rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-[#E3E8EE]">
                  <button
                    type="button"
                    onClick={() => setShowNewEnquiryModal(false)}
                    className="px-3.5 py-2 border border-[#E3E8EE] text-[#5B6B7A] font-semibold rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0F6B6B] hover:bg-[#0a4f4f] text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5"
                  >
                    <Send size={13} />
                    <span>Send Enquiry to Pharmacy</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
