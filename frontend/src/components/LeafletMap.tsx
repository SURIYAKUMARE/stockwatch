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
  const markersRef = useRef<Record<string, L.Marker>>({});

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    // Determine initial center
    let defaultLat = 10.60;
    let defaultLng = 76.96;

    if (shortageCentre) {
      defaultLat = shortageCentre.lat;
      defaultLng = shortageCentre.lng;
    } else if (locations && locations.length > 0) {
      const selected = locations.find((l) => l.id === selectedLocationId);
      if (selected && selected.lat && selected.lng) {
        defaultLat = selected.lat;
        defaultLng = selected.lng;
      } else {
        defaultLat = locations[0].lat;
        defaultLng = locations[0].lng;
      }
    }

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: locations && locations.length > 0 ? 10 : 11,
      zoomControl: true,
      attributionControl: false
    });

    mapInstanceRef.current = map;
    markersRef.current = {};

    // Clinical Light Basemap Tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      subdomains: 'abcd'
    }).addTo(map);

    // MODE 1: Network Locations Mode (PHCs, CHCs, Retail Pharmacies & Shops)
    if (locations && locations.length > 0) {
      const bounds = L.latLngBounds([]);

      locations.forEach((loc) => {
        if (!loc.lat || !loc.lng) return;

        bounds.extend([loc.lat, loc.lng]);
        const isSelected = loc.id === selectedLocationId;
        const isPharmacy = loc.category === 'PHARMACY';
        const hasShortages = (loc.critical_shortages_count ?? 0) > 0;

        // Find highlighted medicine if provided
        const highlightedMed = highlightMedicineId
          ? loc.medicines.find((m) => m.medicine_id === highlightMedicineId)
          : null;

        // Custom HTML marker icon
        const bgColor = isPharmacy ? '#7C3AED' : '#0F6B6B';
        const iconSymbol = isPharmacy ? '💊' : '🏥';
        const markerBorder = isSelected
          ? '3px solid #F59E0B; box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.45); transform: scale(1.18);'
          : '2px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.25);';

        const customMarkerIcon = L.divIcon({
          className: 'custom-network-marker',
          html: `
            <div style="position: relative; cursor: pointer; transition: transform 0.2s;">
              <div style="background-color: ${bgColor}; color: white; border-radius: 50%; width: ${isSelected ? 36 : 30}px; height: ${isSelected ? 36 : 30}px; display: flex; align-items: center; justify-content: center; font-size: ${isSelected ? 16 : 14}px; ${markerBorder}">
                ${iconSymbol}
              </div>
              ${
                hasShortages
                  ? `<div style="position: absolute; -top: 4px; -right: 4px; background-color: #DC2626; color: white; border-radius: 50%; width: 14px; height: 14px; font-size: 9px; font-weight: 800; display: flex; align-items: center; justify-content: center; border: 1.5px solid white;">!</div>`
                  : ''
              }
              ${
                highlightedMed
                  ? `<div style="position: absolute; bottom: -14px; left: 50%; transform: translateX(-50%); background-color: #1E293B; color: #38BDF8; font-size: 9px; font-weight: 700; padding: 1px 5px; border-radius: 4px; white-space: nowrap; box-shadow: 0 1px 4px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.2);">
                      ${highlightedMed.quantity} ${highlightedMed.unit.slice(0, 3)}
                    </div>`
                  : ''
              }
            </div>
          `,
          iconSize: [isSelected ? 36 : 30, isSelected ? 36 : 30],
          iconAnchor: [isSelected ? 18 : 15, isSelected ? 18 : 15]
        });

        const marker = L.marker([loc.lat, loc.lng], { icon: customMarkerIcon }).addTo(map);
        markersRef.current[loc.id] = marker;

        // Build popup HTML with rich medicine stock details
        const topMedsList = loc.medicines
          .slice(0, 4)
          .map(
            (m) => `
            <li style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; font-size: 11px;">
              <span style="color: #334155; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;">${m.medicine_name}</span>
              <span style="font-weight: 700; color: ${m.quantity === 0 ? '#DC2626' : '#0F6B6B'}; font-family: monospace;">
                ${m.quantity} ${m.unit}
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
              <span style="font-size: 10px; color: #64748B;">${loc.block}</span>
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
                <div style="font-size: 14px; font-weight: 800; color: #0F6B6B;">${loc.total_stock_count.toLocaleString()}</div>
              </div>
              <div style="border-left: 1px solid #E2E8F0;">
                <div style="font-size: 9px; color: #64748B; font-weight: 600;">MEDICINES</div>
                <div style="font-size: 14px; font-weight: 800; color: #0284C7;">${loc.distinct_medicines_count}</div>
              </div>
            </div>

            ${
              highlightedMed
                ? `
                <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 6px; padding: 5px 8px; margin-bottom: 6px;">
                  <div style="font-size: 10px; font-weight: 700; color: #1E40AF;">🔍 Selected Medicine:</div>
                  <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
                    <span style="font-size: 11px; font-weight: 600; color: #1E293B;">${highlightedMed.medicine_name}</span>
                    <span style="font-size: 12px; font-weight: 800; color: #2563EB;">${highlightedMed.quantity} ${highlightedMed.unit}</span>
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
              Inspect All ${loc.distinct_medicines_count} Medicines &rarr;
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

      // Fit map to bounds if no single location was selected
      if (!selectedLocationId && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [25, 25], maxZoom: 12 });
      } else if (selectedLocationId && markersRef.current[selectedLocationId]) {
        const selMarker = markersRef.current[selectedLocationId];
        map.setView(selMarker.getLatLng(), 13);
        selMarker.openPopup();
      }
    }

    // MODE 2: Inter-Centre Transfer Route Mode
    if (shortageCentre) {
      const shortageIcon = L.divIcon({
        className: 'custom-shortage-marker',
        html: `
          <div style="background-color: #C62828; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
            !
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const donorIcon = L.divIcon({
        className: 'custom-donor-marker',
        html: `
          <div style="background-color: #0F6B6B; color: white; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
            +
          </div>
        `,
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      L.marker([shortageCentre.lat, shortageCentre.lng], { icon: shortageIcon })
        .addTo(map)
        .bindPopup(`<strong>${shortageCentre.name}</strong><br/>🚨 Shortage Facility<br/>Need: ${shortageCentre.needed_qty || ''}`)
        .openPopup();

      donors.forEach((d) => {
        L.marker([d.lat, d.lng], { icon: donorIcon })
          .addTo(map)
          .bindPopup(`<strong>${d.donor_name}</strong><br/>Surplus: +${d.surplus}<br/>Distance: ${d.distance_km} km`);

        L.polyline(
          [
            [shortageCentre.lat, shortageCentre.lng],
            [d.lat, d.lng]
          ],
          { color: '#0F6B6B', weight: 2.5, dashArray: '5, 8', opacity: 0.8 }
        ).addTo(map);
      });
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [shortageCentre, donors, locations, selectedLocationId, highlightMedicineId, onSelectLocation]);

  return (
    <div
      ref={mapContainerRef}
      className={`w-full rounded-xl border border-[#E3E8EE] overflow-hidden shadow-xs z-10 ${className || ''}`}
      style={{ minHeight: typeof height === 'number' ? `${height}px` : height, height: height }}
    />
  );
};
export default LeafletMap;
