/**
 * Corrige les anciens chemins d'images statiques (/olive-oil.png → /images/…)
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createRequire } from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "../.env");
try {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
} catch { /* ignore */ }

if (!process.env.DATABASE_URL) {
  console.log("DATABASE_URL absent — rien à mettre à jour.");
  process.exit(0);
}

const require = createRequire(import.meta.url);
const pgPath = path.join(__dirname, "../lib/db/node_modules/pg");
const { Pool } = require(pgPath);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const MAP = {
  "/olive-oil.png": "/images/product-olive-oil.jpg",
  "/dates.png": "/images/product-dates-deglet.jpg",
  "/images/product-dates.jpg": "/images/product-dates-deglet.jpg",
  "/honey.png": "/images/product-honey.jpg",
  "/rug.png": "/images/product-textile.jpg",
};

let total = 0;
for (const [oldPath, newPath] of Object.entries(MAP)) {
  const r = await pool.query(
    `UPDATE products SET image_url = $1 WHERE image_url = $2 RETURNING id`,
    [newPath, oldPath],
  );
  total += r.rowCount;
  if (r.rowCount) console.log(`${oldPath} → ${newPath} : ${r.rowCount} produit(s)`);
}

console.log(`Terminé — ${total} produit(s) mis à jour.`);
await pool.end();
