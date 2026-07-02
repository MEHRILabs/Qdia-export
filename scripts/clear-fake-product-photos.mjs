/**
 * Retire les photos IA / placeholders des produits importés.
 * Les vraies photos seront ajoutées via Catalogue Master Data → Enrichissement IA.
 */
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "../.env");
try {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch { /* .env optionnel si DATABASE_URL déjà défini */ }

const require = createRequire(import.meta.url);
const pgPath = path.join(__dirname, "../lib/db/node_modules/pg");
const { Pool } = require(pgPath);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL requis dans .env");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const result = await pool.query(`
  UPDATE products
  SET image_url = NULL, images = '{}'
  WHERE image_url IS NOT NULL
    AND (
      image_url LIKE '/uploads/catalog/%'
      OR image_url LIKE '%.svg'
      OR image_url IN ('/olive-oil.png', '/dates.png', '/honey.png', '/couscous.png', '/rug.png', '/pottery.png')
    )
  RETURNING id
`);

console.log(`Photos retirées pour ${result.rowCount} produit(s).`);
await pool.end();
