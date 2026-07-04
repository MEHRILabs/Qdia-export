#!/usr/bin/env node
/**
 * Garantit un seul compte administrateur en base.
 * Tous les autres comptes restent exportateurs (supplier).
 */
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createDbPool } from "./db-pool.mjs";
import { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } from "./lib/default-accounts.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const bcrypt = require(resolve(__dirname, "../artifacts/api-server/node_modules/bcryptjs"));

const pool = createDbPool();
const client = await pool.connect();
try {
  const hash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  await client.query(
    `INSERT INTO users (email, password_hash, name, role, provider, verified)
     VALUES ($1, $2, $3, 'admin', 'email', true)
     ON CONFLICT (email) DO UPDATE SET
       password_hash = EXCLUDED.password_hash,
       name = EXCLUDED.name,
       role = 'admin',
       verified = true`,
    [ADMIN_EMAIL, hash, ADMIN_NAME],
  );

  await client.query(
    `UPDATE users SET role = 'supplier'
     WHERE role = 'admin' AND lower(email) <> lower($1)`,
    [ADMIN_EMAIL],
  );

  console.log(`→ Compte admin garanti : ${ADMIN_EMAIL}`);
} finally {
  client.release();
  await pool.end();
}
