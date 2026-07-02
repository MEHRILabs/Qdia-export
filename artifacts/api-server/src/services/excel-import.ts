import * as XLSX from "xlsx";

export interface ExcelProductRow {
  name: string;
  description?: string;
  category: string;
  sku?: string;
  moq: number;
  moq_unit: string;
  port_depart: string;
  origin_wilaya?: string;
  price_retail?: number;
  price_wholesale?: number;
  price_currency?: string;
  packaging?: string;
  certifications?: string[];
  image_url?: string;
  source_url?: string;
}

const COLUMN_ALIASES: Record<string, string[]> = {
  name: ["nom", "name", "produit", "product", "product_name", "designation", "désignation", "titre"],
  description: ["description", "desc", "details"],
  category: ["category", "categorie", "catégorie", "secteur"],
  sku: ["sku", "ref", "reference", "référence", "code"],
  moq: ["moq", "quantite_min", "quantité_min", "qty_min", "minimum"],
  moq_unit: ["moq_unit", "unite", "unité", "unit", "unite_moq"],
  port_depart: ["port", "port_depart", "port_départ", "port_export"],
  origin_wilaya: ["wilaya", "origine", "origin", "origin_wilaya", "region"],
  price_retail: [
    "prix_par_piece", "prix piece", "prix_piece", "prix par piece",
    "prix_unitaire", "prix unitaire", "prix_detail", "prix détail",
    "price_retail", "retail", "prix_retail", "prix à la pièce",
  ],
  price_wholesale: [
    "prix_gros", "prix gros", "prix en gros", "prix_en_gros",
    "wholesale", "price_wholesale", "prix_wholesale", "prix_grossiste",
    "prix_export", "prix export",
  ],
  price_currency: ["devise", "currency", "monnaie"],
  packaging: ["conditionnement", "packaging", "emballage"],
  certifications: ["certifications", "certificats", "normes"],
  image_url: ["image_url", "image", "photo", "photo_url", "url_image", "lien_image"],
  source_url: ["source_url", "url_source", "page_url", "url_page", "lien_produit", "catalogue_url"],
};

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

function findColumn(headers: string[], field: keyof typeof COLUMN_ALIASES): number {
  const normalized = headers.map(normalizeHeader);
  const aliases = COLUMN_ALIASES[field].map(normalizeHeader);
  for (let i = 0; i < normalized.length; i++) {
    if (aliases.some(a => normalized[i] === a || normalized[i].includes(a))) return i;
  }
  return -1;
}

function parseNumber(val: unknown): number | undefined {
  if (val == null || val === "") return undefined;
  const n = parseFloat(String(val).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

function parseString(val: unknown): string | undefined {
  if (val == null) return undefined;
  const s = String(val).trim();
  return s || undefined;
}

export function parseExcelProducts(buffer: Buffer): ExcelProductRow[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" }) as unknown[][];
  if (rows.length < 2) return [];

  const headerRow = rows[0].map(h => String(h ?? ""));
  const col = {
    name: findColumn(headerRow, "name"),
    description: findColumn(headerRow, "description"),
    category: findColumn(headerRow, "category"),
    sku: findColumn(headerRow, "sku"),
    moq: findColumn(headerRow, "moq"),
    moq_unit: findColumn(headerRow, "moq_unit"),
    port: findColumn(headerRow, "port_depart"),
    wilaya: findColumn(headerRow, "origin_wilaya"),
    retail: findColumn(headerRow, "price_retail"),
    wholesale: findColumn(headerRow, "price_wholesale"),
    currency: findColumn(headerRow, "price_currency"),
    packaging: findColumn(headerRow, "packaging"),
    certs: findColumn(headerRow, "certifications"),
    image: findColumn(headerRow, "image_url"),
    source: findColumn(headerRow, "source_url"),
  };

  if (col.name < 0) {
    throw new Error(
      "Colonne « nom » / « produit » introuvable. Colonnes attendues : nom, prix_par_piece, prix_gros, moq, categorie…",
    );
  }

  const products: ExcelProductRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row.length) continue;

    const name = parseString(row[col.name]);
    if (!name) continue;

    const priceRetail = col.retail >= 0 ? parseNumber(row[col.retail]) : undefined;
    const priceWholesale = col.wholesale >= 0 ? parseNumber(row[col.wholesale]) : undefined;

    const certsRaw = col.certs >= 0 ? parseString(row[col.certs]) : undefined;

    products.push({
      name,
      description: col.description >= 0 ? parseString(row[col.description]) : undefined,
      category: col.category >= 0 ? (parseString(row[col.category]) ?? "Agriculture & Food") : "Agriculture & Food",
      sku: col.sku >= 0 ? parseString(row[col.sku]) : undefined,
      moq: col.moq >= 0 ? (parseNumber(row[col.moq]) ?? 100) : 100,
      moq_unit: col.moq_unit >= 0 ? (parseString(row[col.moq_unit]) ?? "units") : "units",
      port_depart: col.port >= 0 ? (parseString(row[col.port]) ?? "Alger") : "Alger",
      origin_wilaya: col.wilaya >= 0 ? parseString(row[col.wilaya]) : undefined,
      price_retail: priceRetail,
      price_wholesale: priceWholesale,
      price_currency: col.currency >= 0 ? (parseString(row[col.currency]) ?? "DZD") : "DZD",
      packaging: col.packaging >= 0 ? parseString(row[col.packaging]) : undefined,
      certifications: certsRaw ? certsRaw.split(/[,;|]/).map(s => s.trim()).filter(Boolean) : [],
      image_url: col.image >= 0 ? parseString(row[col.image]) : undefined,
      source_url: col.source >= 0 ? parseString(row[col.source]) : undefined,
    });
  }

  return products;
}

/** Convertit prix gros DZD → Incoterms USD approximatifs */
export function wholesaleToIncoterms(wholesaleDzd: number, currency = "DZD") {
  const USD_RATE = currency.toUpperCase() === "USD" ? 1 : parseFloat(process.env.DZD_USD_RATE ?? "0.0074");
  const base = currency.toUpperCase() === "USD" ? wholesaleDzd : wholesaleDzd * USD_RATE;
  return {
    exw: parseFloat((base * 0.92).toFixed(2)),
    fob: parseFloat(base.toFixed(2)),
    cfr: parseFloat((base * 1.18).toFixed(2)),
    cif: parseFloat((base * 1.22).toFixed(2)),
  };
}

export function buildTemplateWorkbook(): Buffer {
  const data = [
    ["nom", "description", "categorie", "prix_par_piece", "prix_gros", "moq", "unite", "port", "wilaya", "devise", "conditionnement", "certifications", "image_url", "url_source"],
    ["Huile d'olive extra vierge", "Première pression à froid Béjaïa", "Agriculture & Food", 850, 720, 500, "liters", "Béjaïa", "Béjaïa", "DZD", "Bidon 5L", "Bio, Halal", "", "https://exemple-fournisseur.dz/catalogue/huile"],
    ["Dattes Deglet Nour", "Calibre A export Biskra", "Agriculture & Food", 450, 380, 1000, "kg", "Alger", "Biskra", "DZD", "Carton 5kg", "Halal", "https://exemple.dz/images/dattes.jpg", ""],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Produits");
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}
