#!/usr/bin/env node
/** Exit 0 si le catalogue doit être importé (< 15 000 variantes), sinon 1 */
import { createDbPool } from "./db-pool.mjs";

const pool = createDbPool();
try {
  const { rows } = await pool.query("SELECT count(*)::int AS n FROM catalog_variants");
  process.exit(rows[0].n < 15000 ? 0 : 1);
} finally {
  await pool.end();
}
