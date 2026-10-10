import React, { useState } from 'react';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  ShieldCheck,
  AlertOctagon,
  ArrowRight,
  ExternalLink,
  Info
} from 'lucide-react';
import { MatrixData, KPIData, MatrixCell } from '../types';
import { translations, Language } from '../i18n';
import { TierBadge } from './TierBadge';

interface CommandCenterProps {
  matrixData: MatrixData | null;
  kpiData: KPIData | null;
  lang: Language;
  onSelectCell: (centreId: string, medicineId: string) => void;
  onNavigateToTransfers: (centreId: string, medicineId: string) => void;
  isLoading: boolean;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({
  matrixData,
  kpiData,
  lang,
  onSelectCell,
  onNavigateToTransfers,
  isLoading
}) => {
  const t = translations[lang];
  const [hoveredCell, setHoveredCell] = useState<{
    cell: MatrixCell;
    centreName: string;
    x: number;
    y: number;
  } | null>(null);

  if (isLoading || !matrixData) {
    return (
      <div className="p-8 space-y-6">
        <div className="grid grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg" />
          ))}
        </div>
        <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  const getCellBg = (tier: string) => {
    switch (tier) {
      case 'CRITICAL':
        return 'bg-red-50 hover:bg-red-100 border-red-300 text-red-900';
      case 'HIGH':
        return 'bg-orange-50 hover:bg-orange-100 border-orange-300 text-orange-900';
      case 'WATCH':
        return 'bg-amber-50 hover:bg-amber-100 border-amber-300 text-amber-900';
      case 'BLIND_SPOT':
        return 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700';
      case 'SAFE':
      default:
        return 'bg-emerald-50/70 hover:bg-emerald-100 border-emerald-200 text-emerald-950';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white p-4 rounded-lg border border-[#E3E8EE] shadow-xs">
          <div className="text-xs font-medium text-[#5B6B7A] flex items-center justify-between">
            <span>{t.kpi_centres_at_risk}</span>
            <AlertTriangle size={15} className="text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#14202B]">
              {kpiData?.centres_at_risk ?? 0}
            </span>
            <span className="text-xs text-[#5B6B7A]">
              / {kpiData?.total_centres ?? 12} PHCs
            </span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white p-4 rounded-lg border border-[#E3E8EE] shadow-xs">
          <div className="text-xs font-medium text-[#5B6B7A] flex items-center justify-between">
            <span>{t.kpi_critical_items}</span>
            <AlertOctagon size={15} className="text-red-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-red-700">
              {kpiData?.critical_items ?? 0}
            </span>
            <span className="text-xs text-red-600 font-medium">Immediate Action</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white p-4 rounded-lg border border-[#E3E8EE] shadow-xs">
          <div className="text-xs font-medium text-[#5B6B7A] flex items-center justify-between">
            <span>{t.kpi_avg_cover}</span>
            <Clock size={15} className="text-[#0F6B6B]" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-[#14202B]">
              {kpiData?.avg_days_of_cover ?? 0}
            </span>
            <span className="text-xs text-[#5B6B7A]">days</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white p-4 rounded-lg border border-[#E3E8EE] shadow-xs bg-gradient-to-br from-teal-50/50 to-white">
          <div className="text-xs font-medium text-[#0F6B6B] flex items-center justify-between">
            <span>{t.kpi_lead_time_gained}</span>
            <ShieldCheck size={16} className="text-[#0F6B6B]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F6B6B]">
              {kpiData?.early_warning_lead_time_gained ?? '4.8 days'}
            </span>
            <span className="text-[11px] text-[#5B6B7A]">vs threshold</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Matrix (Left) + Act Today (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* Heatmap Matrix (3 cols) */}
        <div className="xl:col-span-3 bg-white rounded-lg border border-[#E3E8EE] p-5 shadow-xs">
          <div className="flex items-center justify-between pb-4 border-b border-[#E3E8EE]">
            <div>
              <h2 className="text-sm font-bold text-[#14202B]">
                {t.matrix_title}
              </h2>
              <p className="text-xs text-[#5B6B7A] mt-0.5">
                {t.matrix_subtitle}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <TierBadge tier="CRITICAL" size="sm" lang={lang} />
              <TierBadge tier="HIGH" size="sm" lang={lang} />
              <TierBadge tier="WATCH" size="sm" lang={lang} />
              <TierBadge tier="SAFE" size="sm" lang={lang} />
              <TierBadge tier="BLIND_SPOT" size="sm" lang={lang} />
            </div>
          </div>

          {/* Matrix Table */}
          <div className="overflow-x-auto mt-4">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#E3E8EE]">
                  <th className="py-2.5 px-3 text-xs font-semibold text-[#5B6B7A] bg-[#F7F9FB] sticky left-0 z-10 w-44">
                    PHC Centre
                  </th>
                  {matrixData.medicines.map((m) => (
                    <th
                      key={m.id}
                      className="py-2.5 px-2 text-[11px] font-semibold text-[#5B6B7A] bg-[#F7F9FB] text-center min-w-[88px]"
                    >
                      <div className="truncate max-w-[85px]" title={m.name}>
                        {m.name.split(' ')[0]}
                      </div>
                      <div className="text-[9px] font-normal text-[#5B6B7A]">
                        {m.unit}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E8EE]">
                {matrixData.rows.map((row) => (
                  <tr key={row.centre_id} className="hover:bg-slate-50/50">
                    {/* Centre Name column */}
                    <td className="py-2 px-3 text-xs font-medium text-[#14202B] bg-white sticky left-0 z-10 border-r border-[#E3E8EE]">
                      <div className="flex items-center gap-1.5">
                        {row.is_stale && (
                          <span
                            title="Blind spot: Stale centre (no updates >= 3d)"
                            className="text-slate-600 font-bold"
                          >
                            ⚠️
                          </span>
                        )}
                        <span className="truncate">{row.centre_name}</span>
                      </div>
                      <span className="text-[10px] text-[#5B6B7A]">
                        {row.block}
                      </span>
                    </td>

                    {/* Cells */}
                    {row.cells.map((cell) => {
                      const isAccelerating = cell.trend > 1.15;
                      const isDecelerating = cell.trend < 0.85;

                      return (
                        <td key={cell.medicine_id} className="p-1 text-center">
                          <button
                            onClick={() =>
                              onSelectCell(row.centre_id, cell.medicine_id)
                            }
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHoveredCell({
                                cell,
                                centreName: row.centre_name,
                                x: rect.left + rect.width / 2,
                                y: rect.top
                              });
                            }}
                            onMouseLeave={() => setHoveredCell(null)}
                            className={`w-full py-2 px-1 rounded-md border text-xs font-semibold flex flex-col items-center justify-center transition-transform hover:scale-105 cursor-pointer ${getCellBg(
                              cell.tier
                            )}`}
                          >
                            <div className="flex items-center gap-0.5 tabular-nums">
                              <span>{cell.days_of_cover}d</span>
                              {isAccelerating && (
                                <TrendingUp
                                  size={11}
                                  className="text-red-600 font-bold"
                                />
                              )}
                              {isDecelerating && (
                                <TrendingDown
                                  size={11}
                                  className="text-emerald-700"
                                />
                              )}
                            </div>
                            <div className="text-[9px] opacity-80 tabular-nums">
                              {cell.stock} {cell.unit.slice(0, 3)}
                            </div>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Panel: "Act Today" Top-5 List */}
        <div className="bg-white rounded-lg border border-[#E3E8EE] p-5 shadow-xs space-y-4">
          <div className="pb-3 border-b border-[#E3E8EE]">
            <h3 className="text-sm font-bold text-[#14202B]">
              {t.act_today_title}
            </h3>
            <p className="text-xs text-[#5B6B7A] mt-0.5">
              Ranked by urgent intervention deadline.
            </p>
          </div>

          <div className="space-y-3">
            {matrixData.act_today.map((item) => (
              <div
                key={item.alert_id}
                className="p-3 rounded-lg border border-[#E3E8EE] hover:border-[#0F6B6B] transition-colors bg-[#F7F9FB]/50 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <TierBadge tier={item.tier} size="sm" lang={lang} />
                  <span className="text-[11px] font-bold text-red-700">
                    Score: {item.urgency}/100
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[#14202B]">
                    {item.centre_name}
                  </h4>
                  <p className="text-xs text-[#0F6B6B] font-semibold">
                    {item.medicine_name}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#5B6B7A] tabular-nums">
                  <span>Cover: {item.days_of_cover} days</span>
                  <span className="font-semibold text-rose-700">
                    Deadline: {item.latest_safe_action_date}
                  </span>
                </div>

                <p className="text-[11px] text-[#5B6B7A] line-clamp-2 leading-tight">
                  {lang === 'ta' ? item.reason_ta : item.reason}
                </p>

                <div className="pt-1 flex items-center justify-between">
                  <button
                    onClick={() =>
                      onNavigateToTransfers(item.centre_id, item.medicine_id)
                    }
                    className="text-xs font-bold text-[#0F6B6B] hover:underline flex items-center gap-1"
                  >
                    <span>{t.btn_transfer}</span>
                    <ArrowRight size={12} />
                  </button>
                  <button
                    onClick={() =>
                      onSelectCell(item.centre_id, item.medicine_id)
                    }
                    className="text-xs text-[#5B6B7A] hover:text-[#14202B] flex items-center gap-0.5"
                  >
                    <span>Detail</span>
                    <ExternalLink size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Tooltip for Matrix Cell Hover */}
      {hoveredCell && (
        <div
          className="fixed z-50 pointer-events-none bg-[#14202B] text-white p-3 rounded-lg shadow-lg text-xs space-y-1.5 max-w-xs -translate-x-1/2 -translate-y-full mb-2"
          style={{
            left: hoveredCell.x,
            top: hoveredCell.y - 8
          }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-gray-700 pb-1">
            <span className="font-bold">{hoveredCell.centreName}</span>
            <TierBadge tier={hoveredCell.cell.tier} size="sm" lang={lang} />
          </div>
          <div className="text-[11px] font-semibold text-teal-300">
            {hoveredCell.cell.medicine_name}
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] pt-1">
            <span className="text-gray-400">Current Stock:</span>
            <span className="font-bold text-right tabular-nums">
              {hoveredCell.cell.stock} {hoveredCell.cell.unit}
            </span>
            <span className="text-gray-400">Daily Burn Rate:</span>
            <span className="font-bold text-right tabular-nums">
              {hoveredCell.cell.velocity}/day
            </span>
            <span className="text-gray-400">3d Trend Change:</span>
            <span className={`font-bold text-right tabular-nums ${hoveredCell.cell.trend_pct > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
              {hoveredCell.cell.trend_pct > 0 ? '+' : ''}{hoveredCell.cell.trend_pct}%
            </span>
            <span className="text-gray-400">Predicted Out (Est):</span>
            <span className="font-bold text-right text-amber-300">
              {hoveredCell.cell.predicted_date}
            </span>
          </div>
          <div className="text-[9px] text-gray-400 pt-1 border-t border-gray-800">
            Click cell to view full 30-day confidence fan chart.
          </div>
        </div>
      )}
    </div>
  );
};
