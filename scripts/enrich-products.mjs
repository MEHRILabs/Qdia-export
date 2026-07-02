#!/usr/bin/env node
/**
 * Enrichit les produits en base : prix (formule + IA) et photos IA.
 *
 * Usage :
 *   node scripts/enrich-products.mjs
 *   node scripts/enrich-products.mjs --limit 100
 *   node scripts/enrich-products.mjs --limit 500 --no-photos
 *   node scripts/enrich-products.mjs --all
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "../.env");
try {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  }
} catch { /* DATABASE_URL déjà défini */ }

const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith("--limit="))?.split("=")[1]
  ?? (args.includes("--limit") ? args[args.indexOf("--limit") + 1] : null);
const all = args.includes("--all");
const noPhotos = args.includes("--no-photos");
const batchSize = all ? 500 : parseInt(limitArg ?? "50", 10);

const baseUrl = process.env.API_URL ?? "http://localhost:8080";
const token = process.env.QDIA_ADMIN_TOKEN ?? process.env.ADMIN_TOKEN;

async function enrichBatch(offset = 0): Promise<{ enriched: number; done: boolean }> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const resp = await fetch(`${baseUrl}/api/products/enrich`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      limit: batchSize,
      generate_photos: !noPhotos,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${resp.status}`);
  }

  const result = await resp.json();
  console.log(
    `Lot ${offset + 1}: enrichis=${result.enriched}, photos=${result.photos_generated}, ` +
    `prix=${result.pricing_updated}, ignorés=${result.skipped}, erreurs=${result.errors?.length ?? 0}`,
  );
  if (result.errors?.length) {
    for (const e of result.errors.slice(0, 5)) console.warn("  -", e);
  }

  const done = !all || result.enriched === 0;
  return { enriched: result.enriched ?? 0, done };
}

async function main() {
  if (!token) {
    console.warn("Astuce : définissez QDIA_ADMIN_TOKEN dans .env (token admin) pour l'authentification API.");
  }

  const statusResp = await fetch(`${baseUrl}/api/products/enrich/status`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (statusResp.ok) {
    const s = await statusResp.json();
    console.log(`État : ${s.total} produits, ${s.without_photo} sans photo, ${s.without_pricing} sans prix`);
  }

  let total = 0;
  let round = 0;
  while (round < 200) {
    const { enriched, done } = await enrichBatch(round);
    total += enriched;
    round++;
    if (done) break;
    if (enriched === 0) break;
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\nTerminé : ${total} produit(s) enrichi(s) en ${round} lot(s).`);
}

main().catch(err => {
  console.error(err.message ?? err);
  process.exit(1);
});
