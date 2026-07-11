/** Règles Incoterms QDIA : origine produit × pays acheteur × stock local */

export type IncotermCode = "exw" | "fob" | "cfr" | "cif" | "ddp";
export type IncotermMode = "domestic" | "export" | "local_stock";

const COUNTRY_ALIASES: Record<string, string> = {
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

export function calculateDdpUsdFromCif(
  cifUsd: number,
  customsTotalDzd: number,
  lastMilePct = 0.05,
): number {
  // Aligné sur lib/fx : DZD_USD_RATE = DZD pour 1 USD (ex. 135)
  const rate = (() => {
    const raw = Number(process.env.DZD_USD_RATE ?? 135);
    if (!Number.isFinite(raw) || raw <= 0) return 135;
    return raw < 1 ? 1 / raw : raw;
  })();
  const cifDzd = cifUsd * rate;
  const lastMileDzd = cifDzd * lastMilePct;
  const ddpDzd = cifDzd + customsTotalDzd + lastMileDzd;
  return Math.round((ddpDzd / rate) * 100) / 100;
}

export interface ResolvedPricing {
  mode: IncotermMode;
  incoterms: IncotermCode[];
  default_incoterm: IncotermCode;
  origin_country: string;
  buyer_country: string;
  export_authorized: boolean;
  requires_factory_authorization: boolean;
  ddp_usd?: number;
  customs_total_dzd?: number;
}
