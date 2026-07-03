import * as XLSX from "xlsx";

export interface ParsedCatalogVariant {
  master_id: string;
  parent_product_id?: string;
  brand_code?: string;
  brand_name?: string;
  category_code?: string;
  category_name: string;
  subcategory?: string;
  name: string;
  description?: string;
  ean?: string;
  price_retail_dzd?: number;
  price_fob_usd?: number;
  moq?: number;
  moq_unit?: string;
  hs_code?: string;
  weight_kg?: number;
  volume_l?: number;
  units_per_carton?: number;
  cartons_per_pallet?: number;
  carton_length_cm?: number;
  carton_width_cm?: number;
  carton_height_cm?: number;
  weight_carton_kg?: number;
  weight_pallet_kg?: number;
  subsidy_status?: string;
  phyto_level?: string;
  export_status?: string;
  image_url?: string;
  packaging_notes?: string;
}

type FieldKey = keyof ParsedCatalogVariant;

const ALIASES: Record<FieldKey, string[]> = {
  master_id: ["master_id", "id_variante", "code_id", "id_produit_variante", "code_article", "id_article", "sku", "an"],
  parent_product_id: ["parent_product_id", "id_produit_mere", "id_produit", "produit_mere"],
  brand_code: ["brand_code", "code_marque"],
  brand_name: ["brand_name", "marque", "brand"],
  category_code: ["category_code", "code_categorie", "code_rayon"],
  category_name: ["category_name", "rayon", "categorie", "category", "catégorie"],
  subcategory: ["subcategory", "ub", "sous_categorie", "sous_cat"],
  name: ["name", "nom", "description", "designation", "nom_article", "libelle"],
  description: ["description", "desc", "details", "description_longue"],
  ean: ["ean", "an", "code_barres", "barcode", "gtin", "code_ean"],
  price_retail_dzd: ["price_retail_dzd", "pvttc", "prix_ttc", "prix_detail", "prix_vente_ttc", "pvt_ttc"],
  price_fob_usd: ["price_fob_usd", "prix_fob_usd", "prix_fob", "fob_usd", "price_fob"],
  moq: ["moq", "quantite_min", "qty_min", "minimum_commande"],
  moq_unit: ["moq_unit", "unite_moq", "unit", "unite"],
  hs_code: ["hs_code", "hs_chapitre", "hs_chapitre_indicatif", "code_hs", "code_douanier"],
  weight_kg: ["weight_kg", "poids_brut", "poids_brut_unit_kg", "poids_unitaire_kg", "poids_kg"],
  volume_l: ["volume_l", "volume_unit", "volume_unitaire_l", "volume"],
  units_per_carton: ["units_per_carton", "nb_art_carton", "nb_art_par_carton", "articles_par_carton"],
  cartons_per_pallet: ["cartons_per_pallet", "nb_cartons_palette", "cartons_par_palette"],
  carton_length_cm: ["carton_length_cm", "carton_long_cm", "longueur_carton"],
  carton_width_cm: ["carton_width_cm", "carton_larg_cm", "largeur_carton"],
  carton_height_cm: ["carton_height_cm", "carton_haut_cm", "hauteur_carton"],
  weight_carton_kg: ["weight_carton_kg", "poids_carton_kg"],
  weight_pallet_kg: ["weight_pallet_kg", "poids_palette_kg"],
  subsidy_status: ["subsidy_status", "subvention", "statut_subvention", "segment_e", "subventionne"],
  phyto_level: ["phyto_level", "phytosanitaire", "niveau_phyto", "segment_f"],
  export_status: ["export_status", "statut_export", "statut", "status_export"],
  image_url: ["image_url", "url_image", "photo", "image", "url"],
  packaging_notes: ["packaging_notes", "conditionnement", "emballage", "notes"],
};

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function findCol(headers: string[], field: FieldKey): number {
  const normalized = headers.map(normalizeHeader);
  const aliases = ALIASES[field].map(normalizeHeader);
  for (let i = 0; i < normalized.length; i++) {
    if (aliases.some(a => normalized[i] === a || normalized[i].includes(a))) return i;
  }
  return -1;
}

function num(val: unknown): number | undefined {
  if (val == null || val === "") return undefined;
  const n = parseFloat(String(val).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

function str(val: unknown): string | undefined {
  if (val == null) return undefined;
  const s = String(val).trim();
  return s || undefined;
}

const SKIP_SHEET_HINTS = ["instruction", "controle", "integrite", "readme", "sommaire"];

function isProductSheet(name: string): boolean {
  const n = normalizeHeader(name);
  return !SKIP_SHEET_HINTS.some(h => n.includes(h));
}

function isEmptyDataRow(row: unknown[]): boolean {
  return row.every(c => c == null || String(c).trim() === "");
}

function sheetCategoryFallback(sheetName: string): string {
  return sheetName.replace(/\s+/g, " ").trim() || "NON_CLASSE";
}

function parseSheetRows(
  rows: unknown[][],
  sheetName: string,
  seen: Set<string>,
  out: ParsedCatalogVariant[],
): void {
  if (rows.length < 2) return;

  const headers = rows[0].map(h => String(h ?? ""));
  const cols = Object.fromEntries(
    (Object.keys(ALIASES) as FieldKey[]).map(k => [k, findCol(headers, k)]),
  ) as Record<FieldKey, number>;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row) || isEmptyDataRow(row)) continue;

    const v = rowToVariant(row, cols, i + 1);
    if (!v) continue;

    if (!v.category_name || v.category_name === "NON_CLASSE") {
      v.category_name = sheetCategoryFallback(sheetName);
    }
    if (!v.ean && v.master_id) v.ean = v.master_id;

    if (seen.has(v.master_id)) continue;
    seen.add(v.master_id);
    out.push(v);
  }
}

function rowToVariant(row: unknown[], cols: Record<FieldKey, number>, rowIndex: number): ParsedCatalogVariant | null {
  const get = (f: FieldKey) => {
    const i = cols[f];
    return i >= 0 ? row[i] : undefined;
  };

  const masterId = str(get("master_id"));
  const name = str(get("name"));
  const category = str(get("category_name"));
  if (!name && !masterId) return null;

  return {
    master_id: masterId ?? `ROW-${rowIndex}`,
    parent_product_id: str(get("parent_product_id")),
    brand_code: str(get("brand_code")),
    brand_name: str(get("brand_name")),
    category_code: str(get("category_code")),
    category_name: category ?? "NON_CLASSE",
    subcategory: str(get("subcategory")),
    name: name ?? masterId ?? "Sans nom",
    description: str(get("description")),
    ean: str(get("ean")),
    price_retail_dzd: num(get("price_retail_dzd")),
    price_fob_usd: num(get("price_fob_usd")),
    moq: num(get("moq")),
    moq_unit: str(get("moq_unit")),
    hs_code: str(get("hs_code")),
    weight_kg: num(get("weight_kg")),
    volume_l: num(get("volume_l")),
    units_per_carton: num(get("units_per_carton")),
    cartons_per_pallet: num(get("cartons_per_pallet")),
    carton_length_cm: num(get("carton_length_cm")),
    carton_width_cm: num(get("carton_width_cm")),
    carton_height_cm: num(get("carton_height_cm")),
    weight_carton_kg: num(get("weight_carton_kg")),
    weight_pallet_kg: num(get("weight_pallet_kg")),
    subsidy_status: (str(get("subsidy_status")) ?? "N").toUpperCase().slice(0, 1),
    phyto_level: (str(get("phyto_level")) ?? "X").toUpperCase().slice(0, 1),
    export_status: (str(get("export_status")) ?? "a_valider").toLowerCase(),
    image_url: str(get("image_url")),
    packaging_notes: str(get("packaging_notes")),
  };
}

export function parseMasterDataExcel(buffer: Buffer): ParsedCatalogVariant[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const out: ParsedCatalogVariant[] = [];
  const seen = new Set<string>();

  const sheetNames = workbook.SheetNames.filter(isProductSheet);
  if (sheetNames.length === 0) return out;

  // Cahier de charge multi-rayons (12 feuilles) ou fichier mono-feuille
  if (sheetNames.length === 1) {
    const sheet = workbook.Sheets[sheetNames[0]];
    if (!sheet) return out;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" }) as unknown[][];
    parseSheetRows(rows, sheetNames[0], seen, out);
    return out;
  }

  for (const sheetName of sheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" }) as unknown[][];
    parseSheetRows(rows, sheetName, seen, out);
  }
  return out;
}

export interface PublishReadiness {
  ready: boolean;
  missing: string[];
  warnings: string[];
}

export function checkPublishReadiness(v: {
  image_url?: string | null;
  price_fob_usd?: number | null;
  moq?: number | null;
  hs_code?: string | null;
  export_status?: string | null;
  subsidy_status?: string | null;
  name?: string | null;
}): PublishReadiness {
  const missing: string[] = [];
  const warnings: string[] = [];

  if (!v.image_url?.trim()) missing.push("image_url");
  if (!v.price_fob_usd || v.price_fob_usd <= 0) missing.push("price_fob_usd");
  if (!v.moq || v.moq <= 0) missing.push("moq");
  if (!v.hs_code || v.hs_code.replace(/\D/g, "").length < 4) missing.push("hs_code");

  const status = (v.export_status ?? "a_valider").toLowerCase();
  const validated = ["published", "validé", "valide", "validated", "approved"];
  if (!validated.includes(status)) {
    missing.push("export_status_validated");
  }

  const sub = (v.subsidy_status ?? "N").toUpperCase();
  if (sub === "S" || sub === "Y" || sub === "1") {
    warnings.push("subsidy_confirm_ministry");
  }

  if (v.hs_code && v.hs_code.replace(/\D/g, "").length < 6) {
    warnings.push("hs_code_incomplete");
  }

  return { ready: missing.length === 0, missing, warnings };
}
