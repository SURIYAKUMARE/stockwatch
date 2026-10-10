import React, { useState, useEffect } from 'react';
import {
  Layers,
  GitMerge,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Plus,
  ArrowRight,
  Info,
  Check,
  ShieldCheck,
  Building2
} from 'lucide-react';
import { Language, translations } from '../i18n';
import { CanonicalMedicineItem, DuplicateCandidate, AuthUser } from '../types';

interface DeduplicationReviewProps {
  currentUser: AuthUser | null;
  lang: Language;
}

export const DeduplicationReview: React.FC<DeduplicationReviewProps> = ({
  currentUser,
  lang
}) => {
  const [candidates, setCandidates] = useState<DuplicateCandidate[]>([]);
  const [medicines, setMedicines] = useState<CanonicalMedicineItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'review' | 'catalogue'>('review');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Add Medicine Modal
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [canName, setCanName] = useState<string>('');
  const [genName, setGenName] = useState<string>('');
  const [brandName, setBrandName] = useState<string>('');
  const [strength, setStrength] = useState<string>('500mg');
  const [dosageForm, setDosageForm] = useState<string>('tablet');
  const [unit, setUnit] = useState<string>('tablets');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [addFeedback, setAddFeedback] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [dupRes, medRes] = await Promise.all([
        fetch('/api/medicines/duplicates/scan').then(r => r.json()),
        fetch('/api/medicines').then(r => r.json())
      ]);

      setCandidates(dupRes.duplicate_candidates || []);
      setMedicines(medRes || []);
    } catch (e) {
      console.error('Failed to load deduplication data', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMerge = async (sourceId: string, targetId: string) => {
    if (!confirm(`Are you sure you want to merge ${sourceId} into ${targetId}? Historical aliases will be preserved.`)) {
      return;
    }
    try {
      const res = await fetch('/api/medicines/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_medicine_id: sourceId,
          target_medicine_id: targetId,
          approved_by: currentUser?.name || 'Authorized Officer',
          notes: 'Deduplication review approval'
        })
      });

      if (res.ok) {
        alert('Medicines successfully merged into canonical record.');
        await fetchData();
      } else {
        const err = await res.json();
        alert(`Merge rejected: ${err.detail || 'Error'}`);
      }
    } catch (e) {
      alert('Network error merging medicines');
    }
  };

  const handleAddMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAddFeedback(null);
    try {
      const res = await fetch('/api/medicines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          canonical_name: canName,
          generic_name: genName || canName,
          brand_name: brandName || undefined,
          strength: strength,
          dosage_form: dosageForm,
          unit: unit,
          essential: true
        })
      });

      const data = await res.json();
      if (res.ok) {
        setAddFeedback(`Success: Added ${canName} to Canonical Catalogue.`);
        setTimeout(() => {
          setShowAddModal(false);
          setCanName('');
          setAddFeedback(null);
          fetchData();
        }, 1200);
      } else {
        setAddFeedback(`Rejected: ${data.detail || 'Failed'}`);
      }
    } catch (e) {
      setAddFeedback('Network error adding medicine');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredMedicines = medicines.filter(m =>
    m.canonical_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.generic_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-[#0F6B6B]">
            <Layers size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#14202B]">
                Canonical Medicine Catalogue & Deduplication Engine
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100 text-[#0F6B6B] border border-teal-200">
                Clinical Safety Guard Enforced
              </span>
            </div>
            <p className="text-xs text-[#5B6B7A] mt-0.5">
              Normalizes hospital trade names, merges brand aliases, and prevents accidental merging of different dosages.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2 border border-[#E3E8EE] rounded-lg text-[#5B6B7A] hover:bg-[#F7F9FB] hover:text-[#0F6B6B] transition"
            title="Scan for duplicates"
          >
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 rounded-lg text-xs font-bold bg-[#0F6B6B] text-white hover:bg-[#0c5555] transition shadow-xs flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>Add Canonical Medicine</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-[#E3E8EE] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('review')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === 'review'
                ? 'bg-[#0F6B6B] text-white shadow-xs'
                : 'text-[#5B6B7A] hover:bg-white'
            }`}
          >
            <GitMerge size={15} />
            <span>Duplicate Scan Candidates ({candidates.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('catalogue')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
              activeTab === 'catalogue'
                ? 'bg-[#0F6B6B] text-white shadow-xs'
                : 'text-[#5B6B7A] hover:bg-white'
            }`}
          >
            <Layers size={15} />
            <span>Verified Catalogue ({medicines.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: DUPLICATE CANDIDATE REVIEW */}
      {activeTab === 'review' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex items-start gap-3">
            <ShieldAlert size={18} className="text-amber-700 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Strict Clinical Safety Rule:</span>
              <p className="mt-0.5">
                The engine strictly blocks merges between different strengths (e.g., 500mg vs 650mg) or different dosage forms (e.g., tablet vs syrup), even if generic names are identical. Merges are allowed only for exact clinical equivalents or brand aliases.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {candidates.map((cand, idx) => {
              const canMerge = cand.can_merge;
              return (
                <div
                  key={idx}
                  className="bg-white border border-[#E3E8EE] rounded-xl p-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-5"
                >
                  {/* Medicine A */}
                  <div className="flex-1 bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg p-3.5 w-full">
                    <span className="text-[10px] font-bold text-[#5B6B7A] uppercase tracking-wider">Candidate A</span>
                    <div className="font-bold text-sm text-[#14202B] mt-0.5">{cand.medicine_a.name}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 rounded bg-white border border-[#E3E8EE] text-xs font-mono text-[#0F6B6B] font-bold">
                        {cand.medicine_a.strength}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white border border-[#E3E8EE] text-xs text-[#5B6B7A]">
                        {cand.medicine_a.form}
                      </span>
                    </div>
                  </div>

                  {/* Similarity Badge */}
                  <div className="flex flex-col items-center shrink-0 px-2 text-center">
                    <div className="flex items-center gap-1 font-mono font-bold text-xs text-[#0F6B6B]">
                      <span>{(cand.similarity * 100).toFixed(0)}%</span>
                      <span className="text-[10px] text-[#5B6B7A]">Similarity</span>
                    </div>
                    <ArrowRight size={18} className="text-[#5B6B7A] my-1" />
                    {canMerge ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Safe to Merge
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        Clinical Mismatch
                      </span>
                    )}
                  </div>

                  {/* Medicine B */}
                  <div className="flex-1 bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg p-3.5 w-full">
                    <span className="text-[10px] font-bold text-[#5B6B7A] uppercase tracking-wider">Candidate B</span>
                    <div className="font-bold text-sm text-[#14202B] mt-0.5">{cand.medicine_b.name}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 rounded bg-white border border-[#E3E8EE] text-xs font-mono text-[#0F6B6B] font-bold">
                        {cand.medicine_b.strength}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-white border border-[#E3E8EE] text-xs text-[#5B6B7A]">
                        {cand.medicine_b.form}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
                    {canMerge ? (
                      <button
                        onClick={() => handleMerge(cand.medicine_b.id, cand.medicine_a.id)}
                        className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Check size={14} />
                        <span>Approve & Merge</span>
                      </button>
                    ) : (
                      <button
                        disabled
                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-slate-100 text-[#5B6B7A] cursor-not-allowed border border-slate-200 flex items-center justify-center gap-1.5"
                        title="Blocked by clinical safety engine: dosages or dosage forms differ"
                      >
                        <XCircle size={14} className="text-rose-500" />
                        <span>Merge Blocked</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {candidates.length === 0 && (
              <div className="bg-white border border-[#E3E8EE] rounded-xl p-10 text-center text-[#5B6B7A] space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
                <h3 className="font-bold text-sm text-[#14202B]">Catalogue Clean & De-duplicated</h3>
                <p className="text-xs">No pending duplicate candidates detected above the similarity threshold.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: VERIFIED CATALOGUE */}
      {activeTab === 'catalogue' && (
        <div className="bg-white border border-[#E3E8EE] rounded-xl overflow-hidden shadow-xs">
          <div className="p-4 border-b border-[#E3E8EE] flex flex-wrap items-center justify-between gap-3 bg-[#F7F9FB]/50">
            <div>
              <h3 className="text-sm font-bold text-[#14202B]">Verified Canonical Medicines</h3>
              <p className="text-xs text-[#5B6B7A]">Standardized Tamil Nadu EDL master list.</p>
            </div>
            <div className="relative min-w-[220px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B7A]" />
              <input
                type="text"
                placeholder="Search canonical name..."
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
                  <th className="py-3 px-4">Canonical Identifier</th>
                  <th className="py-3 px-4">Canonical Name</th>
                  <th className="py-3 px-4">Strength & Dosage Form</th>
                  <th className="py-3 px-4">Generic Name</th>
                  <th className="py-3 px-4 text-right">Network Stock</th>
                  <th className="py-3 px-4 text-right">Facilities Reporting</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E8EE]">
                {filteredMedicines.map((m) => (
                  <tr key={m.id} className="hover:bg-[#F7F9FB]/60 transition">
                    <td className="py-3 px-4 font-mono font-bold text-[#0F6B6B]">{m.id}</td>
                    <td className="py-3 px-4 font-bold text-[#14202B]">{m.canonical_name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-[#14202B] font-mono text-[11px]">
                        {m.strength} · {m.dosage_form}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#5B6B7A]">{m.generic_name}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[#14202B]">
                      {m.total_stock_across_network?.toLocaleString() || '—'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#5B6B7A]">
                      {m.facilities_reporting ?? '12 PHCs'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD MEDICINE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-[#E3E8EE] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[#E3E8EE] flex items-center justify-between bg-[#F7F9FB]">
              <h3 className="font-bold text-sm text-[#14202B]">
                Register New Canonical Medicine
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#5B6B7A] hover:text-[#14202B]">✕</button>
            </div>

            <form onSubmit={handleAddMedicine} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#14202B] mb-1">
                  Canonical Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paracetamol Tablet 500mg"
                  value={canName}
                  onChange={(e) => setCanName(e.target.value)}
                  className="w-full text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg p-2.5 text-[#14202B]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#14202B] mb-1">
                  Generic Active Pharmaceutical Ingredient (API)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paracetamol"
                  value={genName}
                  onChange={(e) => setGenName(e.target.value)}
                  className="w-full text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg p-2.5 text-[#14202B]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#14202B] mb-1">Strength</label>
                  <input
                    type="text"
                    placeholder="e.g. 500mg"
                    value={strength}
                    onChange={(e) => setStrength(e.target.value)}
                    className="w-full text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg p-2.5 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#14202B] mb-1">Dosage Form</label>
                  <select
                    value={dosageForm}
                    onChange={(e) => setDosageForm(e.target.value)}
                    className="w-full text-xs bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg p-2.5"
                  >
                    <option value="tablet">tablet</option>
                    <option value="syrup">syrup</option>
                    <option value="capsule">capsule</option>
                    <option value="sachet">sachet</option>
                    <option value="injection">injection</option>
                  </select>
                </div>
              </div>

              {addFeedback && (
                <div className={`p-3 rounded-lg text-xs font-medium ${
                  addFeedback.startsWith('Success')
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {addFeedback}
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#E3E8EE]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-lg text-xs font-semibold text-[#5B6B7A] hover:bg-[#F7F9FB]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-[#0F6B6B] text-white hover:bg-[#0c5555] transition"
                >
                  {isSubmitting ? 'Validating...' : 'Register Canonical Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
