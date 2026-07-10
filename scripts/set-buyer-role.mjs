/**
 * Force un compte en rôle buyer (ex. compte Google créé avant le choix de rôle).
 * Usage: node scripts/set-buyer-role.mjs "roquia" 
 *        node scripts/set-buyer-role.mjs --email=user@example.com
 */
import pg from "pg";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  for (const p of [resolve(root, ".env"), resolve(root, "artifacts/api-server/.env")]) {
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!m) continue;
      const key = m[1];
      let val = m[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

loadEnv();

const arg = process.argv[2] || "roquia";
const emailArg = arg.startsWith("--email=") ? arg.slice(8) : null;
const needle = emailArg || arg;

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const q = emailArg
  ? `UPDATE users SET role = 'buyer' WHERE lower(email) = lower($1) RETURNING id, email, name, role`
  : `UPDATE users SET role = 'buyer' WHERE lower(email) LIKE $1 OR lower(coalesce(name,'')) LIKE $1 RETURNING id, email, name, role`;

const params = emailArg ? [needle] : [`%${needle.toLowerCase()}%`];
const { rows } = await client.query(q, params);
console.log(JSON.stringify(rows, null, 2));
if (!rows.length) {
  const all = await client.query(`SELECT id, email, name, role FROM users ORDER BY id DESC LIMIT 20`);
  console.log("Aucun match. Derniers users:", JSON.stringify(all.rows, null, 2));
}
await client.end();
