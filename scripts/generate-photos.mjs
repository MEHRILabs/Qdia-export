#!/usr/bin/env node
/**
 * Génère des photos IA (DALL·E 3) pour les produits sans vraie photo.
 * Enregistre dans artifacts/api-server/uploads/catalog/ et met à jour la base.
 *
 * Usage :
 *   node scripts/generate-photos.mjs            (3 produits — test)
 *   node scripts/generate-photos.mjs --limit 20
 *   node scripts/generate-photos.mjs --limit 200
 *
 * Coût indicatif DALL·E 3 : ~0,04 $ par image.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRequire = createRequire(join(__dirname, "../artifacts/api-server/"));
const dbRequire = createRequire(join(__dirname, "../lib/db/"));

const dotenv = apiRequire("dotenv");
dotenv.config({ path: join(__dirname, "../.env") });

const OpenAI = apiRequire("openai").default ?? apiRequire("openai");
const pg = dbRequire("pg");

let genAI = null;
try {
  const { GoogleGenerativeAI } = apiRequire("@google/generative-ai");
  if (process.env.GEMINI_API_KEY) genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} catch { /* gemini indisponible */ }

async function generateWithGemini(prompt) {
  if (!genAI) return null;
  const candidates = [
    process.env.GEMINI_IMAGE_MODEL,
    "gemini-2.5-flash-image",
    "gemini-2.0-flash-preview-image-generation",
  ].filter(Boolean);
  for (const modelName of candidates) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const res = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      });
      const parts = res.response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) return Buffer.from(part.inlineData.data, "base64");
      }
    } catch { /* essaie le modèle suivant */ }
  }
  return null;
}

const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith("--limit="))?.split("=")[1]
  ?? (args.includes("--limit") ? args[args.indexOf("--limit") + 1] : null);
const limit = parseInt(limitArg ?? "3", 10);

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY manquant dans .env");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const UPLOAD_DIR = join(__dirname, "../artifacts/api-server/uploads/catalog");
mkdirSync(UPLOAD_DIR, { recursive: true });

function safeName(sku, id) {
  return (sku?.trim() || `product-${id}`).replace(/[^a-zA-Z0-9._-]/g, "_");
}

function buildPrompt(p) {
  return [
    "Professional e-commerce product photography for B2B export catalog.",
    `Product: "${p.name}".`,
    `Category: ${p.category}.`,
    "Algerian consumer product, studio lighting, clean white neutral background,",
    "commercial packshot, sharp focus, realistic packaging, high quality,",
    "no text overlay, no watermark, no people, single product centered.",
  ].join(" ");
}

const { rows } = await pool.query(
  `SELECT id, name, category, sku FROM products
   WHERE image_url IS NULL OR image_url = '' OR image_url LIKE '%.svg' OR image_url LIKE '%placeholder%'
   ORDER BY id LIMIT $1`,
  [limit],
);

console.log(`${rows.length} produit(s) à illustrer (sur demande de ${limit})…\n`);
let ok = 0, fail = 0;

for (const p of rows) {
  try {
    const prompt = buildPrompt(p);
    let buffer = null;

    try {
      const model = process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1";
      const result = await openai.images.generate({ model, prompt, size: "1024x1024", n: 1 });
      const item = result.data?.[0];
      if (item?.b64_json) buffer = Buffer.from(item.b64_json, "base64");
      else if (item?.url) buffer = Buffer.from(await (await fetch(item.url)).arrayBuffer());
    } catch (openaiErr) {
      buffer = await generateWithGemini(prompt);
      if (!buffer) throw openaiErr;
    }

    if (!buffer) throw new Error("pas d'image renvoyée");

    const filename = `${safeName(p.sku, p.id)}.jpg`;
    writeFileSync(join(UPLOAD_DIR, filename), buffer);
    const url = `/uploads/catalog/${filename}`;
    await pool.query(
      "UPDATE products SET image_url = $1, images = ARRAY[$1] WHERE id = $2",
      [url, p.id],
    );
    ok++;
    console.log(`  OK  ${p.name.slice(0, 40).padEnd(42)} -> ${url}`);
  } catch (e) {
    fail++;
    console.warn(`  ERR ${p.name.slice(0, 40).padEnd(42)} : ${e.message}`);
  }
}

await pool.end();
console.log(`\nTerminé : ${ok} photo(s) générée(s), ${fail} échec(s).`);
