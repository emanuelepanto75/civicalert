'use client';

import { useEffect, useRef, useState } from 'react';

const ITALY = { center: [41.9, 12.5], zoom: 6 };
const escape = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// Mappa delle segnalazioni (OpenStreetMap + Leaflet). Senza `reports` carica la
// mappa pubblica; il cruscotto dell'ufficio passa invece le segnalazioni filtrate.
export default function ReportsMap({ reports: given = null, linkBase = '/segnalazioni/', legend = true }) {
  const container = useRef(null);
  const [count, setCount] = useState(null);

  useEffect(() => {
    let map;
    let cancelled = false;

    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled) return;
      map = L.map(container.current, { zoomControl: false }).setView(ITALY.center, ITALY.zoom);
      L.control.zoom({ position: 'topright' }).addTo(map);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap',
      }).addTo(map);

      const reports =
        given ?? ((await fetch('/api/reports').then((r) => r.json()).catch(() => ({}))).reports || []);
      if (cancelled) return;
      setCount(reports.length);

      const markers = reports.map((r) => {
        const closed = r.status === 'RESOLVED';
        const icon = L.divIcon({
          className: '',
          html: `<div class="pin ${closed ? 'closed' : ''}" style="background:${r.category.color}"></div>`,
          iconSize: [26, 26],
          iconAnchor: [13, 26],
          popupAnchor: [0, -24],
        });
        const img = r.mediaType === 'PHOTO' ? `<img class="popup-img" src="${r.mediaUrl}" alt="">` : '';
        return L.marker([r.latitude, r.longitude], { icon }).bindPopup(
          `<div class="popup-title">${escape(r.category.icon)} ${escape(r.category.name)}</div>
           <div class="muted small">📍 ${escape(r.address || r.municipality || '')}</div>
           ${img}
           <span class="badge ${r.status}">${escape(r.statusLabel)}</span>
           <div style="margin-top:8px"><a href="${linkBase}${r.code}">Dettaglio →</a></div>`,
          { maxWidth: 240 },
        );
      });
      markers.forEach((m) => m.addTo(map));

      if (markers.length) {
        map.fitBounds(L.featureGroup(markers).getBounds().pad(0.2), { maxZoom: 16 });
      } else if (navigator.geolocation && window.isSecureContext) {
        navigator.geolocation.getCurrentPosition(
          (p) => !cancelled && map.setView([p.coords.latitude, p.coords.longitude], 15),
          () => {},
          { timeout: 8000 },
        );
      }
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [given, linkBase]);

  return (
    <>
      <div ref={container} className="map" />
      {legend && count !== null && (
        <div className="map-legend">
          {count === 0 ? 'Nessuna segnalazione ancora' : `${count} segnalazioni`}
        </div>
      )}
    </>
  );
}
