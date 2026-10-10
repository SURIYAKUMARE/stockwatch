// ─── Auth & User Types ───────────────────────────────────────────────────────
// Re-export UserRole from the canonical types to avoid duplication.
export type { UserRole } from '../types';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  /** centre_id / pharmacy_id / district / state depending on role */
  scopeId?: string;
  scopeName?: string;
  avatarInitials: string;
  /** demo account flag — shown clearly in UI */
  isDemo: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  /** extra fields depending on role */
  phone?: string;
  pharmacyName?: string;
  licenceNumber?: string;
  facilityName?: string;
  facilityCode?: string;
  district?: string;
  state?: string;
  consentGiven: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// ─── Demo accounts seeded client-side for Phase 2 ───────────────────────────
// Phase 3 replaces these with real JWT from the backend.

const patientAccount = {
  id: 'demo_patient_01',
  name: 'Kavitha Murugan',
  email: 'patient@demo.tn.gov.in',
  password: 'demo123',
  role: 'patient' as const,
  scopeName: 'Coimbatore',
  avatarInitials: 'KM',
  isDemo: true,
};

const pharmaAccount = {
  id: 'demo_pharm_01',
  name: 'Suresh Pharmacist',
  email: 'pharmacist@demo.tn.gov.in',
  password: 'demo123',
  role: 'pharmacist' as const,
  scopeId: 'pharma_valparai_01',
  scopeName: 'Valparai Medical Store',
  avatarInitials: 'SP',
  isDemo: true,
};

const chcAccount = {
  id: 'demo_fac_01',
  name: 'Dr. Priya Facility',
  email: 'chc@demo.tn.gov.in',
  password: 'demo123',
  role: 'facility' as const,
  scopeId: 'phc_valparai',
  scopeName: 'PHC Valparai',
  avatarInitials: 'PF',
  isDemo: true,
};

const districtAccount = {
  id: 'demo_dist_01',
  name: 'Dr. Rajesh Kumar',
  email: 'district@demo.tn.gov.in',
  password: 'demo123',
  role: 'district_officer' as const,
  scopeId: 'dist_coimbatore',
  scopeName: 'Coimbatore District',
  avatarInitials: 'RK',
  isDemo: true,
};

const stateAccount = {
  id: 'demo_state_01',
  name: 'Dr. Meena Sundaram',
  email: 'state@demo.tn.gov.in',
  password: 'demo123',
  role: 'state_officer' as const,
  scopeId: 'state_tn',
  scopeName: 'Tamil Nadu',
  avatarInitials: 'MS',
  isDemo: true,
};

const nationalAccount = {
  id: 'demo_nat_01',
  name: 'Dr. Arjun Verma',
  email: 'national@demo.tn.gov.in',
  password: 'demo123',
  role: 'national_officer' as const,
  scopeName: 'India',
  avatarInitials: 'AV',
  isDemo: true,
};

export const DEMO_ACCOUNTS: Record<string, AuthUser & { password: string }> = {
  // Username keys
  'patient_demo': patientAccount,
  'pharma_demo': pharmaAccount,
  'chc_demo': chcAccount,
  'district_demo': districtAccount,
  'state_demo': stateAccount,
  'national_demo': nationalAccount,

  // Gov email keys
  'patient@demo.tn.gov.in': patientAccount,
  'pharmacist@demo.tn.gov.in': pharmaAccount,
  'chc@demo.tn.gov.in': chcAccount,
  'district@demo.tn.gov.in': districtAccount,
  'state@demo.tn.gov.in': stateAccount,
  'national@demo.tn.gov.in': nationalAccount,

  // Stockwatch email keys
  'patient@demo.stockwatch': patientAccount,
  'pharmacist@demo.stockwatch': pharmaAccount,
  'facility@demo.stockwatch': chcAccount,
  'district@demo.stockwatch': districtAccount,
  'state@demo.stockwatch': stateAccount,
  'national@demo.stockwatch': nationalAccount,

  // Short role aliases
  'patient': patientAccount,
  'pharmacist': pharmaAccount,
  'facility': chcAccount,
  'chc': chcAccount,
  'district': districtAccount,
  'state': stateAccount,
  'national': nationalAccount,
};
