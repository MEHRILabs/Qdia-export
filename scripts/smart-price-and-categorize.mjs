#!/usr/bin/env node
/**
 * Prix réalistes + catégories pour tous les produits.
 *
 * Données source sans prix : on estime un coût DZD à partir
 * du poids/volume extrait du nom et d'un tarif par catégorie,
 * puis on applique la formule export EXW -> FOB -> CFR -> CIF.
 *
 * Usage : node scripts/smart-price-and-categorize.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(join(__dirname, "../.env"), "utf8").split("\n")) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
}
const require = createRequire(join(__dirname, "../lib/db/"));
const pool = new (require("pg").Pool)({ connectionString: process.env.DATABASE_URL });

// Libellés FR par code catégorie
const CATEGORY_LABEL = {
  EPI: "Épicerie",
  PAP: "Papeterie",
  HYG: "Hygiène & Beauté",
  DRO: "Droguerie & Entretien",
  CDM: "Conserves & Condiments",
  BOI: "Boissons",
  LAI: "Produits laitiers",
  FRL: "Fruits & Légumes",
  CHA: "Charcuterie",
  BVO: "Boucherie & Volaille",
  BOU: "Boulangerie & Pâtisserie",
  POI: "Poissonnerie",
};

// Tarif indicatif DZD/kg (ou DZD/L) par catégorie
const PRICE_PER_KG = {
  EPI: 420, PAP: 900, HYG: 850, DRO: 520, CDM: 480,
  BOI: 160, LAI: 620, FRL: 230, CHA: 1250, BVO: 1450,
  BOU: 380, POI: 1050,
};
// Prix unitaire DZD si pas de poids détecté
const PRICE_PER_UNIT = {
  EPI: 160, PAP: 220, HYG: 260, DRO: 300, CDM: 190,
  BOI: 110, LAI: 150, FRL: 90, CHA: 350, BVO: 450,
  BOU: 120, POI: 400,
};

const DEFAULT_CAT = "Produits divers";
const DEFAULT_KG = 450;
const DEFAULT_UNIT = 180;

// Formule export
const USD_RATE = parseFloat(process.env.DZD_USD_RATE ?? "0.0074");
const FACTOR = USD_RATE * 1.15 * 1.03;
const HANDLING = 900;
const FREIGHT = 1200;

/** Extrait poids(kg) ou volume(L) du nom, sinon null */
function parseQuantity(name) {
  const n = name.toUpperCase().replace(",", ".");
  // volume
  let m = n.match(/(\d+(?:\.\d+)?)\s*(ML|CL|L)\b/);
  if (m) {
    const v = parseFloat(m[1]);
    const unit = m[2];
    const liters = unit === "ML" ? v / 1000 : unit === "CL" ? v / 100 : v;
    return { type: "L", value: liters };
  }
  // poids
  m = n.match(/(\d+(?:\.\d+)?)\s*(KG|G|GR)\b/);
  if (m) {
    const v = parseFloat(m[1]);
    const unit = m[2];
    const kg = unit === "KG" ? v : v / 1000;
    return { type: "kg", value: kg };
  }
  return null;
}

function catCodeFromSku(sku) {
  const parts = (sku ?? "").split("-");
  return parts[1] ?? null;
}

function computeCostDzd(catCode, qty) {
  const perKg = PRICE_PER_KG[catCode] ?? DEFAULT_KG;
  const perUnit = PRICE_PER_UNIT[catCode] ?? DEFAULT_UNIT;
  if (qty && qty.type === "kg") return Math.max(60, perKg * qty.value);
  if (qty && qty.type === "L") return Math.max(50, perKg * qty.value);
  return perUnit;
}

function pricesFromCost(costDzd) {
  const pack = Math.max(50, costDzd * 0.05);
  const transp = Math.max(100, costDzd * 0.03);
  const exwDzd = costDzd + pack;
  const fobDzd = exwDzd + transp + HANDLING;
  const cfrDzd = fobDzd + FREIGHT;
  const cifDzd = cfrDzd * 1.005;
  return {
    exw: +(exwDzd * FACTOR).toFixed(2),
    fob: +(fobDzd * FACTOR).toFixed(2),
    cfr: +(cfrDzd * FACTOR).toFixed(2),
    cif: +(cifDzd * FACTOR).toFixed(2),
    retail: Math.round(costDzd),
  };
}

const rows = await pool.query("SELECT id, name, sku FROM products");
console.log(`${rows.rows.length} produits à traiter…`);

const BATCH = 1000;
let done = 0;
const client = await pool.connect();
try {
  await client.query("BEGIN");
  for (let i = 0; i < rows.rows.length; i += BATCH) {
    const slice = rows.rows.slice(i, i + BATCH);
    const ids = [], cats = [], exw = [], fob = [], cfr = [], cif = [], retail = [];
    for (const r of slice) {
      const code = catCodeFromSku(r.sku);
      const qty = parseQuantity(r.name);
      const cost = computeCostDzd(code, qty);
      const p = pricesFromCost(cost);
      ids.push(r.id);
      cats.push(CATEGORY_LABEL[code] ?? DEFAULT_CAT);
      exw.push(p.exw); fob.push(p.fob); cfr.push(p.cfr); cif.push(p.cif);
      retail.push(p.retail);
    }
    await client.query(
      `UPDATE products AS p SET
         category = d.cat,
         price_exw = d.exw, price_fob = d.fob, price_cfr = d.cfr, price_cif = d.cif,
         price_retail = d.retail, price_currency = 'USD'
       FROM (
         SELECT unnest($1::int[]) AS id, unnest($2::text[]) AS cat,
                unnest($3::real[]) AS exw, unnest($4::real[]) AS fob,
                unnest($5::real[]) AS cfr, unnest($6::real[]) AS cif,
                unnest($7::real[]) AS retail
       ) d
       WHERE p.id = d.id`,
      [ids, cats, exw, fob, cfr, cif, retail],
    );
    done += slice.length;
    if (done % 5000 === 0 || done === rows.rows.length) console.log(`  … ${done} traités`);
  }
  await client.query("COMMIT");
} catch (e) {
  await client.query("ROLLBACK");
  throw e;
} finally {
  client.release();
}

const sample = await pool.query(
  "SELECT name, category, price_fob, price_cif FROM products ORDER BY random() LIMIT 8",
);
console.log("\nExemples variés :");
for (const r of sample.rows) {
  console.log(`  ${r.name.slice(0, 34).padEnd(36)} [${r.category}]  FOB $${r.price_fob}  CIF $${r.price_cif}`);
}

await pool.end();
console.log(`\nTerminé : ${done} produits catégorisés et tarifés.`);
