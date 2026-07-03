#!/usr/bin/env node
/**
 * Import Excel Master Data → catalog_variants
 * Supporte LISTING CAHIER DE CHARGE (12 feuilles / 19 735 produits) et fichiers mono-feuille.
 *
 * Usage: node scripts/import-catalog-variants.mjs <fichier.xlsx>
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { createDbPool } from "./db-pool.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const XLSX = require(resolve(__dirname, "../artifacts/api-server/node_modules/xlsx"));

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/import-catalog-variants.mjs <fichier.xlsx>");
  process.exit(1);
}

function norm(h) {
  return String(h ?? "").toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

const ALIASES = {
  master_id: ["master_id", "code_id", "id_variante", "code_article", "sku", "an"],
  name: ["nom_article", "nom", "designation", "libelle", "name", "description"],
  category_name: ["rayon", "categorie", "category", "category_name"],
  subcategory: ["sous_categorie", "ub", "subcategory"],
  brand_name: ["marque", "brand", "brand_name"],
  brand_code: ["code_marque", "brand_code"],
  category_code: ["code_categorie", "category_code"],
  ean: ["ean", "code_barre_ean", "code_barres", "an"],
  price_retail_dzd: ["prix_ht_dzd", "prix_ttc", "pvttc", "price_retail_dzd"],
  price_fob_usd: ["fob_usd", "prix_fob", "price_fob_usd"],
  moq: ["moq", "quantite_min"],
  moq_unit: ["unite", "moq_unit"],
  hs_code: ["hs_code", "code_hs"],
  packaging_notes: ["conditionnement", "emballage", "packaging_notes"],
  image_url: ["photo_url", "image_url", "url_image"],
  subsidy_status: ["subventionne", "subsidy_status", "segment_e"],
  phyto_level: ["phyto", "niveau_phytosanitaire", "phyto_level"],
};

const SKIP_SHEETS = ["instruction", "controle", "integrite", "readme", "sommaire"];

function colMap(headers) {
  const n = headers.map(norm);
  const map = {};
  for (const [field, aliases] of Object.entries(ALIASES)) {
    map[field] = n.findIndex(h => aliases.map(norm).some(a => h === a || h.includes(a)));
  }
  return map;
}

function num(v) {
  if (v == null || v === "") return null;
  const x = parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(x) ? x : null;
}
function str(v) {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function isEmptyRow(row) {
  return row.every(c => c == null || String(c).trim() === "");
}

function sheetCategory(name) {
  return name.replace(/\s+/g, " ").trim() || "NON_CLASSE";
}

function isProductSheet(name) {
  const n = norm(name);
  return !SKIP_SHEETS.some(s => n.includes(s));
}

function parseWorkbook(wb) {
  const items = [];
  const seen = new Set();

  for (const sheetName of wb.SheetNames.filter(isProductSheet)) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: "" });
    if (rows.length < 2) continue;

    const headers = rows[0].map(h => String(h ?? ""));
    const col = colMap(headers);
    const get = (row, f) => (col[f] >= 0 ? row[col[f]] : undefined);

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row) || isEmptyRow(row)) continue;

      const masterId = str(get(row, "master_id"));
      const name = str(get(row, "name"));
      let category = str(get(row, "category_name")) ?? sheetCategory(sheetName);
      if (!masterId || !name) continue;
      if (seen.has(masterId)) continue;
      seen.add(masterId);

      items.push({
        masterId,
        name,
        category,
        brandCode: str(get(row, "brand_code")),
        brandName: str(get(row, "brand_name")),
        categoryCode: str(get(row, "category_code")),
        subcategory: str(get(row, "subcategory")),
        ean: str(get(row, "ean")) ?? masterId,
        priceRetail: num(get(row, "price_retail_dzd")),
        priceFob: num(get(row, "price_fob_usd")),
        moq: num(get(row, "moq")),
        moqUnit: str(get(row, "moq_unit")),
        hsCode: str(get(row, "hs_code")),
        packaging: str(get(row, "packaging_notes")),
        imageUrl: str(get(row, "image_url")),
        subsidy: (str(get(row, "subsidy_status")) ?? "N").toUpperCase().slice(0, 1),
        phyto: (str(get(row, "phyto_level")) ?? "X").toUpperCase().slice(0, 1),
      });
    }
  }
  return items;
}

const INSERT_SQL = `INSERT INTO catalog_variants (
  master_id, brand_code, brand_name, category_code, category_name, subcategory,
  name, ean, price_retail_dzd, price_fob_usd, moq, moq_unit, hs_code,
  packaging_notes, image_url, subsidy_status, phyto_level, export_status, import_batch, updated_at
) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'a_valider',$18,NOW())
ON CONFLICT (master_id) DO UPDATE SET
  name = EXCLUDED.name,
  category_name = EXCLUDED.category_name,
  subcategory = EXCLUDED.subcategory,
  brand_name = COALESCE(EXCLUDED.brand_name, catalog_variants.brand_name),
  price_retail_dzd = COALESCE(EXCLUDED.price_retail_dzd, catalog_variants.price_retail_dzd),
  price_fob_usd = COALESCE(EXCLUDED.price_fob_usd, catalog_variants.price_fob_usd),
  moq = COALESCE(EXCLUDED.moq, catalog_variants.moq),
  updated_at = NOW()`;

async function main() {
  const wb = XLSX.read(readFileSync(resolve(file)), { type: "buffer" });
  const items = parseWorkbook(wb);
  if (!items.length) {
    console.error("Aucune ligne produit trouvée dans le fichier Excel");
    process.exit(1);
  }

  console.log(`→ ${items.length} produits parsés depuis ${wb.SheetNames.length} feuille(s)`);

  const pool = createDbPool();
  const client = await pool.connect();
  const batch = `XLS-${Date.now()}`;
  let inserted = 0;

  try {
    await client.query("BEGIN");
    for (const v of items) {
      await client.query(INSERT_SQL, [
        v.masterId, v.brandCode, v.brandName, v.categoryCode, v.category,
        v.subcategory, v.name, v.ean, v.priceRetail, v.priceFob, v.moq,
        v.moqUnit, v.hsCode, v.packaging, v.imageUrl, v.subsidy, v.phyto, batch,
      ]);
      inserted++;
      if (inserted % 2000 === 0) console.log(`… ${inserted} variantes importées`);
    }
    await client.query("COMMIT");
    console.log(`✓ Import terminé : ${inserted} variantes (batch ${batch})`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
