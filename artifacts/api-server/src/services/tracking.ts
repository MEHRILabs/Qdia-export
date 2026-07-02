/** Simulation suivi colis DHL / FedEx / Maersk */

export type Carrier = "dhl" | "fedex" | "maersk";

const CARRIER_LABELS: Record<Carrier, string> = {
  dhl: "DHL Express",
  fedex: "FedEx International",
  maersk: "Maersk Line",
};

export interface TrackingEvent {
  status: string;
  location: string;
  description: string;
  event_at: string;
}

function hashSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function trackParcel(carrier: Carrier, trackingNumber: string): {
  carrier: string;
  tracking_number: string;
  status: string;
  events: TrackingEvent[];
} {
  const seed = hashSeed(`${carrier}:${trackingNumber}`);
  const now = Date.now();
  const steps = [
    { status: "picked_up", location: "Alger, DZ", description: "Colis pris en charge par le transporteur" },
    { status: "customs_export", location: "Port de Béjaïa, DZ", description: "Dédouanement export en cours" },
    { status: "in_transit", location: "Méditerranée", description: "En transit maritime / aérien" },
    { status: "customs_import", location: "Port destination", description: "Arrivée port — douane import" },
    { status: "out_for_delivery", location: "Entrepôt local", description: "En cours de livraison" },
    { status: "delivered", location: "Destination finale", description: "Livré au destinataire" },
  ];
  const progress = Math.min(steps.length, 2 + (seed % 5));
  const events: TrackingEvent[] = steps.slice(0, progress).map((s, i) => ({
    ...s,
    event_at: new Date(now - (progress - i) * 86400000 * 1.5).toISOString(),
  }));
  const current = steps[progress - 1] ?? steps[0];
  return {
    carrier: CARRIER_LABELS[carrier] ?? carrier,
    tracking_number: trackingNumber,
    status: current.status,
    events,
  };
}

export function detectCarrier(trackingNumber: string): Carrier {
  const n = trackingNumber.toUpperCase();
  if (n.startsWith("DHL") || n.length === 10) return "dhl";
  if (n.startsWith("FX") || n.length === 12) return "fedex";
  return "maersk";
}
