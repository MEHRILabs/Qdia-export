#!/usr/bin/env node
/**
 * Exit 0 = lancer bootstrap + fix catégories
 * Exit 1 = catalogue déjà prêt (skip pour accélérer le démarrage Render)
 */
import { createDbPool } from "./db-pool.mjs";

const pool = createDbPool();
try {
  const { rows } = await pool.query(`
    SELECT
      (SELECT count(*)::int FROM products WHERE export_status = 'published') AS published,
      (SELECT count(*)::int FROM products
        WHERE lower(trim(category)) IN ('non_classe','non classe','non classé','articles','variantes')
      ) AS bad_categories
  `);
  const { published, bad_categories } = rows[0];
  const ready = published >= 15000 && bad_categories === 0;
  process.exit(ready ? 1 : 0);
} finally {
  await pool.end();
}
