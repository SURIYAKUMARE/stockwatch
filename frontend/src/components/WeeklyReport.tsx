import React, { useState, useEffect } from 'react';
import { Printer, Download, FileText, CheckCircle2 } from 'lucide-react';
import { translations, Language } from '../i18n';
import { TierBadge } from './TierBadge';

interface WeeklyReportProps {
  lang: Language;
}

export const WeeklyReport: React.FC<WeeklyReportProps> = ({ lang }) => {
  const t = translations[lang];
  const [report, setReport] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/report/weekly')
      .then((res) => res.json())
      .then((json) => {
        setReport(json);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading || !report) {
    return (
      <div className="p-8 text-center text-xs text-[#5B6B7A]">
        Generating A4 Weekly Replenishment Audit...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Top Action Bar (hidden on print) */}
      <div className="no-print flex items-center justify-between bg-white p-4 rounded-lg border border-[#E3E8EE] shadow-xs">
        <div>
          <h2 className="text-base font-bold text-[#14202B]">
            {t.report_title}
          </h2>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            Official government format. Formatted for standard A4 printing.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-[#0F6B6B] hover:bg-[#0a4f4f] text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
        >
          <Printer size={15} />
          <span>{t.btn_print}</span>
        </button>
      </div>

      {/* Printable A4 Document Sheet */}
      <div className="bg-white border border-[#E3E8EE] p-8 rounded-lg shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="border-b-2 border-[#14202B] pb-4 flex items-start justify-between">
          <div>
            <div className="text-[11px] font-bold text-[#0F6B6B] tracking-wider uppercase">
              Government of Tamil Nadu · Department of Public Health and Preventive Medicine
            </div>
            <h1 className="text-lg font-bold text-[#14202B] mt-1">
              Primary Health Centre Medicine Early-Warning & Replenishment Action Report
            </h1>
            <div className="text-xs text-[#5B6B7A] mt-1">
              District: <span className="font-semibold text-[#14202B]">{report.district}</span> · Generated: <span className="font-semibold text-[#14202B]">{report.generated_at}</span>
            </div>
          </div>
          <div className="text-right text-xs">
            <div className="px-2.5 py-1 bg-red-100 text-red-800 font-bold rounded-sm inline-block">
              CONFIDENTIAL / CLINICAL ACTION
            </div>
            <div className="text-[11px] text-[#5B6B7A] mt-1">
              Active Shortages: <strong className="text-red-700">{report.total_critical_shortages} critical</strong>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="bg-[#F7F9FB] p-3.5 rounded-lg border border-[#E3E8EE] text-xs leading-relaxed space-y-1">
          <div className="font-bold text-[#14202B]">Action Priority Directive:</div>
          <p className="text-[#5B6B7A]">
            The following facilities have been identified by consumption acceleration models to face imminent medicine depletion prior to the arrival of the next district monthly depot indent. Medical Officers are directed to execute the paired inter-facility transfers or emergency indents as outlined below.
          </p>
        </div>

        {/* Centre-wise Needs Table */}
        <div className="space-y-6">
          {report.centre_reports.map((cr: any) => (
            <div key={cr.centre_id} className="border border-[#E3E8EE] rounded-lg overflow-hidden">
              <div className="bg-[#F7F9FB] px-4 py-2.5 border-b border-[#E3E8EE] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-[#14202B]">{cr.centre_name}</span>
                  <span className="text-[11px] text-[#5B6B7A]">({cr.block} Block)</span>
                </div>
                {cr.is_stale && (
                  <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded-sm font-bold">
                    ⚠️ Stale Facility (Offline &gt;3d)
                  </span>
                )}
              </div>

              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E3E8EE] bg-white text-[11px] font-semibold text-[#5B6B7A]">
                    <th className="py-2 px-3">Medicine</th>
                    <th className="py-2 px-3">On-Hand</th>
                    <th className="py-2 px-3">Days of Cover</th>
                    <th className="py-2 px-3">Urgency Tier</th>
                    <th className="py-2 px-3">Req. Indent Qty</th>
                    <th className="py-2 px-3">Action Deadline</th>
                    <th className="py-2 px-3">Recommended Direction</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E8EE]">
                  {cr.items.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-[#14202B]">
                        {item.medicine_name}
                      </td>
                      <td className="py-2.5 px-3 tabular-nums font-medium">
                        {item.current_stock} {item.unit}
                      </td>
                      <td className="py-2.5 px-3 tabular-nums font-bold text-rose-700">
                        {item.days_of_cover} days
                      </td>
                      <td className="py-2.5 px-3">
                        <TierBadge tier={item.tier} size="sm" lang={lang} />
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#0F6B6B] tabular-nums">
                        {item.recommended_order_qty} {item.unit}
                      </td>
                      <td className="py-2.5 px-3 text-red-700 font-semibold tabular-nums">
                        {item.latest_action_date}
                      </td>
                      <td className="py-2.5 px-3 text-[#14202B]">
                        {item.recommended_action}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Official Sign-Off Section */}
        <div className="pt-8 grid grid-cols-2 gap-12 border-t border-[#E3E8EE] text-xs">
          <div className="space-y-6">
            <div className="text-[#5B6B7A]">Verified by Block Health Officer (BHO):</div>
            <div className="border-b border-dashed border-[#5B6B7A] w-48 mt-8" />
            <div className="text-[11px] text-[#5B6B7A]">Signature & Date / Seal</div>
          </div>
          <div className="space-y-6 text-right">
            <div className="text-[#5B6B7A]">Approved by Deputy Director of Health Services (DDHS):</div>
            <div className="border-b border-dashed border-[#5B6B7A] w-48 mt-8 ml-auto" />
            <div className="text-[11px] text-[#5B6B7A]">Coimbatore District, Tamil Nadu</div>
          </div>
        </div>
      </div>
    </div>
  );
};
