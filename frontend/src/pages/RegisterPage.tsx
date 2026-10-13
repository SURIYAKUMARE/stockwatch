import React, { useState } from 'react';
import {
  HeartPulse,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
  Phone,
  Building2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  RefreshCw,
  Info,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { UserRole } from '../types/auth';

interface RegisterPageProps {
  onGoToLogin: () => void;
  onGoToLanding: () => void;
}

type PublicRole = 'patient' | 'pharmacist' | 'facility';

const ROLE_OPTIONS: { value: PublicRole; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: 'patient',
    label: 'Patient / Customer',
    desc: 'Search nearby medicine availability',
    icon: <User size={18} />,
  },
  {
    value: 'pharmacist',
    label: 'Pharmacist / Pharmacy',
    desc: 'Manage pharmacy inventory and alerts',
    icon: <Building2 size={18} />,
  },
  {
    value: 'facility',
    label: 'Health Facility Staff',
    desc: 'PHC / CHC / Sub-Centre stock management',
    icon: <HeartPulse size={18} />,
  },
];

const OFFICER_NOTE =
  'District, State, and National officer accounts are created through an authorized administrative process. Contact your health department for access.';

export function RegisterPage({ onGoToLogin, onGoToLanding }: RegisterPageProps) {
  const { register, isLoading, error, clearError } = useAuth();

  const [selectedRole, setSelectedRole] = useState<PublicRole>('patient');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pharmacyName, setPharmacyName] = useState('');
  const [licenceNumber, setLicenceNumber] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [facilityCode, setFacilityCode] = useState('');
  const [district, setDistrict] = useState('');
  const [state, setState] = useState('');
  const [consent, setConsent] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Full name is required.';
    if (!email.trim()) errs.email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Invalid email format.';
    if (!password) errs.password = 'Password is required.';
    else if (password.length < 8) errs.password = 'Must be at least 8 characters.';
    if (password !== confirmPw) errs.confirmPw = 'Passwords do not match.';
    if (selectedRole === 'pharmacist') {
      if (!pharmacyName.trim()) errs.pharmacyName = 'Pharmacy name is required.';
      if (!licenceNumber.trim()) errs.licenceNumber = 'Licence number is required.';
    }
    if (selectedRole === 'facility') {
      if (!facilityName.trim()) errs.facilityName = 'Facility name is required.';
      if (!facilityCode.trim()) errs.facilityCode = 'Facility code is required.';
    }
    if (!consent) errs.consent = 'You must accept the privacy notice to register.';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!validate()) return;
    await register({
      name: name.trim(),
      email: email.trim(),
      password,
      role: selectedRole as UserRole,
      phone: phone.trim() || undefined,
      pharmacyName: pharmacyName.trim() || undefined,
      licenceNumber: licenceNumber.trim() || undefined,
      facilityName: facilityName.trim() || undefined,
      facilityCode: facilityCode.trim() || undefined,
      district: district.trim() || undefined,
      state: state.trim() || undefined,
      consentGiven: consent,
    });
  };

  const Field = ({
    id, label, value, onChange, type = 'text', placeholder, error: fe, icon: Icon, optional,
  }: {
    id: string; label: string; value: string; onChange: (v: string) => void;
    type?: string; placeholder?: string; error?: string; icon?: React.ElementType; optional?: boolean;
  }) => (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-[#14202B]" htmlFor={id}>
        {label}{optional && <span className="text-[#5B6B7A] font-normal ml-1">(optional)</span>}
      </label>
      <div className="relative">
        {Icon && <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B7A]" />}
        <input
          id={id}
          type={type}
          value={value}
          onChange={e => { onChange(e.target.value); clearError(); }}
          placeholder={placeholder}
          className={`w-full ${Icon ? 'pl-9' : 'pl-3'} pr-3 py-2.5 text-sm rounded-xl border bg-[#F7F9FB] text-[#14202B] focus:outline-none focus:ring-2 focus:ring-[#0F6B6B] transition-colors ${
            fe ? 'border-red-400' : 'border-[#E3E8EE]'
          }`}
        />
      </div>
      {fe && <p className="text-[11px] text-red-600">{fe}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F9FB] flex flex-col lg:flex-row">
      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex lg:w-[40%] bg-gradient-to-br from-[#0F6B6B] to-[#0a4f4f] flex-col justify-between p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <button
          onClick={onGoToLanding}
          className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
        >
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <HeartPulse size={22} />
          </div>
          <div>
            <div className="text-lg font-bold">StockWatch PHC</div>
            <div className="text-xs text-teal-200">Medicine Supply Network</div>
          </div>
        </button>

        <div className="space-y-4 relative z-10">
          <h2 className="text-2xl font-extrabold leading-tight">
            Join the network.<br />Help prevent stock-outs.
          </h2>
          <p className="text-teal-100 text-sm leading-relaxed">
            Patients find medicines. Pharmacists manage inventory. Health facility staff track stock and get early warnings. Together, we keep essential medicines available.
          </p>
        </div>

        <div className="text-[11px] text-teal-300 font-semibold">
          National Health Mission · Production Platform · SDG 3
        </div>
      </div>

      {/* ── Right: form ── */}
      <div className="flex-1 flex items-start justify-center px-6 py-10 overflow-y-auto">
        <div className="w-full max-w-lg space-y-6">
          {/* Back */}
          <button
            onClick={onGoToLogin}
            className="flex items-center gap-1.5 text-xs text-[#5B6B7A] hover:text-[#14202B] lg:hidden"
          >
            <ArrowLeft size={14} />
            Back to login
          </button>

          <div className="bg-white rounded-2xl border border-[#E3E8EE] shadow-xl p-8 space-y-6">
            <div>
              <h1 className="text-xl font-bold text-[#14202B]">Create your account</h1>
              <p className="text-xs text-[#5B6B7A] mt-1">
                Already have an account?{' '}
                <button onClick={onGoToLogin} className="text-[#0F6B6B] font-semibold hover:underline">
                  Sign in
                </button>
              </p>
            </div>

            {/* Role selector */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#14202B]">Register as</div>
              <div className="grid grid-cols-3 gap-2">
                {ROLE_OPTIONS.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setSelectedRole(r.value)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedRole === r.value
                        ? 'border-[#0F6B6B] bg-teal-50 text-[#0F6B6B]'
                        : 'border-[#E3E8EE] text-[#5B6B7A] hover:border-[#0F6B6B]'
                    }`}
                  >
                    <div className="mb-1">{r.icon}</div>
                    <div className="text-[11px] font-bold">{r.label}</div>
                    <div className="text-[10px] mt-0.5 opacity-70">{r.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Officer accounts note */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-800">
              <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <span>{OFFICER_NOTE}</span>
            </div>

            {/* API error */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Common fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field id="reg-name" label="Full name" value={name} onChange={setName}
                  placeholder="Dr. / Mr. / Ms. …" error={formErrors.name} icon={User} />
                <Field id="reg-email" label="Email address" value={email} onChange={setEmail}
                  type="email" placeholder="you@example.com" error={formErrors.email} icon={Mail} />
              </div>

              <Field id="reg-phone" label="Phone number" value={phone} onChange={setPhone}
                type="tel" placeholder="+91 98765 43210" icon={Phone} optional />

              {/* Role-specific fields */}
              {selectedRole === 'pharmacist' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-teal-50 border border-teal-200 rounded-xl">
                  <div className="md:col-span-2 text-xs font-semibold text-[#0F6B6B]">
                    Pharmacy Details
                  </div>
                  <Field id="reg-pharma-name" label="Pharmacy / Shop name" value={pharmacyName}
                    onChange={setPharmacyName} placeholder="e.g. Valparai Medical Store"
                    error={formErrors.pharmacyName} icon={Building2} />
                  <Field id="reg-licence" label="Licence / Registration number" value={licenceNumber}
                    onChange={setLicenceNumber} placeholder="TN-CDSCO-XXXXX"
                    error={formErrors.licenceNumber} />
                </div>
              )}

              {selectedRole === 'facility' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-teal-50 border border-teal-200 rounded-xl">
                  <div className="md:col-span-2 text-xs font-semibold text-[#0F6B6B]">
                    Facility Details
                  </div>
                  <Field id="reg-fac-name" label="Facility name" value={facilityName}
                    onChange={setFacilityName} placeholder="PHC Valparai"
                    error={formErrors.facilityName} icon={HeartPulse} />
                  <Field id="reg-fac-code" label="Facility code" value={facilityCode}
                    onChange={setFacilityCode} placeholder="TN-CBE-PHC-001"
                    error={formErrors.facilityCode} />
                  <Field id="reg-district" label="District" value={district}
                    onChange={setDistrict} placeholder="Coimbatore" optional />
                  <Field id="reg-state" label="State" value={state}
                    onChange={setState} placeholder="Tamil Nadu" optional />
                </div>
              )}

              {/* Password */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#14202B]" htmlFor="reg-pw">Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B7A]" />
                    <input
                      id="reg-pw"
                      type={showPw ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); clearError(); }}
                      placeholder="Min 8 characters"
                      className={`w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border bg-[#F7F9FB] text-[#14202B] focus:outline-none focus:ring-2 focus:ring-[#0F6B6B] ${formErrors.password ? 'border-red-400' : 'border-[#E3E8EE]'}`}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6B7A]">
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {formErrors.password && <p className="text-[11px] text-red-600">{formErrors.password}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#14202B]" htmlFor="reg-cpw">Confirm password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B7A]" />
                    <input
                      id="reg-cpw"
                      type={showPw ? 'text' : 'password'}
                      value={confirmPw}
                      onChange={e => setConfirmPw(e.target.value)}
                      placeholder="Repeat password"
                      className={`w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border bg-[#F7F9FB] text-[#14202B] focus:outline-none focus:ring-2 focus:ring-[#0F6B6B] ${formErrors.confirmPw ? 'border-red-400' : 'border-[#E3E8EE]'}`}
                    />
                  </div>
                  {formErrors.confirmPw && <p className="text-[11px] text-red-600">{formErrors.confirmPw}</p>}
                </div>
              </div>

              {/* Consent */}
              <div className="space-y-1">
                <label className="flex items-start gap-2.5 text-xs text-[#14202B] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={e => setConsent(e.target.checked)}
                    className="w-4 h-4 mt-0.5 rounded border-[#E3E8EE] accent-[#0F6B6B] shrink-0"
                  />
                  <span>
                    I agree to the{' '}
                    <button type="button" className="text-[#0F6B6B] font-semibold underline" onClick={() => alert('Privacy notice: This is a demo system. No real patient data is collected.')}>
                      Privacy Notice
                    </button>
                    {' '}and understand this is a decision-support tool only. All clinical decisions require authorized officer approval.
                  </span>
                </label>
                {formErrors.consent && <p className="text-[11px] text-red-600 ml-6">{formErrors.consent}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#0F6B6B] hover:bg-[#0a4f4f] text-white font-bold text-sm rounded-xl transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isLoading ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                {isLoading ? 'Creating account…' : 'Create account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
