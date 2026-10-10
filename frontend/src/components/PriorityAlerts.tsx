import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Send,
  CheckCircle,
  Truck,
  FileSpreadsheet,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertCircle,
  Smartphone
} from 'lucide-react';
import { AlertItem, UrgencyTier } from '../types';
import { translations, Language } from '../i18n';
import { TierBadge } from './TierBadge';

interface PriorityAlertsProps {
  alerts: AlertItem[];
  lang: Language;
  onNavigateToTransfers: (centreId: string, medicineId: string) => void;
  onAcknowledgeAlert: (alertId: string) => void;
  onTakeAction: (alertId: string, action: string, notes?: string) => void;
  isLoading: boolean;
}

export const PriorityAlerts: React.FC<PriorityAlertsProps> = ({
  alerts,
  lang,
  onNavigateToTransfers,
  onAcknowledgeAlert,
  onTakeAction,
  isLoading
}) => {
  const t = translations[lang];
  const [selectedTierFilter, setSelectedTierFilter] = useState<string>('ALL');
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [dispatchToast, setDispatchToast] = useState<string | null>(null);

  const filteredAlerts = alerts.filter((a) => {
    if (selectedTierFilter === 'ALL') return true;
    return a.tier === selectedTierFilter;
  });

  const toggleExpand = (id: string) => {
    setExpandedAlertId(expandedAlertId === id ? null : id);
  };

  const handleSimulateDispatch = (alert: AlertItem) => {
    onTakeAction(
      alert.id,
      'DISPATCHED_SMS',
      `Simulated SMS alert dispatched to Block Medical Officer (${alert.centre_name})`
    );
    setDispatchToast(`Official SMS alert dispatched for ${alert.medicine_name} at ${alert.centre_name}!`);
    setTimeout(() => setDispatchToast(null), 3500);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Toast Alert */}
      {dispatchToast && (
        <div className="fixed top-16 right-6 z-50 bg-[#0F6B6B] text-white px-4 py-3 rounded-lg shadow-lg text-xs font-semibold flex items-center gap-2 animate-bounce">
          <CheckCircle size={16} />
          <span>{dispatchToast}</span>
        </div>
      )}

      {/* Screen Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#14202B]">
            {t.alerts_title}
          </h2>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            {t.alerts_subtitle}
          </p>
        </div>

        {/* Tier Filter Pills */}
        <div className="flex items-center gap-1.5 bg-white border border-[#E3E8EE] p-1 rounded-lg">
          {(['ALL', 'CRITICAL', 'HIGH', 'WATCH'] as const).map((tierKey) => (
            <button
              key={tierKey}
              onClick={() => setSelectedTierFilter(tierKey)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                selectedTierFilter === tierKey
                  ? 'bg-[#0F6B6B] text-white'
                  : 'text-[#5B6B7A] hover:bg-[#F7F9FB]'
              }`}
            >
              {tierKey === 'ALL' ? t.filter_all : tierKey}
            </button>
          ))}
        </div>
      </div>

      {/* Urgency Table */}
      <div className="bg-white rounded-lg border border-[#E3E8EE] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F7F9FB] border-b border-[#E3E8EE] text-[11px] font-semibold text-[#5B6B7A] uppercase tracking-wider">
                <th className="py-3 px-3 w-8"></th>
                <th className="py-3 px-3">{t.table_centre}</th>
                <th className="py-3 px-3">{t.table_medicine}</th>
                <th className="py-3 px-3">Urgency (0–100)</th>
                <th className="py-3 px-3">{t.table_stock}</th>
                <th className="py-3 px-3">{t.table_rate}</th>
                <th className="py-3 px-3">{t.table_predicted_date}</th>
                <th className="py-3 px-3">{t.table_deadline}</th>
                <th className="py-3 px-3">{t.table_impact}</th>
                <th className="py-3 px-3">{t.table_tier}</th>
                <th className="py-3 px-3 text-right">{t.table_action}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EE] text-xs">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-[#5B6B7A]">
                    No alerts in this category. System operating within safe parameters.
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => {
                  const isExpanded = expandedAlertId === alert.id;
                  const isCritical = alert.tier === 'CRITICAL';

                  return (
                    <React.Fragment key={alert.id}>
                      <tr
                        className={`hover:bg-slate-50/70 transition-colors cursor-pointer ${
                          isCritical ? 'bg-red-50/20' : ''
                        }`}
                        onClick={() => toggleExpand(alert.id)}
                      >
                        <td className="py-3 px-3 text-center text-[#5B6B7A]">
                          {isExpanded ? (
                            <ChevronDown size={15} />
                          ) : (
                            <ChevronRight size={15} />
                          )}
                        </td>
                        <td className="py-3 px-3 font-bold text-[#14202B]">
                          <div>{alert.centre_name}</div>
                          <div className="text-[10px] font-normal text-[#5B6B7A]">
                            {alert.block} Block
                          </div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-[#0F6B6B]">
                          {alert.medicine_name}
                        </td>
                        {/* Urgency Score Bar */}
                        <td className="py-3 px-3 w-36">
                          <div className="flex items-center gap-2">
                            <span className="font-bold tabular-nums text-xs">
                              {alert.urgency}
                            </span>
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  alert.urgency >= 75
                                    ? 'bg-[#C62828]'
                                    : alert.urgency >= 50
                                    ? 'bg-[#EF6C00]'
                                    : 'bg-[#F9A825]'
                                }`}
                                style={{ width: `${alert.urgency}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-medium tabular-nums">
                          {alert.stock} {alert.unit}
                        </td>
                        {/* Daily Rate with % Change Chip */}
                        <td className="py-3 px-3 tabular-nums">
                          <div className="flex items-center gap-1.5">
                            <span>{alert.velocity}/d</span>
                            {alert.trend_pct > 0 ? (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-red-100 text-red-700 font-bold flex items-center">
                                +{alert.trend_pct}%
                              </span>
                            ) : (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 font-bold">
                                {alert.trend_pct}%
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Predicted Date with Range */}
                        <td className="py-3 px-3 tabular-nums">
                          <div className="font-semibold text-rose-800">
                            {alert.predicted_date}
                          </div>
                          <div className="text-[10px] text-[#5B6B7A]">
                            Range: {alert.range_low.slice(5)} · {alert.range_high.slice(5)} (Est)
                          </div>
                        </td>
                        <td className="py-3 px-3 font-semibold text-red-700 tabular-nums">
                          {alert.latest_safe_action_date}
                        </td>
                        <td className="py-3 px-3 font-medium tabular-nums">
                          <span title="Expected shortfall days x patient load">
                            ~{alert.patient_impact} patients
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <TierBadge tier={alert.tier} size="sm" lang={lang} />
                        </td>
                        {/* Action Buttons */}
                        <td
                          className="py-3 px-3 text-right space-x-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() =>
                              onNavigateToTransfers(alert.centre_id, alert.medicine_id)
                            }
                            className="px-2.5 py-1 text-xs font-bold text-white bg-[#0F6B6B] hover:bg-[#0a4f4f] rounded-md transition-colors"
                          >
                            {t.btn_transfer}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Row Content */}
                      {isExpanded && (
                        <tr className="bg-[#F7F9FB]/90 border-b border-[#E3E8EE]">
                          <td colSpan={11} className="p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {/* Left: Plain-Language Diagnostic Reason */}
                              <div className="bg-white p-3.5 rounded-lg border border-[#E3E8EE] space-y-2">
                                <h4 className="text-xs font-bold text-[#14202B] flex items-center gap-1.5">
                                  <AlertCircle size={14} className="text-[#0F6B6B]" />
                                  <span>Early-Warning Diagnostic Assessment</span>
                                </h4>
                                <div className="text-xs text-[#14202B] leading-relaxed bg-[#F7F9FB] p-2.5 rounded-md border border-[#E3E8EE]">
                                  <div className="font-medium">
                                    {alert.reason}
                                  </div>
                                  <div className="mt-1 text-[11px] text-[#5B6B7A] italic">
                                    {alert.reason_ta}
                                  </div>
                                </div>
                                <div className="text-[11px] text-[#5B6B7A] flex items-center justify-between pt-1">
                                  <span>Recommended Indent Order: <strong className="text-[#14202B]">{alert.recommended_order_qty} {alert.unit}</strong></span>
                                  <span>Status: <strong className="text-[#0F6B6B]">{alert.status}</strong></span>
                                </div>
                              </div>

                              {/* Right: SMS / WhatsApp Dispatch Preview */}
                              <div className="bg-white p-3.5 rounded-lg border border-[#E3E8EE] space-y-2">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-bold text-[#14202B] flex items-center gap-1.5">
                                    <Smartphone size={14} className="text-teal-700" />
                                    <span>{t.sms_preview_title}</span>
                                  </h4>
                                  <span className="text-[10px] text-[#5B6B7A]">
                                    SMS Gateway Mock
                                  </span>
                                </div>
                                <div className="bg-emerald-50 text-emerald-950 p-2.5 rounded-md border border-emerald-200 text-xs font-mono leading-tight space-y-1">
                                  <div className="text-[10px] text-emerald-700 font-bold uppercase">
                                    [TN-HEALTH-ALERT] PHC-{alert.centre_name.toUpperCase()}
                                  </div>
                                  <div>
                                    URGENT: Stockout of {alert.medicine_name} predicted by {alert.predicted_date}. Days of cover: ~{alert.stock / Math.max(alert.velocity, 0.1)}d. Action deadline: {alert.latest_safe_action_date}. Recommended indent: {alert.recommended_order_qty} {alert.unit}.
                                  </div>
                                </div>
                                <div className="flex items-center justify-end gap-2 pt-1">
                                  <button
                                    onClick={() => onAcknowledgeAlert(alert.id)}
                                    className="px-3 py-1 text-xs font-semibold text-[#5B6B7A] hover:bg-[#F7F9FB] border border-[#E3E8EE] rounded-md"
                                  >
                                    {t.btn_acknowledge}
                                  </button>
                                  <button
                                    onClick={() => handleSimulateDispatch(alert)}
                                    className="px-3 py-1 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-md flex items-center gap-1.5 shadow-xs"
                                  >
                                    <Send size={12} />
                                    <span>{t.btn_send_sms}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
