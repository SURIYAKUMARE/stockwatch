import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, CheckCircle2, AlertTriangle, RefreshCw,
  ChevronDown, ChevronRight, GitMerge, Eye, Package,
  ShieldCheck, Info, X
} from 'lucide-react';
import type { Language } from '../../i18n';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CanonicalMed {
  id: string;
  canonical_name: string;
  generic_name: string;
  brand_name?: string;
  strength: string;
  dosage_form: string;
  unit: string;
  essential: boolean;
  verification_status: string; // VERIFIED | PENDING_REVIEW | REJECTED
  normalized_name?: string;
  aliases?: { alias: string; type: string }[];
  total_stock_across_network?: number;
  facilities_reporting?: number;
}

interface DuplicateCandidate {
  medicine_a: { id: string; name: string; strength: string; form: string };
  medicine_b: { id: string; name: string; strength: string; form: string };
  similarity: number;
  can_merge: boolean;
  status: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function VerificationBadge({ status }: { status: string }) {
  if (status === 'VERIFIED')
    return <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">Verified</span>;
  if (status === 'PENDING_REVIEW')
    return <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Pending Review</span>;
  return <span className="text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">Rejected</span>;
}

function DataSourceBadge() {
  return (
    <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
      Demo Seed
    </span>
  );
}

function MergeModal({
  candidate, onConfirm, onCancel, isMerging
}: {
  candidate: DuplicateCandidate;
  onConfirm: (srcId: string, tgtId: string) => void;
  onCancel: () => void;
  isMerging: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl border border-[#E3E8EE] shadow-2xl max-w-lg w-full p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#14202B] flex items-center gap-2">
              <GitMerge size={16} className="text-[#0F6B6B]" />
              Review Potential Duplicate
            </h3>
            <p className="text-xs text-[#5B6B7A] mt-1">
              Both records have the same strength and dosage form. Merging will consolidate inventory and preserve full history.
            </p>
          </div>
          <button onClick={onCancel} className="text-[#5B6B7A] hover:text-[#14202B]">
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Keep (Target)', med: candidate.medicine_b, color: 'border-teal-300 bg-teal-50' },
            { label: 'Merge Into Target', med: candidate.medicine_a, color: 'border-rose-200 bg-rose-50' },
          ].map(({ label, med, color }) => (
            <div key={med.id} className={`border ${color} rounded-xl p-3 space-y-1`}>
              <div className="text-[10px] font-bold text-[#5B6B7A] uppercase tracking-wider">{label}</div>
              <div className="text-xs font-bold text-[#14202B]">{med.name}</div>
              <div className="text-[11px] text-[#5B6B7A]">{med.strength} · {med.form}</div>
              <div className="text-[10px] font-mono text-[#5B6B7A]">{med.id}</div>
            </div>
          ))}
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex items-start gap-2">
          <AlertTriangle size={13} className="shrink-0 mt-0.5 text-amber-600" />
          <span>
            This action requires officer approval and is permanently recorded in the audit log.
            All inventory balances and transaction history will be re-linked to the target record.
          </span>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-xs font-semibold text-[#5B6B7A] border border-[#E3E8EE] rounded-xl hover:bg-[#F7F9FB]">
            Cancel
          </button>
          <button
            onClick={() => onConfirm(candidate.medicine_a.id, candidate.medicine_b.id)}
            disabled={isMerging}
            className="px-4 py-2 text-xs font-bold text-white bg-[#0F6B6B] hover:bg-[#0a4f4f] rounded-xl disabled:opacity-60 flex items-center gap-2"
          >
            {isMerging ? <RefreshCw size={13} className="animate-spin" /> : <GitMerge size={13} />}
            {isMerging ? 'Merging…' : 'Approve Merge'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function MedicineCatalogue({ lang }: { lang: Language }) {
  const [medicines, setMedicines] = useState<CanonicalMed[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanningDups, setIsScanningDups] = useState(false);
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailCache, setDetailCache] = useState<Record<string, CanonicalMed>>({});
  const [activeTab, setActiveTab] = useState<'catalogue' | 'duplicates'>('catalogue');
  const [mergeCandidate, setMergeCandidate] = useState<DuplicateCandidate | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const isTa = lang === 'ta';

  const loadMedicines = useCallback(() => {
    setIsLoading(true);
    fetch('/api/medicines')
      .then(r => r.json())
      .then(d => { setMedicines(Array.isArray(d) ? d : []); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, []);

  useEffect(() => { loadMedicines(); }, [loadMedicines]);

  const handleScanDuplicates = async () => {
    setIsScanningDups(true);
    setActiveTab('duplicates');
    try {
      const res = await fetch('/api/medicines/duplicates/scan');
      const data = await res.json();
      setDuplicates(data.duplicate_candidates ?? []);
    } catch {
      setDuplicates([]);
    }
    setIsScanningDups(false);
  };

  const handleExpandDetail = async (id: string) => {
    if (expandedId === id) { setExpandedId(null); return; }
    setExpandedId(id);
    if (detailCache[id]) return;
    try {
      const res = await fetch(`/api/medicines/${id}`);
      const data = await res.json();
      setDetailCache(prev => ({ ...prev, [id]: data }));
    } catch { /* ignore */ }
  };

  const handleMergeConfirm = async (srcId: string, tgtId: string) => {
    setIsMerging(true);
    try {
      const res = await fetch('/api/medicines/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_medicine_id: srcId, target_medicine_id: tgtId, approved_by: 'Officer' }),
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ msg: data.message || 'Merge successful', type: 'success' });
        setDuplicates(prev => prev.filter(d => d.medicine_a.id !== srcId));
        loadMedicines();
      } else {
        setToast({ msg: data.detail || 'Merge failed', type: 'error' });
      }
    } catch {
      setToast({ msg: 'Network error during merge', type: 'error' });
    }
    setIsMerging(false);
    setMergeCandidate(null);
    setTimeout(() => setToast(null), 4000);
  };

  const filtered = medicines.filter(m =>
    !query ||
    m.canonical_name.toLowerCase().includes(query.toLowerCase()) ||
    m.generic_name.toLowerCase().includes(query.toLowerCase()) ||
    m.strength.toLowerCase().includes(query.toLowerCase()) ||
    m.dosage_form.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-16 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
          {toast.msg}
        </div>
      )}

      {mergeCandidate && (
        <MergeModal
          candidate={mergeCandidate}
          onConfirm={handleMergeConfirm}
          onCancel={() => setMergeCandidate(null)}
          isMerging={isMerging}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-[#14202B]">
            {isTa ? 'நிலையான மருந்து பட்டியல்' : 'Canonical Medicine Catalogue'}
          </h2>
          <p className="text-xs text-[#5B6B7A] mt-0.5">
            {isTa
              ? 'அனைத்து இருப்பு பதிவுகளும் ஒரே மருந்து நுழைவில் இணைக்கப்படுகின்றன.'
              : 'All inventory records link to a single canonical entry. Duplicates are detected and flagged for human review.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleScanDuplicates}
            disabled={isScanningDups}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors disabled:opacity-60"
          >
            {isScanningDups ? <RefreshCw size={13} className="animate-spin" /> : <Eye size={13} />}
            {isTa ? 'நகல்களை கண்டறி' : 'Scan for Duplicates'}
            {duplicates.length > 0 && (
              <span className="ml-1 bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {duplicates.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#F7F9FB] border border-[#E3E8EE] rounded-xl p-1 w-fit">
        {(['catalogue', 'duplicates'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              activeTab === tab ? 'bg-white text-[#14202B] shadow-sm' : 'text-[#5B6B7A] hover:text-[#14202B]'
            }`}
          >
            {tab === 'catalogue'
              ? (isTa ? 'பட்டியல்' : `Catalogue (${medicines.length})`)
              : (isTa ? 'நகல்கள்' : `Duplicates${duplicates.length > 0 ? ` (${duplicates.length})` : ''}`)}
          </button>
        ))}
      </div>

      {/* ── Tab: Catalogue ── */}
      {activeTab === 'catalogue' && (
        <>
          {/* Search + count */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B7A]" />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={isTa ? 'மருந்து பெயர், வலிமை தேடுக…' : 'Search by name, strength, form…'}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E3E8EE] bg-white text-[#14202B] focus:outline-none focus:ring-2 focus:ring-[#0F6B6B]"
              />
            </div>
            <span className="text-xs text-[#5B6B7A]">{filtered.length} {isTa ? 'மருந்துகள்' : 'medicines'}</span>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-[#5B6B7A]">
              <RefreshCw size={14} className="animate-spin text-[#0F6B6B]" />
              {isTa ? 'பட்டியல் ஏற்றப்படுகிறது…' : 'Loading catalogue…'}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-[#E3E8EE] overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F7F9FB] border-b border-[#E3E8EE] text-[11px] font-semibold text-[#5B6B7A] uppercase tracking-wider">
                    <th className="py-3 px-4 w-6" />
                    <th className="py-3 px-4">{isTa ? 'மருந்து பெயர்' : 'Canonical Name'}</th>
                    <th className="py-3 px-4">{isTa ? 'வலிமை' : 'Strength'}</th>
                    <th className="py-3 px-4">{isTa ? 'வடிவம்' : 'Form'}</th>
                    <th className="py-3 px-4">{isTa ? 'யூனிட்' : 'Unit'}</th>
                    <th className="py-3 px-4">{isTa ? 'அத்தியாவசியம்' : 'Essential'}</th>
                    <th className="py-3 px-4">{isTa ? 'நிலை' : 'Status'}</th>
                    <th className="py-3 px-4">{isTa ? 'தரவு மூலம்' : 'Source'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E8EE]">
                  {filtered.map(m => {
                    const isExpanded = expandedId === m.id;
                    const detail = detailCache[m.id];
                    return (
                      <React.Fragment key={m.id}>
                        <tr
                          className="hover:bg-slate-50/50 cursor-pointer"
                          onClick={() => handleExpandDetail(m.id)}
                        >
                          <td className="py-3 px-4 text-[#5B6B7A]">
                            {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#14202B]">
                            <div>{m.canonical_name}</div>
                            <div className="text-[10px] text-[#5B6B7A] font-normal">{m.generic_name}</div>
                          </td>
                          <td className="py-3 px-4 font-mono text-[#14202B]">{m.strength}</td>
                          <td className="py-3 px-4 text-[#5B6B7A] capitalize">{m.dosage_form}</td>
                          <td className="py-3 px-4 text-[#5B6B7A]">{m.unit}</td>
                          <td className="py-3 px-4">
                            {m.essential ? (
                              <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                                <ShieldCheck size={12} /> {isTa ? 'ஆம்' : 'Yes'}
                              </span>
                            ) : (
                              <span className="text-[#5B6B7A]">{isTa ? 'இல்லை' : 'No'}</span>
                            )}
                          </td>
                          <td className="py-3 px-4"><VerificationBadge status={m.verification_status} /></td>
                          <td className="py-3 px-4"><DataSourceBadge /></td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-teal-50/30">
                            <td colSpan={8} className="px-6 py-4">
                              {!detail ? (
                                <div className="flex items-center gap-2 text-xs text-[#5B6B7A]">
                                  <RefreshCw size={12} className="animate-spin" /> Loading details…
                                </div>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                  <div className="space-y-1.5">
                                    <div className="font-bold text-[#14202B]">{isTa ? 'நெட்வொர்க் இருப்பு' : 'Network Stock'}</div>
                                    <div className="text-xl font-bold text-[#0F6B6B] tabular-nums">
                                      {detail.total_stock_across_network ?? 0}
                                      <span className="text-xs font-normal text-[#5B6B7A] ml-1">{m.unit}</span>
                                    </div>
                                    <div className="text-[11px] text-[#5B6B7A]">
                                      {detail.facilities_reporting ?? 0} {isTa ? 'மையங்கள் தெரிவிக்கின்றன' : 'facilities reporting'}
                                    </div>
                                  </div>
                                  <div className="space-y-1.5">
                                    <div className="font-bold text-[#14202B]">{isTa ? 'மாற்றுப் பெயர்கள்' : 'Known Aliases'}</div>
                                    {(detail.aliases ?? []).length === 0 ? (
                                      <div className="text-[#5B6B7A]">{isTa ? 'ஏதும் இல்லை' : 'None recorded'}</div>
                                    ) : (
                                      <div className="flex flex-wrap gap-1.5">
                                        {(detail.aliases ?? []).map((a, i) => (
                                          <span key={i} className="text-[10px] font-semibold text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">
                                            {a.alias} <span className="opacity-60">({a.type})</span>
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="space-y-1.5">
                                    <div className="font-bold text-[#14202B]">{isTa ? 'கடைசி ஒத்திசைவு' : 'Normalized Form'}</div>
                                    <code className="text-[10px] bg-[#F7F9FB] border border-[#E3E8EE] px-2 py-1 rounded-lg font-mono text-[#5B6B7A] block">
                                      {m.normalized_name || m.canonical_name.toLowerCase()}
                                    </code>
                                    <div className="text-[10px] text-[#5B6B7A]">ID: {m.id}</div>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Safety notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 flex items-start gap-2.5">
            <Info size={14} className="shrink-0 mt-0.5 text-blue-500" />
            <p>
              {isTa
                ? 'CSV இறக்குமதியில் ஒவ்வொரு வரிசையும் இந்த பட்டியலில் சரிபார்க்கப்படும். வெவ்வேறு வலிமை அல்லது வடிவம் உள்ள மருந்துகள் ஒருபோதும் தானாக இணைக்கப்படுவதில்லை.'
                : 'Every CSV import row is validated against this catalogue. Medicines with different strength or dosage form are never automatically merged — a distinct difference always requires a new canonical entry.'}
            </p>
          </div>
        </>
      )}

      {/* ── Tab: Duplicates ── */}
      {activeTab === 'duplicates' && (
        <div className="space-y-4">
          {isScanningDups ? (
            <div className="flex items-center gap-2 text-xs text-[#5B6B7A]">
              <RefreshCw size={14} className="animate-spin text-[#0F6B6B]" />
              {isTa ? 'நகல்களை தேடுகிறது…' : 'Scanning for duplicates…'}
            </div>
          ) : duplicates.length === 0 ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-8 text-center text-xs text-emerald-800 space-y-2">
              <CheckCircle2 size={20} className="mx-auto text-emerald-600" />
              <div className="font-semibold">
                {isTa ? 'நகல்கள் எதுவும் கண்டறியப்படவில்லை' : 'No duplicate candidates found'}
              </div>
              <div className="text-[11px] text-emerald-700">
                {isTa
                  ? 'அனைத்து மருந்துகளும் 70% க்கும் குறைவான ஒற்றுமையைக் கொண்டுள்ளன.'
                  : 'All canonical medicines have < 70% name similarity with each other.'}
              </div>
            </div>
          ) : (
            <>
              <div className="text-xs text-[#5B6B7A]">
                {duplicates.length} {isTa ? 'நகல் வேட்பாளர்கள் கண்டறியப்பட்டனர்' : 'candidate pairs found'}.
                {isTa ? ' மருத்துவ அதிகாரி ஒப்புதல் தேவை.' : ' Officer approval required to merge.'}
              </div>
              <div className="space-y-3">
                {duplicates.map((d, i) => (
                  <div key={i} className={`bg-white border rounded-xl p-4 shadow-sm space-y-3 ${
                    d.can_merge ? 'border-amber-200' : 'border-[#E3E8EE]'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          d.can_merge
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {d.can_merge ? (isTa ? 'இணைக்கக்கூடியது' : 'MERGEABLE') : (isTa ? 'வேறு தயாரிப்பு' : 'DIFFERENT PRODUCT')}
                        </span>
                        <span className="text-[11px] text-[#5B6B7A]">
                          {Math.round(d.similarity * 100)}% {isTa ? 'ஒற்றுமை' : 'similarity'}
                        </span>
                      </div>
                      {d.can_merge && (
                        <button
                          onClick={() => setMergeCandidate(d)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#0F6B6B] border border-[#0F6B6B] rounded-lg hover:bg-teal-50 transition-colors"
                        >
                          <GitMerge size={12} />
                          {isTa ? 'இணைப்பை மதிப்பாய்வு செய்' : 'Review Merge'}
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {[d.medicine_a, d.medicine_b].map((med, mi) => (
                        <div key={mi} className="bg-[#F7F9FB] rounded-lg p-3 border border-[#E3E8EE] space-y-1">
                          <div className="font-bold text-[#14202B]">{med.name}</div>
                          <div className="text-[#5B6B7A]">{med.strength} · {med.form}</div>
                          <code className="text-[10px] font-mono text-[#5B6B7A]">{med.id}</code>
                        </div>
                      ))}
                    </div>
                    {!d.can_merge && (
                      <div className="text-[11px] text-[#5B6B7A] bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
                        ⚠️ {isTa
                          ? 'வலிமை அல்லது வடிவம் வேறுபடுகிறது — இணைக்க அனுமதியில்லை. இவை தனி மருத்துவ நிறுவனங்கள்.'
                          : 'Strength or dosage form differs — merge not permitted. These are clinically distinct entities.'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
