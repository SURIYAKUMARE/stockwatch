import React, { useState, useEffect } from 'react';
import {
  FileText,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  ArrowRightLeft,
  KeyRound,
  UploadCloud,
  Layers,
  Download
} from 'lucide-react';
import { Language, translations } from '../i18n';
import { AuditLogItem, AuthUser } from '../types';

interface AuditLogViewerProps {
  currentUser: AuthUser | null;
  lang: Language;
}

export const AuditLogViewer: React.FC<AuditLogViewerProps> = ({
  currentUser,
  lang
}) => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/audit-logs?limit=100');
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Failed to load audit logs', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.user_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAction = actionFilter === 'ALL' || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'TRANSFER_APPROVE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'TRANSFER_RECEIVE':
        return 'bg-teal-100 text-[#0F6B6B] border-teal-200';
      case 'CATALOGUE_MERGE':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'CSV_IMPORT':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'LOGIN':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const exportAuditCSV = () => {
    if (logs.length === 0) return;
    const headers = ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'User ID', 'Role', 'Details'];
    const rows = filteredLogs.map(l => [
      l.created_at,
      l.action,
      l.entity_type,
      l.entity_id,
      l.user_id,
      l.user_role,
      `"${l.details.replace(/"/g, '""')}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `StockWatch_Audit_Trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F6B6B]">
            <ShieldCheck size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#14202B]">
                Immutable Regulatory Audit Trail
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                Tamper-Resistant Log
              </span>
            </div>
            <p className="text-xs text-[#5B6B7A] mt-0.5">
              Audits all medicine stock adjustments, transfer approvals, catalogue merges, and officer authentications.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="p-2 border border-[#E3E8EE] rounded-lg text-[#5B6B7A] hover:bg-[#F7F9FB] hover:text-[#0F6B6B] transition"
            title="Refresh logs"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={exportAuditCSV}
            className="px-3.5 py-2 rounded-lg text-xs font-bold bg-[#0F6B6B] text-white hover:bg-[#0c5555] transition shadow-xs flex items-center gap-1.5"
          >
            <Download size={14} />
            <span>Export Audit Trail (CSV)</span>
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-[#E3E8EE] rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E3E8EE] flex flex-wrap items-center justify-between gap-3 bg-[#F7F9FB]/50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#5B6B7A] font-semibold">Action Filter:</span>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="text-xs font-semibold bg-white border border-[#E3E8EE] rounded-lg px-2.5 py-1 text-[#14202B]"
            >
              <option value="ALL">All Actions ({logs.length})</option>
              <option value="LOGIN">LOGIN</option>
              <option value="TRANSFER_APPROVE">TRANSFER_APPROVE</option>
              <option value="TRANSFER_RECEIVE">TRANSFER_RECEIVE</option>
              <option value="CATALOGUE_MERGE">CATALOGUE_MERGE</option>
              <option value="CSV_IMPORT">CSV_IMPORT</option>
              <option value="REGISTER">REGISTER</option>
            </select>
          </div>

          <div className="relative min-w-[240px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B7A]" />
            <input
              type="text"
              placeholder="Search user, action, details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-[#E3E8EE] rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0F6B6B]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E3E8EE] bg-[#F7F9FB] text-[#5B6B7A] font-semibold">
                <th className="py-3 px-4">Timestamp (UTC)</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">User & Role</th>
                <th className="py-3 px-4">Entity Type / ID</th>
                <th className="py-3 px-4">Audit Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EE]">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-[#F7F9FB]/60 transition">
                  <td className="py-3 px-4 font-mono text-[11px] text-[#5B6B7A] whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getActionBadge(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#14202B]">{log.user_id}</div>
                    <div className="text-[10px] text-[#5B6B7A] capitalize">{log.user_role}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-mono text-[#5B6B7A] text-[11px]">
                      {log.entity_type} · {log.entity_id}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#14202B] max-w-md">
                    {log.details}
                  </td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#5B6B7A]">
                    No matching audit records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
