import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Search,
  Building2,
  Hospital,
  AlertTriangle,
  Layers,
  Phone,
  Navigation,
  ArrowRight,
  Filter,
  CheckCircle2,
  RefreshCw,
  TrendingDown,
  ShoppingBag,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { LeafletMap } from '../../components/LeafletMap';
import type { MapLocationItem, MedicineStockInfo } from '../../types';
import { FALLBACK_MAP_LOCATIONS, FALLBACK_MEDICINES } from '../../db/demoFallbackData';
import type { Language } from '../../i18n';

interface NetworkMapScreenProps {
  lang?: Language;
  onNavigateToTransfers?: (centreId: string, medicineId: string) => void;
  preselectedLocationId?: string;
}

export const NetworkMapScreen: React.FC<NetworkMapScreenProps> = ({
  lang = 'en',
  onNavigateToTransfers,
  preselectedLocationId
}) => {
  const [locations, setLocations] = useState<MapLocationItem[]>(FALLBACK_MAP_LOCATIONS);
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    preselectedLocationId || 'phc_valparai'
  );
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUsingFallback, setIsUsingFallback] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'FACILITY' | 'PHARMACY'>('ALL');
  const [selectedMedicineId, setSelectedMedicineId] = useState<string>('');
  const [medicineSearchInShop, setMedicineSearchInShop] = useState<string>('');

  // Fetch live map data from API with offline fallback
  const fetchMapData = async () => {
    setIsLoading(true);
    try {
      let url = '/api/map/locations';
      const params = new URLSearchParams();
      if (selectedMedicineId) params.append('medicine_id', selectedMedicineId);
      if (categoryFilter !== 'ALL') params.append('category', categoryFilter.toLowerCase());
      if (searchQuery) params.append('search', searchQuery);

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.locations && Array.isArray(data.locations)) {
        setLocations(data.locations);
        setIsUsingFallback(false);
      } else {
        throw new Error('Invalid response structure');
      }
    } catch (e) {
      console.warn('Map locations fetch failed or offline, loading fallback data', e);
      setIsUsingFallback(true);
      // Filter fallback locally
      let filtered = [...FALLBACK_MAP_LOCATIONS];
      if (categoryFilter !== 'ALL') {
        filtered = filtered.filter((l) => l.category === categoryFilter);
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (l) =>
            l.name.toLowerCase().includes(q) ||
            l.block.toLowerCase().includes(q) ||
            l.address.toLowerCase().includes(q)
        );
      }
      setLocations(filtered);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMapData();
    const mapPoll = setInterval(() => {
      if (navigator.onLine && !document.hidden) {
        fetchMapData();
      }
    }, 15000);
    return () => clearInterval(mapPoll);
  }, [categoryFilter, selectedMedicineId]);

  // Overall metrics across the district network
  const metrics = useMemo(() => {
    const totalLocations = locations.length;
    const totalFacilities = locations.filter((l) => l.category === 'FACILITY').length;
    const totalPharmacies = locations.filter((l) => l.category === 'PHARMACY').length;
    const totalStock = locations.reduce((sum, l) => sum + (l.total_stock_count || 0), 0);
    const criticalFacilities = locations.filter(
      (l) => (l.critical_shortages_count ?? 0) > 0
    ).length;

    return {
      totalLocations,
      totalFacilities,
      totalPharmacies,
      totalStock,
      criticalFacilities
    };
  }, [locations]);

  // Currently selected location object
  const selectedLocation = useMemo(() => {
    return locations.find((l) => l.id === selectedLocationId) || locations[0] || null;
  }, [locations, selectedLocationId]);

  // Medicines inside the selected shop/facility (filtered by inner search)
  const filteredMedicinesInSelected = useMemo(() => {
    if (!selectedLocation || !selectedLocation.medicines) return [];
    if (!medicineSearchInShop) return selectedLocation.medicines;
    const q = medicineSearchInShop.toLowerCase();
    return selectedLocation.medicines.filter((m) =>
      m.medicine_name.toLowerCase().includes(q)
    );
  }, [selectedLocation, medicineSearchInShop]);

  // Highlighted medicine meta (if selected in filter)
  const highlightedMedMeta = useMemo(() => {
    if (!selectedMedicineId) return null;
    return FALLBACK_MEDICINES.find((m) => m.id === selectedMedicineId) || null;
  }, [selectedMedicineId]);

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header and Context */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#0F6B6B]/10 rounded-xl text-[#0F6B6B]">
              <MapPin size={22} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#14202B]">
                {lang === 'ta'
                  ? 'நெட்வொர்க் வரைபட இருப்பு மற்றும் மருந்தகங்கள்'
                  : 'Network Stock Map & Pharmacy Locator'}
              </h1>
              <p className="text-xs text-[#5B6B7A]">
                {lang === 'ta'
                  ? 'கோயம்புத்தூர் மாவட்டத்தில் உள்ள ஆரம்ப சுகாதார நிலையங்கள் (PHC) மற்றும் சில்லறை மருந்தகங்களின் நேரலை இருப்பு.'
                  : 'Geospatial medicine stock intelligence across Primary Health Centres (PHCs) and verified retail chemist shops in Coimbatore District.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isUsingFallback && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Offline Cache Mode
            </div>
          )}
          <button
            onClick={fetchMapData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white border border-[#E3E8EE] hover:bg-[#F7F9FB] text-[#14202B] transition shadow-xs"
            title="Refresh Map Stocks"
          >
            <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-[#E3E8EE] rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-[#5B6B7A] flex items-center justify-between">
            <span>TOTAL MAPPED LOCATIONS</span>
            <Building2 size={15} className="text-[#0F6B6B]" />
          </div>
          <div className="text-2xl font-black text-[#14202B] mt-1">
            {metrics.totalLocations}
          </div>
          <div className="text-[10px] text-[#5B6B7A] mt-0.5">
            {metrics.totalFacilities} Govt PHCs · {metrics.totalPharmacies} Retail Stores
          </div>
        </div>

        <div className="bg-white border border-[#E3E8EE] rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-[#5B6B7A] flex items-center justify-between">
            <span>TOTAL STOCK UNITS</span>
            <Layers size={15} className="text-teal-600" />
          </div>
          <div className="text-2xl font-black text-[#0F6B6B] mt-1">
            {metrics.totalStock.toLocaleString()}
          </div>
          <div className="text-[10px] text-teal-700 font-medium mt-0.5">
            Verified across facilities & shops
          </div>
        </div>

        <div className="bg-white border border-[#E3E8EE] rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-[#5B6B7A] flex items-center justify-between">
            <span>ESSENTIAL MEDICINES</span>
            <ShoppingBag size={15} className="text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-700 mt-1">
            16 Types
          </div>
          <div className="text-[10px] text-[#5B6B7A] mt-0.5">
            EDL Tamil Nadu standard catalogue
          </div>
        </div>

        <div className="bg-white border border-[#E3E8EE] rounded-xl p-3.5 shadow-xs">
          <div className="text-[11px] font-semibold text-[#5B6B7A] flex items-center justify-between">
            <span>CRITICAL SHORTAGES</span>
            <AlertTriangle size={15} className="text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {metrics.criticalFacilities} Facilities
          </div>
          <div className="text-[10px] text-rose-700 font-medium mt-0.5">
            Surplus transfers recommended
          </div>
        </div>
      </div>

      {/* Filter and Medicine Selector Controls */}
      <div className="bg-white border border-[#E3E8EE] rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Search bar */}
          <div className="md:col-span-5 relative">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5B6B7A]"
            />
            <input
              type="text"
              placeholder="Search facility name, medical shop, or block..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchMapData()}
              className="w-full pl-9 pr-3 py-2 bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg text-xs text-[#14202B] placeholder-[#8A98A5] focus:outline-none focus:ring-1 focus:ring-[#0F6B6B]"
            />
          </div>

          {/* Specific Medicine Filter */}
          <div className="md:col-span-4">
            <select
              value={selectedMedicineId}
              onChange={(e) => setSelectedMedicineId(e.target.value)}
              className="w-full px-3 py-2 bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg text-xs font-medium text-[#14202B] focus:outline-none focus:ring-1 focus:ring-[#0F6B6B]"
            >
              <option value="">🔎 Highlight Specific Medicine (All 16)</option>
              {FALLBACK_MEDICINES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.unit})
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter Buttons */}
          <div className="md:col-span-3 flex items-center gap-1.5 bg-[#F7F9FB] p-1 rounded-lg border border-[#E3E8EE]">
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-bold transition ${
                categoryFilter === 'ALL'
                  ? 'bg-white text-[#0F6B6B] shadow-xs'
                  : 'text-[#5B6B7A] hover:text-[#14202B]'
              }`}
            >
              All ({metrics.totalLocations})
            </button>
            <button
              onClick={() => setCategoryFilter('FACILITY')}
              className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-bold transition ${
                categoryFilter === 'FACILITY'
                  ? 'bg-[#0F6B6B] text-white shadow-xs'
                  : 'text-[#5B6B7A] hover:text-[#14202B]'
              }`}
            >
              PHCs ({metrics.totalFacilities})
            </button>
            <button
              onClick={() => setCategoryFilter('PHARMACY')}
              className={`flex-1 py-1.5 px-2 rounded-md text-[11px] font-bold transition ${
                categoryFilter === 'PHARMACY'
                  ? 'bg-[#7C3AED] text-white shadow-xs'
                  : 'text-[#5B6B7A] hover:text-[#14202B]'
              }`}
            >
              Shops ({metrics.totalPharmacies})
            </button>
          </div>
        </div>

        {/* Selected Medicine Status Notice */}
        {highlightedMedMeta && (
          <div className="bg-sky-50 border border-sky-200 rounded-lg p-2.5 flex items-center justify-between text-xs text-sky-900 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sky-950">Active Filter:</span>
              <span>
                Displaying live quantities of <strong>{highlightedMedMeta.name}</strong> on all map pins and shop badges.
              </span>
            </div>
            <button
              onClick={() => setSelectedMedicineId('')}
              className="text-[11px] text-sky-700 hover:text-sky-900 underline font-semibold"
            >
              Clear Filter
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Map on Left / Top, Detailed Shop & Medicine Breakdown on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Map */}
        <div className="lg:col-span-7 bg-white border border-[#E3E8EE] rounded-xl p-3 shadow-xs space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#5B6B7A] flex items-center gap-1.5">
              <span>Interactive Coimbatore District Map</span>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                {locations.length} Locations Active
              </span>
            </h2>
            <div className="flex items-center gap-3 text-[11px] text-[#5B6B7A]">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0F6B6B]" /> Govt PHC
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#7C3AED]" /> Retail Shop
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" /> Shortage
              </span>
            </div>
          </div>

          {/* Leaflet Map Component */}
          <LeafletMap
            locations={locations}
            selectedLocationId={selectedLocationId}
            onSelectLocation={(locId) => setSelectedLocationId(locId)}
            highlightMedicineId={selectedMedicineId}
            height={520}
          />

          <div className="p-2.5 bg-[#F7F9FB] rounded-lg border border-[#E3E8EE] text-[11px] text-[#5B6B7A] flex items-center justify-between">
            <span>
              💡 <em>Click any pin on the map to inspect full inventory and available medicine stock.</em>
            </span>
            <span className="font-semibold text-[#0F6B6B]">
              Selected: {selectedLocation?.name || 'None'}
            </span>
          </div>
        </div>

        {/* Right Column: Selected Shop / Centre Details & Complete Medicine List */}
        <div className="lg:col-span-5 bg-white border border-[#E3E8EE] rounded-xl shadow-xs overflow-hidden flex flex-col">
          {selectedLocation ? (
            <div className="p-4 space-y-4">
              {/* Shop / Centre Header */}
              <div className="border-b border-[#E3E8EE] pb-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
                      selectedLocation.category === 'PHARMACY'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-teal-50 text-[#0F6B6B] border border-teal-200'
                    }`}
                  >
                    {selectedLocation.type_label}
                  </span>
                  <span className="text-[11px] font-semibold text-[#5B6B7A]">
                    {selectedLocation.block} Block
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-[#14202B] leading-tight">
                  {selectedLocation.name}
                </h3>
                <p className="text-xs text-[#5B6B7A] mt-1 flex items-center gap-1.5">
                  <MapPin size={13} className="shrink-0 text-slate-400" />
                  <span>{selectedLocation.address}</span>
                </p>

                {/* Contact and Directions Quick Action Buttons */}
                <div className="flex items-center gap-2 mt-3">
                  {selectedLocation.phone && (
                    <a
                      href={`tel:${selectedLocation.phone.replace(/[^0-9+]/g, '')}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-[#14202B] transition"
                    >
                      <Phone size={12} className="text-[#0F6B6B]" />
                      <span>{selectedLocation.phone}</span>
                    </a>
                  )}

                  <a
                    href={
                      selectedLocation.directions_url ||
                      `https://www.google.com/maps/dir/?api=1&destination=${selectedLocation.lat},${selectedLocation.lng}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#0F6B6B]/10 hover:bg-[#0F6B6B]/20 text-[#0F6B6B] transition"
                  >
                    <Navigation size={12} />
                    <span>Get Directions</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>

              {/* Stock Summary Banner */}
              <div className="grid grid-cols-2 gap-2 bg-[#F7F9FB] p-3 rounded-lg border border-[#E3E8EE] text-center">
                <div>
                  <div className="text-[10px] font-bold text-[#5B6B7A] uppercase">
                    Total Medicine Units
                  </div>
                  <div className="text-lg font-black text-[#0F6B6B]">
                    {selectedLocation.total_stock_count.toLocaleString()}
                  </div>
                </div>
                <div className="border-l border-[#E3E8EE]">
                  <div className="text-[10px] font-bold text-[#5B6B7A] uppercase">
                    Distinct Medicines
                  </div>
                  <div className="text-lg font-black text-sky-700">
                    {selectedLocation.distinct_medicines_count}
                  </div>
                </div>
              </div>

              {/* Search Inside Shop Medicine List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#14202B] flex items-center gap-1.5">
                    <span>Available Medicines ({filteredMedicinesInSelected.length})</span>
                  </h4>
                  {selectedLocation.critical_shortages_count && selectedLocation.critical_shortages_count > 0 ? (
                    <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
                      {selectedLocation.critical_shortages_count} Critical Shortages
                    </span>
                  ) : null}
                </div>

                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8A98A5]"
                  />
                  <input
                    type="text"
                    placeholder="Search medicine name in this facility..."
                    value={medicineSearchInShop}
                    onChange={(e) => setMedicineSearchInShop(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-[#F7F9FB] border border-[#E3E8EE] rounded-lg text-xs text-[#14202B] placeholder-[#8A98A5] focus:outline-none focus:ring-1 focus:ring-[#0F6B6B]"
                  />
                </div>
              </div>

              {/* Medicines Table */}
              <div className="max-h-96 overflow-y-auto border border-[#E3E8EE] rounded-lg divide-y divide-[#E3E8EE]">
                {filteredMedicinesInSelected.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#5B6B7A]">
                    No medicines match the search filter.
                  </div>
                ) : (
                  filteredMedicinesInSelected.map((med) => {
                    const isCrit = med.status === 'CRITICAL' || med.quantity === 0;
                    const isLow = med.status === 'LOW_STOCK';
                    const isHighlighted = med.medicine_id === selectedMedicineId;

                    return (
                      <div
                        key={med.medicine_id}
                        className={`p-2.5 text-xs transition flex items-center justify-between gap-3 ${
                          isHighlighted
                            ? 'bg-sky-50/80 font-medium'
                            : 'hover:bg-[#F7F9FB]'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[#14202B] truncate">
                              {med.medicine_name}
                            </span>
                            {isHighlighted && (
                              <span className="text-[9px] bg-sky-200 text-sky-800 px-1.5 py-0.2 rounded font-bold">
                                MATCH
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-[#5B6B7A] mt-0.5">
                            {med.days_of_cover !== undefined && (
                              <span>
                                {med.days_of_cover === 0
                                  ? 'Depleted'
                                  : `${med.days_of_cover.toFixed(1)} days cover`}
                              </span>
                            )}
                            {med.price_inr !== undefined && (
                              <span className="text-emerald-700 font-semibold">
                                ₹{med.price_inr} MRP
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quantity and Status */}
                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-xs text-[#14202B]">
                            {med.quantity.toLocaleString()} {med.unit}
                          </div>
                          <div className="mt-0.5">
                            {isCrit ? (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">
                                CRITICAL
                              </span>
                            ) : isLow ? (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                LOW STOCK
                              </span>
                            ) : (
                              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                                IN STOCK
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Quick Transfer Route Action Button */}
              {selectedLocation.category === 'FACILITY' && onNavigateToTransfers && (
                <button
                  onClick={() =>
                    onNavigateToTransfers(selectedLocation.id, selectedMedicineId || 'med_pcm')
                  }
                  className="w-full py-2.5 px-4 rounded-lg bg-[#0F6B6B] hover:bg-[#0C5555] text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
                >
                  <span>Initiate Inter-Facility Transfer for this Centre</span>
                  <ArrowRight size={14} />
                </button>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#5B6B7A]">
              Select a location on the map to view inventory breakdown.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default NetworkMapScreen;
