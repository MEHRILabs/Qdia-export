/** Champs export / stock local — partagé bootstrap & scripts */

const COUNTRY_ALIASES = {
  algerie: "DZ", algérie: "DZ", algeria: "DZ", dz: "DZ",
  tunisie: "TN", tunisia: "TN", tn: "TN",
  maroc: "MA", morocco: "MA", ma: "MA",
  france: "FR", fr: "FR",
  "émirats": "AE", emirats: "AE", uae: "AE", ae: "AE",
  allemagne: "DE", de: "DE", germany: "DE",
  espagne: "ES", es: "ES", spain: "ES",
  "royaume-uni": "UK", uk: "UK", gb: "UK",
  "arabie saoudite": "SA", sa: "SA",
  usa: "US", us: "US",
  italie: "IT", it: "IT",
};

export function normalizeCountryCode(input) {
  if (!input?.trim()) return null;
  const raw = input.trim();
  if (raw.length === 2) return raw.toUpperCase();
  return COUNTRY_ALIASES[raw.toLowerCase()] ?? raw.slice(0, 2).toUpperCase();
}

/** Pays où le produit peut être livré en DDP (stock local ou entrepôt) */
export function inferStockCountries(targetMarkets = []) {
  const codes = new Set(["DZ"]);
  for (const m of targetMarkets) {
    const c = normalizeCountryCode(m);
    if (c) codes.add(c);
  }
  return [...codes];
}

export const DEFAULT_TARGET_MARKETS = ["FR", "DE", "ES"];

export function computePriceDdp(priceCif) {
  const cif = Number(priceCif) || 1;
  return Math.round(cif * 1.18 * 100) / 100;
}
