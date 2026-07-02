import { useEffect, useRef } from "react";
import { appConfig, hasGoogleMaps } from "@/lib/app-config";
import type { MapPortMarker } from "@/lib/ports-data";

interface Props {
  markers: MapPortMarker[];
  height?: number;
  className?: string;
}

type GMaps = {
  Map: new (el: HTMLElement, opts: object) => { fitBounds: (b: unknown) => void };
  LatLngBounds: new () => { extend: (p: { lat: number; lng: number }) => void };
  Marker: new (opts: object) => unknown;
};

const MARKER_COLORS: Record<string, string> = {
  DZ: "#0461A5",
  FR: "#2563eb",
  AE: "#F5C518",
};

function getMaps(): GMaps | undefined {
  return (window as Window & { google?: { maps: GMaps } }).google?.maps;
}

function loadMapsScript(apiKey: string): Promise<void> {
  if (getMaps()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const id = "qdia-google-maps";
    if (document.getElementById(id)) {
      const t = setInterval(() => {
        if (getMaps()) { clearInterval(t); resolve(); }
      }, 100);
      return;
    }
    const script = document.createElement("script");
    script.id = id;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps indisponible"));
    document.head.appendChild(script);
  });
}

export function PortsMap({ markers, height = 220, className }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasGoogleMaps() || !ref.current || !markers.length) return;

    let cancelled = false;
    loadMapsScript(appConfig.googleMapsKey).then(() => {
      const maps = getMaps();
      if (cancelled || !ref.current || !maps) return;

      const bounds = new maps.LatLngBounds();
      const map = new maps.Map(ref.current, {
        zoom: 4,
        center: { lat: 35.5, lng: 5.0 },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      for (const m of markers) {
        const pos = { lat: m.lat, lng: m.lng };
        bounds.extend(pos);
        new maps.Marker({
          map,
          position: pos,
          title: m.label,
          label: {
            text: m.country_code === "DZ" ? "🇩🇿" : m.country_code === "FR" ? "🇫🇷" : "🇦🇪",
            fontSize: "14px",
          },
        });
      }

      map.fitBounds(bounds);
    }).catch(() => {});

    return () => { cancelled = true; };
  }, [markers]);

  if (!hasGoogleMaps()) {
    return (
      <div
        className={`rounded-lg bg-[#f0f4ff] flex flex-col items-center justify-center text-xs text-[#0461A5] p-4 ${className ?? ""}`}
        style={{ height }}
      >
        <p className="font-semibold mb-2">Ports export — carte</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {markers.map(m => (
            <span key={m.code} className="bg-white px-2 py-1 rounded border text-[10px]">
              {m.label}
            </span>
          ))}
        </div>
        <p className="text-[10px] text-[#9CA3AF] mt-2">Ajoutez VITE_GOOGLE_MAPS_API_KEY pour la carte</p>
      </div>
    );
  }

  if (!markers.length) {
    return (
      <div
        className={`rounded-lg bg-[#f0f4ff] flex items-center justify-center text-xs text-[#656566] ${className ?? ""}`}
        style={{ height }}
      >
        Aucun port à afficher
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3 text-[10px] text-[#656566]">
        <span><span className="inline-block w-2 h-2 rounded-full bg-[#0461A5] mr-1" />Algérie</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-[#2563eb] mr-1" />France</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-[#F5C518] mr-1" />UAE</span>
      </div>
      <div ref={ref} className={`rounded-lg overflow-hidden border border-[#0461A5]/20 ${className ?? ""}`} style={{ height }} />
    </div>
  );
}
