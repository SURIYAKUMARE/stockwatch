/**
 * AlertTimeline — renders the closed-loop lifecycle of a single alert.
 * Fetches /api/alerts/{id}/timeline and shows ordered action events
 * with icons, timestamps, actors, and notes.
 */
import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, AlertTriangle, Truck, RotateCcw, Eye,
  Send, AlertCircle, RefreshCw, Clock
} from 'lucide-react';
import type { Language } from '../i18n';

interface TimelineEvent {
  id: string;
  action: string;
  timestamp: string;
  user: string;
  notes: string;
}

const ACTION_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  ALERT_TRIGGERED:    { icon: AlertCircle,  color: 'border-red-200 bg-red-50 text-red-700',        label: 'Alert Triggered' },
  ACKNOWLEDGED:       { icon: CheckCircle2, color: 'border-teal-200 bg-teal-50 text-teal-700',      label: 'Acknowledged' },
  EMERGENCY_INDENT:   { icon: AlertTriangle,color: 'border-orange-200 bg-orange-50 text-orange-700',label: 'Emergency Indent' },
  TRANSFER_APPROVED:  { icon: Truck,        color: 'border-blue-200 bg-blue-50 text-blue-700',      label: 'Transfer Approved' },
  TRANSFER_INITIATED: { icon: Truck,        color: 'border-blue-200 bg-blue-50 text-blue-700',      label: 'Transfer Initiated' },
  DISPATCHED_SMS:     { icon: Send,         color: 'border-purple-200 bg-purple-50 text-purple-700',label: 'SMS Dispatched' },
  MONITOR:            { icon: Eye,          color: 'border-slate-200 bg-slate-50 text-slate-700',   label: 'Set to Monitor' },
  RESOLVED:           { icon: CheckCircle2, color: 'border-emerald-200 bg-emerald-50 text-emerald-700', label: 'Resolved' },
};

function getConfig(action: string) {
  return ACTION_CONFIG[action] ?? {
    icon: Clock,
    color: 'border-[#E3E8EE] bg-[#F7F9FB] text-[#5B6B7A]',
    label: action,
  };
}

interface AlertTimelineProps {
  alertId: string;
  lang: Language;
}

export function AlertTimeline({ alertId, lang }: AlertTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isTa = lang === 'ta';

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/alerts/${alertId}/timeline`)
      .then(r => r.json())
      .then(d => { setEvents(Array.isArray(d) ? d : []); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, [alertId]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-[#5B6B7A] py-2">
        <RefreshCw size={12} className="animate-spin text-[#0F6B6B]" />
        {isTa ? 'நடவடிக்கை வரலாறு ஏற்றுகிறது…' : 'Loading alert timeline…'}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-xs text-[#5B6B7A] py-2">
        {isTa ? 'இன்னும் எந்த நடவடிக்கையும் எடுக்கப்படவில்லை.' : 'No actions taken yet on this alert.'}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-bold text-[#5B6B7A] uppercase tracking-wider">
        {isTa ? 'நடவடிக்கை காலவரிசை' : 'Alert Lifecycle Timeline'}
      </div>
      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-4 top-0 bottom-0 w-px bg-[#E3E8EE]" />
        <div className="space-y-2.5">
          {events.map((ev, i) => {
            const cfg = getConfig(ev.action);
            const Icon = cfg.icon;
            return (
              <div key={ev.id} className="flex items-start gap-3 relative">
                {/* Icon dot */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-full border flex items-center justify-center z-10 bg-white ${cfg.color.split(' ')[0]} ${cfg.color.split(' ')[1]}`}>
                  <Icon size={13} className={cfg.color.split(' ')[2]} />
                </div>
                {/* Content */}
                <div className="flex-1 bg-white border border-[#E3E8EE] rounded-xl px-3 py-2 shadow-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="text-[10px] text-[#5B6B7A] tabular-nums whitespace-nowrap">{ev.timestamp}</span>
                  </div>
                  {ev.user && (
                    <div className="text-[10px] text-[#5B6B7A] mt-1">
                      {isTa ? 'நபர்:' : 'By:'} <span className="font-semibold text-[#14202B]">{ev.user}</span>
                    </div>
                  )}
                  {ev.notes && (
                    <div className="text-[10px] text-[#5B6B7A] mt-0.5 line-clamp-2">{ev.notes}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
