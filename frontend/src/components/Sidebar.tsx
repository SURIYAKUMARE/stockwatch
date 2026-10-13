import React from 'react';
import {
  LayoutDashboard,
  ShieldAlert,
  ClipboardPen,
  Activity,
  BarChart3,
  ArrowLeftRight,
  FileText,
  HeartPulse,
  Search,
  Building2,
  Hospital,
  Building,
  Globe,
  Layers,
  ShieldCheck,
  Home,
  MapPin
} from 'lucide-react';
import { translations, Language } from '../i18n';
import { AuthUser, UserRole } from '../types';

export type ScreenId =
  | 'command_center'
  | 'priority_alerts'
  | 'stock_entry'
  | 'centre_detail'
  | 'forecast_accuracy'
  | 'transfers'
  | 'reports'
  | 'patient_finder'
  | 'pharmacy_dashboard'
  | 'facility_dashboard'
  | 'state_dashboard'
  | 'national_dashboard'
  | 'deduplication'
  | 'audit_logs'
  | 'map_view';

interface SidebarProps {
  activeScreen: ScreenId;
  onSelectScreen: (screen: ScreenId) => void;
  lang: Language;
  currentUser: AuthUser | null;
  criticalAlertCount?: number;
  pendingSyncCount?: number;
  onGoHome?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeScreen,
  onSelectScreen,
  lang,
  currentUser,
  criticalAlertCount = 0,
  pendingSyncCount = 0,
  onGoHome
}) => {
  const t = translations[lang] || translations.en;
  const role = currentUser?.role || 'district_officer';

  // Base list of role-adapted navigation items
  const getNavItems = () => {
    if (role === 'patient') {
      return [
        {
          id: 'patient_finder' as ScreenId,
          label: 'Find Medicines & Pharmacies',
          icon: Search,
          badge: 'Patient'
        }
      ];
    }

    if (role === 'pharmacist') {
      return [
        {
          id: 'pharmacy_dashboard' as ScreenId,
          label: 'Pharmacy Stock Portal',
          icon: Building2,
          badge: 'Outlet'
        },
        {
          id: 'map_view' as ScreenId,
          label: t.nav_network_map || 'Network Stock Map',
          icon: MapPin,
          badge: null
        },
        {
          id: 'deduplication' as ScreenId,
          label: 'Medicine Catalogue & Dedup',
          icon: Layers,
          badge: null
        },
        {
          id: 'audit_logs' as ScreenId,
          label: 'Audit Trail',
          icon: ShieldCheck,
          badge: null
        }
      ];
    }

    if (role === 'chc_facility' || role === 'facility') {
      return [
        {
          id: 'facility_dashboard' as ScreenId,
          label: 'Facility Early Warning',
          icon: Hospital,
          badge: 'Facility'
        },
        {
          id: 'map_view' as ScreenId,
          label: t.nav_network_map || 'District Stock Map',
          icon: MapPin,
          badge: 'Map',
          badgeColor: 'bg-teal-100 text-teal-800'
        },
        {
          id: 'stock_entry' as ScreenId,
          label: t.nav_stock_entry || 'Stock Entry',
          icon: ClipboardPen,
          badge: pendingSyncCount > 0 ? `${pendingSyncCount} sync` : null,
          badgeColor: 'bg-[#EF6C00] text-white'
        },
        {
          id: 'centre_detail' as ScreenId,
          label: t.nav_centre_detail || 'Facility Trend Detail',
          icon: Activity,
          badge: null
        },
        {
          id: 'transfers' as ScreenId,
          label: t.nav_transfers || 'Surplus Transfers',
          icon: ArrowLeftRight,
          badge: null
        },
        {
          id: 'forecast_accuracy' as ScreenId,
          label: t.nav_forecast_accuracy || 'Backtest Accuracy',
          icon: BarChart3,
          badge: null
        }
      ];
    }

    if (role === 'state_officer') {
      return [
        {
          id: 'state_dashboard' as ScreenId,
          label: 'State Directorate Overview',
          icon: Building,
          badge: 'State HQ'
        },
        {
          id: 'map_view' as ScreenId,
          label: t.nav_network_map || 'District Stock Map',
          icon: MapPin,
          badge: null
        },
        {
          id: 'command_center' as ScreenId,
          label: t.nav_command_center || 'District Matrix',
          icon: LayoutDashboard,
          badge: null
        },
        {
          id: 'priority_alerts' as ScreenId,
          label: t.nav_priority_alerts || 'Priority Alerts',
          icon: ShieldAlert,
          badge: criticalAlertCount > 0 ? criticalAlertCount : null,
          badgeColor: 'bg-[#C62828] text-white'
        },
        {
          id: 'transfers' as ScreenId,
          label: 'Inter-District Transfers',
          icon: ArrowLeftRight,
          badge: null
        },
        {
          id: 'deduplication' as ScreenId,
          label: 'Catalogue Deduplication',
          icon: Layers,
          badge: null
        },
        {
          id: 'reports' as ScreenId,
          label: t.nav_reports || 'Replenishment Report',
          icon: FileText,
          badge: 'A4'
        },
        {
          id: 'audit_logs' as ScreenId,
          label: 'State Regulatory Audit',
          icon: ShieldCheck,
          badge: null
        }
      ];
    }

    if (role === 'national_officer') {
      return [
        {
          id: 'national_dashboard' as ScreenId,
          label: 'National Surveillance',
          icon: Globe,
          badge: 'MoHFW'
        },
        {
          id: 'map_view' as ScreenId,
          label: t.nav_network_map || 'Geospatial Stock Map',
          icon: MapPin,
          badge: null
        },
        {
          id: 'state_dashboard' as ScreenId,
          label: 'State Analytics',
          icon: Building,
          badge: null
        },
        {
          id: 'command_center' as ScreenId,
          label: 'Macro Matrix',
          icon: LayoutDashboard,
          badge: null
        },
        {
          id: 'deduplication' as ScreenId,
          label: 'National Catalogue',
          icon: Layers,
          badge: null
        },
        {
          id: 'audit_logs' as ScreenId,
          label: 'National Audit Trail',
          icon: ShieldCheck,
          badge: null
        }
      ];
    }

    // Default: District Health Officer
    return [
      {
        id: 'command_center' as ScreenId,
        label: t.nav_command_center || 'Command Center',
        icon: LayoutDashboard,
        badge: null
      },
      {
        id: 'priority_alerts' as ScreenId,
        label: t.nav_priority_alerts || 'Priority Alerts',
        icon: ShieldAlert,
        badge: criticalAlertCount > 0 ? criticalAlertCount : null,
        badgeColor: 'bg-[#C62828] text-white'
      },
      {
        id: 'map_view' as ScreenId,
        label: t.nav_network_map || 'Network Map & Stocks',
        icon: MapPin,
        badge: 'Live Map',
        badgeColor: 'bg-teal-100 text-teal-800'
      },
      {
        id: 'stock_entry' as ScreenId,
        label: t.nav_stock_entry || 'Stock Entry',
        icon: ClipboardPen,
        badge: pendingSyncCount > 0 ? `${pendingSyncCount} sync` : null,
        badgeColor: 'bg-[#EF6C00] text-white'
      },
      {
        id: 'centre_detail' as ScreenId,
        label: t.nav_centre_detail || 'Centre Detail',
        icon: Activity,
        badge: null
      },
      {
        id: 'forecast_accuracy' as ScreenId,
        label: t.nav_forecast_accuracy || 'Forecast Accuracy',
        icon: BarChart3,
        badge: 'Backtest',
        badgeColor: 'bg-emerald-100 text-emerald-800'
      },
      {
        id: 'transfers' as ScreenId,
        label: t.nav_transfers || 'Transfers',
        icon: ArrowLeftRight,
        badge: 'Optimizer',
        badgeColor: 'bg-teal-100 text-teal-800'
      },
      {
        id: 'deduplication' as ScreenId,
        label: 'Catalogue Deduplication',
        icon: Layers,
        badge: null
      },
      {
        id: 'reports' as ScreenId,
        label: t.nav_reports || 'Reports',
        icon: FileText,
        badge: 'A4',
        badgeColor: 'bg-gray-100 text-gray-700'
      },
      {
        id: 'audit_logs' as ScreenId,
        label: 'Audit Trail',
        icon: ShieldCheck,
        badge: null
      }
    ];
  };

  const navItems = getNavItems();

  return (
    <aside className="no-print w-64 bg-white border-r border-[#E3E8EE] flex flex-col h-screen select-none shrink-0 sticky top-0">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#E3E8EE]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="StockWatch PHC Logo" className="w-9 h-9 object-contain rounded-xl shadow-xs" />
            <div>
              <h1 className="text-base font-bold text-[#14202B] tracking-tight leading-tight">
                {t.app_title || 'StockWatch PHC'}
              </h1>
              <p className="text-[11px] text-[#5B6B7A] font-medium leading-none mt-0.5">
                Intelligent Medicine Network
              </p>
            </div>
          </div>

          {onGoHome && (
            <button
              onClick={onGoHome}
              className="p-1.5 rounded-md hover:bg-[#F7F9FB] text-[#5B6B7A] hover:text-[#0F6B6B] transition"
              title="Return to Public Portal / Landing"
            >
              <Home size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeScreen === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onSelectScreen(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-[#0F6B6B] text-white shadow-sm'
                  : 'text-[#14202B] hover:bg-[#F7F9FB] hover:text-[#0F6B6B]'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  size={16}
                  className={`shrink-0 ${isActive ? 'text-white' : 'text-[#5B6B7A]'}`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : (item as any).badgeColor || 'bg-slate-100 text-[#5B6B7A]'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer Info & Operational Status */}
      <div className="p-3.5 border-t border-[#E3E8EE] bg-[#F7F9FB]/60 text-[11px] text-[#5B6B7A] space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-[#0F6B6B]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>National Health Mission · Live System</span>
        </div>
        <p className="text-[10px] leading-tight text-[#5B6B7A]">
          {t.approval_notice || 'All transfers and official stock adjustments require human officer approval.'}
        </p>
      </div>
    </aside>
  );
};
