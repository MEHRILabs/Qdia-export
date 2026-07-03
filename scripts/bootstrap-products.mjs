/**
 * Garantit des produits visibles dans le catalogue marketplace.
 * 1) Insère le catalogue algérien de base (6 produits) si la table est vide
 * 2) Publie catalog_variants → products (jusqu'à 20 000 lignes)
 */
import { createDbPool } from "./db-pool.mjs";

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
    await client.query(
      `INSERT INTO products (
        name, description, category, sku, image_url, images, supplier_id, supplier_name, supplier_location,
        moq, moq_unit, port_depart, origin_wilaya, certifications, packaging, export_status,
        price_exw, price_fob, price_cfr, price_cif, price_currency, price_unit,
        target_markets, is_featured, rating, review_count, orders_fulfilled
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'published',
        $16,$17,$18,$19,'USD',$20,$21,$22,$23,$24,$25
      ) ON CONFLICT (sku) WHERE sku IS NOT NULL DO NOTHING`,
      [
        p.name, p.description, p.category, p.sku, p.image_url, [p.image_url],
        supplierId, p.supplier_name, "Algérie",
        p.moq, p.moq_unit, p.port_depart, p.origin_wilaya, p.certifications, p.packaging,
        p.price_exw, p.price_fob, p.price_cfr, p.price_cif, p.price_unit,
        p.target_markets, p.is_featured, p.rating, p.review_count, p.orders_fulfilled,
      ],
    );
  }
  console.log(`→ ${SEED_PRODUCTS.length} produits de base insérés`);
  return SEED_PRODUCTS.length;
}

async function syncCatalogVariants(client, supplierId) {
  const { rows: variants } = await client.query(
    `SELECT id, master_id, name, description, category_name, subcategory, brand_name,
            price_retail_dzd, price_fob_usd, moq, moq_unit, image_url, packaging_notes, published_product_id
     FROM catalog_variants
     WHERE name IS NOT NULL AND trim(name) <> ''
     ORDER BY id
     LIMIT 20000`,
  );
  if (!variants.length) {
    console.log("→ Aucune variante catalog_variants à publier");
    return 0;
  }

  let published = 0;
  for (const v of variants) {
    const sku = v.master_id;
    if (!sku) continue;
    const fob = v.price_fob_usd > 0
      ? v.price_fob_usd
      : v.price_retail_dzd > 0
        ? Math.round((v.price_retail_dzd / 135) * 100) / 100
        : 1;
    const moq = v.moq > 0 ? v.moq : 100;
    const category = v.subcategory ? `${v.category_name} > ${v.subcategory}` : v.category_name;
    const image = v.image_url?.trim() || PLACEHOLDER;
    const payload = [
      v.name,
      v.description ?? `${v.brand_name ?? ""} — ${v.name}`.trim(),
      category,
      sku,
      image,
      [image],
      supplierId,
      v.brand_name ?? "Export DZ",
      "Algérie",
      moq,
      v.moq_unit ?? "unité",
      "Béjaïa",
      "Alger",
      [],
      v.packaging_notes,
      fob * 0.92,
      fob,
      fob * 1.08,
      fob * 1.12,
      "unit",
      v.price_retail_dzd,
      fob,
      false,
    ];

    const existing = await client.query(
      `SELECT id FROM products WHERE sku = $1 LIMIT 1`,
      [sku],
    );
    let productId;
    if (existing.rows.length) {
      productId = existing.rows[0].id;
      await client.query(
        `UPDATE products SET
          name=$1, description=$2, category=$3, image_url=$4, images=$5,
          supplier_id=$6, supplier_name=$7, moq=$8, moq_unit=$9, packaging=$10,
          price_exw=$11, price_fob=$12, price_cfr=$13, price_cif=$14,
          price_retail=$15, price_wholesale=$16, export_status='published'
         WHERE id=$17`,
        [...payload, productId],
      );
    } else {
      const ins = await client.query(
        `INSERT INTO products (
          name, description, category, sku, image_url, images,
          supplier_id, supplier_name, supplier_location, moq, moq_unit,
          port_depart, origin_wilaya, certifications, packaging, export_status,
          price_exw, price_fob, price_cfr, price_cif, price_currency, price_unit,
          price_retail, price_wholesale, is_featured
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'published',
          $16,$17,$18,$19,'USD',$20,$21,$22,$23
        ) RETURNING id`,
        payload,
      );
      productId = ins.rows[0].id;
    }
    await client.query(
      `UPDATE catalog_variants SET export_status='published', published_product_id=$1, updated_at=NOW() WHERE id=$2`,
      [productId, v.id],
    );
    published++;
    if (published % 1000 === 0) console.log(`… ${published} variantes publiées`);
  }
  console.log(`→ ${published} variantes catalog_variants → products`);
  return published;
}

async function main() {
  const pool = createDbPool();
  const client = await pool.connect();
  try {
    const supplierId = await ensureSupplier(client);
    await seedBaseProducts(client, supplierId);
    await syncCatalogVariants(client, supplierId);
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
