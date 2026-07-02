#!/usr/bin/env node
/**
 * CLI import catalogue Master Data
 * Usage: node scripts/import-catalog.mjs ./data/base_de_donnees_finale.xlsx [--enrich] [--publish]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/import-catalog.mjs <fichier.xlsx> [--enrich] [--publish]");
  process.exit(1);
}

const baseUrl = process.env.API_URL ?? "http://localhost:8080";
const email = process.env.QDIA_EMAIL ?? "supplier@qdiadz.com";
const password = process.env.QDIA_PASSWORD ?? "demo1234";

const buffer = readFileSync(resolve(file));
const b64 = buffer.toString("base64");

async function login() {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Login échoué");
  return data.token;
}

async function api(token, method, path, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

const token = await login();
console.log("Connecté → import…");
const result = await api(token, "POST", "/api/catalog/import", { file_base64: b64 });
console.log(JSON.stringify(result, null, 2));

if (process.argv.includes("--enrich")) {
  console.log("Enrichissement IA…");
  console.log(JSON.stringify(await api(token, "POST", "/api/catalog/enrich", { limit: 50 }), null, 2));
}

if (process.argv.includes("--publish")) {
  console.log("Publication variantes prêtes…");
  console.log(JSON.stringify(await api(token, "POST", "/api/catalog/publish-ready", { limit: 100 }), null, 2));
}

console.log("Stats:", JSON.stringify(await api(token, "GET", "/api/catalog/stats"), null, 2));
