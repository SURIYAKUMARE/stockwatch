import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import {
  Activity,
  TrendingUp,
  ShieldCheck,
  Package,
  Calendar,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { Centre, Medicine, ForecastDetailData } from '../types';
import { translations, Language } from '../i18n';
import { TierBadge } from './TierBadge';

interface CentreDetailProps {
  centres: Centre[];
  medicines: Medicine[];
  selectedCentreId: string;
  selectedMedicineId: string;
  onChangeSelection: (cId: string, mId: string) => void;
  lang: Language;
}

export const CentreDetail: React.FC<CentreDetailProps> = ({
  centres,
  medicines,
  selectedCentreId,
  selectedMedicineId,
  onChangeSelection,
  lang
}) => {
  const t = translations[lang];
  const [data, setData] = useState<ForecastDetailData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    fetch(`/api/centres/${selectedCentreId}/medicines/${selectedMedicineId}/forecast`)
      .then((res) => res.json())
      .then((json) => {
        if (isMounted) {
          setData(json);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCentreId, selectedMedicineId]);

  if (isLoading || !data) {
    return (
      <div className="p-8 flex items-center justify-center space-x-2 text-[#5B6B7A]">
        <RefreshCw size={18} className="animate-spin text-[#0F6B6B]" />
        <span className="text-xs font-semibold">{t.loading}</span>
      </div>
    );
  }

  // Combine history curve and forecast projection into unified timeline
  const chartPoints: any[] = [];
  data.history_curve.forEach((pt) => {
    chartPoints.push({
      date: pt.date,
      historicalStock: pt.stock,
      projectedStock: null,
      bandHigh: null,
      bandLow: null
    });
  });

  // Connect last historical point to first projection point
  const lastHistoryStock = data.history_curve[data.history_curve.length - 1]?.stock ?? data.current_stock;
  if (chartPoints.length > 0) {
    chartPoints[chartPoints.length - 1].projectedStock = lastHistoryStock;
  }

  data.forecast_projection.forEach((pt) => {
    chartPoints.push({
      date: pt.date,
      historicalStock: null,
      projectedStock: pt.projected_stock,
      bandHigh: pt.band_high,
      bandLow: pt.band_low
    });
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header with Centre & Medicine Selectors */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E3E8EE] shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-base font-bold text-[#14202B]">
              {data.centre.name}
            </h2>
            <TierBadge tier={data.tier} size="sm" lang={lang} />
          </div>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            {data.centre.block} Block · {data.centre.district} District · Last Sync: Today
          </p>
        </div>

        {/* Dual Selectors */}
        <div className="flex items-center gap-3">
          <select
            value={selectedCentreId}
            onChange={(e) => onChangeSelection(e.target.value, selectedMedicineId)}
            className="text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-md px-3 py-2 text-[#14202B] font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#0F6B6B]"
          >
            {centres.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedMedicineId}
            onChange={(e) => onChangeSelection(selectedCentreId, e.target.value)}
            className="text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-md px-3 py-2 text-[#14202B] font-semibold focus:outline-hidden focus:ring-1 focus:ring-[#0F6B6B]"
          >
            {medicines.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Grid: Line Chart (Left) + Side Metric Cards (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Fan Chart (2 cols) */}
        <div className="xl:col-span-2 bg-white rounded-lg border border-[#E3E8EE] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#14202B]">
                30-Day Stock History & Monte Carlo Confidence Band
              </h3>
              <p className="text-xs text-[#5B6B7A] mt-0.5">
                Shaded area depicts P10–P90 residual bootstrap projection. All forecasts labelled "Estimate".
              </p>
            </div>
            {data.spike_detected && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                <AlertTriangle size={14} />
                <span>CUSUM Surge: {data.spike_date}</span>
              </div>
            )}
          </div>

          {/* Recharts Composed Chart */}
          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartPoints} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#5B6B7A' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: '#5B6B7A' }}
                  tickLine={false}
                  unit={` ${data.medicine.unit.slice(0, 3)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#14202B',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '11px',
                    border: 'none'
                  }}
                />

                {/* Vertical Marker for Next Indent Delivery */}
                <ReferenceLine
                  x={data.history_curve[data.history_curve.length - 1]?.date}
                  stroke="#5B6B7A"
                  strokeDasharray="4 4"
                  label={{ value: 'Today', fill: '#5B6B7A', fontSize: 10, position: 'top' }}
                />

                {/* Shaded Confidence Band (P10 - P90) */}
                <Area
                  type="monotone"
                  dataKey="bandHigh"
                  stroke="none"
                  fill="#0F6B6B"
                  fillOpacity={0.12}
                  name="P10-P90 Confidence Band"
                />

                {/* Historical Stock Line */}
                <Line
                  type="monotone"
                  dataKey="historicalStock"
                  stroke="#0F6B6B"
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: '#0F6B6B' }}
                  name="Historical Stock"
                />

                {/* Projected Stock Line (Dashed) */}
                <Line
                  type="monotone"
                  dataKey="projectedStock"
                  stroke="#C62828"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ r: 2.5, fill: '#C62828' }}
                  name="Projected Stock (P50 Estimate)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs text-[#5B6B7A] pt-2 border-t border-[#E3E8EE]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#0F6B6B]" /> Recorded Stock
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-[#C62828] border-dashed" /> Projected Burn
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-[#0F6B6B]/20 rounded-xs" /> P10–P90 Band
              </span>
            </div>
            <span className="text-red-700 font-semibold tabular-nums">
              Stockout Day: {data.predicted_stockout_date} (Estimate)
            </span>
          </div>
        </div>

        {/* Side Detail Cards (1 col) */}
        <div className="space-y-4">
          {/* Card 1: Velocity & Trend */}
          <div className="bg-white p-4 rounded-lg border border-[#E3E8EE] shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-[#14202B] uppercase tracking-wider text-[#5B6B7A]">
              Consumption Dynamics
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-md bg-[#F7F9FB]">
                <div className="text-[10px] text-[#5B6B7A]">{t.card_velocity}</div>
                <div className="text-lg font-bold text-[#14202B] tabular-nums mt-0.5">
                  {data.velocity} <span className="text-xs font-normal">/day</span>
                </div>
              </div>
              <div className="p-2.5 rounded-md bg-[#F7F9FB]">
                <div className="text-[10px] text-[#5B6B7A]">{t.card_trend}</div>
                <div className={`text-lg font-bold tabular-nums mt-0.5 ${data.trend > 1.15 ? 'text-red-600' : 'text-emerald-700'}`}>
                  {data.trend}x ({data.trend_pct > 0 ? '+' : ''}{data.trend_pct}%)
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Supply Buffer & Action Window */}
          <div className="bg-white p-4 rounded-lg border border-[#E3E8EE] shadow-xs space-y-2.5">
            <h4 className="text-xs font-bold text-[#14202B] uppercase tracking-wider text-[#5B6B7A]">
              Supply Windows
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#E3E8EE]">
                <span className="text-[#5B6B7A]">Current On-Hand Stock:</span>
                <span className="font-bold tabular-nums">{data.current_stock} {data.medicine.unit}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E3E8EE]">
                <span className="text-[#5B6B7A]">Safety Stock Requirement:</span>
                <span className="font-bold tabular-nums">{data.safety_stock} {data.medicine.unit}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E3E8EE]">
                <span className="text-[#5B6B7A]">Days of Cover:</span>
                <span className="font-bold text-rose-700 tabular-nums">~{data.days_of_cover} days</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#E3E8EE]">
                <span className="text-[#5B6B7A]">Latest Safe Action Date:</span>
                <span className="font-bold text-red-700 tabular-nums">{data.latest_safe_action_date}</span>
              </div>
            </div>
          </div>

          {/* Card 3: Batch Expiry */}
          <div className="bg-white p-4 rounded-lg border border-[#E3E8EE] shadow-xs space-y-3">
            <h4 className="text-xs font-bold text-[#14202B] uppercase tracking-wider text-[#5B6B7A]">
              {t.card_batches}
            </h4>
            <div className="space-y-2">
              {data.expiry_batches.map((b) => (
                <div key={b.batch} className="flex items-center justify-between text-xs p-2 rounded-md bg-[#F7F9FB] border border-[#E3E8EE]">
                  <div>
                    <div className="font-mono font-bold text-[#14202B]">{b.batch}</div>
                    <div className="text-[10px] text-[#5B6B7A]">Exp: {b.expiry}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold tabular-nums">{b.qty} units</div>
                    <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded-xs">
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
