export type UrgencyTier = 'CRITICAL' | 'HIGH' | 'WATCH' | 'SAFE' | 'BLIND_SPOT';

export type UserRole =
  | 'patient'
  | 'pharmacist'
  | 'chc_facility'
  | 'facility'
  | 'district_officer'
  | 'state_officer'
  | 'national_officer'
  | 'block_officer';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  centre_id?: string | null;
  scopes?: {
    state_id?: string | null;
    district_id?: string | null;
    facility_id?: string | null;
    pharmacy_id?: string | null;
  };
}

export interface PharmacyItem {
  id: string;
  name: string;
  address: string;
  distance_km: number;
  contact_phone: string;
  stock_quantity: number;
  availability_status: 'IN_STOCK' | 'LOW_STOCK' | 'AWAITING_CONFIRMATION' | 'STALE_DATA';
  data_source: 'LIVE_INTEGRATION' | 'VERIFIED_PHARMACY' | 'MANUALLY_REPORTED' | 'DEMO_DATA' | 'STALE';
  verified: boolean;
  disclaimer: string;
}

export interface AvailabilityEnquiry {
  id: string;
  pharmacy_id: string;
  medicine_id: string;
  patient_name: string;
  patient_phone: string;
  requested_quantity: number;
  status: 'PENDING' | 'CONFIRMED' | 'OUT_OF_STOCK';
  confirmed_by?: string;
  created_at: string;
}

export interface CanonicalMedicineItem {
  id: string;
  canonical_name: string;
  generic_name: string;
  brand_name?: string;
  strength: string;
  dosage_form: string;
  unit: string;
  essential: boolean;
  verification_status: string;
  normalized_name?: string;
  total_stock_across_network?: number;
  facilities_reporting?: number;
}

export interface DuplicateCandidate {
  medicine_a: { id: string; name: string; strength: string; form: string };
  medicine_b: { id: string; name: string; strength: string; form: string };
  similarity: number;
  can_merge: boolean;
  status: string;
}

export interface DistrictMetric {
  id: string;
  name: string;
  total_facilities: number;
  critical_shortages: number;
  avg_days_cover: number;
  compliance_pct: number;
}

export interface StateAnalyticsData {
  state_id: string;
  state_name: string;
  total_facilities: number;
  total_critical_items: number;
  state_avg_cover_days: number;
  reporting_compliance_pct: number;
  districts: DistrictMetric[];
  essential_availability_pct: number;
}

export interface StateNationalMetric {
  state_id: string;
  state_name: string;
  facilities: number;
  stockout_risk_score: number;
  essential_cover_pct: number;
  active_transfers: number;
}

export interface NationalAnalyticsData {
  country: string;
  total_monitored_facilities: number;
  national_essential_drug_index: number;
  critical_shortage_clusters: number;
  macro_stockout_prevention_rate: number;
  states: StateNationalMetric[];
}

export interface AuditLogItem {
  id: string;
  sequence_number?: number;
  action: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  user_role: string;
  details: string;
  prev_hash?: string;
  entry_hash?: string;
  digital_signature?: string;
  created_at: string;
}

export interface Centre {
  id: string;
  name: string;
  block: string;
  district: string;
  is_stale: boolean;
  lat?: number;
  lng?: number;
}

export interface MedicineStockInfo {
  medicine_id: string;
  medicine_name: string;
  quantity: number;
  unit: string;
  status: 'IN_STOCK' | 'LOW_STOCK' | 'CRITICAL' | 'OUT_OF_STOCK';
  days_of_cover?: number | null;
  tier?: string;
  price_inr?: string;
}

export interface MapLocationItem {
  id: string;
  name: string;
  type: 'phc' | 'chc' | 'sub_centre' | 'pharmacy';
  type_label: string;
  category: 'FACILITY' | 'PHARMACY';
  address: string;
  block?: string;
  district: string;
  lat: number;
  lng: number;
  phone?: string;
  is_stale?: boolean;
  registration_number?: string;
  data_source?: string;
  verified?: boolean;
  total_stock_count: number;
  distinct_medicines_count: number;
  critical_shortages_count?: number;
  selected_medicine_stock?: number;
  medicines: MedicineStockInfo[];
  directions_url?: string;
}

export interface Medicine {
  id: string;
  name: string;
  unit: string;
  essential: boolean;
}

export interface MatrixCell {
  medicine_id: string;
  medicine_name: string;
  unit: string;
  stock: number;
  tier: UrgencyTier;
  days_of_cover: number;
  trend: number;
  trend_pct: number;
  velocity: number;
  predicted_date: string;
  urgency: number;
  is_stale: boolean;
  essential: boolean;
}

export interface MatrixRow {
  centre_id: string;
  centre_name: string;
  block: string;
  district: string;
  is_stale: boolean;
  cells: MatrixCell[];
}

export interface ActTodayItem {
  alert_id: string;
  centre_id: string;
  centre_name: string;
  medicine_id: string;
  medicine_name: string;
  unit: string;
  tier: UrgencyTier;
  urgency: number;
  days_of_cover: number;
  latest_safe_action_date: string;
  recommended_order_qty: number;
  reason: string;
  reason_ta: string;
  status: string;
}

export interface MatrixData {
  medicines: { id: string; name: string; unit: string }[];
  rows: MatrixRow[];
  act_today: ActTodayItem[];
}

export interface AlertItem {
  id: string;
  centre_id: string;
  centre_name: string;
  block: string;
  medicine_id: string;
  medicine_name: string;
  unit: string;
  stock: number;
  velocity: number;
  trend: number;
  trend_pct: number;
  tier: UrgencyTier;
  urgency: number;
  probability: number;
  predicted_date: string;
  range_low: string;
  range_high: string;
  latest_safe_action_date: string;
  recommended_order_qty: number;
  patient_impact: number;
  reason: string;
  reason_ta: string;
  status: string;
  created_at: string;
}

export interface KPIData {
  centres_at_risk: number;
  total_centres: number;
  critical_items: number;
  avg_days_of_cover: number;
  early_warning_lead_time_gained: string;
  median_time_to_acknowledge: string;
  alerts_acted_before_stockout_pct: number;
  stockouts_averted_count: number;
}

export interface ForecastDetailData {
  centre: Centre;
  medicine: Medicine;
  current_stock: number;
  velocity: number;
  trend: number;
  trend_pct: number;
  safety_stock: number;
  days_of_cover: number;
  spike_detected: boolean;
  spike_date: string | null;
  tier: UrgencyTier;
  urgency: number;
  probability: number;
  predicted_stockout_date: string;
  range_low: string;
  range_high: string;
  next_indent_date: string;
  lead_time_days: number;
  next_delivery_marker: string;
  action_window_days: number;
  latest_safe_action_date: string;
  recommended_order_qty: number;
  patient_impact: number;
  reason: string;
  reason_ta: string;
  history_curve: { date: string; stock: number; consumption: number }[];
  forecast_projection: {
    date: string;
    day_offset: number;
    projected_stock: number;
    band_high: number;
    band_low: number;
  }[];
  expiry_batches: {
    batch: string;
    qty: number;
    expiry: string;
    status: string;
  }[];
}

export interface DonorCandidate {
  donor_id: string;
  donor_name: string;
  block: string;
  current_stock: number;
  safety_stock: number;
  velocity: number;
  surplus: number;
  distance_km: number;
  road_time_mins: number;
  batch: string;
  expiry: string;
  lat: number;
  lng: number;
  transfer_qty?: number;
  donor_stock_before?: number;
  donor_days_of_cover_before?: number;
  donor_tier_before?: UrgencyTier;
  stock_after_transfer?: number;
  days_of_cover_after?: number;
  tier_after_transfer?: UrgencyTier;
  recipient_stock_before?: number;
  recipient_days_of_cover_before?: number;
  recipient_tier_before?: UrgencyTier;
  recipient_stock_after?: number;
  recipient_days_of_cover_after?: number;
  recipient_tier_after?: UrgencyTier;
  days_of_cover_gained?: number;
}

export interface TransferSuggestionsData {
  shortage_centre: {
    id: string;
    name: string;
    lat: number;
    lng: number;
    current_stock: number;
    needed_qty: number;
    velocity?: number;
    days_of_cover?: number;
    tier?: UrgencyTier;
  };
  medicine: {
    id: string;
    name: string;
    unit: string;
  };
  total_transferable: number;
  remaining_shortfall: number;
  suggested_donors: DonorCandidate[];
  all_ranked_donors: DonorCandidate[];
}

export interface BacktestEvent {
  id: string;
  centre: string;
  medicine: string;
  stockout_date: string;
  stockwatch_warned_date: string;
  stockwatch_lead_days: number;
  threshold_warned_date: string;
  threshold_lead_days: number;
  lead_time_gained: number;
  status: string;
  actual_shortfall_bottles: number;
  root_cause: string;
}

export interface BacktestData {
  headline: string;
  mean_lead_days_gained: number;
  stockouts_averted: number;
  mape_stockout_day: number;
  precision: number;
  recall: number;
  false_alarm_rate: number;
  total_evaluated_cycles: number;
  comparison_bars: {
    metric: string;
    stockwatch_lead: number;
    threshold_lead: number;
  }[];
  historical_events: BacktestEvent[];
}
