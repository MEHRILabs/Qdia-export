#!/usr/bin/env node
/**
 * Import Excel Master Data → catalog_variants
 * Usage: node scripts/import-catalog-variants.mjs ./data/base_de_donnees_finale.xlsx
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
  master_id: ["master_id", "code_id", "id_variante", "code_article", "sku"],
  name: ["nom_article", "nom", "designation", "libelle", "name"],
  category_name: ["rayon", "categorie", "category", "category_name"],
  subcategory: ["sous_categorie", "ub", "subcategory"],
  brand_name: ["marque", "brand", "brand_name"],
  brand_code: ["code_marque", "brand_code"],
  category_code: ["code_categorie", "category_code"],
  ean: ["ean", "code_barre_ean", "code_barres"],
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

function pickSheet(wb) {
  for (const p of ["articles", "variantes", "produits", "catalogue"]) {
    const hit = wb.SheetNames.find(n => norm(n).includes(p));
    if (hit) return wb.Sheets[hit];
  }
  return wb.Sheets[wb.SheetNames[0]];
}

async function main() {
  const wb = XLSX.read(readFileSync(resolve(file)), { type: "buffer" });
  const rows = XLSX.utils.sheet_to_json(pickSheet(wb), { header: 1, defval: "" });
  if (rows.length < 2) { console.error("Feuille vide"); process.exit(1); }

  const headers = rows[0].map(h => String(h ?? ""));
  const col = colMap(headers);
  const get = (row, f) => (col[f] >= 0 ? row[col[f]] : undefined);
  const batch = `XLS-${Date.now()}`;

  const pool = createDbPool();
  const client = await pool.connect();
  let inserted = 0, skipped = 0;

  try {
    await client.query("BEGIN");
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const masterId = str(get(row, "master_id"));
      const name = str(get(row, "name"));
      const category = str(get(row, "category_name")) ?? "NON_CLASSE";
      if (!masterId || !name) { skipped++; continue; }

      await client.query(
        `INSERT INTO catalog_variants (
          master_id, brand_code, brand_name, category_code, category_name, subcategory,
          name, ean, price_retail_dzd, price_fob_usd, moq, moq_unit, hs_code,
          packaging_notes, image_url, subsidy_status, phyto_level, export_status, import_batch, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,'a_valider',$18,NOW())
        ON CONFLICT (master_id) DO UPDATE SET
          name = EXCLUDED.name,
          category_name = EXCLUDED.category_name,
          price_retail_dzd = COALESCE(EXCLUDED.price_retail_dzd, catalog_variants.price_retail_dzd),
          price_fob_usd = COALESCE(EXCLUDED.price_fob_usd, catalog_variants.price_fob_usd),
          moq = COALESCE(EXCLUDED.moq, catalog_variants.moq),
          updated_at = NOW()`,
        [
          masterId,
          str(get(row, "brand_code")),
          str(get(row, "brand_name")),
          str(get(row, "category_code")),
          category,
          str(get(row, "subcategory")),
          name,
          str(get(row, "ean")),
          num(get(row, "price_retail_dzd")),
          num(get(row, "price_fob_usd")),
          num(get(row, "moq")),
          str(get(row, "moq_unit")),
          str(get(row, "hs_code")),
          str(get(row, "packaging_notes")),
          str(get(row, "image_url")),
          (str(get(row, "subsidy_status")) ?? "N").toUpperCase().slice(0, 1),
          (str(get(row, "phyto_level")) ?? "X").toUpperCase().slice(0, 1),
          batch,
        ],
      );
      inserted++;
      if (inserted % 2000 === 0) console.log(`… ${inserted} variantes importées`);
    }
    await client.query("COMMIT");
    console.log(`Import terminé : ${inserted} variantes, ${skipped} ignorées (batch ${batch})`);
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
