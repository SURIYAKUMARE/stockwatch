import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardPen, RefreshCw, Filter, Search, AlertTriangle,
  CheckCircle2, ArrowRightLeft, Package, LogIn, UserCog, GitMerge
} from 'lucide-react';
import type { Language } from '../../i18n';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AuditLogEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  user_id: string;
  user_role: string;
  details: string;
  created_at: string;
}

// ─── Action metadata ──────────────────────────────────────────────────────────

const ACTION_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  STOCK_ADJUST:     { icon: Package,        color: 'bg-teal-50 text-teal-700 border-teal-200',     label: 'Stock Adjust' },
  TRANSFER_APPROVE: { icon: ArrowRightLeft, color: 'bg-blue-50 text-blue-700 border-blue-200',     label: 'Transfer Approved' },
  CATALOGUE_MERGE:  { icon: GitMerge,       color: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Catalogue Merge' },
  CSV_IMPORT:       { icon: ClipboardPen,   color: 'bg-amber-50 text-amber-700 border-amber-200',  label: 'CSV Import' },
  LOGIN:            { icon: LogIn,          color: 'bg-slate-50 text-slate-700 border-slate-200',  label: 'Login' },
  PERMISSION_CHANGE:{ icon: UserCog,        color: 'bg-rose-50 text-rose-700 border-rose-200',     label: 'Permission Change' },
  REGISTER:         { icon: UserCog,        color: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Registration' },
  ALERT_TRIGGERED:  { icon: AlertTriangle,  color: 'bg-red-50 text-red-700 border-red-200',        label: 'Alert Triggered' },
};

function ActionBadge({ action }: { action: string }) {
  const meta = ACTION_META[action] ?? { icon: ClipboardPen, color: 'bg-[#F7F9FB] text-[#5B6B7A] border-[#E3E8EE]', label: action };
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.color}`}>
      <Icon size={11} />
      {meta.label}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    patient: 'bg-blue-50 text-blue-700',
    pharmacist: 'bg-teal-50 text-teal-700',
    chc_facility: 'bg-emerald-50 text-emerald-700',
    district_officer: 'bg-orange-50 text-orange-700',
    state_officer: 'bg-purple-50 text-purple-700',
    national_officer: 'bg-rose-50 text-rose-700',
  };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors[role] ?? 'bg-slate-50 text-slate-600'}`}>
      {role.replace('_', ' ')}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AuditLogs({ lang }: { lang: Language }) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const isTa = lang === 'ta';

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/audit-logs?limit=200');
      if (res.ok) {
        const data = await res.json();
        setEntries(Array.isArray(data) ? data : []);
      }
    } catch {
      /* network error — leave empty */
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const actionTypes = ['ALL', ...Array.from(new Set(entries.map(e => e.action)))];

  const filtered = entries.filter(e => {
    const matchesAction = filterAction === 'ALL' || e.action === filterAction;
    const matchesQuery = !query ||
      e.action.toLowerCase().includes(query.toLowerCase()) ||
      e.user_id.toLowerCase().includes(query.toLowerCase()) ||
      e.details.toLowerCase().includes(query.toLowerCase()) ||
      e.entity_type.toLowerCase().includes(query.toLowerCase());
    return matchesAction && matchesQuery;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[#14202B] flex items-center gap-2">
            <ClipboardPen size={16} className="text-[#0F6B6B]" />
            {isTa ? 'தணிக்கை பதிவுகள்' : 'Audit Log'}
          </h2>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            {isTa
              ? 'அனைத்து முக்கிய நடவடிக்கைகளும் இங்கே மாறாமல் பதிவாகின்றன.'
              : 'Immutable record of all stock adjustments, transfers, merges, logins, and permission changes.'}
          </p>
        </div>
        <button
          onClick={loadLogs}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#5B6B7A] border border-[#E3E8EE] rounded-xl hover:bg-[#F7F9FB]"
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          {isTa ? 'புதுப்பி' : 'Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B7A]" />
          <input
            type="search"
            value={query}
            onChange={e => { setQuery(e.target.value); setPage(1); }}
            placeholder={isTa ? 'தேடுக…' : 'Search action, user, entity…'}
            className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border border-[#E3E8EE] bg-white text-[#14202B] focus:outline-none focus:ring-2 focus:ring-[#0F6B6B]"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter size={13} className="text-[#5B6B7A]" />
          <select
            value={filterAction}
            onChange={e => { setFilterAction(e.target.value); setPage(1); }}
            className="text-xs border border-[#E3E8EE] rounded-xl px-2.5 py-2 bg-white text-[#14202B] focus:outline-none focus:ring-2 focus:ring-[#0F6B6B]"
          >
            {actionTypes.map(a => (
              <option key={a} value={a}>{a === 'ALL' ? (isTa ? 'அனைத்தும்' : 'All Actions') : a}</option>
            ))}
          </select>
        </div>
        <span className="text-xs text-[#5B6B7A] self-center">
          {filtered.length} {isTa ? 'பதிவுகள்' : 'entries'}
        </span>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-[#5B6B7A]">
          <RefreshCw size={14} className="animate-spin text-[#0F6B6B]" />
          {isTa ? 'பதிவுகள் ஏற்றப்படுகின்றன…' : 'Loading audit entries…'}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#E3E8EE] rounded-xl p-10 text-center text-xs text-[#5B6B7A]">
          {query || filterAction !== 'ALL'
            ? (isTa ? 'பொருத்தமான பதிவுகள் இல்லை.' : 'No entries match your filter.')
            : (isTa ? 'இன்னும் பதிவுகள் இல்லை.' : 'No audit events yet. Actions will appear here as officers interact with the system.')}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-[#E3E8EE] overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F7F9FB] border-b border-[#E3E8EE] text-[11px] font-semibold text-[#5B6B7A] uppercase tracking-wider">
                  <th className="py-3 px-4">{isTa ? 'நேரம்' : 'Timestamp'}</th>
                  <th className="py-3 px-4">{isTa ? 'நடவடிக்கை' : 'Action'}</th>
                  <th className="py-3 px-4">{isTa ? 'நிறுவனம்' : 'Entity'}</th>
                  <th className="py-3 px-4">{isTa ? 'பயனர்' : 'User'}</th>
                  <th className="py-3 px-4">{isTa ? 'பாத்திரம்' : 'Role'}</th>
                  <th className="py-3 px-4">{isTa ? 'விவரங்கள்' : 'Details'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E8EE]">
                {paginated.map(ev => (
                  <tr key={ev.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 tabular-nums text-[#5B6B7A] whitespace-nowrap text-[11px]">
                      {new Date(ev.created_at).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4"><ActionBadge action={ev.action} /></td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-[#14202B]">{ev.entity_type}</div>
                      <div className="text-[10px] text-[#5B6B7A] font-mono truncate max-w-[100px]" title={ev.entity_id}>
                        {ev.entity_id.slice(0, 16)}{ev.entity_id.length > 16 ? '…' : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[#14202B] text-[11px]">{ev.user_id}</td>
                    <td className="py-3 px-4"><RoleBadge role={ev.user_role} /></td>
                    <td className="py-3 px-4 text-[#5B6B7A] max-w-xs">
                      <span className="block truncate" title={ev.details}>{ev.details || '—'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#5B6B7A]">
                {isTa ? 'பக்கம்' : 'Page'} {page} / {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 border border-[#E3E8EE] rounded-lg hover:bg-[#F7F9FB] disabled:opacity-40"
                >
                  {isTa ? 'முந்தைய' : 'Prev'}
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 border border-[#E3E8EE] rounded-lg hover:bg-[#F7F9FB] disabled:opacity-40"
                >
                  {isTa ? 'அடுத்த' : 'Next'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Immutability note */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 flex items-start gap-2.5">
        <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-slate-500" />
        <p>
          {isTa
            ? 'அனைத்து தணிக்கை பதிவுகளும் மாற்றமற்றவை. எந்தவொரு பயனரும் பதிவுகளை திருத்தவோ நீக்கவோ முடியாது.'
            : 'All audit entries are immutable. No user can edit or delete past records. This log is the authoritative record for compliance, investigation, and dispute resolution.'}
        </p>
      </div>
    </div>
  );
}
