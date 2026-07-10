#!/usr/bin/env node
/**
 * Crée / met à jour les comptes de test : admin2, vendeur, acheteur.
 */
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createDbPool } from "./db-pool.mjs";
import {
  ADMIN2_EMAIL, ADMIN2_PASSWORD, ADMIN2_NAME,
} from "./lib/default-accounts.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const bcrypt = require(resolve(__dirname, "../artifacts/api-server/node_modules/bcryptjs"));

const ACCOUNTS = [
  { email: ADMIN2_EMAIL, password: ADMIN2_PASSWORD, name: ADMIN2_NAME, role: "admin" },
  { email: "vendeur@qdiadz.com", password: "Vendeur@2026", name: "Exportateur Démo", role: "supplier" },
  { email: "acheteur@qdiadz.com", password: "Acheteur@2026", name: "Acheteur Démo", role: "buyer" },
];

const pool = createDbPool();
const client = await pool.connect();
try {
  for (const a of ACCOUNTS) {
    const hash = await bcrypt.hash(a.password, 10);
    await client.query(
      `INSERT INTO users (email, password_hash, name, role, provider, verified)
       VALUES ($1, $2, $3, $4, 'email', true)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash,
         name = EXCLUDED.name,
         role = EXCLUDED.role,
         verified = true`,
      [a.email, hash, a.name, a.role],
    );
    console.log(`→ ${a.role.padEnd(9)} ${a.email} / ${a.password}`);
  }
} finally {
  client.release();
  await pool.end();
}
