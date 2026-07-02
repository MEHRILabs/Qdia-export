import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL requis");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const CATEGORIES = [
  ["Agriculture & Food", "agriculture-food", "Wheat"],
  ["Energy & Chemicals", "energy-chemicals", "Flame"],
  ["Textiles & Apparel", "textiles-apparel", "Shirt"],
  ["Construction Materials", "construction", "Building"],
  ["Handicrafts & Decor", "handicrafts", "Palette"],
];

const IMAGES = {
  oliveOil: "/olive-oil.png",
  dates: "/dates.png",
  honey: "/honey.png",
  textile: "/rug.png",
  couscous: "/couscous.png",
  pottery: "/pottery.png",
};

async function seed() {
  const client = await pool.connect();
  try {
    for (const [name, slug, icon] of CATEGORIES) {
      await client.query(
        `INSERT INTO categories (name, slug, icon) VALUES ($1, $2, $3) ON CONFLICT (slug) DO NOTHING`,
        [name, slug, icon],
      );
    }

    let supplier = await client.query(`SELECT id FROM suppliers LIMIT 1`);
    let supplierId;
    if (supplier.rows.length === 0) {
      const ins = await client.query(
        `INSERT INTO suppliers (company_name, wilaya, verified, verification_level, platform_years, response_rate, transaction_count, description)
         VALUES ($1, $2, true, 2, 3, 0.95, 47, $3) RETURNING id`,
        ["Coopérative Oléicole Béjaïa", "Béjaïa", "Producteur d'huile d'olive et dattes certifiées bio."],
      );
      supplierId = ins.rows[0].id;
    } else {
      supplierId = supplier.rows[0].id;
    }

    const products = await client.query(`SELECT id FROM products LIMIT 1`);
    if (products.rows.length === 0) {
      await client.query(
        `INSERT INTO products (name, description, category, sku, moq, moq_unit, port_depart, origin_wilaya, certifications, export_status, price_exw, price_fob, price_cfr, price_cif, price_currency, price_unit, target_markets, supplier_id, supplier_name, supplier_location, is_featured, rating, review_count, orders_fulfilled, image_url)
         VALUES
         ($1, $2, $3, $4, 500, 'liters', 'Béjaïa', 'Béjaïa', $5, 'published', 4.2, 5.1, 6.8, 7.0, 'USD', 'per liter', $6, $7, $8, $9, true, 4.8, 23, 12, $15),
         ($10, $11, $3, $12, 1000, 'kg', 'Alger', 'Biskra', $13, 'published', 2.8, 3.4, 4.6, 4.8, 'USD', 'per kg', $14, $7, $8, null, true, 4.6, 18, null, $16),
         ($17, $18, $19, $20, 200, 'kg', 'Ghardaïa', 'Ghardaïa', $21, 'published', 8.5, 9.2, 11.0, 11.5, 'USD', 'per kg', $22, $7, $8, $9, false, 4.7, 11, 8, $23),
         ($24, $25, $26, $27, 5000, 'meters', 'Oran', 'Tlemcen', $28, 'published', 1.2, 1.6, 2.1, 2.3, 'USD', 'per meter', $29, $7, $8, $9, false, 4.5, 9, 5, $30)`,
        [
          "Huile d'olive extra vierge — Béjaïa",
          "Première pression à froid, acidité < 0.8%. Export premium vers l'UE.",
          "Agriculture & Food", "QDIA-OO-001",
          ["Bio Certified", "ISO 22000", "Halal Certificate"],
          ["FR", "DE", "ES"], supplierId, "Coopérative Oléicole Béjaïa", "Béjaïa, Algeria",
          IMAGES.oliveOil,
          "Dattes Deglet Nour Premium",
          "Dattes branche de qualité export, calibre A, origine Biskra.",
          "QDIA-DT-002",
          ["Halal Certificate", "Phytosanitary Certificate"],
          ["FR", "UK", "US"],
          IMAGES.dates,
          "Miel de Ghardaïa — Sahara",
          "Miel pur des oasis du M'Zab, non pasteurisé, certifié Halal.",
          "Agriculture & Food", "QDIA-HN-003",
          ["Halal Certificate", "Organic"],
          ["FR", "DE", "SA"],
          IMAGES.honey,
          "Coton tissé traditionnel — Tlemcen",
          "Tissu coton premium pour export textile, largeur 150 cm.",
          "Textiles & Apparel", "QDIA-TX-004",
          ["ISO 9001"],
          ["FR", "IT", "ES"],
          IMAGES.textile,
        ],
      );
    } else {
      const updates = [
        ["QDIA-OO-001", IMAGES.oliveOil],
        ["QDIA-DT-002", IMAGES.dates],
        ["QDIA-HN-003", IMAGES.honey],
        ["QDIA-TX-004", IMAGES.textile],
      ];
      for (const [sku, url] of updates) {
        await client.query(`UPDATE products SET image_url = $1 WHERE sku = $2`, [url, sku]);
      }
    }

    const rfqs = await client.query(`SELECT id FROM rfqs LIMIT 1`);
    if (rfqs.rows.length === 0) {
      await client.query(
        `INSERT INTO rfqs (product_name, quantity, quantity_unit, destination_country, requested_incoterm, target_price, message, status)
         VALUES ($1, 20, 'tons', 'France', 'CIF', 85000, $2, 'pending'),
                ($3, 5000, 'kg', 'Germany', 'FOB', null, null, 'quoted')`,
        [
          "Huile d'olive extra vierge (20 tonnes)",
          "Recherche fournisseur algérien certifié bio pour import Marseille.",
          "Dattes Deglet Nour Premium",
        ],
      );
    }

    const PORTS = [
      ["DZALG", "Port d'Alger", "Alger", "Algérie", "DZ", "seaport", "Centre", 900, 1200, 2200, 3500],
      ["DZORN", "Port d'Oran", "Oran", "Algérie", "DZ", "seaport", "Ouest", 850, 1100, 2100, 3400],
      ["DZBJA", "Port de Béjaïa", "Béjaïa", "Algérie", "DZ", "seaport", "Est", 800, 1000, 2000, 3200],
      ["DZAAE", "Port d'Annaba", "Annaba", "Algérie", "DZ", "seaport", "Est", 820, 1050, 2050, 3300],
      ["DZSKI", "Port de Skikda", "Skikda", "Algérie", "DZ", "seaport", "Est", 780, 980, 1980, 3100],
      ["DZMOS", "Port de Mostaganem", "Mostaganem", "Algérie", "DZ", "seaport", "Ouest", 750, 950, 1950, 3050],
      ["FRMRS", "Marseille-Fos", "Marseille", "France", "FR", "seaport", "Méditerranée", 0, null, null, null],
      ["FRLEH", "Le Havre", "Le Havre", "France", "FR", "seaport", "Atlantique", 0, null, null, null],
      ["AEDXB", "Jebel Ali (Dubai)", "Dubai", "Émirats arabes unis", "AE", "seaport", "Golfe", 0, null, null, null],
      ["AEKHL", "Khalifa Port", "Abu Dhabi", "Émirats arabes unis", "AE", "seaport", "Golfe", 0, null, null, null],
    ];
    for (const p of PORTS) {
      await client.query(
        `INSERT INTO ports (code, name, city, country, country_code, type, region, handling_fee_dzd, freight_to_fr_dzd, freight_to_ae_dzd, freight_to_us_dzd)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (code) DO NOTHING`,
        p,
      );
    }

    const CUSTOMS = [
      ["France", "FR", "Agriculture & Food", "1509", 0, 5.5, 1200, 800, "Huile d'olive — préférence tarifaire UE-Algérie"],
      ["France", "FR", "Agriculture & Food", "0804", 0, 5.5, 1000, 800, "Dattes — certificat phytosanitaire obligatoire"],
      ["France", "FR", "Handicrafts & Decor", "5702", 4, 20, 900, 600, "Tapis artisanaux"],
      ["Émirats arabes unis", "AE", "Agriculture & Food", "1509", 5, 5, 1500, 700, "Halal + certificat origine DZ requis"],
      ["Émirats arabes unis", "AE", "Agriculture & Food", "0804", 5, 5, 1400, 700, "Dattes — inspection SPS à l'arrivée"],
      ["Émirats arabes unis", "AE", "Handicrafts & Decor", "6912", 5, 5, 1100, 650, "Poterie — emballage renforcé"],
      ["Algérie (export)", "DZ", "Agriculture & Food", "—", 0, 0, 600, 500, "Dédouanement export — DAU + certificat origine"],
    ];
    for (const c of CUSTOMS) {
      await client.query(
        `INSERT INTO customs_tariffs (destination_country, destination_code, product_category, hs_code, duty_rate_pct, vat_rate_pct, customs_fee_dzd, documentation_fee_dzd, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        c,
      );
    }

    const demoHash = "$2b$10$Dxhy/Kp8zT7ASr2Zs5mFV.lFjiG7kScFkQJGXe7ItcejVTzT0Yo4a";
    await client.query(
      `INSERT INTO users (email, password_hash, name, role, provider, verified, supplier_id)
       VALUES ($1, $2, $3, 'supplier', 'email', true, $4)
       ON CONFLICT (email) DO NOTHING`,
      ["supplier@qdiadz.com", demoHash, "Exportateur Demo", supplierId],
    );

    await client.query(
      `INSERT INTO users (email, password_hash, name, role, provider, verified)
       VALUES ($1, $2, $3, 'admin', 'email', true)
       ON CONFLICT (email) DO NOTHING`,
      ["admin@qdiadz.com", demoHash, "Admin QDIA"],
    );

    console.log("Seed terminé avec succès.");
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
