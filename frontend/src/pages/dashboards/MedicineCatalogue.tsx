import React, { useState, useEffect } from 'react';
import { Search, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import type { Language } from '../../i18n';

interface CatalogMedicine {
  id: string;
  name: string;
  unit: string;
  essential: boolean;
}

export function MedicineCatalogue({ lang }: { lang: Language }) {
  const [medicines, setMedicines] = useState<CatalogMedicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState('');
  const isTa = lang === 'ta';

  useEffect(() => {
    fetch('/api/metadata')
      .then(r => r.json())
      .then(d => { setMedicines(d.medicines || []); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, []);

  const filtered = medicines.filter(m =>
    !query || m.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-base font-bold text-[#14202B]">
          {isTa ? 'மருந்து பட்டியல்' : 'Canonical Medicine Catalogue'}
        </h2>
        <p className="text-xs text-[#5B6B7A] mt-0.5">
          {isTa
            ? 'அனைத்து மருந்துகளும் ஒரே நிலையான பட்டியலில் இருந்து இணைக்கப்படுகின்றன.'
            : 'All inventory records link to a single canonical medicine entry. Duplicate prevention is enforced at import.'}
        </p>
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B7A]" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search medicine…"
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[#E3E8EE] bg-white text-[#14202B] focus:outline-none focus:ring-2 focus:ring-[#0F6B6B]"
          />
        </div>
        <span className="text-xs text-[#5B6B7A]">{filtered.length} medicines</span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-[#5B6B7A]">
          <RefreshCw size={14} className="animate-spin text-[#0F6B6B]" />
          Loading catalogue…
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E3E8EE] overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#F7F9FB] border-b border-[#E3E8EE] text-[11px] font-semibold text-[#5B6B7A] uppercase tracking-wider">
                <th className="py-3 px-4">Medicine Name</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4">Essential</th>
                <th className="py-3 px-4">Catalogue Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E8EE]">
              {filtered.map(m => (
                <tr key={m.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-semibold text-[#14202B]">{m.name}</td>
                  <td className="py-3 px-4 text-[#5B6B7A]">{m.unit}</td>
                  <td className="py-3 px-4">
                    {m.essential ? (
                      <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                        <CheckCircle2 size={13} /> Essential
                      </span>
                    ) : (
                      <span className="text-[#5B6B7A]">Non-essential</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      Demo Seed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 space-y-1">
        <div className="font-bold">Duplicate Prevention (Phase 4)</div>
        <p>
          CSV imports will be validated against this catalogue. Fuzzy-match warnings fire for high-similarity names.
          Merges require authorized officer approval and are fully audited.
        </p>
      </div>
    </div>
  );
}
