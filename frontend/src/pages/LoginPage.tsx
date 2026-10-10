import React, { useState } from 'react';
import {
  HeartPulse,
  Eye,
  EyeOff,
  Lock,
  Mail,
  LogIn,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface LoginPageProps {
  onGoToLanding: () => void;
  onGoToRegister: () => void;
}

// Quick-fill demo credentials
const DEMO_PRESETS = [
  { label: 'District Officer', email: 'district_demo' },
  { label: 'Facility / CHC', email: 'chc_demo' },
  { label: 'Pharmacist', email: 'pharma_demo' },
  { label: 'State Officer', email: 'state_demo' },
  { label: 'National Officer', email: 'national_demo' },
  { label: 'Patient', email: 'patient_demo' },
];

export function LoginPage({ onGoToLanding, onGoToRegister }: LoginPageProps) {
  const { login, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formErrors, setFormErrors] = useState<{ email?: string; password?: string }>({});

  const validate = () => {
    const errs: typeof formErrors = {};
    if (!email.trim()) errs.email = 'Username or email is required.';
    if (!password) errs.password = 'Password is required.';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!validate()) return;
    await login({ email: email.trim(), password, rememberMe });
  };

  const fillDemo = (preset: typeof DEMO_PRESETS[0]) => {
    setEmail(preset.email);
    setPassword('demo123');
    clearError();
    setFormErrors({});
  };

  return (
    <div className="min-h-screen bg-[#F7F9FB] flex flex-col lg:flex-row">
      {/* ── Left panel: branding / illustration ── */}
      <div className="hidden lg:flex lg:w-[55%] bg-gradient-to-br from-[#0F6B6B] to-[#0a4f4f] text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-56 h-56 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        {/* Brand */}
        <div>
          <button
            onClick={onGoToLanding}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <HeartPulse size={22} className="text-white" />
            </div>
            <div>
              <div className="text-lg font-bold tracking-tight">StockWatch PHC</div>
              <div className="text-xs text-teal-200">Medicine Supply Early-Warning</div>
            </div>
          </button>
        </div>

        {/* Headline */}
        <div className="space-y-4 relative z-10">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight">
            One Network.<br />Smarter Medicine Supply.
          </h2>
          <p className="text-teal-100 text-sm leading-relaxed max-w-sm">
            Predict shortages early. Coordinate supplies. Help keep essential medicines available across every Primary Health Centre.
          </p>

          {/* Feature bullets */}
          <ul className="space-y-2 pt-2">
            {[
              'Velocity & acceleration-based forecasting',
              'Six role-specific dashboards',
              'Inter-facility transfer recommendations',
              'Offline stock-entry with auto-sync',
              'English and Tamil interface',
            ].map(f => (
              <li key={f} className="flex items-center gap-2 text-xs text-teal-100">
                <CheckCircle2 size={13} className="text-teal-300 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* SDG badge */}
        <div className="text-[11px] text-teal-300 font-semibold">
          Sakthi Hackfest '26 · Problem Statement 6 · SDG 3: Good Health & Well-Being
        </div>
      </div>

      {/* ── Right panel: login card ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center justify-between mb-2">
            <button
              onClick={onGoToLanding}
              className="flex items-center gap-1.5 text-xs text-[#5B6B7A] hover:text-[#14202B]"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#0F6B6B] flex items-center justify-center">
                <HeartPulse size={14} className="text-white" />
              </div>
              <span className="text-sm font-bold text-[#14202B]">StockWatch PHC</span>
            </div>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl border border-[#E3E8EE] shadow-xl p-8 space-y-6">
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-[#14202B]">Sign in to your account</h1>
              <p className="text-xs text-[#5B6B7A]">
                Enter your registered email and password to continue.
              </p>
            </div>

            {/* Demo quick-fill pills */}
            <div className="space-y-2">
              <div className="text-[10px] font-semibold text-[#5B6B7A] uppercase tracking-wider">
                Quick demo login
              </div>
              <div className="flex flex-wrap gap-1.5">
                {DEMO_PRESETS.map(p => (
                  <button
                    key={p.email}
                    type="button"
                    onClick={() => fillDemo(p)}
                    className="px-2.5 py-1 text-[10px] font-semibold rounded-full border border-[#E3E8EE] text-[#5B6B7A] hover:border-[#0F6B6B] hover:text-[#0F6B6B] hover:bg-teal-50 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Error banner */}
            {error && (
              <div className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                <AlertCircle size={15} className="text-red-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {/* Username or Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#14202B]" htmlFor="login-email">
                  Username or Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B7A]" />
                  <input
                    id="login-email"
                    type="text"
                    autoComplete="username"
                    value={email}
                    onChange={e => { setEmail(e.target.value); clearError(); }}
                    placeholder="e.g. district_demo or district@demo.tn.gov.in"
                    className={`w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border bg-[#F7F9FB] text-[#14202B] focus:outline-none focus:ring-2 focus:ring-[#0F6B6B] focus:border-[#0F6B6B] transition-colors ${
                      formErrors.email ? 'border-red-400' : 'border-[#E3E8EE]'
                    }`}
                  />
                </div>
                {formErrors.email && (
                  <p className="text-[11px] text-red-600">{formErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#14202B]" htmlFor="login-pw">
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-[11px] text-[#0F6B6B] hover:underline"
                    onClick={() => alert('Password reset not implemented in demo.')}
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B7A]" />
                  <input
                    id="login-pw"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); clearError(); }}
                    placeholder="••••••••"
                    className={`w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border bg-[#F7F9FB] text-[#14202B] focus:outline-none focus:ring-2 focus:ring-[#0F6B6B] focus:border-[#0F6B6B] transition-colors ${
                      formErrors.password ? 'border-red-400' : 'border-[#E3E8EE]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5B6B7A] hover:text-[#14202B]"
                    aria-label={showPw ? 'Hide password' : 'Show password'}
                  >
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-[11px] text-red-600">{formErrors.password}</p>
                )}
              </div>

              {/* Remember me */}
              <label className="flex items-center gap-2.5 text-xs text-[#14202B] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-[#E3E8EE] accent-[#0F6B6B]"
                />
                Remember me on this device
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-[#0F6B6B] hover:bg-[#0a4f4f] text-white font-bold text-sm rounded-xl transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isLoading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <LogIn size={16} />
                )}
                {isLoading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="text-xs text-center text-[#5B6B7A]">
              Don't have an account?{' '}
              <button
                onClick={onGoToRegister}
                className="font-semibold text-[#0F6B6B] hover:underline"
              >
                Register here
              </button>
            </p>
          </div>

          {/* Decision-support note */}
          <p className="text-[10px] text-center text-[#5B6B7A] px-4 leading-relaxed">
            StockWatch PHC is a decision-support tool. All replenishment actions require authorized officer approval. Forecasts are estimates.
          </p>
        </div>
      </div>
    </div>
  );
}
