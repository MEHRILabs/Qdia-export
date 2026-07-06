/**
 * Garantit des produits visibles dans le catalogue marketplace.
 * 1) Insère le catalogue algérien de base (6 produits) si la table est vide
 * 2) Publie catalog_variants → products (jusqu'à 20 000 lignes)
 */
import { createDbPool } from "./db-pool.mjs";
import { marketplaceCategorySql } from "./lib/category-normalize.mjs";
import {
  inferStockCountries,
  DEFAULT_TARGET_MARKETS,
  computePriceDdp,
} from "./lib/export-fields.mjs";

const PLACEHOLDER = "/qdia-photo-placeholder.svg";

const SEED_PRODUCTS = [
  {
    name: "Huile d'olive extra vierge — Béjaïa",
    description: "Première pression à froid, acidité < 0,8 %. Export premium vers l'UE.",
    category: "Agriculture & Food",
    sku: "QDIA-OO-001",
    image_url: "/olive-oil.png",
    moq: 500, moq_unit: "liters", port_depart: "Béjaïa", origin_wilaya: "Béjaïa",
    certifications: ["Bio Certified", "ISO 22000", "Halal Certificate"],
    packaging: "Bidon 5 L / bouteille 750 ml",
    target_markets: ["FR", "DE", "ES"],
    price_exw: 4.2, price_fob: 5.1, price_cfr: 6.8, price_cif: 7.0, price_unit: "per liter",
    is_featured: true, rating: 4.8, review_count: 23, orders_fulfilled: 12,
    supplier_name: "Coopérative Oléicole Béjaïa",
    export_authorized: true,
    stock_countries: ["DZ", "FR"],
  },
  {
    name: "Dattes Deglet Nour Premium",
    description: "Dattes branche calibre A, origine Biskra.",
    category: "Agriculture & Food",
    sku: "QDIA-DT-002",
    image_url: "/dates.png",
    moq: 1000, moq_unit: "kg", port_depart: "Alger", origin_wilaya: "Biskra",
    certifications: ["Halal Certificate", "Phytosanitary Certificate"],
    packaging: "Carton 5 kg branche",
    target_markets: ["FR", "UK", "US"],
    price_exw: 2.8, price_fob: 3.4, price_cfr: 4.6, price_cif: 4.8, price_unit: "per kg",
    is_featured: true, rating: 4.6, review_count: 18, orders_fulfilled: 8,
    supplier_name: "Coopérative Oléicole Béjaïa",
  },
  {
    name: "Miel de Ghardaïa — Sahara",
    description: "Miel pur des oasis du M'Zab, certifié Halal.",
    category: "Agriculture & Food",
    sku: "QDIA-HN-003",
    image_url: "/honey.png",
    moq: 200, moq_unit: "kg", port_depart: "Ghardaïa", origin_wilaya: "Ghardaïa",
    certifications: ["Halal Certificate", "Organic"],
    packaging: "Pot verre 500 g / seau 25 kg",
    target_markets: ["FR", "DE", "SA"],
    price_exw: 8.5, price_fob: 9.2, price_cfr: 11.0, price_cif: 11.5, price_unit: "per kg",
    is_featured: false, rating: 4.7, review_count: 11, orders_fulfilled: 8,
    supplier_name: "Apiculteurs du M'Zab",
  },
  {
    name: "Couscous traditionnel",
    description: "Semoule de blé dur premium, Constantine.",
    category: "Agriculture & Food",
    sku: "QDIA-CS-004",
    image_url: "/couscous.png",
    moq: 2000, moq_unit: "kg", port_depart: "Skikda", origin_wilaya: "Constantine",
    certifications: ["ISO 22000", "Halal Certificate"],
    packaging: "Sac 25 kg",
    target_markets: ["FR", "IT"],
    price_exw: 1.8, price_fob: 2.1, price_cfr: 2.9, price_cif: 3.1, price_unit: "per kg",
    is_featured: false, rating: 4.5, review_count: 9, orders_fulfilled: 5,
    supplier_name: "Meunerie Constantine",
  },
  {
    name: "Tapis berbère — artisanat",
    description: "Tapis tissé main, laine naturelle, motifs kabyles.",
    category: "Handicrafts & Decor",
    sku: "QDIA-RG-005",
    image_url: "/rug.png",
    moq: 50, moq_unit: "units", port_depart: "Alger", origin_wilaya: "Tizi Ouzou",
    certifications: ["Artisanat certifié"],
    packaging: "Roulé + tube carton",
    target_markets: ["FR", "US"],
    price_exw: 38, price_fob: 45, price_cfr: 52, price_cif: 55, price_unit: "per unit",
    is_featured: false, rating: 4.9, review_count: 7, orders_fulfilled: 3,
    supplier_name: "Artisans de Kabylie",
  },
  {
    name: "Poterie kabyle",
    description: "Poterie traditionnelle émaillée, Ath Yenni.",
    category: "Handicrafts & Decor",
    sku: "QDIA-PT-006",
    image_url: "/pottery.png",
    moq: 100, moq_unit: "units", port_depart: "Alger", origin_wilaya: "Tizi Ouzou",
    certifications: ["Artisanat certifié"],
    packaging: "Carton renforcé individuel",
    target_markets: ["FR", "DE"],
    price_exw: 10, price_fob: 12, price_cfr: 15, price_cif: 16, price_unit: "per unit",
    is_featured: false, rating: 4.6, review_count: 5, orders_fulfilled: 2,
    supplier_name: "Atelier Ath Yenni",
  },
];

async function ensureSupplier(client) {
  let row = await client.query(`SELECT id FROM suppliers LIMIT 1`);
  if (row.rows.length) return row.rows[0].id;
  const ins = await client.query(
    `INSERT INTO suppliers (company_name, wilaya, verified, verification_level, platform_years, response_rate, transaction_count, description)
     VALUES ($1, $2, true, 2, 3, 0.95, 47, $3) RETURNING id`,
    ["Catalogue Export QDIA 🇩🇿", "Alger", "Exportateurs algériens vérifiés — agriculture, artisanat, industrie."],
  );
  return ins.rows[0].id;
}

async function seedBaseProducts(client, supplierId) {
  const { rows } = await client.query(`SELECT count(*)::int AS n FROM products`);
  if (rows[0].n > 0) {
    console.log(`→ ${rows[0].n} produit(s) déjà en base — seed de base ignoré`);
    return rows[0].n;
  }
  for (const p of SEED_PRODUCTS) {
    const stock = p.stock_countries ?? inferStockCountries(p.target_markets);
    const priceDdp = computePriceDdp(p.price_cif);
    await client.query(
      `INSERT INTO products (
        name, description, category, sku, image_url, images, supplier_id, supplier_name, supplier_location,
        moq, moq_unit, port_depart, origin_wilaya, certifications, packaging, export_status,
        price_exw, price_fob, price_cfr, price_cif, price_currency, price_unit,
        target_markets, is_featured, rating, review_count, orders_fulfilled,
        origin_country, export_authorized, stock_countries, price_ddp
      )
      SELECT $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'published',
        $16,$17,$18,$19,'USD',$20,$21,$22,$23,$24,$25,
        'DZ',$26,$27,$28
      WHERE NOT EXISTS (SELECT 1 FROM products WHERE sku = $4)`,
      [
        p.name, p.description, p.category, p.sku, p.image_url, [p.image_url],
        supplierId, p.supplier_name, "Algérie",
        p.moq, p.moq_unit, p.port_depart, p.origin_wilaya, p.certifications, p.packaging,
        p.price_exw, p.price_fob, p.price_cfr, p.price_cif, p.price_unit,
        p.target_markets, p.is_featured, p.rating, p.review_count, p.orders_fulfilled,
        p.export_authorized !== false, stock, priceDdp,
      ],
    );
  }
  console.log(`→ ${SEED_PRODUCTS.length} produits de base insérés`);
  return SEED_PRODUCTS.length;
}

async function repairCatalogVariantCategories(client) {
  const { rowCount } = await client.query(`
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
  console.log(`→ ${rowCount ?? 0} variantes reclassées (catalog_variants)`);
  return rowCount ?? 0;
}

async function syncCatalogVariants(client, supplierId) {
  const { rows: countRows } = await client.query(
    `SELECT count(*)::int AS n FROM catalog_variants WHERE name IS NOT NULL AND trim(name) <> ''`,
  );
  if (!countRows[0].n) {
    console.log("→ Aucune variante catalog_variants à publier");
    return 0;
  }

  // Expressions de prix réutilisées (INSERT + UPDATE) — pas d'ON CONFLICT
  // car le schéma Drizzle ne garantit pas d'index unique sur products.sku.
  const EXW = `CASE WHEN cv.price_fob_usd > 0 THEN cv.price_fob_usd * 0.92
      WHEN cv.price_retail_dzd > 0 THEN (cv.price_retail_dzd / 135.0) * 0.92 ELSE 0.92 END`;
  const FOB = `CASE WHEN cv.price_fob_usd > 0 THEN cv.price_fob_usd
      WHEN cv.price_retail_dzd > 0 THEN cv.price_retail_dzd / 135.0 ELSE 1 END`;
  const CFR = `CASE WHEN cv.price_fob_usd > 0 THEN cv.price_fob_usd * 1.08
      WHEN cv.price_retail_dzd > 0 THEN (cv.price_retail_dzd / 135.0) * 1.08 ELSE 1.08 END`;
  const CIF = `CASE WHEN cv.price_fob_usd > 0 THEN cv.price_fob_usd * 1.12
      WHEN cv.price_retail_dzd > 0 THEN (cv.price_retail_dzd / 135.0) * 1.12 ELSE 1.12 END`;
  const WHOLESALE = `CASE WHEN cv.price_fob_usd > 0 THEN cv.price_fob_usd
      WHEN cv.price_retail_dzd > 0 THEN cv.price_retail_dzd / 135.0 ELSE NULL END`;
  const DDP = `CASE WHEN cv.price_fob_usd > 0 THEN cv.price_fob_usd * 1.12 * 1.18
      WHEN cv.price_retail_dzd > 0 THEN (cv.price_retail_dzd / 135.0) * 1.12 * 1.18 ELSE 1.32 END`;
  const CATEGORY = marketplaceCategorySql("cv");
  const IMAGE = `COALESCE(NULLIF(trim(cv.image_url), ''), $2)`;
  const DESC = `COALESCE(cv.description, COALESCE(cv.brand_name, '') || ' — ' || cv.name)`;
  const NOT_EMPTY = `cv.name IS NOT NULL AND trim(cv.name) <> '' AND cv.master_id IS NOT NULL`;

  // 1) Mettre à jour les produits déjà présents (même SKU)
  await client.query(
    `UPDATE products p SET
        name = cv.name,
        description = ${DESC},
        category = ${CATEGORY},
        image_url = ${IMAGE},
        images = ARRAY[${IMAGE}],
        supplier_id = $1,
        supplier_name = COALESCE(cv.brand_name, 'Export DZ'),
        moq = GREATEST(COALESCE(cv.moq, 100), 1),
        moq_unit = COALESCE(cv.moq_unit, 'unité'),
        packaging = cv.packaging_notes,
        price_exw = ${EXW},
        price_fob = ${FOB},
        price_cfr = ${CFR},
        price_cif = ${CIF},
        price_retail = cv.price_retail_dzd,
        price_wholesale = ${WHOLESALE},
        export_status = 'published',
        origin_country = COALESCE(p.origin_country, 'DZ'),
        export_authorized = COALESCE(p.export_authorized, false),
        stock_countries = CASE
          WHEN p.stock_countries IS NOT NULL AND cardinality(p.stock_countries) > 1 THEN p.stock_countries
          ELSE ARRAY['DZ']
        END,
        target_markets = CASE
          WHEN p.target_markets IS NOT NULL AND p.target_markets <> '{}' THEN p.target_markets
          ELSE $3::text[]
        END,
        price_ddp = COALESCE(p.price_ddp, ${DDP})
      FROM catalog_variants cv
      WHERE p.sku = cv.master_id AND ${NOT_EMPTY}`,
    [supplierId, PLACEHOLDER, DEFAULT_TARGET_MARKETS],
  );

  // 2) Insérer les nouvelles variantes (SKU absent de products)
  const { rowCount } = await client.query(
    `INSERT INTO products (
      name, description, category, sku, image_url, images,
      supplier_id, supplier_name, supplier_location, moq, moq_unit,
      port_depart, origin_wilaya, certifications, packaging, export_status,
      price_exw, price_fob, price_cfr, price_cif, price_currency, price_unit,
      price_retail, price_wholesale, is_featured,
      origin_country, export_authorized, stock_countries, target_markets, price_ddp
    )
    SELECT
      cv.name, ${DESC}, ${CATEGORY}, cv.master_id, ${IMAGE}, ARRAY[${IMAGE}],
      $1, COALESCE(cv.brand_name, 'Export DZ'), 'Algérie',
      GREATEST(COALESCE(cv.moq, 100), 1), COALESCE(cv.moq_unit, 'unité'),
      'Béjaïa', 'Alger', '{}', cv.packaging_notes, 'published',
      ${EXW}, ${FOB}, ${CFR}, ${CIF}, 'USD', 'unit',
      cv.price_retail_dzd, ${WHOLESALE}, false,
      'DZ', false, ARRAY['DZ'], $3, ${DDP}
    FROM catalog_variants cv
    WHERE ${NOT_EMPTY}
      AND NOT EXISTS (SELECT 1 FROM products p WHERE p.sku = cv.master_id)`,
    [supplierId, PLACEHOLDER, DEFAULT_TARGET_MARKETS],
  );

  // 3) Lier chaque variante à son produit publié
  await client.query(
    `UPDATE catalog_variants cv
     SET export_status = 'published',
         published_product_id = p.id,
         updated_at = NOW()
     FROM products p
     WHERE p.sku = cv.master_id
       AND cv.name IS NOT NULL AND trim(cv.name) <> ''`,
  );

  const inserted = rowCount ?? 0;
  console.log(`→ ${inserted} nouvelles variantes publiées (catalog_variants → products)`);
  return inserted;
}

async function repairExportFields(client) {
  const { rowCount } = await client.query(`
    UPDATE products SET
      origin_country = COALESCE(NULLIF(trim(origin_country), ''), 'DZ'),
      stock_countries = CASE
        WHEN stock_countries IS NULL OR stock_countries = '{}' THEN ARRAY['DZ']
        ELSE stock_countries
      END,
      target_markets = CASE
        WHEN target_markets IS NULL OR target_markets = '{}' THEN $1::text[]
        ELSE target_markets
      END,
      price_ddp = COALESCE(price_ddp, price_cif * 1.18),
      export_authorized = COALESCE(export_authorized, false)
    WHERE export_status = 'published'
  `, [DEFAULT_TARGET_MARKETS]);
  console.log(`→ ${rowCount ?? 0} produits — champs export/stock/DDP réparés`);
  return rowCount ?? 0;
}

async function main() {
  const pool = createDbPool();
  const client = await pool.connect();
  try {
    const supplierId = await ensureSupplier(client);
    await seedBaseProducts(client, supplierId);
    await repairCatalogVariantCategories(client);
    await syncCatalogVariants(client, supplierId);
    await repairExportFields(client);
    await client.query(`
      UPDATE products SET is_featured = false WHERE export_status = 'published';
      UPDATE products SET is_featured = true
      WHERE id IN (
        SELECT id FROM products
        WHERE export_status = 'published'
          AND image_url IS NOT NULL
          AND trim(image_url) <> ''
          AND image_url NOT LIKE '%.svg'
          AND image_url NOT LIKE '%qdia-photo-placeholder%'
        ORDER BY rating DESC NULLS LAST, id DESC
        LIMIT 6
      );
    `);
    const { rows } = await client.query(`SELECT count(*)::int AS n FROM products WHERE export_status='published'`);
    console.log(`✓ Catalogue marketplace : ${rows[0].n} produits publiés`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error("bootstrap-products:", err);
  process.exit(1);
});
