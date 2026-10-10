import React, { useState, useRef, useCallback } from 'react';
import {
  Upload, FileText, CheckCircle2, AlertTriangle, X,
  RefreshCw, Info, Download, Eye, Send
} from 'lucide-react';
import type { Language } from '../../i18n';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ParsedRow {
  row: number;
  medicine_name: string;
  strength?: string;
  dosage_form?: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  transaction_type: string;
  idempotency_key?: string;
  _parseError?: string;
}

interface ImportResult {
  status: string;
  total_rows: number;
  accepted_count: number;
  rejected_count: number;
  accepted: { row: number; canonical_id: string; medicine: string; quantity: number }[];
  rejected: { row: number; medicine: string; reason: string }[];
}

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/['"]/g, ''));
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = cells[idx] ?? ''; });

    const qty = parseInt(obj.quantity || '0');
    rows.push({
      row: i,
      medicine_name: obj.medicine_name || obj.medicine || obj.name || '',
      strength: obj.strength || undefined,
      dosage_form: obj.dosage_form || obj.form || undefined,
      batch_number: obj.batch_number || obj.batch || `BTH-IMP-${i}`,
      expiry_date: obj.expiry_date || obj.expiry || '2027-12-31',
      quantity: isNaN(qty) ? 0 : qty,
      transaction_type: obj.transaction_type || obj.type || 'receive',
      idempotency_key: obj.idempotency_key || undefined,
      _parseError: !obj.medicine_name && !obj.medicine && !obj.name ? 'Missing medicine name' : undefined,
    });
  }
  return rows;
}

const CSV_TEMPLATE = `medicine_name,strength,dosage_form,batch_number,expiry_date,quantity,transaction_type
Paracetamol 500mg,500mg,tablet,BTH-2025-001,2027-06-30,100,receive
ORS Sachets 20.5g,20.5g,sachet,BTH-2025-002,2028-01-01,200,receive
Amoxicillin 250mg,250mg,capsule,BTH-2025-003,2027-09-30,50,receive`;

// ─── Main component ───────────────────────────────────────────────────────────

interface CsvImporterProps {
  lang: Language;
  ownerId: string;
  ownerType?: 'facility' | 'pharmacy';
}

export function CsvImporter({ lang, ownerId, ownerType = 'facility' }: CsvImporterProps) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [stage, setStage] = useState<'upload' | 'preview' | 'result'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isTa = lang === 'ta';

  const handleFile = useCallback((file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert(isTa ? '.csv கோப்புகள் மட்டுமே ஏற்றுக்கொள்ளப்படும்.' : 'Only .csv files are accepted.');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const rows = parseCSV(text);
      setParsedRows(rows);
      setStage('preview');
      setImportResult(null);
    };
    reader.readAsText(file);
  }, [isTa]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleSubmitImport = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);
    try {
      const res = await fetch('/api/inventory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner_type: ownerType,
          owner_id: ownerId,
          rows: parsedRows.filter(r => !r._parseError).map((r, i) => ({
            medicine_name: r.medicine_name,
            strength: r.strength,
            dosage_form: r.dosage_form,
            batch_number: r.batch_number,
            expiry_date: r.expiry_date,
            quantity: r.quantity,
            transaction_type: r.transaction_type,
            idempotency_key: r.idempotency_key ?? `CSV-${ownerId}-${fileName}-row${r.row}-${Date.now()}`,
          })),
        }),
      });
      const data = await res.json();
      setImportResult(data);
      setStage('result');
    } catch {
      alert(isTa ? 'நெட்வொர்க் பிழை.' : 'Network error during import.');
    }
    setIsImporting(false);
  };

  const handleReset = () => {
    setParsedRows([]);
    setFileName('');
    setImportResult(null);
    setStage('upload');
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'stockwatch_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const validRows = parsedRows.filter(r => !r._parseError);
  const errorRows = parsedRows.filter(r => !!r._parseError);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-[#14202B] flex items-center gap-2">
            <Upload size={16} className="text-[#0F6B6B]" />
            {isTa ? 'CSV இருப்பு இறக்குமதி' : 'Import Inventory from CSV'}
          </h2>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            {isTa
              ? 'நிலையான மருந்து பட்டியலில் சரிபார்க்கப்பட்ட இடம்பெயர்வு ஏற்றுமதி.'
              : 'Validated against the canonical catalogue. Idempotent — safe to re-submit without duplicating records.'}
          </p>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0F6B6B] border border-[#0F6B6B] rounded-xl hover:bg-teal-50"
        >
          <Download size={13} />
          {isTa ? 'வார்ப்புரு பதிவிறக்கம்' : 'Download Template'}
        </button>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-xs">
        {[
          { id: 'upload', label: isTa ? '1. கோப்பு' : '1. Upload' },
          { id: 'preview', label: isTa ? '2. முன்னோட்டம்' : '2. Preview' },
          { id: 'result', label: isTa ? '3. முடிவு' : '3. Result' },
        ].map((s, i) => (
          <React.Fragment key={s.id}>
            <div className={`flex items-center gap-1.5 font-semibold px-3 py-1 rounded-full ${
              stage === s.id ? 'bg-[#0F6B6B] text-white' : 'text-[#5B6B7A]'
            }`}>
              {s.label}
            </div>
            {i < 2 && <div className="w-8 h-px bg-[#E3E8EE]" />}
          </React.Fragment>
        ))}
      </div>

      {/* ── Stage: Upload ── */}
      {stage === 'upload' && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${
            dragOver ? 'border-[#0F6B6B] bg-teal-50' : 'border-[#E3E8EE] hover:border-[#0F6B6B] hover:bg-teal-50/30'
          }`}
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={32} className="mx-auto text-[#5B6B7A] mb-3" />
          <div className="text-sm font-semibold text-[#14202B]">
            {isTa ? 'CSV கோப்பை இழுத்து விடுங்கள் அல்லது கிளிக் செய்யுங்கள்' : 'Drag & drop CSV or click to browse'}
          </div>
          <div className="text-xs text-[#5B6B7A] mt-1">
            {isTa ? 'வார்ப்புருவை பதிவிறக்கம் செய்து பூர்த்தி செய்யுங்கள்' : 'Download the template above to get started'}
          </div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      )}

      {/* ── Stage: Preview ── */}
      {stage === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-[#14202B]">
              <FileText size={14} className="text-[#0F6B6B]" />
              {fileName}
            </div>
            <button onClick={handleReset} className="flex items-center gap-1 text-xs text-[#5B6B7A] hover:text-[#14202B]">
              <X size={13} /> {isTa ? 'வேறொரு கோப்பு' : 'Choose different file'}
            </button>
          </div>

          {/* Summary chips */}
          <div className="flex gap-3 flex-wrap">
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
              {validRows.length} {isTa ? 'சரியான வரிகள்' : 'valid rows'}
            </span>
            {errorRows.length > 0 && (
              <span className="text-[11px] font-bold text-red-700 bg-red-50 border border-red-200 px-3 py-1 rounded-full">
                {errorRows.length} {isTa ? 'பார்ஸிங் பிழைகள்' : 'parse errors'}
              </span>
            )}
          </div>

          {/* Preview table */}
          <div className="bg-white rounded-xl border border-[#E3E8EE] overflow-hidden shadow-sm overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-[#F7F9FB] border-b border-[#E3E8EE] text-[10px] font-semibold text-[#5B6B7A] uppercase tracking-wider">
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">{isTa ? 'மருந்து பெயர்' : 'Medicine Name'}</th>
                  <th className="py-2.5 px-3">{isTa ? 'வலிமை' : 'Strength'}</th>
                  <th className="py-2.5 px-3">{isTa ? 'தொகுதி' : 'Batch'}</th>
                  <th className="py-2.5 px-3">{isTa ? 'காலாவதி' : 'Expiry'}</th>
                  <th className="py-2.5 px-3">{isTa ? 'அளவு' : 'Qty'}</th>
                  <th className="py-2.5 px-3">{isTa ? 'வகை' : 'Type'}</th>
                  <th className="py-2.5 px-3">{isTa ? 'நிலை' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E8EE]">
                {parsedRows.map(r => (
                  <tr key={r.row} className={r._parseError ? 'bg-red-50/30' : 'hover:bg-slate-50/50'}>
                    <td className="py-2 px-3 text-[#5B6B7A]">{r.row}</td>
                    <td className="py-2 px-3 font-semibold text-[#14202B]">{r.medicine_name || '—'}</td>
                    <td className="py-2 px-3 font-mono text-[#5B6B7A]">{r.strength ?? '—'}</td>
                    <td className="py-2 px-3 font-mono text-[#5B6B7A]">{r.batch_number}</td>
                    <td className="py-2 px-3 text-[#5B6B7A]">{r.expiry_date}</td>
                    <td className="py-2 px-3 tabular-nums font-bold">{r.quantity}</td>
                    <td className="py-2 px-3 text-[#5B6B7A]">{r.transaction_type}</td>
                    <td className="py-2 px-3">
                      {r._parseError ? (
                        <span className="text-[10px] text-red-700 font-bold">⚠ {r._parseError}</span>
                      ) : (
                        <span className="text-[10px] text-emerald-700 font-bold">✓ Ready</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {validRows.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 flex items-start gap-2">
              <Info size={14} className="shrink-0 mt-0.5 text-amber-600" />
              <span>
                {isTa
                  ? 'சமர்ப்பித்தவுடன், ஒவ்வொரு வரிசையும் நிலையான பட்டியலில் சரிபார்க்கப்படும். ஒரே மாதிரியான idempotency key கொண்ட வரிகள் மீண்டும் சமர்ப்பிக்கப்பட்டாலும் நகல் பதிவுகள் உருவாக்கப்படாது.'
                  : 'On submit, each row is validated against the canonical catalogue. Rows with the same idempotency key will be skipped on re-submission — this import is safe to retry.'}
              </span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#5B6B7A] border border-[#E3E8EE] rounded-xl hover:bg-[#F7F9FB]"
            >
              <X size={13} /> {isTa ? 'ரத்து' : 'Cancel'}
            </button>
            <button
              onClick={handleSubmitImport}
              disabled={isImporting || validRows.length === 0}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold text-white bg-[#0F6B6B] hover:bg-[#0a4f4f] rounded-xl disabled:opacity-60 transition-colors"
            >
              {isImporting ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
              {isImporting
                ? (isTa ? 'இறக்குமதி செய்கிறது…' : 'Importing…')
                : (isTa ? `${validRows.length} வரிகளை இறக்குமதி செய்` : `Import ${validRows.length} rows`)}
            </button>
          </div>
        </div>
      )}

      {/* ── Stage: Result ── */}
      {stage === 'result' && importResult && (
        <div className="space-y-4">
          {/* Summary */}
          <div className={`p-5 rounded-2xl border text-sm space-y-2 ${
            importResult.rejected_count === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
          }`}>
            <div className={`font-bold text-base ${importResult.rejected_count === 0 ? 'text-emerald-800' : 'text-amber-800'}`}>
              {importResult.rejected_count === 0
                ? (isTa ? '✓ இறக்குமதி வெற்றிகரமாக முடிந்தது!' : '✓ Import completed successfully!')
                : (isTa ? '⚠ இறக்குமதி பகுதியளவு முடிந்தது' : '⚠ Import completed with some rejections')}
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs mt-2">
              {[
                { label: isTa ? 'மொத்த வரிகள்' : 'Total rows', value: importResult.total_rows, color: 'text-[#14202B]' },
                { label: isTa ? 'ஏற்கப்பட்டவை' : 'Accepted', value: importResult.accepted_count, color: 'text-emerald-700' },
                { label: isTa ? 'நிராகரிக்கப்பட்டவை' : 'Rejected', value: importResult.rejected_count, color: importResult.rejected_count > 0 ? 'text-red-700' : 'text-[#5B6B7A]' },
              ].map(k => (
                <div key={k.label} className="bg-white/70 rounded-xl p-3 text-center border border-white">
                  <div className="text-[10px] text-[#5B6B7A]">{k.label}</div>
                  <div className={`text-xl font-bold tabular-nums mt-0.5 ${k.color}`}>{k.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Rejected rows */}
          {importResult.rejected.length > 0 && (
            <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-red-200 text-xs font-bold text-red-800 flex items-center gap-2">
                <AlertTriangle size={13} /> {isTa ? 'நிராகரிக்கப்பட்ட வரிகள்' : 'Rejected Rows'}
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-red-50 text-[10px] text-red-700 font-semibold uppercase tracking-wider">
                    <th className="py-2 px-3">{isTa ? 'வரி' : 'Row'}</th>
                    <th className="py-2 px-3">{isTa ? 'மருந்து' : 'Medicine'}</th>
                    <th className="py-2 px-3">{isTa ? 'காரணம்' : 'Reason'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-red-100">
                  {importResult.rejected.map((r, i) => (
                    <tr key={i}>
                      <td className="py-2 px-3 tabular-nums text-red-700 font-mono">{r.row}</td>
                      <td className="py-2 px-3 font-semibold text-[#14202B]">{r.medicine}</td>
                      <td className="py-2 px-3 text-red-700">{r.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#0F6B6B] rounded-xl hover:bg-[#0a4f4f]"
            >
              {isTa ? 'மேலும் இறக்குமதி' : 'Import Another File'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
