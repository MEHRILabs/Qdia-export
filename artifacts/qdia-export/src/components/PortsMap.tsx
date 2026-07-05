import { useEffect, useRef, useState } from "react";
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
  FR: "🇫🇷",
  AE: "🇦🇪",
  DE: "🇩🇪",
  ES: "🇪🇸",
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

function AnimatedPortsFallback({
  markers,
  height,
  className,
  highlightCountry,
}: Props) {
  const positions: Record<string, { x: string; y: string }> = {
    DZ: { x: "42%", y: "52%" },
    FR: { x: "48%", y: "28%" },
    AE: { x: "62%", y: "48%" },
    DE: { x: "52%", y: "24%" },
    ES: { x: "44%", y: "32%" },
  };

  return (
    <div
      className={`relative rounded-lg overflow-hidden border border-[#0461A5]/20 bg-gradient-to-br from-[#e8f0fe] via-[#f0f4ff] to-[#dbeafe] ${className ?? ""}`}
      style={{ height }}
    >
      <div className="absolute inset-0 opacity-30">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute h-px bg-[#0461A5]/40"
            style={{ top: `${15 + i * 14}%`, left: "5%", right: "5%" }}
            animate={{ opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 2 + i * 0.3, repeat: Infinity }}
          />
        ))}
      </div>

      <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden>
        <motion.path
          d="M 168 104 Q 180 76 192 56"
          fill="none"
          stroke="#0461A5"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeDasharray="6 4"
          initial={{ pathLength: 0, opacity: 0.3 }}
          animate={{ pathLength: 1, opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.path
          d="M 168 104 Q 216 96 248 96"
          fill="none"
          stroke="#F5C518"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeDasharray="6 4"
          initial={{ pathLength: 0, opacity: 0.3 }}
          animate={{ pathLength: 1, opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 3.5, repeat: Infinity, delay: 0.5 }}
        />
      </svg>

      <motion.div
        className="absolute text-[#0461A5]"
        style={{ left: "38%", top: "44%" }}
        animate={{ x: [0, 30, 60], y: [0, -20, -24], opacity: [0, 1, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Ship className="h-5 w-5 rotate-[-25deg]" />
      </motion.div>

      {markers.map((m, i) => {
        const pos = positions[m.country_code] ?? { x: `${20 + (i * 17) % 60}%`, y: `${30 + (i * 13) % 40}%` };
        const active = !highlightCountry || highlightCountry === m.country_code;
        return (
          <motion.div
            key={m.code}
            className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
            style={{ left: pos.x, top: pos.y }}
            initial={{ scale: 0 }}
            animate={{ scale: active ? 1 : 0.85, opacity: active ? 1 : 0.5 }}
            transition={{ delay: i * 0.1, type: "spring" }}
          >
            <motion.span
              className="text-xl drop-shadow"
              animate={active ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {MARKER_EMOJI[m.country_code] ?? "⚓"}
            </motion.span>
            <span className="text-[9px] font-bold text-[#073B74] bg-white/90 px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap shadow-sm">
              {m.label.split("·")[0]?.trim() ?? m.code}
            </span>
          </motion.div>
        );
      })}

      <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-[#656566]">
        Routes export DZ → FR · UAE
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
      <AnimatedPortsFallback
        markers={markers}
        height={height}
        className={className}
        highlightCountry={highlightCountry}
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3 text-[10px] text-[#656566]">
        <span><span className="inline-block w-2 h-2 rounded-full bg-[#0461A5] mr-1" />Algérie</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-[#2563eb] mr-1" />France</span>
        <span><span className="inline-block w-2 h-2 rounded-full bg-[#F5C518] mr-1" />UAE</span>
      </div>
      {!mapReady && (
        <AnimatedPortsFallback
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
