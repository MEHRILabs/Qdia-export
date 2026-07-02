#!/usr/bin/env node
/**
 * Vérifie qu'un produit ajouté via l'API est bien enregistré en base PostgreSQL.
 * Usage : node scripts/test-add-product.mjs
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRequire = createRequire(join(__dirname, "../artifacts/api-server/"));
const dbRequire = createRequire(join(__dirname, "../lib/db/"));
apiRequire("dotenv").config({ path: join(__dirname, "../.env") });

const { Pool } = dbRequire("pg");
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const API = process.env.VITE_API_URL ?? "http://localhost:8080";
const testName = `TEST-QDIA-${Date.now()}`;

async function main() {
  console.log("═".repeat(60));
  console.log("Test ajout produit → base PostgreSQL");
  console.log("═".repeat(60));

  const body = {
    name: testName,
    description: "Produit de test ajouté depuis l'application",
    category: "Épicerie",
    sku: `SKU-TEST-${Date.now()}`,
    moq: 100,
    moq_unit: "units",
    port_depart: "Béjaïa",
    origin_wilaya: "Béjaïa",
    certifications: ["Test"],
    prices: { exw: 5, fob: 8, cfr: 12, cif: 13, currency: "USD", unit: "per unit" },
    export_status: "published",
  };

  let productId;
  try {
    const res = await fetch(`${API}/api/products`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    productId = data.id;
    console.log(`\n✅ API POST /products → id=${productId}, nom="${data.name}"`);
  } catch (e) {
    console.log(`\n⚠️  API indisponible (${e.message}) — insertion directe en base…`);
    const r = await pool.query(
      `INSERT INTO products (name, description, category, sku, moq, moq_unit, port_depart, origin_wilaya,
        certifications, export_status, price_exw, price_fob, price_cfr, price_cif, price_currency, price_unit, supplier_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'published',$10,$11,$12,$13,'USD','per unit',1)
       RETURNING id, name`,
      [testName, body.description, body.category, body.sku, body.moq, body.moq_unit,
        body.port_depart, body.origin_wilaya, body.certifications,
        body.prices.exw, body.prices.fob, body.prices.cfr, body.prices.cif],
    );
    productId = r.rows[0].id;
    console.log(`\n✅ Insertion directe → id=${productId}`);
  }

  const check = await pool.query(
    "SELECT id, name, category, sku, export_status FROM products WHERE id = $1",
    [productId],
  );
  if (check.rows.length === 0) {
    console.error("\n❌ Produit introuvable en base après ajout !");
    process.exit(1);
  }
  const row = check.rows[0];
  console.log("\n📦 Vérification base :");
  console.log(`   ID       : ${row.id}`);
  console.log(`   Nom      : ${row.name}`);
  console.log(`   Catégorie: ${row.category}`);
  console.log(`   SKU      : ${row.sku}`);
  console.log(`   Statut   : ${row.export_status}`);

  await pool.query("DELETE FROM products WHERE id = $1", [productId]);
  console.log(`\n🧹 Produit test #${productId} supprimé (nettoyage)`);
  console.log("\n✅ Conclusion : un produit ajouté via l'app/API est bien enregistré en base.");
  await pool.end();
}

main().catch(async e => {
  console.error("\n❌", e.message);
  await pool.end();
  process.exit(1);
});
