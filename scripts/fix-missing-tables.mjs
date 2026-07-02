import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRequire = createRequire(join(__dirname, "../artifacts/api-server/"));
apiRequire("dotenv").config({ path: join(__dirname, "../.env") });
const pool = new (createRequire(join(__dirname, "../lib/db/"))("pg").Pool)({ connectionString: process.env.DATABASE_URL });

await pool.query(`
  CREATE TABLE IF NOT EXISTS product_views (
    id serial PRIMARY KEY,
    product_id integer NOT NULL,
    user_id integer,
    viewed_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE INDEX IF NOT EXISTS idx_product_views_product ON product_views(product_id);

  CREATE TABLE IF NOT EXISTS favorites (
    id serial PRIMARY KEY,
    user_id integer NOT NULL,
    product_id integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  );
`);

const check = await pool.query(
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('product_views','favorites') ORDER BY table_name",
);
console.log("Tables présentes:", check.rows.map(r => r.table_name).join(", "));
await pool.end();
