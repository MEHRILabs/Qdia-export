import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRequire = createRequire(join(__dirname, "../artifacts/api-server/"));
apiRequire("dotenv").config({ path: join(__dirname, "../.env"), quiet: true });

const dbRequire = createRequire(join(__dirname, "../lib/db/"));
const { Pool } = dbRequire("pg");

const expected = [
  "users",
  "otp_codes",
  "suppliers",
  "categories",
  "products",
  "rfqs",
  "ai_sessions",
  "catalog_variants",
  "ports",
  "customs_tariffs",
  "messages",
  "favorites",
  "reviews",
  "product_views",
  "cart_items",
  "orders",
  "disputes",
  "oem_requests",
  "sample_requests",
  "supplier_reviews",
  "tracking_events",
  "transactions",
  "fcm_tokens",
  "invoices",
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const { rows } = await pool.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = 'public'
     ORDER BY table_name`,
  );
  const existing = new Set(rows.map(r => r.table_name));
  const missing = expected.filter(t => !existing.has(t));

  console.log(`Tables attendues: ${expected.length}`);
  console.log(`Tables présentes: ${expected.length - missing.length}`);
  console.log(`Tables manquantes: ${missing.length}`);
  if (missing.length) {
    console.log(missing.join("\n"));
  }
} finally {
  await pool.end();
}
