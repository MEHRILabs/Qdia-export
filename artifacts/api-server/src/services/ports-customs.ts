/** Données ports & douanes — fallback si BDD vide */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { dataDir } from "../lib/runtime-paths";

interface ShippingTariffsFile {
  freight_overrides_dzd?: Record<string, Record<string, number>>;
  transit_fee_dzd?: number;
  handling_overrides_dzd?: Record<string, number>;
}

let _customTariffs: ShippingTariffsFile | null = null;

function loadCustomTariffs(): ShippingTariffsFile {
  if (_customTariffs) return _customTariffs;
  try {
    const raw = readFileSync(join(dataDir(), "shipping-tariffs.json"), "utf8");
    _customTariffs = JSON.parse(raw) as ShippingTariffsFile;
  } catch {
    _customTariffs = {};
  }
  return _customTariffs;
}

export const FALLBACK_PORTS = [
  { code: "DZALG", name: "Port d'Alger", city: "Alger", country: "Algérie", country_code: "DZ", type: "seaport", region: "Centre", handling_fee_dzd: 900, freight_to_fr_dzd: 1200, freight_to_ae_dzd: 2200, freight_to_us_dzd: 3500 },
  { code: "DZORN", name: "Port d'Oran", city: "Oran", country: "Algérie", country_code: "DZ", type: "seaport", region: "Ouest", handling_fee_dzd: 850, freight_to_fr_dzd: 1100, freight_to_ae_dzd: 2100, freight_to_us_dzd: 3400 },
  { code: "DZBJA", name: "Port de Béjaïa", city: "Béjaïa", country: "Algérie", country_code: "DZ", type: "seaport", region: "Est", handling_fee_dzd: 800, freight_to_fr_dzd: 1000, freight_to_ae_dzd: 2000, freight_to_us_dzd: 3200 },
  { code: "DZAAE", name: "Port d'Annaba", city: "Annaba", country: "Algérie", country_code: "DZ", type: "seaport", region: "Est", handling_fee_dzd: 820, freight_to_fr_dzd: 1050, freight_to_ae_dzd: 2050, freight_to_us_dzd: 3300 },
  { code: "DZSKI", name: "Port de Skikda", city: "Skikda", country: "Algérie", country_code: "DZ", type: "seaport", region: "Est", handling_fee_dzd: 780, freight_to_fr_dzd: 980, freight_to_ae_dzd: 1980, freight_to_us_dzd: 3100 },
  { code: "DZMOS", name: "Port de Mostaganem", city: "Mostaganem", country: "Algérie", country_code: "DZ", type: "seaport", region: "Ouest", handling_fee_dzd: 750, freight_to_fr_dzd: 950, freight_to_ae_dzd: 1950, freight_to_us_dzd: 3050 },
  { code: "FRMRS", name: "Marseille-Fos", city: "Marseille", country: "France", country_code: "FR", type: "seaport", region: "Méditerranée", handling_fee_dzd: 0 },
  { code: "FRLEH", name: "Le Havre", city: "Le Havre", country: "France", country_code: "FR", type: "seaport", region: "Atlantique", handling_fee_dzd: 0 },
  { code: "AEDXB", name: "Jebel Ali (Dubai)", city: "Dubai", country: "Émirats arabes unis", country_code: "AE", type: "seaport", region: "Golfe", handling_fee_dzd: 0 },
  { code: "AEKHL", name: "Khalifa Port", city: "Abu Dhabi", country: "Émirats arabes unis", country_code: "AE", type: "seaport", region: "Golfe", handling_fee_dzd: 0 },
  { code: "TNRDS", name: "Port de Radès", city: "Tunis", country: "Tunisie", country_code: "TN", type: "seaport", region: "Maghreb", handling_fee_dzd: 0 },
  { code: "MACAS", name: "Port de Casablanca", city: "Casablanca", country: "Maroc", country_code: "MA", type: "seaport", region: "Maghreb", handling_fee_dzd: 0 },
] as const;

export const FALLBACK_CUSTOMS = [
  { destination_country: "France", destination_code: "FR", product_category: "Agriculture & Food", hs_code: "1509", duty_rate_pct: 0, vat_rate_pct: 5.5, customs_fee_dzd: 1200, documentation_fee_dzd: 800, notes: "Huile d'olive — préférence tarifaire UE-Algérie" },
  { destination_country: "France", destination_code: "FR", product_category: "Agriculture & Food", hs_code: "0804", duty_rate_pct: 0, vat_rate_pct: 5.5, customs_fee_dzd: 1000, documentation_fee_dzd: 800, notes: "Dattes — certificat phytosanitaire obligatoire" },
  { destination_country: "France", destination_code: "FR", product_category: "Handicrafts & Decor", hs_code: "5702", duty_rate_pct: 4, vat_rate_pct: 20, customs_fee_dzd: 900, documentation_fee_dzd: 600, notes: "Tapis artisanaux" },
  { destination_country: "Émirats arabes unis", destination_code: "AE", product_category: "Agriculture & Food", hs_code: "1509", duty_rate_pct: 5, vat_rate_pct: 5, customs_fee_dzd: 1500, documentation_fee_dzd: 700, notes: "Halal + certificat origine DZ requis" },
  { destination_country: "Émirats arabes unis", destination_code: "AE", product_category: "Agriculture & Food", hs_code: "0804", duty_rate_pct: 5, vat_rate_pct: 5, customs_fee_dzd: 1400, documentation_fee_dzd: 700, notes: "Dattes — inspection SPS à l'arrivée" },
  { destination_country: "Émirats arabes unis", destination_code: "AE", product_category: "Handicrafts & Decor", hs_code: "6912", duty_rate_pct: 5, vat_rate_pct: 5, customs_fee_dzd: 1100, documentation_fee_dzd: 650, notes: "Poterie — emballage renforcé recommandé" },
  { destination_country: "Algérie (export)", destination_code: "DZ", product_category: "Agriculture & Food", hs_code: "—", duty_rate_pct: 0, vat_rate_pct: 0, customs_fee_dzd: 600, documentation_fee_dzd: 500, notes: "Dédouanement export — DAU + certificat origine" },
  { destination_country: "Tunisie", destination_code: "TN", product_category: "Agriculture & Food", hs_code: "1509", duty_rate_pct: 0, vat_rate_pct: 7, customs_fee_dzd: 700, documentation_fee_dzd: 550, notes: "Maghreb — certificat origine DZ, accord commercial régional" },
  { destination_country: "Tunisie", destination_code: "TN", product_category: "Agriculture & Food", hs_code: "0804", duty_rate_pct: 0, vat_rate_pct: 7, customs_fee_dzd: 650, documentation_fee_dzd: 550, notes: "Dattes — contrôle phytosanitaire à l'arrivée" },
  { destination_country: "Tunisie", destination_code: "TN", product_category: "Handicrafts & Decor", hs_code: "5702", duty_rate_pct: 2, vat_rate_pct: 19, customs_fee_dzd: 600, documentation_fee_dzd: 500, notes: "Artisanat — déclaration en douane tunisienne" },
  { destination_country: "Maroc", destination_code: "MA", product_category: "Agriculture & Food", hs_code: "1509", duty_rate_pct: 0, vat_rate_pct: 10, customs_fee_dzd: 720, documentation_fee_dzd: 560, notes: "Maghreb — certificat origine DZ, accord commercial régional" },
  { destination_country: "Maroc", destination_code: "MA", product_category: "Agriculture & Food", hs_code: "0804", duty_rate_pct: 0, vat_rate_pct: 10, customs_fee_dzd: 680, documentation_fee_dzd: 560, notes: "Dattes — contrôle phytosanitaire à l'arrivée" },
  { destination_country: "Maroc", destination_code: "MA", product_category: "Handicrafts & Decor", hs_code: "5702", duty_rate_pct: 2.5, vat_rate_pct: 20, customs_fee_dzd: 620, documentation_fee_dzd: 510, notes: "Artisanat — déclaration en douane marocaine" },
] as const;

export type PortRow = (typeof FALLBACK_PORTS)[number];
export type CustomsRow = (typeof FALLBACK_CUSTOMS)[number];

export function getFreightDzd(port: PortRow, destinationCode: string): number {
  const custom = loadCustomTariffs();
  const override = custom.freight_overrides_dzd?.[port.code]?.[destinationCode];
  if (override != null) return override + (custom.transit_fee_dzd ?? 0);
  switch (destinationCode) {
    case "FR": return (port.freight_to_fr_dzd ?? 1200) + (custom.transit_fee_dzd ?? 0);
    case "TN": return 850 + (custom.transit_fee_dzd ?? 0);
    case "MA": return 900 + (custom.transit_fee_dzd ?? 0);
    case "AE": return (port.freight_to_ae_dzd ?? 2200) + (custom.transit_fee_dzd ?? 0);
    case "US": return (port.freight_to_us_dzd ?? 3500) + (custom.transit_fee_dzd ?? 0);
    case "DE":
    case "UK":
    case "ES":
    case "CA": return 2000 + (custom.transit_fee_dzd ?? 0);
    default: return 2000 + (custom.transit_fee_dzd ?? 0);
  }
}

export function getPricingSources(portCode?: string) {
  const custom = loadCustomTariffs();
  return {
    ports: "FALLBACK_PORTS (ports-customs.ts) — ports DZ/FR/AE",
    customs: "FALLBACK_CUSTOMS (ports-customs.ts) — droits, TVA, frais par catégorie",
    freight: custom.freight_overrides_dzd
      ? `shipping-tariffs.json (surcharges port ${portCode ?? "DZ"})`
      : "FALLBACK_PORTS.freight_to_*_dzd",
    exchange_rates: "Variables DZD_USD_RATE, DZD_EUR_RATE, DZD_AED_RATE",
    handling: "FALLBACK_PORTS.handling_fee_dzd par port",
    margin: "Marge vendeur (saisie) + commission QDIA 3%",
    insurance: "0,5 % de la valeur CFR",
  };
}

export interface CustomsCalcInput {
  product_category: string;
  destination_code: string;
  cif_value_dzd: number;
  port_code?: string;
}

export interface CustomsCalcResult {
  destination_country: string;
  destination_code: string;
  product_category: string;
  hs_code?: string;
  duty_dzd: number;
  vat_dzd: number;
  customs_fee_dzd: number;
  documentation_fee_dzd: number;
  total_customs_dzd: number;
  notes?: string;
  port?: PortRow;
}

export function calculateCustoms(input: CustomsCalcInput, ports = FALLBACK_PORTS, tariffs = FALLBACK_CUSTOMS): CustomsCalcResult {
  const tariff = tariffs.find(
    t => t.destination_code === input.destination_code && t.product_category === input.product_category,
  ) ?? tariffs.find(t => t.destination_code === input.destination_code);

  const port = input.port_code
    ? ports.find(p => p.code === input.port_code)
    : ports.find(p => p.country_code === "DZ");

  const dutyRate = tariff?.duty_rate_pct ?? 5;
  const vatRate = tariff?.vat_rate_pct ?? 10;
  const dutyDzd = input.cif_value_dzd * (dutyRate / 100);
  const vatBase = input.cif_value_dzd + dutyDzd;
  const vatDzd = vatBase * (vatRate / 100);
  const customsFee = tariff?.customs_fee_dzd ?? 1000;
  const docFee = tariff?.documentation_fee_dzd ?? 500;

  return {
    destination_country: tariff?.destination_country ?? input.destination_code,
    destination_code: input.destination_code,
    product_category: input.product_category,
    hs_code: tariff?.hs_code,
    duty_dzd: Math.round(dutyDzd),
    vat_dzd: Math.round(vatDzd),
    customs_fee_dzd: customsFee,
    documentation_fee_dzd: docFee,
    total_customs_dzd: Math.round(dutyDzd + vatDzd + customsFee + docFee),
    notes: tariff?.notes,
    port: port as PortRow | undefined,
  };
}
