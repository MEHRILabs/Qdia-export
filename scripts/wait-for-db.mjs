#!/usr/bin/env node
/**
 * Vérifie DATABASE_URL avant le bootstrap prod (Render).
 * Donne un diagnostic clair si le hostname Postgres a disparu (plan free expiré, etc.).
 */
import { createDbPool } from "./db-pool.mjs";

function redactUrl(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.username ? "***:***@" : ""}${u.hostname}${u.port ? `:${u.port}` : ""}${u.pathname}`;
  } catch {
    return "(DATABASE_URL illisible)";
  }
}

function hostFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

const raw = process.env.DATABASE_URL;
if (!raw?.trim()) {
  console.error("ERREUR: DATABASE_URL non défini sur le service Render.");
  console.error("→ Dashboard Render → qdia-export → Environment → ajoute DATABASE_URL");
  process.exit(1);
}

const host = hostFromUrl(raw);
console.log(`→ Postgres cible : ${redactUrl(raw)}`);

const maxAttempts = Number(process.env.DB_WAIT_ATTEMPTS || 8);
const delayMs = Number(process.env.DB_WAIT_MS || 4000);

let lastErr = null;
for (let i = 1; i <= maxAttempts; i++) {
  const pool = createDbPool(raw);
  try {
    await pool.query("SELECT 1 AS ok");
    console.log(`→ Postgres OK (tentative ${i}/${maxAttempts})`);
    await pool.end();
    process.exit(0);
  } catch (err) {
    lastErr = err;
    const code = err?.code || "";
    console.warn(`→ Échec connexion DB (${i}/${maxAttempts}) : ${code || err?.message}`);
    try {
      await pool.end();
    } catch {
      /* ignore */
    }
    if (i < maxAttempts) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

const code = lastErr?.code || "";
const msg = lastErr?.message || String(lastErr);
console.error("");
console.error("═══════════════════════════════════════════════════════════");
console.error("ERREUR PostgreSQL — QDIA ne peut pas démarrer");
console.error("═══════════════════════════════════════════════════════════");
console.error(`Code : ${code}`);
console.error(`Détail : ${msg}`);
console.error(`Hôte : ${host || "?"}`);
console.error("");

if (code === "ENOTFOUND" || /getaddrinfo/i.test(msg)) {
  console.error("Cause probable : la base Render n'existe plus ou l'URL est incorrecte.");
  console.error("Sur le plan Free, Postgres est SUSPENDU/SUPPRIMÉ après inactivité.");
  console.error("");
  console.error("À faire dans Render Dashboard :");
  console.error("  1. Dashboard → Databases");
  console.error("  2. Si « qdia-db » (ou similaire) est absente → Create PostgreSQL");
  console.error("  3. Ouvre la base → Connect → External Database URL (ou Internal)");
  console.error("  4. Copie l'URL complète (ex: dpg-xxx-a.oregon-postgres.render.com)");
  console.error("  5. Service web « qdia-export » → Environment → DATABASE_URL = cette URL");
  console.error("  6. Ajoute aussi : DATABASE_SSL_REJECT_UNAUTHORIZED=false");
  console.error("  7. Manual Deploy → Clear build cache & deploy");
  console.error("");
  if (host && /^dpg-[a-z0-9]+-a$/i.test(host)) {
    console.error("Note : l'hôte court « dpg-…-a » (Internal) ne résout que si la base");
    console.error("existe encore et que le web service est dans la même région Render.");
    console.error("Préfère l'External Database URL si ENOTFOUND continue.");
  }
} else if (code === "28P01" || /password/i.test(msg)) {
  console.error("Mot de passe / user incorrects dans DATABASE_URL — recopie l'URL depuis Render.");
} else if (code === "ECONNREFUSED" || code === "ETIMEDOUT") {
  console.error("Base inaccessible (sleep free tier ?). Attends 1–2 min et redéploie.");
}

console.error("═══════════════════════════════════════════════════════════");
process.exit(1);
