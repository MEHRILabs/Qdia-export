#!/usr/bin/env node
/**
 * Garantit les comptes administrateur en base (admin principal + admin2).
 * Ne rétrograde pas les e-mails listés dans adminEmails().
 */
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createDbPool } from "./db-pool.mjs";
import {
  ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME,
  ADMIN2_EMAIL, ADMIN2_PASSWORD, ADMIN2_NAME,
  adminEmails,
} from "./lib/default-accounts.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const bcrypt = require(resolve(__dirname, "../artifacts/api-server/node_modules/bcryptjs"));

const pool = createDbPool();
const client = await pool.connect();

async function upsertAdmin(email, password, name) {
  const hash = await bcrypt.hash(password, 10);
  await client.query(
    `INSERT INTO users (email, password_hash, name, role, provider, verified)
     VALUES ($1, $2, $3, 'admin', 'email', true)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       name = EXCLUDED.name,
       role = 'admin',
       verified = true`,
    [email, hash, name],
  );
  console.log(`→ Admin OK : ${email}`);
}

try {
  await upsertAdmin(ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME);
  await upsertAdmin(ADMIN2_EMAIL, ADMIN2_PASSWORD, ADMIN2_NAME);

  const allowed = adminEmails();
  // Rétrograde les autres "admin" parasites, sauf la liste autorisée
  const r = await client.query(
    `UPDATE users SET role = 'supplier'
     WHERE role = 'admin'
       AND lower(email) <> ALL($1::text[])
     RETURNING email`,
    [allowed],
  );
  if (r.rowCount) {
    console.log(`→ ${r.rowCount} compte(s) admin non autorisé(s) → supplier`);
  }
} finally {
  client.release();
  await pool.end();
}
