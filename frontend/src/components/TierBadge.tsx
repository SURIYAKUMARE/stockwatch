import React from 'react';
import { AlertTriangle, AlertCircle, Eye, CheckCircle2, AlertOctagon } from 'lucide-react';
import { UrgencyTier } from '../types';
import { translations, Language } from '../i18n';

interface TierBadgeProps {
  tier: UrgencyTier;
  lang?: Language;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export const TierBadge: React.FC<TierBadgeProps> = ({
  tier,
  lang = 'en',
  size = 'md',
  showIcon = true
}) => {
  const t = translations[lang];

  let config = {
    label: t.tier_safe,
    bg: '#DCFCE7',
    text: '#2E7D32',
    border: '#86EFAC',
    icon: CheckCircle2,
    ariaLabel: 'Safe: stock levels well above action window'
  };

  switch (tier) {
    case 'CRITICAL':
      config = {
        label: t.tier_critical,
        bg: '#FEE2E2',
        text: '#C62828',
        border: '#FCA5A5',
        icon: AlertTriangle,
        ariaLabel: 'Critical: stockout expected before action window with probability >= 70%'
      };
      break;
    case 'HIGH':
      config = {
        label: t.tier_high,
        bg: '#FFEDD5',
        text: '#EF6C00',
        border: '#FDBA74',
        icon: AlertCircle,
        ariaLabel: 'High: stockout probability >= 40%'
      };
      break;
    case 'WATCH':
      config = {
        label: t.tier_watch,
        bg: '#FEF9C3',
        text: '#B45309',
        border: '#FDE047',
        icon: Eye,
        ariaLabel: 'Watch: stockout probability >= 15%'
      };
      break;
    case 'BLIND_SPOT':
      config = {
        label: t.tier_blindspot,
        bg: '#F1F5F9',
        text: '#475569',
        border: '#CBD5E1',
        icon: AlertOctagon,
        ariaLabel: 'Blind Spot: Stale centre, no stock telemetry received in >= 3 days'
      };
      break;
    case 'SAFE':
    default:
      break;
  }

  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-semibold'
  }[size];

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16
  }[size];

  return (
    <span
      role="status"
      aria-label={config.ariaLabel}
      className={`inline-flex items-center rounded-md border ${sizeClasses}`}
      style={{
        backgroundColor: config.bg,
        color: config.text,
        borderColor: config.border
      }}
    >
      {showIcon && <IconComponent size={iconSizes} aria-hidden="true" />}
      <span className="tracking-wide uppercase font-semibold">{config.label}</span>
    </span>
  );
};
