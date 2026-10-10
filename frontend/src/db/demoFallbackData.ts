import type { Centre, Medicine, KPIData, AlertItem, MatrixData } from '../types';

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
