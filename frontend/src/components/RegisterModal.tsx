import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Building2, User, ShieldCheck } from 'lucide-react';
import { UserRole } from '../types';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RegisterModal: React.FC<RegisterModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [tab, setTab] = useState<'patient' | 'pharmacy' | 'facility'>('patient');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [extraField, setExtraField] = useState(''); // Address or Facility Code
  const [consent, setConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === 'patient' && !consent) {
      setErrorMsg('You must agree to the patient privacy notice.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const roleToRegister: UserRole =
        tab === 'patient' ? 'patient' : tab === 'pharmacy' ? 'pharmacist' : 'chc_facility';

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          username: username.trim().toLowerCase(),
          email: email.trim().toLowerCase(),
          password,
          role: roleToRegister,
          registration_number: tab === 'pharmacy' ? extraField : undefined,
          facility_id: tab === 'facility' ? extraField : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.detail || 'Registration failed. Please check your details.');
        return;
      }

      setSuccessMsg('Account registered successfully! You can now sign in with your credentials.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setErrorMsg('Network error connecting to registration server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl border border-[#E3E8EE] shadow-2xl max-w-lg w-full p-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#E3E8EE] mb-4">
          <div>
            <h3 className="font-bold text-base text-[#14202B]">Register for StockWatch PHC</h3>
            <p className="text-xs text-[#5B6B7A]">Select account type to connect to the supply network</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-[#5B6B7A]"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg mb-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab('patient')}
            className={`py-1.5 rounded-md transition ${tab === 'patient' ? 'bg-white text-[#0F6B6B] shadow-2xs' : 'text-[#5B6B7A]'}`}
          >
            👤 Patient
          </button>
          <button
            type="button"
            onClick={() => setTab('pharmacy')}
            className={`py-1.5 rounded-md transition ${tab === 'pharmacy' ? 'bg-white text-[#0F6B6B] shadow-2xs' : 'text-[#5B6B7A]'}`}
          >
            💊 Pharmacy
          </button>
          <button
            type="button"
            onClick={() => setTab('facility')}
            className={`py-1.5 rounded-md transition ${tab === 'facility' ? 'bg-white text-[#0F6B6B] shadow-2xs' : 'text-[#5B6B7A]'}`}
          >
            🏥 Health Facility
          </button>
        </div>

        <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-200 text-[11px] text-[#0F6B6B] mb-4">
          <strong>Nodal Officer Notice:</strong> District, State, and National Health Officer accounts cannot be created via public self-registration. They are provisioned by state administrative coordinators.
        </div>

        {errorMsg && (
          <div className="mb-3 p-2.5 rounded-lg border border-red-200 bg-red-50 text-xs text-[#C62828] flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-3 p-2.5 rounded-lg border border-emerald-200 bg-emerald-50 text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 size={15} />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-[#14202B] mb-1">
              {tab === 'patient' ? 'Full Name' : tab === 'pharmacy' ? 'Pharmacist / Owner Name' : 'Medical Officer / Facility In-Charge'}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Senthil Kumar"
              className="w-full border border-[#E3E8EE] rounded-lg p-2.5 bg-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block font-semibold text-[#14202B] mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. senthil_k"
                className="w-full border border-[#E3E8EE] rounded-lg p-2.5 bg-white font-mono"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-[#14202B] mb-1">Email or Phone</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="senthil@example.com"
                className="w-full border border-[#E3E8EE] rounded-lg p-2.5 bg-white"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#14202B] mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-[#E3E8EE] rounded-lg p-2.5 bg-white"
              required
            />
          </div>

          {tab === 'pharmacy' && (
            <div>
              <label className="block font-semibold text-[#14202B] mb-1">Drug License / Pharmacy Reg Number</label>
              <input
                type="text"
                value={extraField}
                onChange={(e) => setExtraField(e.target.value)}
                placeholder="e.g. TN-CBE-2026-XXXX"
                className="w-full border border-[#E3E8EE] rounded-lg p-2.5 bg-white font-mono"
                required
              />
            </div>
          )}

          {tab === 'facility' && (
            <div>
              <label className="block font-semibold text-[#14202B] mb-1">Facility Code / NIN</label>
              <input
                type="text"
                value={extraField}
                onChange={(e) => setExtraField(e.target.value)}
                placeholder="e.g. chc_pollachi or phc_valparai"
                className="w-full border border-[#E3E8EE] rounded-lg p-2.5 bg-white font-mono"
                required
              />
            </div>
          )}

          {tab === 'patient' && (
            <label className="flex items-start gap-2 pt-1 text-[11px] text-[#5B6B7A] cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 rounded border-[#E3E8EE] text-[#0F6B6B]"
              />
              <span>
                I agree to the applicable privacy notice and understand that pharmacy stock data may experience reporting delays.
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 rounded-lg bg-[#0F6B6B] hover:bg-teal-800 disabled:opacity-50 text-white font-bold text-xs shadow-xs transition mt-3"
          >
            {isLoading ? 'Registering Account...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
};
