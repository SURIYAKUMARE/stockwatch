import type { Centre, Medicine, KPIData, AlertItem, MatrixData, MapLocationItem, AvailabilityEnquiry } from '../types';
import rawMapLocations from './mapFallbackData.json';

export const FALLBACK_CENTRES: Centre[] = [
  { id: 'phc_valparai', name: 'PHC Valparai', block: 'Valparai', district: 'Coimbatore', is_stale: false },
  { id: 'phc_aliyar', name: 'PHC Aliyar', block: 'Anaimalai', district: 'Coimbatore', is_stale: false },
  { id: 'phc_anaimalai', name: 'PHC Anaimalai', block: 'Anaimalai', district: 'Coimbatore', is_stale: false },
  { id: 'phc_kottur', name: 'PHC Kottur', block: 'Anaimalai', district: 'Coimbatore', is_stale: false },
  { id: 'chc_pollachi', name: 'CHC Pollachi Central', block: 'Pollachi', district: 'Coimbatore', is_stale: false },
  { id: 'phc_pollachi_w', name: 'PHC Pollachi West', block: 'Pollachi', district: 'Coimbatore', is_stale: false },
  { id: 'phc_negamam', name: 'PHC Negamam', block: 'Pollachi', district: 'Coimbatore', is_stale: false },
  { id: 'phc_vettaikaranpudur', name: 'PHC Vettaikaranpudur', block: 'Anaimalai', district: 'Coimbatore', is_stale: false },
  { id: 'phc_kinathukadavu', name: 'PHC Kinathukadavu', block: 'Kinathukadavu', district: 'Coimbatore', is_stale: false },
  { id: 'phc_othakkalmandapam', name: 'PHC Othakkalmandapam', block: 'Kinathukadavu', district: 'Coimbatore', is_stale: false },
  { id: 'phc_madukkarai', name: 'PHC Madukkarai', block: 'Madukkarai', district: 'Coimbatore', is_stale: false },
  { id: 'phc_chettipalayam', name: 'PHC Chettipalayam', block: 'Madukkarai', district: 'Coimbatore', is_stale: true }, // Stale blind spot!
];

export const FALLBACK_MEDICINES: Medicine[] = [
  { id: 'med_pcm', name: 'Paracetamol 500mg', unit: 'tablets', essential: true },
  { id: 'med_pcm_syr', name: 'Paracetamol Syrup 60ml', unit: 'bottles', essential: true },
  { id: 'med_amox', name: 'Amoxicillin 250mg', unit: 'capsules', essential: true },
  { id: 'med_amox_500', name: 'Amoxicillin 500mg', unit: 'capsules', essential: true },
  { id: 'med_ors', name: 'ORS Sachets 20.5g', unit: 'sachets', essential: true },
  { id: 'med_zinc', name: 'Zinc Sulfate 20mg', unit: 'tablets', essential: true },
  { id: 'med_metformin', name: 'Metformin 500mg', unit: 'tablets', essential: true },
  { id: 'med_ifa', name: 'Iron and Folic Acid', unit: 'tablets', essential: true },
  { id: 'med_cetirizine', name: 'Cetirizine 10mg', unit: 'tablets', essential: true },
  { id: 'med_alben', name: 'Albendazole 400mg', unit: 'tablets', essential: true },
  { id: 'med_asv', name: 'Anti-Snake Venom 10ml Inj', unit: 'vials', essential: true },
  { id: 'med_arv', name: 'Anti-Rabies Vaccine 0.5ml', unit: 'vials', essential: true },
  { id: 'med_amlo', name: 'Amlodipine 5mg', unit: 'tablets', essential: true },
  { id: 'med_azithro', name: 'Azithromycin 500mg', unit: 'tablets', essential: true },
  { id: 'med_salbutamol', name: 'Salbutamol Inhaler 100mcg', unit: 'inhalers', essential: true },
  { id: 'med_atropine', name: 'Atropine Sulfate 0.6mg/ml Inj', unit: 'ampoules', essential: true },
];

export const FALLBACK_KPIS: KPIData = {
  centres_at_risk: 4,
  total_centres: 12,
  critical_items: 7,
  avg_days_of_cover: 14.8,
  early_warning_lead_time_gained: '4.8 days',
  median_time_to_acknowledge: '38 mins',
  alerts_acted_before_stockout_pct: 94.2,
  stockouts_averted_count: 18,
};

export const FALLBACK_ALERTS: AlertItem[] = [
  {
    id: 'alt-crit-1',
    centre_id: 'phc_valparai',
    centre_name: 'PHC Valparai',
    block: 'Valparai',
    medicine_id: 'med_pcm_syr',
    medicine_name: 'Paracetamol Syrup 60ml',
    unit: 'bottles',
    stock: 35,
    velocity: 16.8,
    trend: 1.64,
    trend_pct: 64.0,
    tier: 'CRITICAL',
    urgency: 94,
    probability: 0.98,
    predicted_date: 'In 2.1 days',
    range_low: '1.8d',
    range_high: '2.5d',
    latest_safe_action_date: 'Today',
    recommended_order_qty: 260,
    patient_impact: 42,
    reason: 'Pediatric fever surge (+64% dispensing surge). Stockout predicted in 2.1 days.',
    reason_ta: 'குழந்தைகள் காய்ச்சல் அதிகரிப்பு. 2.1 நாட்களில் இருப்பு தீர்ந்துவிடும் அபாயம்.',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  },
  {
    id: 'alt-crit-2',
    centre_id: 'phc_anaimalai',
    centre_name: 'PHC Anaimalai',
    block: 'Anaimalai',
    medicine_id: 'med_asv',
    medicine_name: 'Anti-Snake Venom 10ml Inj',
    unit: 'vials',
    stock: 0,
    velocity: 2.1,
    trend: 1.2,
    trend_pct: 20.0,
    tier: 'CRITICAL',
    urgency: 98,
    probability: 1.0,
    predicted_date: 'Immediate',
    range_low: '0d',
    range_high: '0d',
    latest_safe_action_date: 'Immediate',
    recommended_order_qty: 20,
    patient_impact: 8,
    reason: 'Zero stock in trauma ward. Immediate inter-facility transfer required.',
    reason_ta: 'அதிர்ச்சி பிரிவில் இருப்பு பூஜ்ஜியம். உடனடி இடமாற்றம் தேவை.',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  },
  {
    id: 'alt-crit-3',
    centre_id: 'phc_aliyar',
    centre_name: 'PHC Aliyar',
    block: 'Anaimalai',
    medicine_id: 'med_ors',
    medicine_name: 'ORS Sachets 20.5g',
    unit: 'sachets',
    stock: 90,
    velocity: 21.4,
    trend: 1.45,
    trend_pct: 45.0,
    tier: 'CRITICAL',
    urgency: 88,
    probability: 0.92,
    predicted_date: 'In 4.2 days',
    range_low: '3.6d',
    range_high: '5.1d',
    latest_safe_action_date: 'Tomorrow',
    recommended_order_qty: 450,
    patient_impact: 65,
    reason: 'Acute gastroenteritis cluster detected by CUSUM. Only 4.2 days cover remaining.',
    reason_ta: 'வயிற்றுப்போக்கு அதிகரிப்பு கண்டறியப்பட்டது. 4.2 நாட்கள் இருப்பு மட்டுமே உள்ளது.',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  },
  {
    id: 'alt-crit-4',
    centre_id: 'phc_valparai',
    centre_name: 'PHC Valparai',
    block: 'Valparai',
    medicine_id: 'med_pcm',
    medicine_name: 'Paracetamol 500mg',
    unit: 'tablets',
    stock: 80,
    velocity: 14.5,
    trend: 1.3,
    trend_pct: 30.0,
    tier: 'HIGH',
    urgency: 78,
    probability: 0.85,
    predicted_date: 'In 5.5 days',
    range_low: '4.8d',
    range_high: '6.2d',
    latest_safe_action_date: 'In 2 days',
    recommended_order_qty: 400,
    patient_impact: 55,
    reason: 'Stock cover below safety threshold. Transfer candidate from PHC Aliyar available.',
    reason_ta: 'பாதுகாப்பு அளவுக்கு கீழ் இருப்பு குறைந்துள்ளது. ஆழியார் மையத்திலிருந்து இடமாற்றம் செய்யலாம்.',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  },
  {
    id: 'alt-crit-5',
    centre_id: 'phc_kottur',
    centre_name: 'PHC Kottur',
    block: 'Anaimalai',
    medicine_id: 'med_amox',
    medicine_name: 'Amoxicillin 250mg',
    unit: 'capsules',
    stock: 120,
    velocity: 18.0,
    trend: 1.15,
    trend_pct: 15.0,
    tier: 'HIGH',
    urgency: 72,
    probability: 0.80,
    predicted_date: 'In 6.7 days',
    range_low: '5.9d',
    range_high: '7.5d',
    latest_safe_action_date: 'In 3 days',
    recommended_order_qty: 350,
    patient_impact: 38,
    reason: 'Respiratory infection surge. Action needed before district indent window closes.',
    reason_ta: 'சுவாச தொற்று அதிகரிப்பு. மாவட்ட கோரிக்கை சாளரத்திற்கு முன் நடவடிக்கை தேவை.',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
  },
];

export const FALLBACK_MATRIX: MatrixData = {
  medicines: FALLBACK_MEDICINES.map(m => ({ id: m.id, name: m.name, unit: m.unit })),
  act_today: [
    {
      alert_id: 'alt-crit-1',
      centre_id: 'phc_valparai',
      centre_name: 'PHC Valparai',
      medicine_id: 'med_pcm_syr',
      medicine_name: 'Paracetamol Syrup 60ml',
      unit: 'bottles',
      tier: 'CRITICAL',
      urgency: 94,
      days_of_cover: 2.1,
      latest_safe_action_date: 'Today',
      recommended_order_qty: 260,
      reason: 'Pediatric fever surge (+64% dispensing surge). Stockout predicted in 2.1 days.',
      reason_ta: 'குழந்தைகள் காய்ச்சல் அதிகரிப்பு. 2.1 நாட்களில் இருப்பு தீர்ந்துவிடும் அபாயம்.',
      status: 'ACTIVE',
    },
    {
      alert_id: 'alt-crit-2',
      centre_id: 'phc_anaimalai',
      centre_name: 'PHC Anaimalai',
      medicine_id: 'med_asv',
      medicine_name: 'Anti-Snake Venom 10ml Inj',
      unit: 'vials',
      tier: 'CRITICAL',
      urgency: 98,
      days_of_cover: 0,
      latest_safe_action_date: 'Immediate',
      recommended_order_qty: 20,
      reason: 'Zero stock in trauma ward. Immediate inter-facility transfer required.',
      reason_ta: 'அதிர்ச்சி பிரிவில் இருப்பு பூஜ்ஜியம். உடனடி இடமாற்றம் தேவை.',
      status: 'ACTIVE',
    },
  ],
  rows: FALLBACK_CENTRES.map(c => {
    return {
      centre_id: c.id,
      centre_name: c.name,
      block: c.block,
      district: c.district,
      is_stale: c.is_stale,
      cells: FALLBACK_MEDICINES.map(m => {
        let tier: 'CRITICAL' | 'HIGH' | 'WATCH' | 'SAFE' | 'BLIND_SPOT' = 'SAFE';
        let stock = 220;
        let daysOfCover = 24.5;
        let urgency = 10;

        if (c.is_stale) {
          tier = 'BLIND_SPOT';
          urgency = 60;
        } else if (c.id === 'phc_valparai' && m.id === 'med_pcm_syr') {
          tier = 'CRITICAL';
          stock = 35;
          daysOfCover = 2.1;
          urgency = 94;
        } else if (c.id === 'phc_anaimalai' && m.id === 'med_asv') {
          tier = 'CRITICAL';
          stock = 0;
          daysOfCover = 0;
          urgency = 98;
        } else if (c.id === 'phc_aliyar' && m.id === 'med_ors') {
          tier = 'CRITICAL';
          stock = 90;
          daysOfCover = 4.2;
          urgency = 88;
        } else if (c.id === 'phc_valparai' && m.id === 'med_pcm') {
          tier = 'HIGH';
          stock = 80;
          daysOfCover = 5.5;
          urgency = 78;
        } else if (c.id === 'phc_kottur' && m.id === 'med_amox') {
          tier = 'HIGH';
          stock = 120;
          daysOfCover = 6.7;
          urgency = 72;
        } else if (c.id === 'phc_aliyar' && m.id === 'med_pcm') {
          // Surplus donor centre!
          stock = 350;
          daysOfCover = 45.0;
        } else if (c.id === 'phc_aliyar' && m.id === 'med_pcm_syr') {
          // Surplus donor centre!
          stock = 420;
          daysOfCover = 38.0;
        }

        return {
          medicine_id: m.id,
          medicine_name: m.name,
          unit: m.unit,
          stock,
          tier,
          days_of_cover: daysOfCover,
          trend: 1.0,
          trend_pct: 0,
          velocity: 5.0,
          predicted_date: 'In 24 days',
          urgency,
          is_stale: c.is_stale,
          essential: m.essential,
        };
      }),
    };
  }),
};

export const FALLBACK_MAP_LOCATIONS: MapLocationItem[] = rawMapLocations as MapLocationItem[];

// ================= OFFLINE ENTERPRISE HEALTHCARE FALLBACK DATA =================

export const FALLBACK_ENQUIRIES: AvailabilityEnquiry[] = [
  {
    id: 'enq-001',
    pharmacy_id: 'pharma_apollo_cbe',
    pharmacy_name: 'Apollo Pharmacy - Gandhipuram',
    medicine_id: 'med_pcm',
    medicine_name: 'Paracetamol 500mg (Dolo 650)',
    patient_name: 'Kavitha Murugan',
    patient_phone: '+91 98421 12345',
    requested_quantity: 2,
    status: 'CONFIRMED',
    confirmed_by: 'K. Ramesh, Head Pharmacist',
    notes: 'Urgent availability check for high fever during evening hours',
    reply_notes: 'Physical stock verified: 40 boxes available on shelf. Reserved for 24 hours under your name.',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString()
  },
  {
    id: 'enq-002',
    pharmacy_id: 'pharma_kovai_valparai',
    pharmacy_name: 'Kovai Medicals - Valparai Bazaar',
    medicine_id: 'med_pcm_syr',
    medicine_name: 'Paracetamol Syrup 60ml Pediatric',
    patient_name: 'Kavitha Murugan',
    patient_phone: '+91 98421 12345',
    requested_quantity: 1,
    status: 'PENDING',
    confirmed_by: undefined,
    notes: 'Checking pediatric formulation stock for child fever',
    reply_notes: 'Under review by on-duty chemist. Physical shelf check in progress.',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'enq-003',
    pharmacy_id: 'phc_valparai',
    pharmacy_name: 'PHC Valparai Dispensary',
    medicine_id: 'med_amox',
    medicine_name: 'Amoxicillin 250mg Capsules',
    patient_name: 'Kavitha Murugan',
    patient_phone: '+91 98421 12345',
    requested_quantity: 10,
    status: 'CONFIRMED',
    confirmed_by: 'R. Karpagam, D.Pharm (Govt. Pharmacist)',
    notes: 'Govt PHC free supply availability inquiry',
    reply_notes: 'Free TNMSC stock available in PHC dispensary room 3. Please bring doctor prescription / OP chit.',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString()
  }
];

export const FALLBACK_APPOINTMENTS = [
  {
    id: 'apt-001',
    patient_id: 'user_patient_01',
    patient_name: 'Kavitha Murugan',
    patient_phone: '+91 98421 12345',
    facility_id: 'phc_valparai',
    department: 'General OPD',
    doctor_name: 'Dr. S. Kulanthaivel, MBBS',
    appointment_date: '2026-10-15',
    appointment_time: '10:30 AM',
    symptoms: 'Seasonal fever, headache, body ache',
    status: 'CONFIRMED',
    token_number: 'OPD-104',
    created_at: new Date().toISOString()
  },
  {
    id: 'apt-002',
    patient_id: 'user_patient_01',
    patient_name: 'Kavitha Murugan',
    patient_phone: '+91 98421 12345',
    facility_id: 'chc_pollachi',
    department: 'Maternal Health',
    doctor_name: 'Dr. R. Anuradha, DGO',
    appointment_date: '2026-10-16',
    appointment_time: '11:15 AM',
    symptoms: 'Routine prenatal checkup and iron supplementation review',
    status: 'CONFIRMED',
    token_number: 'MCH-028',
    created_at: new Date().toISOString()
  }
];

export const FALLBACK_MEDICAL_RECORDS = [
  {
    id: 'rec-001',
    patient_id: 'user_patient_01',
    facility_id: 'phc_valparai',
    record_type: 'PRESCRIPTION',
    title: 'OPD Clinical Consultation & Prescription',
    doctor_name: 'Dr. S. Kulanthaivel, MBBS',
    record_date: '2026-10-12',
    diagnosis: 'Acute Viral Pyrexia with upper respiratory symptoms',
    medicines_prescribed: [
      { name: 'Paracetamol 500mg', dosage: '1 tablet TDS', duration: '5 days', instructions: 'After food' },
      { name: 'Cetirizine 10mg', dosage: '1 tablet OD', duration: '3 days', instructions: 'At bedtime' },
      { name: 'ORS Sachet', dosage: '1 packet in 1L water', duration: '2 days', instructions: 'Sip frequently' }
    ],
    notes: 'Patient advised adequate hydration and rest. Review if fever persists past 3 days.',
    created_at: new Date().toISOString()
  },
  {
    id: 'rec-002',
    patient_id: 'user_patient_01',
    facility_id: 'phc_valparai',
    record_type: 'LAB_REPORT',
    title: 'Complete Blood Count (CBC) & Dengue NS1 Rapid Test',
    doctor_name: 'Dr. P. Meena, Pathologist',
    record_date: '2026-10-12',
    diagnosis: 'Normal hematological profile; Dengue NS1 Negative',
    lab_results: {
      'Hemoglobin': '13.8 g/dL (Normal 12.0 - 15.5)',
      'Total WBC Count': '6,800 /cu.mm (Normal 4,000 - 11,000)',
      'Platelet Count': '2.4 Lakhs /cu.mm (Normal 1.5 - 4.5)',
      'Dengue NS1 Antigen': 'NEGATIVE',
      'Malaria Rapid Diagnostic Test': 'NEGATIVE'
    },
    notes: 'No evidence of acute thrombocytopenia or malarial parasites.',
    created_at: new Date().toISOString()
  }
];

export const FALLBACK_INVOICES = [
  {
    id: 'inv-001',
    invoice_number: 'INV-2026-089101',
    pharmacy_id: 'pharma_valparai_01',
    patient_name: 'S. Natarajan',
    patient_phone: '+91 94432 55678',
    doctor_name: 'Dr. Sundaram, MD',
    items: [
      { medicine_id: 'med_pcm', medicine_name: 'Paracetamol 500mg Tab', batch: 'BTH-PCM-2026', qty: 20, unit_price: 1.5, gst_rate: 12.0, line_total: 33.6 },
      { medicine_id: 'med_amox', medicine_name: 'Amoxicillin 500mg Cap', batch: 'BTH-AMX-2026', qty: 10, unit_price: 7.0, gst_rate: 12.0, line_total: 78.4 }
    ],
    subtotal: 100.0,
    cgst: 6.0,
    sgst: 6.0,
    total_amount: 112.0,
    payment_mode: 'UPI' as const,
    created_by: 'Retail Pharmacist',
    created_at: new Date().toISOString()
  }
];

export const FALLBACK_COLD_CHAIN_LOGS = [
  {
    id: 'cc-001',
    facility_id: 'phc_valparai',
    equipment_id: 'ILR-01',
    equipment_type: 'ILR' as const,
    temperature_celsius: 4.2,
    target_min: 2.0,
    target_max: 8.0,
    is_excursion: false,
    excursion_severity: 'NORMAL' as const,
    logged_by: 'R. Karpagam, D.Pharm',
    power_source: 'MAINS',
    notes: 'Morning temperature verification. Green zone optimal.',
    created_at: new Date().toISOString()
  },
  {
    id: 'cc-002',
    facility_id: 'phc_valparai',
    equipment_id: 'DF-01',
    equipment_type: 'DF' as const,
    temperature_celsius: -18.5,
    target_min: -25.0,
    target_max: -15.0,
    is_excursion: false,
    excursion_severity: 'NORMAL' as const,
    logged_by: 'R. Karpagam, D.Pharm',
    power_source: 'MAINS',
    notes: 'Deep Freezer holding ice packs and OPV vials.',
    created_at: new Date().toISOString()
  }
];

export const FALLBACK_ADR_REPORTS = [
  {
    id: 'adr-001',
    report_reference: 'ADR-2026-004128',
    facility_id: 'phc_valparai',
    patient_age: 42,
    patient_gender: 'Female',
    medicine_id: 'med_amox',
    batch_number: 'BTH-AMX-2026',
    reaction_description: 'Erythematous rash with pruritus 2 hours after oral dose.',
    onset_date: '2026-10-12',
    severity: 'MODERATE' as const,
    outcome: 'RECOVERED' as const,
    action_taken: 'DRUG_WITHDRAWN',
    reported_by: 'R. Karpagam, D.Pharm',
    reported_by_role: 'pharmacist',
    created_at: new Date().toISOString()
  }
];

export const FALLBACK_REFERRALS = [
  {
    id: 'ref-001',
    referral_code: 'REF-CHC-10492',
    patient_name: 'Marimuthu K.',
    patient_age: 58,
    patient_gender: 'Male',
    from_facility_id: 'phc_valparai',
    to_facility_id: 'chc_pollachi',
    referral_reason: 'Suspected acute coronary syndrome; elevated troponin and ST elevation',
    urgency: 'EMERGENCY' as const,
    clinical_notes: 'Stabilized with Aspirin 300mg, Clopidogrel 300mg, Sorbitrate 5mg sublingual. Shifted via 108 Ambulance.',
    status: 'IN_TRANSIT' as const,
    referring_doctor: 'Dr. S. Kulanthaivel, MBBS',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'ref-002',
    referral_code: 'REF-CHC-10488',
    patient_name: 'Revathi P.',
    patient_age: 26,
    patient_gender: 'Female',
    from_facility_id: 'phc_aliyar',
    to_facility_id: 'chc_pollachi',
    referral_reason: 'Primigravida 38 weeks with mild gestational hypertension',
    urgency: 'PRIORITY' as const,
    clinical_notes: 'BP 146/94 mmHg, urine albumin 1+. Fetal heart sound regular.',
    status: 'ADMITTED' as const,
    referring_doctor: 'Dr. K. Geetha, MBBS',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

export const FALLBACK_BEDS = [
  { id: 'bed-1', facility_id: 'chc_pollachi', ward_name: 'General Male Ward', total_beds: 20, occupied_beds: 15, oxygen_supported_beds: 8, ventilator_beds: 0, last_updated_by: 'Sister Incharge', updated_at: new Date().toISOString() },
  { id: 'bed-2', facility_id: 'chc_pollachi', ward_name: 'General Female Ward', total_beds: 20, occupied_beds: 18, oxygen_supported_beds: 10, ventilator_beds: 0, last_updated_by: 'Sister Incharge', updated_at: new Date().toISOString() },
  { id: 'bed-3', facility_id: 'chc_pollachi', ward_name: 'Maternity & Labour Ward', total_beds: 15, occupied_beds: 12, oxygen_supported_beds: 6, ventilator_beds: 0, last_updated_by: 'Midwife Incharge', updated_at: new Date().toISOString() },
  { id: 'bed-4', facility_id: 'chc_pollachi', ward_name: 'Pediatric Ward', total_beds: 10, occupied_beds: 6, oxygen_supported_beds: 4, ventilator_beds: 0, last_updated_by: 'Sister Incharge', updated_at: new Date().toISOString() },
  { id: 'bed-5', facility_id: 'chc_pollachi', ward_name: 'Emergency & ICU Stabilisation', total_beds: 6, occupied_beds: 4, oxygen_supported_beds: 6, ventilator_beds: 2, last_updated_by: 'Casualty MO', updated_at: new Date().toISOString() }
];

export const FALLBACK_DUTY_ROSTER = [
  { id: 'ros-1', facility_id: 'chc_pollachi', staff_name: 'Dr. M. Sangeetha', role_title: 'Medical Officer', shift: 'Morning (08:00 - 14:00)', roster_date: '2026-10-15', status: 'ON_DUTY' as const, contact_number: '+91 94431 10001', created_at: new Date().toISOString() },
  { id: 'ros-2', facility_id: 'chc_pollachi', staff_name: 'Dr. V. Karthik', role_title: 'Medical Officer', shift: 'Evening (14:00 - 20:00)', roster_date: '2026-10-15', status: 'SCHEDULED' as const, contact_number: '+91 94431 10002', created_at: new Date().toISOString() },
  { id: 'ros-3', facility_id: 'chc_pollachi', staff_name: 'Dr. R. Anand', role_title: 'Casualty MO', shift: 'Night (20:00 - 08:00)', roster_date: '2026-10-15', status: 'SCHEDULED' as const, contact_number: '+91 94431 10003', created_at: new Date().toISOString() },
  { id: 'ros-4', facility_id: 'chc_pollachi', staff_name: 'S. Malathi', role_title: 'Staff Nurse Incharge', shift: 'Morning (08:00 - 14:00)', roster_date: '2026-10-15', status: 'ON_DUTY' as const, contact_number: '+91 94431 10004', created_at: new Date().toISOString() },
  { id: 'ros-5', facility_id: 'chc_pollachi', staff_name: 'T. Vignesh', role_title: 'Chief Pharmacist', shift: 'General (09:00 - 17:00)', roster_date: '2026-10-15', status: 'ON_DUTY' as const, contact_number: '+91 94431 10005', created_at: new Date().toISOString() }
];

export const FALLBACK_SURVEILLANCE = [
  {
    id: 'srv-1',
    surveillance_code: 'IDSP-2026-0310',
    district_id: 'coimbatore',
    facility_id: 'phc_valparai',
    disease_name: 'Dengue Fever',
    reported_cases: 14,
    suspected_cases: 22,
    confirmed_cases: 8,
    reporting_week: '2026-W41',
    reporting_date: '2026-10-14',
    alert_level: 'OUTBREAK_WARNING' as const,
    affected_villages: 'Waterfall Estate, Valparai Town Ward 4, Sholayar',
    action_taken: 'Source reduction drive initiated; 500 Paracetamol strips & 250 ORS sachets redistributed; fogging team mobilized.',
    reported_by: 'District Epidemiologist',
    created_at: new Date().toISOString()
  },
  {
    id: 'srv-2',
    surveillance_code: 'IDSP-2026-0308',
    district_id: 'coimbatore',
    facility_id: 'phc_aliyar',
    disease_name: 'Acute Diarrheal Disease (ADD)',
    reported_cases: 19,
    suspected_cases: 25,
    confirmed_cases: 12,
    reporting_week: '2026-W41',
    reporting_date: '2026-10-14',
    alert_level: 'WATCH' as const,
    affected_villages: 'Aliyar Colony, Navamalai Tribal Settlement',
    action_taken: 'Chlorination of community overhead tanks verified; zinc & ORS buffer positioned.',
    reported_by: 'Block Medical Officer Anaimalai',
    created_at: new Date().toISOString()
  }
];

export const FALLBACK_STRATEGIC_RESERVES = [
  {
    id: 'res-1',
    depot_name: 'Central Medical Store Depot (CMSD) - Chennai',
    depot_code: 'CMSD-CHN',
    state_id: 'TN',
    medicine_id: 'med_pcm',
    medicine_name: 'Paracetamol 500mg',
    buffer_quantity: 250000,
    reserved_quantity: 45000,
    minimum_threshold: 50000,
    depot_manager: 'Dr. R. Ramanathan, Chief Medical Storekeeper',
    last_inspected: '2026-10-10',
    created_at: new Date().toISOString()
  },
  {
    id: 'res-2',
    depot_name: 'Central Medical Store Depot (CMSD) - Chennai',
    depot_code: 'CMSD-CHN',
    state_id: 'TN',
    medicine_id: 'med_asv',
    medicine_name: 'Anti-Snake Venom 10ml Inj',
    buffer_quantity: 5000,
    reserved_quantity: 800,
    minimum_threshold: 1000,
    depot_manager: 'Dr. R. Ramanathan, Chief Medical Storekeeper',
    last_inspected: '2026-10-11',
    created_at: new Date().toISOString()
  },
  {
    id: 'res-3',
    depot_name: 'Northern Regional Buffer Depot - Delhi',
    depot_code: 'CMSD-DEL',
    state_id: 'DL',
    medicine_id: 'med_amox',
    medicine_name: 'Amoxicillin 250mg',
    buffer_quantity: 180000,
    reserved_quantity: 30000,
    minimum_threshold: 40000,
    depot_manager: 'Shri S. K. Sharma',
    last_inspected: '2026-10-09',
    created_at: new Date().toISOString()
  }
];

