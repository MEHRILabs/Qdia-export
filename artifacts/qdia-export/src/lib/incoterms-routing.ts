/** Règles Incoterms QDIA — miroir frontend */

export type IncotermCode = "exw" | "fob" | "cfr" | "cif" | "ddp";
export type IncotermMode = "domestic" | "export" | "local_stock";

const COUNTRY_ALIASES: Record<string, string> = {
  algerie: "DZ", algérie: "DZ", algeria: "DZ", dz: "DZ",
  france: "FR", fr: "FR",
  "émirats": "AE", emirats: "AE", uae: "AE", ae: "AE",
  allemagne: "DE", de: "DE", germany: "DE",
  espagne: "ES", es: "ES", spain: "ES",
  "royaume-uni": "UK", uk: "UK", gb: "UK",
  "arabie saoudite": "SA", sa: "SA",
  usa: "US", us: "US",
};

export function normalizeCountryCode(input?: string | null): string {
  if (!input?.trim()) return "FR";
  const raw = input.trim();
  if (raw.length === 2) return raw.toUpperCase();
  return COUNTRY_ALIASES[raw.toLowerCase()] ?? raw.slice(0, 2).toUpperCase();
}

export function inferStockCountries(targetMarkets: string[] = []): string[] {
  const codes = new Set<string>(["DZ"]);
  for (const m of targetMarkets) {
    codes.add(normalizeCountryCode(m));
  }
  return [...codes];
}

export function resolveIncotermMode(
  originCountry: string,
  buyerCountry: string,
  stockCountries: string[] = [],
): IncotermMode {
  const origin = normalizeCountryCode(originCountry);
  const buyer = normalizeCountryCode(buyerCountry);
  const stock = stockCountries.map(normalizeCountryCode);

  if (stock.includes(buyer)) return "local_stock";
  if (origin === buyer) return "domestic";
  return "export";
}

export function availableIncoterms(mode: IncotermMode): IncotermCode[] {
  switch (mode) {
    case "local_stock":
      return ["ddp"];
    case "domestic":
      return ["exw", "fob", "cfr", "cif"];
    case "export":
      return ["fob", "cif", "ddp"];
  }
}

export function defaultIncoterm(mode: IncotermMode): IncotermCode {
  if (mode === "local_stock") return "ddp";
  if (mode === "domestic") return "fob";
  return "ddp";
}

export const BUYER_COUNTRIES = [
  { code: "DZ", labelKey: "order_flow.country_dz", flag: "🇩🇿" },
  { code: "FR", labelKey: "order_flow.country_fr", flag: "🇫🇷" },
  { code: "AE", labelKey: "order_flow.country_ae", flag: "🇦🇪" },
  { code: "DE", labelKey: "order_flow.country_de", flag: "🇩🇪" },
  { code: "ES", labelKey: "order_flow.country_es", flag: "🇪🇸" },
] as const;

const STORAGE_KEY = "qdia_buyer_country";

export function getStoredBuyerCountry(): string {
  try {
    return normalizeCountryCode(localStorage.getItem(STORAGE_KEY) ?? "FR");
  } catch {
    return "FR";
  }
}

export function setStoredBuyerCountry(code: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, normalizeCountryCode(code));
  } catch { /* ignore */ }
}
