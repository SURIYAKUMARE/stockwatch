import React, { useState } from 'react';
import {
  X,
  Eye,
  EyeOff,
  ShieldCheck,
  Activity,
  User,
  Building2,
  Lock,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { AuthUser, UserRole } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AuthUser, token: string) => void;
  onOpenRegister: () => void;
  defaultRole?: string;
}

const DEMO_ACCOUNTS = [
  { role: 'patient' as UserRole, name: 'Patient / Customer', username: 'patient_demo', label: 'Patient', icon: '👤' },
  { role: 'pharmacist' as UserRole, name: 'Retail Pharmacist', username: 'pharma_demo', label: 'Pharmacist', icon: '💊' },
  { role: 'chc_facility' as UserRole, name: 'CHC / Health Facility', username: 'chc_demo', label: 'Facility / CHC', icon: '🏥' },
  { role: 'district_officer' as UserRole, name: 'District Health Officer', username: 'district_demo', label: 'District Officer', icon: '🛡️' },
  { role: 'state_officer' as UserRole, name: 'State Health Officer', username: 'state_demo', label: 'State Officer', icon: '🏛️' },
  { role: 'national_officer' as UserRole, name: 'National Health Officer', username: 'national_demo', label: 'National Officer', icon: '🇮🇳' },
];

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onOpenRegister,
  defaultRole
}) => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (overrideUsername?: string) => {
    const userToLogin = overrideUsername || usernameOrEmail;
    if (!userToLogin.trim()) {
      setErrorMsg('Please enter your username or registered email');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your password');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username_or_email: userToLogin.trim(),
          password: password
        })
      });

      if (res.ok) {
        const data = await res.json();
        localStorage.setItem('stockwatch_token', data.access_token);
        localStorage.setItem('stockwatch_user', JSON.stringify(data.user));

        const roleMap: Record<string, string> = {
          patient: 'patient',
          pharmacist: 'pharmacist',
          chc_facility: 'facility',
          facility: 'facility',
          district_officer: 'district_officer',
          state_officer: 'state_officer',
          national_officer: 'national_officer',
        };
        const authUser = {
          id: data.user.id,
          name: data.user.name || data.user.username,
          email: data.user.email || data.user.username,
          role: roleMap[data.user.role] || 'facility',
          scopeId: data.user.scopes?.facility_id || data.user.scopes?.pharmacy_id || data.user.centre_id,
          scopeName: data.user.scopes?.district_id || data.user.scopes?.state_id,
          avatarInitials: (data.user.name || data.user.username || 'SW').slice(0, 2).toUpperCase(),
          isDemo: data.user.username?.endsWith('_demo') ?? true,
        };
        localStorage.setItem('sw_session_v3', JSON.stringify({ user: authUser, token: data.access_token }));

        onLoginSuccess(data.user, data.access_token);
        onClose();
        return;
      }

      // Check demo fallback on non-200
      const demoMatch = DEMO_ACCOUNTS.find(
        d => d.username === userToLogin.trim().toLowerCase() ||
             userToLogin.toLowerCase().includes(d.role)
      );
      if (demoMatch && (password === 'demo123' || password === 'demo1234')) {
        const fallbackUser: AuthUser = {
          id: `demo_${demoMatch.role}`,
          name: demoMatch.name,
          email: `${demoMatch.username}@demo.tn.gov.in`,
          username: demoMatch.username,
          role: demoMatch.role,
          scopes: { state_id: 'TN', district_id: 'coimbatore' }
        };
        const token = `demo_token_${demoMatch.role}_${Date.now()}`;
        localStorage.setItem('stockwatch_token', token);
        localStorage.setItem('stockwatch_user', JSON.stringify(fallbackUser));
        onLoginSuccess(fallbackUser, token);
        onClose();
        return;
      }

      let errDetail = 'Login failed. Please check your credentials.';
      try {
        const data = await res.json();
        errDetail = data.detail || errDetail;
      } catch { /* ignore */ }
      setErrorMsg(errDetail);
    } catch (e) {
      // Network offline or failed — check demo fallback
      const demoMatch = DEMO_ACCOUNTS.find(
        d => d.username === userToLogin.trim().toLowerCase() ||
             userToLogin.toLowerCase().includes(d.role)
      );
      if (demoMatch && (password === 'demo123' || password === 'demo1234')) {
        const fallbackUser: AuthUser = {
          id: `demo_${demoMatch.role}`,
          name: demoMatch.name,
          email: `${demoMatch.username}@demo.tn.gov.in`,
          username: demoMatch.username,
          role: demoMatch.role,
          scopes: { state_id: 'TN', district_id: 'coimbatore' }
        };
        const token = `demo_token_${demoMatch.role}_${Date.now()}`;
        localStorage.setItem('stockwatch_token', token);
        localStorage.setItem('stockwatch_user', JSON.stringify(fallbackUser));
        onLoginSuccess(fallbackUser, token);
        onClose();
      } else {
        setErrorMsg('Network error connecting to auth server.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickDemo = (uname: string) => {
    setUsernameOrEmail(uname);
    setPassword('demo123');
    handleLogin(uname);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-[#E3E8EE] shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        {/* Left Side: Brand Visual & Supply Chain Preview */}
        <div className="md:w-5/12 bg-linear-to-br from-[#0F6B6B] to-[#0A4B4B] text-white p-8 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-white backdrop-blur-xs border border-white/20">
                <Activity size={22} className="stroke-[2.5]" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-white">
                StockWatch PHC
              </span>
            </div>

            <h2 className="text-xl md:text-2xl font-black leading-tight tracking-tight text-white">
              One Network.
              <br />
              Smarter Medicine Supply.
            </h2>
            <p className="mt-3 text-xs text-teal-100/90 leading-relaxed">
              Predict shortages early. Coordinate supplies. Help keep essential medicines available at every Primary Health Centre.
            </p>

            <div className="mt-6 space-y-2.5 text-xs text-teal-50">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-300 shrink-0" />
                <span>EWMA-Driven Velocity Forecasting</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-300 shrink-0" />
                <span>Inter-Facility Transfer Optimization</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-300 shrink-0" />
                <span>Clinical Decision Support with Officer Authorization</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 mt-6 border-t border-white/15 text-[11px] text-teal-200">
            Government of Tamil Nadu · Health & Family Welfare
          </div>
        </div>

        {/* Right Side: Clean Login Card */}
        <div className="md:w-7/12 p-8 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE] mb-5">
              <div>
                <h3 className="font-bold text-lg text-[#14202B]">Sign In</h3>
                <p className="text-xs text-[#5B6B7A]">Access authorized portal dashboards</p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-[#5B6B7A] transition"
              >
                <X size={18} />
              </button>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-[#C62828] flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Quick Demo 1-Click Role Switcher */}
            <div className="mb-5 bg-slate-50 border border-[#E3E8EE] rounded-xl p-3">
              <span className="text-[11px] font-bold text-[#5B6B7A] block mb-2">
                Quick Demo 1-Click Access (Password: demo123):
              </span>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => handleQuickDemo(acc.username)}
                    className="text-[11px] px-2 py-1.5 rounded-lg border border-[#E3E8EE] bg-white hover:border-[#0F6B6B] hover:text-[#0F6B6B] font-medium text-left truncate transition flex items-center gap-1.5 shadow-3xs"
                  >
                    <span>{acc.icon}</span>
                    <span className="truncate">{acc.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Login Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="space-y-3.5"
            >
              <div>
                <label className="block text-xs font-semibold text-[#14202B] mb-1">
                  Email or Registered Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    placeholder="e.g. district_demo or dr_rajesh_ddhs"
                    className="w-full text-xs border border-[#E3E8EE] rounded-lg p-2.5 pr-8 bg-white focus:outline-none focus:border-[#0F6B6B]"
                    required
                  />
                  <User size={15} className="absolute right-2.5 top-3 text-[#5B6B7A]" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#14202B] mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs border border-[#E3E8EE] rounded-lg p-2.5 pr-8 bg-white focus:outline-none focus:border-[#0F6B6B]"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-3 text-[#5B6B7A] hover:text-[#14202B]"
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-1.5 text-[#5B6B7A] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-[#E3E8EE] text-[#0F6B6B]"
                  />
                  <span>Remember me</span>
                </label>
                <a
                  href="#forgot"
                  onClick={(e) => {
                    e.preventDefault();
                    alert('Password reset link has been dispatched to authorized nodal officer email.');
                  }}
                  className="text-[#0F6B6B] font-semibold hover:underline"
                >
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 rounded-lg bg-[#0F6B6B] hover:bg-teal-800 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition flex items-center justify-center gap-2 mt-2"
              >
                {isLoading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="pt-4 border-t border-[#E3E8EE] text-center text-xs text-[#5B6B7A] mt-5">
            Don't have an account?{' '}
            <button
              onClick={() => {
                onClose();
                onOpenRegister();
              }}
              className="text-[#0F6B6B] font-bold hover:underline"
            >
              Register here
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
