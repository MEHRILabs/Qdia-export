import type { PortInfo } from "@/lib/api-auth";

/** Coordonnées des ports DZ · FR · AE pour la carte */
export const PORT_COORDINATES: Record<string, { lat: number; lng: number }> = {
  DZALG: { lat: 36.7538, lng: 3.0588 },
  DZORN: { lat: 35.6971, lng: -0.6337 },
  DZBJA: { lat: 36.7525, lng: 5.0553 },
  DZAAE: { lat: 36.9, lng: 7.7667 },
  DZSKI: { lat: 36.8762, lng: 6.9092 },
  DZMOS: { lat: 35.9311, lng: 0.0892 },
  FRMRS: { lat: 43.2965, lng: 5.3698 },
  FRLEH: { lat: 49.4944, lng: 0.1079 },
  AEDXB: { lat: 25.0267, lng: 55.0956 },
  AEKHL: { lat: 24.4539, lng: 54.3773 },
  TNRDS: { lat: 36.8189, lng: 10.2928 },
};

export const FALLBACK_PORTS_GROUPED: { algeria: PortInfo[]; international: PortInfo[] } = {
  algeria: [
    { code: "DZALG", name: "Port d'Alger", city: "Alger", country: "Algérie", country_code: "DZ" },
    { code: "DZORN", name: "Port d'Oran", city: "Oran", country: "Algérie", country_code: "DZ" },
    { code: "DZBJA", name: "Port de Béjaïa", city: "Béjaïa", country: "Algérie", country_code: "DZ" },
    { code: "DZAAE", name: "Port d'Annaba", city: "Annaba", country: "Algérie", country_code: "DZ" },
  ],
  international: [
    { code: "TNRDS", name: "Port de Radès", city: "Tunis", country: "Tunisie", country_code: "TN" },
    { code: "FRMRS", name: "Marseille-Fos", city: "Marseille", country: "France", country_code: "FR" },
    { code: "FRLEH", name: "Le Havre", city: "Le Havre", country: "France", country_code: "FR" },
    { code: "AEDXB", name: "Jebel Ali", city: "Dubai", country: "Émirats arabes unis", country_code: "AE" },
    { code: "AEKHL", name: "Khalifa Port", city: "Abu Dhabi", country: "Émirats arabes unis", country_code: "AE" },
  ],
};

export type MapPortMarker = {
  code: string;
  label: string;
  lat: number;
  lng: number;
  country_code: string;
};

export function toMapMarkers(ports: PortInfo[]): MapPortMarker[] {
  return ports
    .map(p => {
      const coords = PORT_COORDINATES[p.code];
      if (!coords) return null;
      return {
        code: p.code,
        label: `${p.city} (${p.code})`,
        lat: coords.lat,
        lng: coords.lng,
        country_code: p.country_code,
      };
    })
    .filter((m): m is MapPortMarker => m !== null);
}
