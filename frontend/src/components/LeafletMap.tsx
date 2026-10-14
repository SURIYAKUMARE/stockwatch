import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import type { MapLocationItem } from '../types';

interface LeafletMapProps {
  // Transfer route mode (used in Transfers.tsx)
  shortageCentre?: { name: string; lat: number; lng: number; needed_qty?: number };
  donors?: { donor_name: string; lat: number; lng: number; distance_km: number; surplus: number }[];

  // Network & Pharmacy/Facility Map Mode (used in NetworkMapScreen.tsx)
  locations?: MapLocationItem[];
  selectedLocationId?: string | null;
  onSelectLocation?: (locationId: string) => void;
  highlightMedicineId?: string;
  className?: string;
  height?: string | number;
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  shortageCentre,
  donors = [],
  locations,
  selectedLocationId,
  onSelectLocation,
  highlightMedicineId,
  className,
  height = '320px'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routesLayerRef = useRef<L.LayerGroup | null>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const fallbackAddedRef = useRef<boolean>(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. INITIALIZE MAP ONCE ON MOUNT
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Guard against duplicate initialization in strict mode
    if ((mapContainerRef.current as any)._leaflet_id && mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }
    delete (mapContainerRef.current as any)._leaflet_id;

    const defaultLat = 10.60;
    const defaultLng = 76.96;

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 10,
      zoomControl: true,
      attributionControl: false
    });

    mapInstanceRef.current = map;
    fallbackAddedRef.current = false;

    // Layer groups for dynamic data
    const markersLayer = L.layerGroup().addTo(map);
    const routesLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    routesLayerRef.current = routesLayer;

    // Primary basemap: Standard OpenStreetMap (Clean, open-source, fast, 100% free with NO API key needed)
    const primaryTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c'],
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    // Fallback basemap: ESRI World Street Map on tile loading error
    primaryTiles.on('tileerror', () => {
      if (!fallbackAddedRef.current) {
        fallbackAddedRef.current = true;
        L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
          maxZoom: 19,
          attribution: 'Tiles &copy; Esri'
        }).addTo(map);
      }
    });

    // Invalidate size after layout completes to prevent grey/blank tiles
    const timer1 = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    const timer2 = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 450);

    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', handleResize);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. RENDER LOCATIONS (PHCs, CHCs, RETAIL SHOPS) INTO MARKERS LAYER
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer || !locations || locations.length === 0) return;

    markersLayer.clearLayers();
    markersRef.current = {};

    const bounds = L.latLngBounds([]);

    locations.forEach((loc) => {
      const lat = Number(loc.lat);
      const lng = Number(loc.lng);
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) return;

      bounds.extend([lat, lng]);

      const isSelected = loc.id === selectedLocationId;
      const isPharmacy = loc.category === 'PHARMACY';
      const hasShortages = (loc.critical_shortages_count ?? 0) > 0;

      const highlightedMed = highlightMedicineId
        ? loc.medicines.find((m) => m.medicine_id === highlightMedicineId)
        : null;

      const bgColor = isPharmacy ? '#7C3AED' : '#0F6B6B';
      const iconSymbol = isPharmacy ? '💊' : '🏥';
      const markerBorder = isSelected
        ? '3px solid #F59E0B; box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.45); transform: scale(1.15);'
        : '2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.25);';

      const customMarkerIcon = L.divIcon({
        className: 'custom-network-marker-clean',
        html: `
          <div style="position: relative; cursor: pointer; transition: transform 0.2s; background: transparent;">
            <div style="background-color: ${bgColor}; color: white; border-radius: 50%; width: ${isSelected ? 36 : 30}px; height: ${isSelected ? 36 : 30}px; display: flex; align-items: center; justify-content: center; font-size: ${isSelected ? 16 : 14}px; ${markerBorder}">
              ${iconSymbol}
            </div>
            ${
              hasShortages
                ? `<div style="position: absolute; top: -3px; right: -3px; background-color: #DC2626; color: white; border-radius: 50%; width: 14px; height: 14px; font-size: 9px; font-weight: 800; display: flex; align-items: center; justify-content: center; border: 1.5px solid white;">!</div>`
                : ''
            }
            ${
              highlightedMed
                ? `<div style="position: absolute; bottom: -14px; left: 50%; transform: translateX(-50%); background-color: #1E293B; color: #38BDF8; font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 4px; white-space: nowrap; box-shadow: 0 1px 4px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2);">
                    ${highlightedMed.quantity} ${highlightedMed.unit ? highlightedMed.unit.slice(0, 3) : ''}
                  </div>`
                : ''
            }
          </div>
        `,
        iconSize: [isSelected ? 36 : 30, isSelected ? 36 : 30],
        iconAnchor: [isSelected ? 18 : 15, isSelected ? 18 : 15]
      });

      const marker = L.marker([lat, lng], { icon: customMarkerIcon }).addTo(markersLayer);
      markersRef.current[loc.id] = marker;

      // Popup HTML content
      const topMedsList = (loc.medicines || [])
        .slice(0, 4)
        .map(
          (m) => `
          <li style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; font-size: 11px;">
            <span style="color: #334155; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;">${m.medicine_name}</span>
            <span style="font-weight: 700; color: ${m.quantity === 0 ? '#DC2626' : '#0F6B6B'}; font-family: monospace;">
              ${m.quantity} ${m.unit || ''}
            </span>
          </li>
        `
        )
        .join('');

      const popupHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 230px; max-width: 280px; padding: 2px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;">
            <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 2px 6px; border-radius: 4px; background-color: ${isPharmacy ? '#F3E8FF' : '#E6F4F1'}; color: ${isPharmacy ? '#7E22CE' : '#0F6B6B'};">
              ${loc.type_label}
            </span>
            <span style="font-size: 10px; color: #64748B;">${loc.block || loc.district || 'Coimbatore'}</span>
          </div>
          
          <h4 style="margin: 4px 0 2px; font-size: 13px; font-weight: 700; color: #0F172A; line-height: 1.2;">
            ${loc.name}
          </h4>
          <p style="margin: 0 0 6px; font-size: 10px; color: #64748B;">
            📍 ${loc.address}
          </p>

          <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 6px 8px; margin-bottom: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; text-align: center;">
            <div>
              <div style="font-size: 9px; color: #64748B; font-weight: 600;">TOTAL STOCK</div>
              <div style="font-size: 14px; font-weight: 800; color: #0F6B6B;">${loc.total_stock_count ? loc.total_stock_count.toLocaleString() : 0}</div>
            </div>
            <div style="border-left: 1px solid #E2E8F0;">
              <div style="font-size: 9px; color: #64748B; font-weight: 600;">MEDICINES</div>
              <div style="font-size: 14px; font-weight: 800; color: #0284C7;">${loc.distinct_medicines_count || 0}</div>
            </div>
          </div>

          ${
            highlightedMed
              ? `
              <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 6px; padding: 5px 8px; margin-bottom: 6px;">
                <div style="font-size: 10px; font-weight: 700; color: #1E40AF;">🔍 Selected Medicine:</div>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
                  <span style="font-size: 11px; font-weight: 600; color: #1E293B;">${highlightedMed.medicine_name}</span>
                  <span style="font-size: 12px; font-weight: 800; color: #2563EB;">${highlightedMed.quantity} ${highlightedMed.unit || ''}</span>
                </div>
              </div>
            `
              : ''
          }

          <div style="margin-bottom: 6px;">
            <div style="font-size: 10px; font-weight: 700; color: #475569; margin-bottom: 4px;">Top Medicines Available:</div>
            <ul style="list-style: none; padding: 0; margin: 0;">
              ${topMedsList}
            </ul>
            ${
              loc.distinct_medicines_count > 4
                ? `<div style="font-size: 10px; color: #64748B; text-align: right; margin-top: 2px;">+${loc.distinct_medicines_count - 4} more medicines</div>`
                : ''
            }
          </div>

          <button
            id="inspect-btn-${loc.id}"
            style="width: 100%; padding: 5px 8px; background-color: #0F6B6B; color: white; border: none; border-radius: 5px; font-size: 11px; font-weight: 700; cursor: pointer; transition: background 0.15s;"
          >
            Inspect All ${loc.distinct_medicines_count || 0} Medicines &rarr;
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 300 });

      marker.on('click', () => {
        if (onSelectLocation) {
          onSelectLocation(loc.id);
        }
      });

      marker.on('popupopen', () => {
        const btn = document.getElementById(`inspect-btn-${loc.id}`);
        if (btn && onSelectLocation) {
          btn.onclick = () => onSelectLocation(loc.id);
        }
      });
    });

    // Fit bounds smoothly on initial load if valid
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    }
  }, [locations, highlightMedicineId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. SELECTION EFFECT: PAN TO SELECTED LOCATION WITHOUT DESTROYING MAP
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedLocationId) return;

    const marker = markersRef.current[selectedLocationId];
    if (marker) {
      map.panTo(marker.getLatLng(), { animate: true, duration: 0.5 });
      marker.openPopup();
    }
  }, [selectedLocationId]);

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. TRANSFER ROUTE MODE (SHORTAGE CENTRE + DONORS)
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    const routesLayer = routesLayerRef.current;
    if (!map || !routesLayer || !shortageCentre) return;

    routesLayer.clearLayers();

    const shortageLat = Number(shortageCentre.lat);
    const shortageLng = Number(shortageCentre.lng);
    if (isNaN(shortageLat) || isNaN(shortageLng)) return;

    const bounds = L.latLngBounds([[shortageLat, shortageLng]]);

    const shortageIcon = L.divIcon({
      className: 'custom-shortage-marker-clean',
      html: `
        <div style="background-color: #DC2626; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">
          🚨
        </div>
      `,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const donorIcon = L.divIcon({
      className: 'custom-donor-marker-clean',
      html: `
        <div style="background-color: #0F6B6B; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 13px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
          🏥
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    L.marker([shortageLat, shortageLng], { icon: shortageIcon })
      .addTo(routesLayer)
      .bindPopup(`<strong>${shortageCentre.name}</strong><br/>🚨 Shortage Facility<br/>Need: ${shortageCentre.needed_qty || ''}`)
      .openPopup();

    donors.forEach((d) => {
      const dLat = Number(d.lat);
      const dLng = Number(d.lng);
      if (isNaN(dLat) || isNaN(dLng)) return;

      bounds.extend([dLat, dLng]);

      L.marker([dLat, dLng], { icon: donorIcon })
        .addTo(routesLayer)
        .bindPopup(`<strong>${d.donor_name}</strong><br/>Surplus: +${d.surplus}<br/>Distance: ${d.distance_km} km`);

      L.polyline(
        [
          [shortageLat, shortageLng],
          [dLat, dLng]
        ],
        { color: '#0F6B6B', weight: 3, dashArray: '6, 8', opacity: 0.85 }
      ).addTo(routesLayer);
    });

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 12 });
    }
  }, [shortageCentre, donors]);

  return (
    <>
      <style>{`
        .custom-network-marker-clean,
        .custom-shortage-marker-clean,
        .custom-donor-marker-clean {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }
      `}</style>
      <div
        ref={mapContainerRef}
        className={`w-full rounded-xl border border-[#E3E8EE] overflow-hidden shadow-xs z-10 ${className || ''}`}
        style={{ minHeight: typeof height === 'number' ? `${height}px` : height, height: height }}
      />
    </>
  );
};

export default LeafletMap;
