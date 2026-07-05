/**
 * Ajoute les colonnes export / stock / DDP si absentes (idempotent).
 * Exécuté au démarrage Render avant bootstrap.
 */
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("[ensure-export-fields] DATABASE_URL absent — skip");
  process.exit(0);
}

const pool = new pg.Pool({
  connectionString: url,
  ssl: /render\.com|neon\.|supabase|sslmode=require/i.test(url)
    ? { rejectUnauthorized: false }
    : undefined,
});

const alters = [
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS origin_country text NOT NULL DEFAULT 'DZ'`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS export_authorized boolean NOT NULL DEFAULT true`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_countries text[] NOT NULL DEFAULT '{DZ}'`,
  `ALTER TABLE products ADD COLUMN IF NOT EXISTS price_ddp real`,
];

try {
  for (const sql of alters) {
    await pool.query(sql);
  }
  console.log("[ensure-export-fields] Colonnes export/stock/DDP OK");
} catch (err) {
  console.error("[ensure-export-fields] Erreur:", err.message);
  process.exit(1);
} finally {
  await pool.end();
}
