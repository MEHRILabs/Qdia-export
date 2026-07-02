/** Données ports & douanes — fallback si BDD vide */
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
] as const;

export const FALLBACK_CUSTOMS = [
  { destination_country: "France", destination_code: "FR", product_category: "Agriculture & Food", hs_code: "1509", duty_rate_pct: 0, vat_rate_pct: 5.5, customs_fee_dzd: 1200, documentation_fee_dzd: 800, notes: "Huile d'olive — préférence tarifaire UE-Algérie" },
  { destination_country: "France", destination_code: "FR", product_category: "Agriculture & Food", hs_code: "0804", duty_rate_pct: 0, vat_rate_pct: 5.5, customs_fee_dzd: 1000, documentation_fee_dzd: 800, notes: "Dattes — certificat phytosanitaire obligatoire" },
  { destination_country: "France", destination_code: "FR", product_category: "Handicrafts & Decor", hs_code: "5702", duty_rate_pct: 4, vat_rate_pct: 20, customs_fee_dzd: 900, documentation_fee_dzd: 600, notes: "Tapis artisanaux" },
  { destination_country: "Émirats arabes unis", destination_code: "AE", product_category: "Agriculture & Food", hs_code: "1509", duty_rate_pct: 5, vat_rate_pct: 5, customs_fee_dzd: 1500, documentation_fee_dzd: 700, notes: "Halal + certificat origine DZ requis" },
  { destination_country: "Émirats arabes unis", destination_code: "AE", product_category: "Agriculture & Food", hs_code: "0804", duty_rate_pct: 5, vat_rate_pct: 5, customs_fee_dzd: 1400, documentation_fee_dzd: 700, notes: "Dattes — inspection SPS à l'arrivée" },
  { destination_country: "Émirats arabes unis", destination_code: "AE", product_category: "Handicrafts & Decor", hs_code: "6912", duty_rate_pct: 5, vat_rate_pct: 5, customs_fee_dzd: 1100, documentation_fee_dzd: 650, notes: "Poterie — emballage renforcé recommandé" },
  { destination_country: "Algérie (export)", destination_code: "DZ", product_category: "Agriculture & Food", hs_code: "—", duty_rate_pct: 0, vat_rate_pct: 0, customs_fee_dzd: 600, documentation_fee_dzd: 500, notes: "Dédouanement export — DAU + certificat origine" },
] as const;

export type PortRow = (typeof FALLBACK_PORTS)[number];
export type CustomsRow = (typeof FALLBACK_CUSTOMS)[number];

export function getFreightDzd(port: PortRow, destinationCode: string): number {
  switch (destinationCode) {
    case "FR": return port.freight_to_fr_dzd ?? 1200;
    case "AE": return port.freight_to_ae_dzd ?? 2200;
    case "US": return port.freight_to_us_dzd ?? 3500;
    default: return 2000;
  }
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
