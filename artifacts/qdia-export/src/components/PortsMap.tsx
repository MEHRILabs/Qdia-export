import { useEffect, useRef, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Ship } from "lucide-react";
import { appConfig } from "@/lib/app-config";
import type { MapPortMarker } from "@/lib/ports-data";

interface Props {
  markers: MapPortMarker[];
  height?: number;
  className?: string;
  highlightCountry?: string;
}

type GMaps = {
  Map: new (el: HTMLElement, opts: object) => { fitBounds: (b: unknown) => void };
  LatLngBounds: new () => { extend: (p: { lat: number; lng: number }) => void };
  Marker: new (opts: object) => unknown;
};

const MARKER_EMOJI: Record<string, string> = {
  DZ: "🇩🇿",
  TN: "🇹🇳",
  MA: "🇲🇦",
  FR: "🇫🇷",
  AE: "🇦🇪",
  DE: "🇩🇪",
  ES: "🇪🇸",
};

/** Positions % dans la carte Méditerranée stylisée */
const HUB: Record<string, { x: number; y: number }> = {
  DZ: { x: 36, y: 62 },
  TN: { x: 46, y: 52 },
  MA: { x: 40, y: 58 },
  FR: { x: 44, y: 28 },
  AE: { x: 78, y: 58 },
  DE: { x: 52, y: 22 },
  ES: { x: 38, y: 34 },
};

const ROUTE_COLORS: Record<string, string> = {
  TN: "#E70013",
  MA: "#C1272D",
  FR: "#0461A5",
  AE: "#F5C518",
  DZ: "#0461A5",
};

function routePath(from: { x: number; y: number }, to: { x: number; y: number }) {
  const mx = (from.x + to.x) / 2;
  const my = Math.min(from.y, to.y) - 8;
  return `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;
}

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

async function resolveMapsKey(): Promise<string> {
  if (appConfig.googleMapsKey) return appConfig.googleMapsKey;
  try {
    const base = import.meta.env.DEV ? "" : (import.meta.env.VITE_API_URL ?? "");
    const res = await fetch(`${base}/api/config/public`);
    if (!res.ok) return "";
    const data = await res.json() as { google_maps_key?: string };
    return data.google_maps_key ?? "";
  } catch {
    return "";
  }
}

function AnimatedPortsMap({
  markers,
  height,
  className,
  highlightCountry = "FR",
}: Props) {
  const origin = HUB.DZ;
  const dest = HUB[highlightCountry] ?? HUB.FR;
  const routeColor = ROUTE_COLORS[highlightCountry] ?? "#0461A5";
  const pathD = routePath(origin, dest);

  const visibleCountries = useMemo(() => {
    const codes = new Set(markers.map(m => m.country_code));
    codes.add("DZ");
    codes.add(highlightCountry);
    return [...codes];
  }, [markers, highlightCountry]);

  return (
    <div
      className={`relative w-full overflow-hidden bg-gradient-to-b from-[#dceaf8] via-[#eef4fc] to-[#f8fafc] ${className ?? ""}`}
      style={{ height }}
      aria-label="Carte des routes export"
    >
      {/* Mer stylisée */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c5daf0" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#e8f0fa" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill="url(#sea)" />
        {/* Côte sud (Maghreb) */}
        <path
          d="M 8 72 Q 25 58 36 62 Q 46 52 55 48 Q 70 42 92 55 L 92 100 L 8 100 Z"
          fill="#e8dcc8"
          opacity="0.55"
        />
        {/* Europe nord */}
        <path
          d="M 20 8 Q 45 2 70 12 Q 85 18 92 35 L 92 48 Q 70 38 44 28 Q 28 22 12 30 Z"
          fill="#d4e4d4"
          opacity="0.45"
        />
      </svg>

      {/* Routes secondaires (faibles) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" aria-hidden>
        {(["TN", "MA", "FR", "AE"] as const)
          .filter(c => c !== highlightCountry)
          .map(c => {
            const to = HUB[c];
            if (!to) return null;
            return (
              <path
                key={c}
                d={routePath(origin, to)}
                fill="none"
                stroke="#0461A5"
                strokeWidth="0.35"
                strokeDasharray="1.5 1.5"
                opacity="0.2"
              />
            );
          })}

        {/* Route active */}
        <motion.path
          key={highlightCountry}
          d={pathD}
          fill="none"
          stroke={routeColor}
          strokeWidth="0.7"
          strokeLinecap="round"
          strokeDasharray="2 1.2"
          initial={{ pathLength: 0, opacity: 0.4 }}
          animate={{ pathLength: 1, opacity: [0.5, 1, 0.5] }}
          transition={{ pathLength: { duration: 1.2 }, opacity: { duration: 2.5, repeat: Infinity } }}
        />
      </svg>

      {/* Navire animé le long de la route active */}
      <motion.div
        key={`ship-${highlightCountry}`}
        className="absolute z-20 text-[#0461A5] drop-shadow-md"
        style={{ left: `${origin.x}%`, top: `${origin.y}%`, marginLeft: -10, marginTop: -10 }}
        animate={{
          left: [`${origin.x}%`, `${dest.x}%`],
          top: [`${origin.y}%`, `${dest.y}%`],
          opacity: [0, 1, 1, 0],
        }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Ship className="h-5 w-5 -rotate-12" />
      </motion.div>

      {/* Hubs pays */}
      {visibleCountries.map(code => {
        const pos = HUB[code];
        if (!pos) return null;
        const active = code === highlightCountry || code === "DZ";
        return (
          <div
            key={code}
            className="absolute z-10 flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          >
            {active && (
              <motion.span
                className="absolute inline-flex h-10 w-10 rounded-full"
                style={{ backgroundColor: `${routeColor}22` }}
                animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
            <motion.span
              className="relative text-2xl drop-shadow-md select-none"
              animate={active ? { scale: [1, 1.12, 1] } : { scale: 0.9, opacity: 0.55 }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {MARKER_EMOJI[code] ?? "⚓"}
            </motion.span>
          </div>
        );
      })}

      <p className="absolute bottom-3 left-0 right-0 text-center text-[11px] font-semibold text-[#073B74]/70 tracking-wide pointer-events-none">
        🇩🇿 Alger → {MARKER_EMOJI[highlightCountry] ?? ""} {highlightCountry}
      </p>
    </div>
  );
}

export function PortsMap({ markers, height = 220, className, highlightCountry }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [mapsKey, setMapsKey] = useState(appConfig.googleMapsKey);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    if (mapsKey) return;
    void resolveMapsKey().then(key => {
      if (key) setMapsKey(key);
    });
  }, [mapsKey]);

  useEffect(() => {
    if (!mapsKey || !ref.current || !markers.length) return;

    let cancelled = false;
    setMapFailed(false);
    setMapReady(false);
    loadMapsScript(mapsKey).then(() => {
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
            text: MARKER_EMOJI[m.country_code] ?? "⚓",
            fontSize: "14px",
          },
        });
      }

      map.fitBounds(bounds);
      setMapReady(true);
    }).catch(() => {
      if (!cancelled) setMapFailed(true);
    });

    return () => { cancelled = true; };
  }, [mapsKey, markers]);

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

  if (!mapsKey || mapFailed) {
    return (
      <AnimatedPortsMap
        markers={markers}
        height={height}
        className={className}
        highlightCountry={highlightCountry}
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3 text-[10px] text-[#656566] px-1">
        <span><span className="inline-block w-2 h-2 rounded-full bg-[#0461A5] mr-1" />Algérie</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-[#E70013] mr-1" />Tunisie</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-[#C1272D] mr-1" />Maroc</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-[#2563eb] mr-1" />France</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-[#F5C518] mr-1" />UAE</span>
      </div>
      {!mapReady && (
        <AnimatedPortsMap
          markers={markers}
          height={height}
          className={className}
          highlightCountry={highlightCountry}
        />
      )}
      <div
        ref={ref}
        className={`rounded-lg overflow-hidden border border-[#0461A5]/20 ${className ?? ""} ${mapReady ? "" : "hidden"}`}
        style={{ height }}
      />
    </div>
  );
}
