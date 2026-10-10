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

export const DEMO_ACCOUNTS: Record<string, AuthUser & { password: string }> = {
  'patient@demo.stockwatch': {
    id: 'demo_patient_01',
    name: 'Kavitha Murugan',
    email: 'patient@demo.stockwatch',
    password: 'demo1234',
    role: 'patient',
    scopeName: 'Coimbatore',
    avatarInitials: 'KM',
    isDemo: true,
  },
  'pharmacist@demo.stockwatch': {
    id: 'demo_pharm_01',
    name: 'Suresh Pharmacist',
    email: 'pharmacist@demo.stockwatch',
    password: 'demo1234',
    role: 'pharmacist',
    scopeId: 'pharma_valparai_01',
    scopeName: 'Valparai Medical Store',
    avatarInitials: 'SP',
    isDemo: true,
  },
  'facility@demo.stockwatch': {
    id: 'demo_fac_01',
    name: 'Dr. Priya Facility',
    email: 'facility@demo.stockwatch',
    password: 'demo1234',
    role: 'facility',
    scopeId: 'phc_valparai',
    scopeName: 'PHC Valparai',
    avatarInitials: 'PF',
    isDemo: true,
  },
  'district@demo.stockwatch': {
    id: 'demo_dist_01',
    name: 'Dr. Rajesh Kumar',
    email: 'district@demo.stockwatch',
    password: 'demo1234',
    role: 'district_officer',
    scopeId: 'dist_coimbatore',
    scopeName: 'Coimbatore District',
    avatarInitials: 'RK',
    isDemo: true,
  },
  'state@demo.stockwatch': {
    id: 'demo_state_01',
    name: 'Dr. Meena Sundaram',
    email: 'state@demo.stockwatch',
    password: 'demo1234',
    role: 'state_officer',
    scopeId: 'state_tn',
    scopeName: 'Tamil Nadu',
    avatarInitials: 'MS',
    isDemo: true,
  },
  'national@demo.stockwatch': {
    id: 'demo_nat_01',
    name: 'Dr. Arjun Verma',
    email: 'national@demo.stockwatch',
    password: 'demo1234',
    role: 'national_officer',
    scopeName: 'India',
    avatarInitials: 'AV',
    isDemo: true,
  },
};
