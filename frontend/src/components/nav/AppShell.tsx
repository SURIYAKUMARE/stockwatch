import React, { useState, useEffect } from 'react';
import {
  HeartPulse,
  LayoutDashboard,
  ShieldAlert,
  ClipboardPen,
  Activity,
  BarChart3,
  ArrowLeftRight,
  FileText,
  Search,
  MapPin,
  Star,
  Users,
  Settings,
  LogOut,
  Globe,
  SunMoon,
  ChevronDown,
  Bell,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types/auth';
import { translations, Language } from '../../i18n';

export type AppScreen =
  // shared
  | 'dashboard'
  | 'alerts'
  | 'transfers'
  | 'reports'
  // patient
  | 'medicine_search'
  | 'nearby_pharmacies'
  | 'my_enquiries'
  | 'saved_pharmacies'
  // pharmacist / facility
  | 'inventory'
  | 'inventory_manager'
  | 'stock_entry'
  | 'expiry_batches'
  | 'import_csv'
  // facility
  | 'centre_detail'
  | 'forecast'
  | 'stock_entry_facility'
  // officer shared
  | 'priority_alerts'
  | 'command_center'
  | 'forecast_accuracy'
  | 'transfers_network'
  | 'medicine_catalogue'
  | 'audit_logs'
  | 'user_management'
  | 'weekly_report'
  | 'map_view';

interface NavItem {
  id: AppScreen;
  label: string;
  labelTa?: string;
  icon: React.ElementType;
  badge?: string | number | null;
  badgeColor?: string;
}

function getNavItems(role: UserRole, criticalCount: number, pendingSync: number): NavItem[] {
  switch (role) {
    case 'patient':
      return [
        { id: 'medicine_search', label: 'Find Medicines', labelTa: 'மருந்து தேடல்', icon: Search },
        { id: 'nearby_pharmacies', label: 'Nearby Pharmacies', labelTa: 'அருகிலுள்ள மருந்தகங்கள்', icon: MapPin },
        { id: 'my_enquiries', label: 'My Enquiries', labelTa: 'என் கேள்விகள்', icon: ClipboardPen },
        { id: 'saved_pharmacies', label: 'Saved Pharmacies', labelTa: 'சேமித்த மருந்தகங்கள்', icon: Star },
      ];
    case 'pharmacist':
      return [
        { id: 'dashboard', label: 'Dashboard', labelTa: 'டாஷ்போர்டு', icon: LayoutDashboard },
        { id: 'inventory', label: 'Inventory', labelTa: 'இருப்பு', icon: Activity },
        { id: 'inventory_manager', label: 'Inventory Ledger', labelTa: 'இருப்பு பதிவேடு', icon: FileText },
        { id: 'stock_entry', label: 'Stock Entry', labelTa: 'இருப்பு பதிவு', icon: ClipboardPen,
          badge: pendingSync > 0 ? `${pendingSync} sync` : null, badgeColor: 'bg-orange-100 text-orange-700' },
        { id: 'alerts', label: 'Alerts', labelTa: 'எச்சரிக்கைகள்', icon: ShieldAlert,
          badge: criticalCount > 0 ? criticalCount : null, badgeColor: 'bg-red-100 text-red-700' },
        { id: 'expiry_batches', label: 'Expiry Tracker', labelTa: 'காலாவதி கண்காணிப்பு', icon: BarChart3 },
        { id: 'import_csv', label: 'Import CSV', labelTa: 'CSV இறக்குமதி', icon: FileText },
        { id: 'medicine_catalogue', label: 'Medicine Catalogue', labelTa: 'மருந்து பட்டியல்', icon: Activity },
        { id: 'map_view', label: 'Network Stock Map', labelTa: 'வரைபட இருப்பு விவரம்', icon: MapPin },
        { id: 'audit_logs', label: 'Audit Log', labelTa: 'தணிக்கை பதிவு', icon: ClipboardPen },
        { id: 'reports', label: 'Reports', labelTa: 'அறிக்கைகள்', icon: FileText },
      ];
    case 'facility':
      return [
        { id: 'command_center', label: 'PHC Dashboard', labelTa: 'கட்டளை மையம்', icon: LayoutDashboard },
        { id: 'priority_alerts', label: 'Stock Alerts', labelTa: 'முன்னுரிமை எச்சரிக்கைகள்', icon: ShieldAlert,
          badge: criticalCount > 0 ? criticalCount : null, badgeColor: 'bg-red-100 text-red-700' },
        { id: 'stock_entry_facility', label: 'Stock Entry', labelTa: 'இருப்பு பதிவு', icon: ClipboardPen,
          badge: pendingSync > 0 ? `${pendingSync} sync` : null, badgeColor: 'bg-orange-100 text-orange-700' },
        { id: 'map_view', label: 'District Stock Map', labelTa: 'வரைபட இருப்பு விவரம்', icon: MapPin },
        { id: 'centre_detail', label: 'Centre Inventory', labelTa: 'மைய விவரம்', icon: Activity },
        { id: 'forecast', label: 'Forecast Accuracy', labelTa: 'முன்கணிப்பு துல்லியம்', icon: BarChart3 },
        { id: 'transfers_network', label: 'Smart Transfers', labelTa: 'இடமாற்றங்கள்', icon: ArrowLeftRight },
        { id: 'weekly_report', label: 'Weekly Report', labelTa: 'வாராந்திர அறிக்கை', icon: FileText },
      ];
    case 'chc_facility':
      return [
        { id: 'command_center', label: 'CHC Command Center', labelTa: 'CHC கட்டளை மையம்', icon: LayoutDashboard },
        { id: 'priority_alerts', label: 'Cluster Alerts', labelTa: 'முன்னுரிமை எச்சரிக்கைகள்', icon: ShieldAlert,
          badge: criticalCount > 0 ? criticalCount : null, badgeColor: 'bg-red-100 text-red-700' },
        { id: 'map_view', label: 'Cluster Map & Shops', labelTa: 'வட்டார வரைபடம்', icon: MapPin },
        { id: 'transfers_network', label: 'Inter-Facility Transfers', labelTa: 'இடமாற்றங்கள்', icon: ArrowLeftRight },
        { id: 'centre_detail', label: 'PHC Network Facilities', labelTa: 'நிலைய விவரம்', icon: Activity },
        { id: 'forecast', label: 'Demand Forecast', labelTa: 'தேவை முன்கணிப்பு', icon: BarChart3 },
        { id: 'weekly_report', label: 'Block Report', labelTa: 'வட்டார அறிக்கை', icon: FileText },
      ];
    case 'district_officer':
      return [
        { id: 'command_center', label: 'Command Center', labelTa: 'கட்டளை மையம்', icon: LayoutDashboard },
        { id: 'priority_alerts', label: 'Priority Alerts', labelTa: 'முன்னுரிமை எச்சரிக்கைகள்', icon: ShieldAlert,
          badge: criticalCount > 0 ? criticalCount : null, badgeColor: 'bg-red-100 text-red-700' },
        { id: 'map_view', label: 'Network Stock Map', labelTa: 'வரைபட இருப்பு விவரம்', icon: MapPin },
        { id: 'transfers_network', label: 'Transfer Network', labelTa: 'இடமாற்ற நெட்வொர்க்', icon: ArrowLeftRight },
        { id: 'forecast_accuracy', label: 'Forecast Accuracy', labelTa: 'முன்கணிப்பு துல்லியம்', icon: BarChart3 },
        { id: 'medicine_catalogue', label: 'Medicine Catalogue', labelTa: 'மருந்து பட்டியல்', icon: Activity },
        { id: 'import_csv', label: 'Import CSV', labelTa: 'CSV இறக்குமதி', icon: FileText },
        { id: 'weekly_report', label: 'District Report', labelTa: 'மாவட்ட அறிக்கை', icon: FileText },
        { id: 'audit_logs', label: 'Audit Logs', labelTa: 'தணிக்கை பதிவுகள்', icon: ClipboardPen },
      ];
    case 'state_officer':
      return [
        { id: 'dashboard', label: 'State Overview', labelTa: 'மாநில கண்ணோட்டம்', icon: LayoutDashboard },
        { id: 'priority_alerts', label: 'Critical Alerts', labelTa: 'ஆபத்தான எச்சரிக்கைகள்', icon: ShieldAlert,
          badge: criticalCount > 0 ? criticalCount : null, badgeColor: 'bg-red-100 text-red-700' },
        { id: 'map_view', label: 'District Stock Map', labelTa: 'மாவட்ட வரைபடம்', icon: MapPin },
        { id: 'command_center', label: 'District Heatmap', labelTa: 'மாவட்ட வெப்ப வரைபடம்', icon: LayoutDashboard },
        { id: 'transfers_network', label: 'Transfer Activity', labelTa: 'இடமாற்ற நடவடிக்கை', icon: ArrowLeftRight },
        { id: 'forecast_accuracy', label: 'Forecast Accuracy', labelTa: 'முன்கணிப்பு துல்லியம்', icon: BarChart3 },
        { id: 'medicine_catalogue', label: 'Medicine Catalogue', labelTa: 'மருந்து பட்டியல்', icon: Activity },
        { id: 'weekly_report', label: 'State Report', labelTa: 'மாநில அறிக்கை', icon: FileText },
        { id: 'audit_logs', label: 'Audit Logs', labelTa: 'தணிக்கை பதிவுகள்', icon: ClipboardPen },
      ];
    case 'national_officer':
      return [
        { id: 'dashboard', label: 'National Overview', labelTa: 'தேசிய கண்ணோட்டம்', icon: LayoutDashboard },
        { id: 'priority_alerts', label: 'Critical Alerts', labelTa: 'ஆபத்தான எச்சரிக்கைகள்', icon: ShieldAlert,
          badge: criticalCount > 0 ? criticalCount : null, badgeColor: 'bg-red-100 text-red-700' },
        { id: 'map_view', label: 'Geospatial Stock Map', labelTa: 'தேசிய வரைபடம்', icon: MapPin },
        { id: 'command_center', label: 'State Heatmap', labelTa: 'மாநில வெப்ப வரைபடம்', icon: LayoutDashboard },
        { id: 'forecast_accuracy', label: 'Forecast Accuracy', labelTa: 'முன்கணிப்பு துல்லியம்', icon: BarChart3 },
        { id: 'medicine_catalogue', label: 'Medicine Catalogue', labelTa: 'மருந்து பட்டியல்', icon: Activity },
        { id: 'reports', label: 'National Reports', labelTa: 'தேசிய அறிக்கைகள்', icon: FileText },
        { id: 'audit_logs', label: 'Audit Logs', labelTa: 'தணிக்கை பதிவுகள்', icon: ClipboardPen },
        { id: 'user_management', label: 'User Management', labelTa: 'பயனர் மேலாண்மை', icon: Users },
      ];
    default:
      return [];
  }
}

function roleLabel(role: UserRole): string {
  const map: Record<string, string> = {
    patient: 'Patient',
    pharmacist: 'Retail Pharmacist',
    facility: 'PHC Pharmacist',
    chc_facility: 'CHC Officer',
    district_officer: 'District Health Officer',
    state_officer: 'State Health Officer',
    national_officer: 'National Health Officer',
    block_officer: 'Block Health Officer',
  };
  return map[role] ?? role;
}

interface AppShellProps {
  activeScreen: AppScreen;
  onSelectScreen: (s: AppScreen) => void;
  lang: Language;
  onToggleLang: () => void;
  highContrast: boolean;
  onToggleContrast: () => void;
  criticalAlertCount?: number;
  pendingSyncCount?: number;
  children: React.ReactNode;
  onSimulateSpike?: () => void;
  onResetDemo?: () => void;
  isSimulating?: boolean;
  isOnline?: boolean;
}

export function AppShell({
  activeScreen, onSelectScreen, lang, onToggleLang, highContrast, onToggleContrast,
  criticalAlertCount = 0, pendingSyncCount = 0, children,
  onSimulateSpike, onResetDemo, isSimulating = false, isOnline = true,
}: AppShellProps) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchAppNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const json = await res.json();
        setNotificationsList(json.notifications || []);
        setUnreadCount(json.unread_count || 0);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchAppNotifications();
    const timer = setInterval(fetchAppNotifications, 25000);
    return () => clearInterval(timer);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
      fetchAppNotifications();
    } catch (e) {}
  };

  const handleMarkOneRead = async (id: string, actionLink?: string) => {
    try {
      await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      fetchAppNotifications();
      if (actionLink?.includes('transfers')) {
        onSelectScreen('transfers');
        setNotificationsOpen(false);
      }
    } catch (e) {}
  };

  const t = translations[lang];

  if (!user) return null;
  const navItems = getNavItems(user.role, criticalAlertCount, pendingSyncCount);

  const isOfficer = ['facility', 'district_officer', 'state_officer', 'national_officer'].includes(user.role);

  const Sidebar = () => (
    <aside
      className={`no-print bg-white border-r border-[#E3E8EE] flex flex-col h-full select-none shrink-0
        fixed lg:sticky top-0 z-40 transition-transform duration-200
        w-64
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
      style={{ height: '100vh' }}
    >
      {/* Brand */}
      <div className="p-4 border-b border-[#E3E8EE] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo.png" alt="StockWatch PHC Logo" className="w-9 h-9 object-contain rounded-xl shadow-xs" />
          <div>
            <h1 className="text-sm font-bold text-[#14202B] leading-tight">StockWatch PHC</h1>
            <p className="text-[10px] text-[#5B6B7A] leading-none mt-0.5">{roleLabel(user.role)}</p>
          </div>
        </div>
        <button className="lg:hidden text-[#5B6B7A]" onClick={() => setSidebarOpen(false)}>
          <X size={16} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;
          const label = lang === 'ta' && item.labelTa ? item.labelTa : item.label;
          return (
            <button
              key={item.id}
              onClick={() => { onSelectScreen(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[#0F6B6B] text-white shadow-sm'
                  : 'text-[#14202B] hover:bg-[#F7F9FB] hover:text-[#0F6B6B]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={15} className={isActive ? 'text-white' : 'text-[#5B6B7A]'} />
                <span className="truncate">{label}</span>
              </div>
              {item.badge != null && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  isActive ? 'bg-white/20 text-white' : (item.badgeColor ?? 'bg-gray-100 text-gray-700')
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3.5 border-t border-[#E3E8EE] bg-[#F7F9FB]/60 text-[10px] text-[#5B6B7A] space-y-2">
        {/* Demo badge */}
        {user.isDemo && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 text-[10px] text-amber-800 font-semibold">
            Demo account — not real clinical data
          </div>
        )}
        <div className="flex items-center gap-1.5 font-semibold text-[#0F6B6B]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          SDG 3 · Sakthi Hackfest '26
        </div>
        <p className="text-[9px] leading-tight">{t.approval_notice}</p>
      </div>
    </aside>
  );

  return (
    <div className={`min-h-screen flex bg-[#F7F9FB] text-[#14202B] ${highContrast ? 'high-contrast' : ''}`}>
      <Sidebar />

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top nav */}
        <header className="no-print bg-white border-b border-[#E3E8EE] h-14 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Hamburger (mobile) */}
            <button
              className="lg:hidden text-[#5B6B7A] hover:text-[#14202B]"
              onClick={() => setSidebarOpen(v => !v)}
            >
              <Menu size={18} />
            </button>

            {/* Demo sim buttons — only for officer roles */}
            {isOfficer && onSimulateSpike && (
              <button
                onClick={onSimulateSpike}
                disabled={isSimulating}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
              >
                ⚡ {lang === 'ta' ? 'காய்ச்சல் உயர்வு' : 'Fever Spike'}
              </button>
            )}
            {isOfficer && onResetDemo && (
              <button
                onClick={onResetDemo}
                disabled={isSimulating}
                className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#5B6B7A] hover:bg-[#F7F9FB] border border-[#E3E8EE] transition-colors"
              >
                ↺ {lang === 'ta' ? 'மீட்டமை' : 'Reset Demo'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Online status */}
            <div className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold ${
              isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
              {isOnline ? (lang === 'ta' ? 'இணைக்கப்பட்டது' : 'Online') : (lang === 'ta' ? 'ஆஃப்லைன்' : 'Offline')}
            </div>

            {/* Real-Time Notification Center Bell */}
            <div className="relative">
              <button
                onClick={() => setNotificationsOpen(v => !v)}
                className="relative p-1.5 rounded-lg hover:bg-[#F7F9FB] text-[#5B6B7A] transition-colors"
                title="Real-Time Alerts & Notifications"
              >
                <Bell size={16} />
                {(unreadCount > 0 || criticalAlertCount > 0) && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 bg-[#C62828] text-white text-[9px] font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 9 ? '9+' : (unreadCount || criticalAlertCount)}
                  </span>
                )}
              </button>

              {/* Notification Center Dropdown */}
              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-[#E3E8EE] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in duration-150">
                  <div className="p-3.5 bg-gradient-to-r from-teal-900 to-[#0F6B6B] text-white flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold flex items-center gap-1.5">
                        <Bell size={13} className="text-amber-400" />
                        <span>System Notifications & Alerts</span>
                      </h4>
                      <p className="text-[10px] text-teal-200">{unreadCount} unread items</p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] font-semibold bg-white/20 hover:bg-white/30 text-white px-2 py-0.5 rounded-md transition-colors"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-[#E3E8EE]">
                    {notificationsList.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#5B6B7A]">
                        No active notifications. All systems operational.
                      </div>
                    ) : (
                      notificationsList.map(notif => (
                        <div
                          key={notif.id}
                          onClick={() => handleMarkOneRead(notif.id, notif.action_link)}
                          className={`p-3 text-xs cursor-pointer hover:bg-slate-50 transition-colors ${
                            !notif.is_read ? 'bg-teal-50/40 font-medium' : ''
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-[#14202B] text-xs leading-tight">
                              {notif.title}
                            </span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm ${
                              notif.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                              notif.priority === 'WARNING' ? 'bg-amber-100 text-amber-800' :
                              'bg-teal-100 text-[#0F6B6B]'
                            }`}>
                              {notif.priority}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#5B6B7A] mt-1 leading-snug">{notif.message}</p>
                          <div className="flex items-center justify-between text-[10px] text-[#5B6B7A] mt-2">
                            <span className="text-[9px] font-semibold text-[#0F6B6B] uppercase tracking-wider">{notif.category}</span>
                            {notif.action_link && (
                              <span className="text-[#0F6B6B] hover:underline font-bold">View details →</span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* High contrast */}
            <button
              onClick={onToggleContrast}
              className={`p-1.5 rounded-lg border text-xs transition-colors ${
                highContrast ? 'bg-slate-800 text-white border-slate-900' : 'text-[#5B6B7A] border-[#E3E8EE] hover:bg-[#F7F9FB]'
              }`}
              aria-label={t.contrast_toggle}
            >
              <SunMoon size={14} />
            </button>

            {/* Language toggle */}
            <button
              onClick={onToggleLang}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#0F6B6B]/10 text-[#0F6B6B] hover:bg-[#0F6B6B]/20 border border-[#0F6B6B]/20 transition-colors"
            >
              <Globe size={13} />
              {lang === 'en' ? 'தமிழ்' : 'EN'}
            </button>

            {/* User avatar + logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#E3E8EE]">
              <div className="w-7 h-7 rounded-full bg-[#0F6B6B] flex items-center justify-center text-white text-[10px] font-bold">
                {user.avatarInitials}
              </div>
              <div className="hidden md:block">
                <div className="text-[11px] font-semibold text-[#14202B] leading-tight">{user.name}</div>
                <div className="text-[10px] text-[#5B6B7A]">{roleLabel(user.role)}</div>
              </div>
              <button
                onClick={logout}
                className="p-1.5 rounded-lg text-[#5B6B7A] hover:bg-[#F7F9FB] hover:text-red-600 transition-colors"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </header>

        {/* Screen content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
