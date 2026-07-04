#!/usr/bin/env node
/**
 * Répare les catégories NON_CLASSE / Articles / VARIANTES
 * en déduisant le rayon depuis le code master_id (DZ-EPI-… → Épicerie)
 * puis mappe vers les 5 secteurs marketplace.
 *
 * Usage : node scripts/fix-product-categories.mjs
 */
import { createDbPool } from "./db-pool.mjs";
import { marketplaceCategorySql } from "./lib/category-normalize.mjs";

async function main() {
  const pool = createDbPool();
  const client = await pool.connect();
  const cvMarketplace = marketplaceCategorySql("cv");
  const pMarketplace = marketplaceCategorySql("p", "sku", "category");

  try {
    const before = await client.query(`
      SELECT category, COUNT(*)::int AS n FROM products
      WHERE lower(trim(category)) IN ('non_classe','non classe','non classé','articles','variantes','produits divers')
         OR category NOT IN ('Agriculture & Food','Energy & Chemicals','Textiles & Apparel','Construction Materials','Handicrafts & Decor')
      GROUP BY category ORDER BY n DESC LIMIT 10
    `);
    if (before.rows.length) {
      console.log("Avant réparation (products) :");
      for (const r of before.rows) console.log(`  ${r.category}: ${r.n}`);
    }

    await client.query("BEGIN");

    const cvFix = await client.query(`
      UPDATE catalog_variants cv SET
        category_code = COALESCE(NULLIF(trim(cv.category_code), ''), UPPER(split_part(cv.master_id, '-', 2))),
        category_name = CASE UPPER(split_part(cv.master_id, '-', 2))
          WHEN 'EPI' THEN 'Épicerie' WHEN 'PAP' THEN 'Papeterie' WHEN 'HYG' THEN 'Hygiène & Beauté'
          WHEN 'DRO' THEN 'Droguerie & Entretien' WHEN 'CDM' THEN 'Conserves & Condiments'
          WHEN 'BOI' THEN 'Boissons' WHEN 'LAI' THEN 'Produits laitiers' WHEN 'FRL' THEN 'Fruits & Légumes'
          WHEN 'CHA' THEN 'Charcuterie' WHEN 'BVO' THEN 'Boucherie & Volaille'
          WHEN 'BOU' THEN 'Boulangerie & Pâtisserie' WHEN 'POI' THEN 'Poissonnerie'
          WHEN 'ALI' THEN 'Agroalimentaire' WHEN 'AGR' THEN 'Agroalimentaire'
          WHEN 'TEX' THEN 'Textiles' WHEN 'TXT' THEN 'Textiles'
          WHEN 'BTP' THEN 'Construction' WHEN 'CON' THEN 'Construction'
          WHEN 'ART' THEN 'Artisanat' WHEN 'ENE' THEN 'Énergie' WHEN 'CHI' THEN 'Chimie'
          WHEN 'PHA' THEN 'Pharmaceutique' WHEN 'CMH' THEN 'Confort maison'
          ELSE cv.category_name
        END,
        updated_at = NOW()
      WHERE cv.master_id IS NOT NULL
        AND (
          lower(trim(cv.category_name)) IN ('non_classe','non classe','non classé','articles','variantes','produits','catalogue')
          OR cv.category_name IS NULL OR trim(cv.category_name) = ''
        )
    `);
    console.log(`→ ${cvFix.rowCount ?? 0} lignes catalog_variants corrigées`);

    const pFixCv = await client.query(`
      UPDATE products p SET category = sub.marketplace
      FROM (
        SELECT cv.master_id, ${cvMarketplace} AS marketplace
        FROM catalog_variants cv
        WHERE cv.master_id IS NOT NULL
      ) sub
      WHERE p.sku = sub.master_id
        AND (
          lower(trim(p.category)) IN ('non_classe','non classe','non classé','articles','variantes','produits','catalogue','produits divers')
          OR p.category IS NULL OR trim(p.category) = ''
          OR p.category NOT IN ('Agriculture & Food','Energy & Chemicals','Textiles & Apparel','Construction Materials','Handicrafts & Decor')
        )
    `);
    console.log(`→ ${pFixCv.rowCount ?? 0} lignes products corrigées via catalog_variants`);

    const pFixSku = await client.query(`
      UPDATE products p SET category = ${pMarketplace}
      WHERE p.sku IS NOT NULL AND trim(p.sku) <> ''
        AND p.sku LIKE 'DZ-%'
        AND (
          lower(trim(p.category)) IN ('non_classe','non classe','non classé','articles','variantes','produits','catalogue','produits divers')
          OR p.category IS NULL OR trim(p.category) = ''
          OR p.category NOT IN ('Agriculture & Food','Energy & Chemicals','Textiles & Apparel','Construction Materials','Handicrafts & Decor')
        )
    `);
    console.log(`→ ${pFixSku.rowCount ?? 0} lignes products corrigées via SKU`);

    await client.query("COMMIT");

    const after = await client.query(`
      SELECT category, COUNT(*)::int AS n FROM products
      WHERE export_status = 'published'
      GROUP BY category ORDER BY n DESC LIMIT 15
    `);
    console.log("\nRépartition après réparation :");
    for (const r of after.rows) console.log(`  ${r.category}: ${r.n}`);
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error("fix-product-categories:", err);
  process.exit(1);
});
