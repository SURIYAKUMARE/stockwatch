import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface LeafletMapProps {
  shortageCentre?: { name: string; lat: number; lng: number; needed_qty?: number };
  donors?: { donor_name: string; lat: number; lng: number; distance_km: number; surplus: number }[];
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  shortageCentre,
  donors = []
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const defaultLat = shortageCentre?.lat || 10.3254;
    const defaultLng = shortageCentre?.lng || 76.9558;

    const map = L.map(mapContainerRef.current, {
      center: [defaultLat, defaultLng],
      zoom: 11,
      zoomControl: true,
      attributionControl: false
    });

    mapInstanceRef.current = map;

    // CartoDB Positron / OSM tiles for clinical light appearance
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 18,
      subdomains: 'abcd'
    }).addTo(map);

    // Custom Red Icon for Shortage Centre
    const shortageIcon = L.divIcon({
      className: 'custom-shortage-marker',
      html: `
        <div style="background-color: #C62828; color: white; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
          !
        </div>
      `,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    // Custom Teal Icon for Donor Centres
    const donorIcon = L.divIcon({
      className: 'custom-donor-marker',
      html: `
        <div style="background-color: #0F6B6B; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 11px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);">
          +
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    if (shortageCentre) {
      L.marker([shortageCentre.lat, shortageCentre.lng], { icon: shortageIcon })
        .addTo(map)
        .bindPopup(`<strong>${shortageCentre.name}</strong><br/>🚨 Shortage Facility<br/>Need: ${shortageCentre.needed_qty || ''}`)
        .openPopup();
    }

    donors.forEach((d) => {
      L.marker([d.lat, d.lng], { icon: donorIcon })
        .addTo(map)
        .bindPopup(`<strong>${d.donor_name}</strong><br/>Surplus: +${d.surplus}<br/>Distance: ${d.distance_km} km`);

      if (shortageCentre) {
        L.polyline(
          [
            [shortageCentre.lat, shortageCentre.lng],
            [d.lat, d.lng]
          ],
          { color: '#0F6B6B', weight: 2.5, dashArray: '5, 8', opacity: 0.8 }
        ).addTo(map);
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [shortageCentre, donors]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-72 rounded-lg border border-[#E3E8EE] overflow-hidden shadow-xs z-10"
      style={{ minHeight: '280px' }}
    />
  );
};
