import React, { useState } from 'react';
import {
  Globe,
  UserCheck,
  Zap,
  RotateCcw,
  SunMoon,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  LogIn,
  User,
  Download
} from 'lucide-react';
import { UserRole, AuthUser } from '../types';
import { translations, Language } from '../i18n';

interface TopNavProps {
  currentRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  lang: Language;
  onToggleLang: () => void;
  isOnline: boolean;
  pendingSyncCount: number;
  onSyncNow: () => void;
  highContrast: boolean;
  onToggleContrast: () => void;
  onSimulateSpike: () => void;
  onResetDemo: () => void;
  isSimulating: boolean;
  currentUser?: AuthUser | null;
  onLogout?: () => void;
  onOpenLogin?: () => void;
  onOpenQueueModal?: () => void;
  canInstallPWA?: boolean;
  onInstallPWA?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentRole,
  onChangeRole,
  lang,
  onToggleLang,
  isOnline,
  pendingSyncCount,
  onSyncNow,
  highContrast,
  onToggleContrast,
  onSimulateSpike,
  onResetDemo,
  isSimulating,
  currentUser,
  onLogout,
  onOpenLogin,
  onOpenQueueModal,
  canInstallPWA,
  onInstallPWA
}) => {
  const t = translations[lang] || translations.en;

  const roleLabels: Record<UserRole, string> = {
    patient: 'Patient / Customer',
    pharmacist: 'Retail Pharmacist',
    chc_facility: 'CHC / Health Facility',
    district_officer: 'District Health Officer (DDHS)',
    state_officer: 'State Health Officer (DPH)',
    national_officer: 'National Health Officer (NHM)',
    block_officer: 'Block Health Officer'
  };

  return (
    <header className="no-print bg-white border-b border-[#E3E8EE] h-14 px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      {/* Left: Role Switcher & User Identity */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-medium text-[#5B6B7A]">
          <UserCheck size={16} className="text-[#0F6B6B]" />
          <span>Active Role:</span>
        </div>
        <select
          value={currentRole}
          onChange={(e) => onChangeRole(e.target.value as UserRole)}
          className="text-xs font-bold text-[#14202B] bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-1 focus:ring-[#0F6B6B]"
        >
          <option value="district_officer">🛡️ {roleLabels.district_officer}</option>
          <option value="chc_facility">🏥 {roleLabels.chc_facility}</option>
          <option value="pharmacist">💊 {roleLabels.pharmacist}</option>
          <option value="state_officer">🏛️ {roleLabels.state_officer}</option>
          <option value="national_officer">🇮🇳 {roleLabels.national_officer}</option>
          <option value="patient">👤 {roleLabels.patient}</option>
        </select>

        {currentUser && (
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-teal-50 border border-teal-200 text-[11px] text-[#0F6B6B] font-semibold">
            <User size={12} />
            <span>{currentUser.name}</span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* PWA Install Button (Shown on desktop & Android browsers when install prompt is available) */}
        {canInstallPWA && onInstallPWA && (
          <button
            onClick={onInstallPWA}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#0F6B6B] text-white hover:bg-[#0c5555] shadow-xs transition"
            title="Install StockWatch PHC as Progressive Web App"
          >
            <Download size={13} />
            <span>Install App</span>
          </button>
        )}

        {/* Offline / Online Sync Indicator — Clickable to open Offline Queue */}
        <button
          onClick={onOpenQueueModal}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition cursor-pointer ${
            isOnline
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
          }`}
          title="Click to view offline queue & sync actions"
        >
          {isOnline ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Wifi size={13} />
              <span>{t.online_synced || 'Online'}</span>
              {pendingSyncCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-xs bg-emerald-600 text-white font-bold text-[10px]">
                  {pendingSyncCount} queued
                </span>
              )}
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <WifiOff size={13} />
              <span>{t.offline_badge || 'Offline'} ({pendingSyncCount})</span>
            </>
          )}
        </button>

        {/* Surge Simulation: Outbreak Test */}
        <button
          onClick={onSimulateSpike}
          disabled={isSimulating}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
          title="Simulate rapid outbreak surge consumption in network"
        >
          <Zap size={14} className="text-rose-600" />
          <span className="hidden sm:inline">{t.simulate_spike || 'Test Demand Surge'}</span>
        </button>

        {/* Live Inventory Sync */}
        <button
          onClick={onResetDemo}
          disabled={isSimulating}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#5B6B7A] hover:bg-[#F7F9FB] border border-[#E3E8EE] transition-colors"
          title="Resynchronize and restore live inventory balances"
        >
          <RotateCcw size={13} />
          <span className="hidden sm:inline">{t.reset_demo || 'Sync Live Inventory'}</span>
        </button>

        {/* High Contrast Mode Toggle */}
        <button
          onClick={onToggleContrast}
          className={`p-1.5 rounded-lg border text-xs transition-colors ${
            highContrast
              ? 'bg-slate-800 text-white border-slate-900'
              : 'text-[#5B6B7A] border-[#E3E8EE] hover:bg-[#F7F9FB]'
          }`}
          title={t.contrast_toggle || 'Contrast mode'}
          aria-label={t.contrast_toggle || 'Contrast mode'}
        >
          <SunMoon size={15} />
        </button>

        {/* Bilingual Language Switcher */}
        <button
          onClick={onToggleLang}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#0F6B6B]/10 text-[#0F6B6B] hover:bg-[#0F6B6B]/20 border border-[#0F6B6B]/20 transition-colors"
        >
          <Globe size={14} />
          <span>{lang === 'en' ? 'தமிழ்' : 'English'}</span>
        </button>

        {/* Login / Logout */}
        {currentUser ? (
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-[#5B6B7A] hover:bg-rose-50 hover:text-rose-600 border border-[#E3E8EE] transition"
            title="Sign out to landing page"
          >
            <LogOut size={13} />
            <span className="hidden md:inline">Sign Out</span>
          </button>
        ) : (
          <button
            onClick={onOpenLogin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0F6B6B] text-white hover:bg-[#0c5555] transition shadow-xs"
          >
            <LogIn size={13} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
