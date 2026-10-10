import React, { useState, useEffect } from 'react';
import { ClipboardPen, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import type { Language } from '../../i18n';

interface AuditEvent {
  id: string;
  action: string;
  timestamp: string;
  user: string;
  notes: string;
}

export function AuditLogs({ lang }: { lang: Language }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isTa = lang === 'ta';

  useEffect(() => {
    // We pull alert timeline events as a proxy audit log source.
    // Phase 9 will implement a dedicated /api/admin/audit-logs endpoint.
    fetch('/api/alerts')
      .then(r => r.json())
      .then(async (alerts: any[]) => {
        const criticalAlerts = alerts.filter(a => a.tier === 'CRITICAL').slice(0, 3);
        const allEvents: AuditEvent[] = [];
        for (const alert of criticalAlerts) {
          const res = await fetch(`/api/alerts/${alert.id}/timeline`);
          const timeline = await res.json();
          for (const ev of timeline) {
            allEvents.push({
              id: ev.id,
              action: ev.action,
              timestamp: ev.timestamp,
              user: ev.user,
              notes: ev.notes,
            });
          }
        }
        setEvents(allEvents);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-base font-bold text-[#14202B] flex items-center gap-2">
          <ClipboardPen size={16} className="text-[#0F6B6B]" />
          {isTa ? 'தணிக்கை பதிவுகள்' : 'Audit Log'}
        </h2>
        <p className="text-xs text-[#5B6B7A] mt-0.5">
          {isTa
            ? 'அனைத்து முக்கிய நடவடிக்கைகளும் இங்கே பதிவாகின்றன.'
            : 'All stock adjustments, alert actions, and transfer approvals are recorded here.'}
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-[#5B6B7A]">
          <RefreshCw size={14} className="animate-spin text-[#0F6B6B]" />
          Loading audit events…
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white border border-[#E3E8EE] rounded-xl p-10 text-center text-xs text-[#5B6B7A]">
          No audit events yet. Actions taken on alerts will appear here.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E3E8EE] overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F7F9FB] border-b border-[#E3E8EE] text-[11px] font-semibold text-[#5B6B7A] uppercase tracking-wider">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EE]">
              {events.map(ev => (
                <tr key={ev.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 tabular-nums text-[#5B6B7A] whitespace-nowrap">{ev.timestamp}</td>
                  <td className="py-3 px-4 font-semibold">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      ev.action.includes('CRITICAL') || ev.action.includes('TRANSFER')
                        ? 'bg-teal-50 text-teal-700 border border-teal-200'
                        : 'bg-[#F7F9FB] text-[#5B6B7A] border border-[#E3E8EE]'
                    }`}>
                      {ev.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#14202B]">{ev.user}</td>
                  <td className="py-3 px-4 text-[#5B6B7A] max-w-xs truncate" title={ev.notes}>{ev.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800">
        <strong>Phase 9 expansion:</strong> A dedicated <code>/api/admin/audit-logs</code> endpoint will record all stock adjustments, transfer approvals, catalogue merges, and officer permission changes with full immutable history.
      </div>
    </div>
  );
}
