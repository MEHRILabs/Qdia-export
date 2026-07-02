#!/usr/bin/env node
/**
 * Test rapide de l'IA Groq (compatible OpenAI) pour QDIA Export.
 * - Génère une FICHE PRODUIT (description multilingue) en JSON
 * - Calcule un PRIX d'export (EXW/FOB/CFR/CIF) + un benchmark marché par IA
 *
 * Usage :
 *   node scripts/test-groq.mjs "Huile d'olive extra vierge de Kabylie"
 *   node scripts/test-groq.mjs "Dattes Deglet Nour de Biskra" --cost 350 --qty 1000 --dest FR
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRequire = createRequire(join(__dirname, "../artifacts/api-server/"));
apiRequire("dotenv").config({ path: join(__dirname, "../.env") });

const API_KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
const BASE_URL = "https://api.groq.com/openai/v1";

if (!API_KEY) {
  console.error("❌ GROQ_API_KEY manquant dans .env");
  process.exit(1);
}

// ─── Arguments ───
const args = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith("--")) {
    flags[args[i].slice(2)] = args[i + 1];
    i++;
  } else {
    positional.push(args[i]);
  }
}
const description = positional[0] ?? "Huile d'olive extra vierge de Kabylie, bidon 5L";
const costDzd = parseFloat(flags.cost ?? "350");
const quantity = parseFloat(flags.qty ?? "1000");
const destination = (flags.dest ?? "FR").toUpperCase();

async function groqChat(messages, { json = false, maxTokens = 1500, temperature = 0.4 } = {}) {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: maxTokens,
      temperature,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function fmt(n) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 2 }).format(n);
}

async function main() {
  console.log("═".repeat(64));
  console.log(`🤖 Test Groq — modèle : ${MODEL}`);
  console.log(`📦 Produit : ${description}`);
  console.log("═".repeat(64));

  // ─── 1. DESCRIPTION (fiche produit) ───
  console.log("\n① Génération de la fiche produit…\n");
  const t1 = Date.now();
  const ficheRaw = await groqChat(
    [
      {
        role: "system",
        content:
          "Tu es l'Agent IA QDIA Export, expert en rédaction de fiches produit B2B pour l'export algérien. Réponds UNIQUEMENT en JSON valide.",
      },
      {
        role: "user",
        content: `Génère une fiche produit export pour : "${description}".
Retourne un JSON avec ces champs exacts :
{
  "name_fr": "...", "name_en": "...", "name_ar": "...",
  "description_fr": "description SEO 120 mots",
  "description_en": "SEO description 120 words",
  "category": "Agriculture & Food | Textiles & Apparel | Handicrafts & Decor | Construction Materials | Energy & Chemicals",
  "suggested_moq": 500, "suggested_moq_unit": "kg|liters|units",
  "suggested_port": "Alger|Oran|Annaba|Béjaïa",
  "certifications": ["..."], "seo_tags": ["..."]
}`,
      },
    ],
    { json: true },
  );
  let fiche;
  try {
    fiche = JSON.parse(ficheRaw);
  } catch {
    fiche = { _raw: ficheRaw };
  }
  console.log(`   ✅ Fiche générée en ${((Date.now() - t1) / 1000).toFixed(1)}s\n`);
  console.log(`   Nom FR  : ${fiche.name_fr ?? "—"}`);
  console.log(`   Nom EN  : ${fiche.name_en ?? "—"}`);
  console.log(`   Nom AR  : ${fiche.name_ar ?? "—"}`);
  console.log(`   Catégorie : ${fiche.category ?? "—"}`);
  console.log(`   MOQ     : ${fiche.suggested_moq ?? "—"} ${fiche.suggested_moq_unit ?? ""}`);
  console.log(`   Port    : ${fiche.suggested_port ?? "—"}`);
  console.log(`   Certifs : ${(fiche.certifications ?? []).join(", ") || "—"}`);
  console.log(`\n   Description FR :\n   ${(fiche.description_fr ?? "—").replace(/\n/g, "\n   ")}`);

  // ─── 2. PRIX (formule incoterms + benchmark IA) ───
  console.log("\n" + "─".repeat(64));
  console.log("② Calcul du prix d'export…\n");
  const USD = parseFloat(process.env.DZD_USD_RATE ?? "0.0074");
  const handling = 800;
  const localTransport = 1500;
  const freight = destination === "FR" ? 2000 : destination === "US" ? 4500 : 3000;

  const exwDzd = costDzd;
  const fobDzd = exwDzd + localTransport + handling;
  const cfrDzd = fobDzd + freight;
  const cifDzd = cfrDzd + cfrDzd * 0.005;

  const rows = [
    ["EXW", exwDzd],
    ["FOB", fobDzd],
    ["CFR", cfrDzd],
    ["CIF", cifDzd],
  ];
  console.log(`   Coût de revient : ${fmt(costDzd)} DZD/unité — Quantité : ${fmt(quantity)} — Destination : ${destination}\n`);
  console.log("   Incoterm |        DZD |        USD");
  console.log("   ---------|------------|-----------");
  for (const [name, dzd] of rows) {
    console.log(`   ${name.padEnd(8)} | ${fmt(dzd).padStart(10)} | ${fmt(dzd * USD).padStart(9)}`);
  }
  const fobUsd = fobDzd * USD;

  console.log("\n   💬 Benchmark marché (IA)…\n");
  const t2 = Date.now();
  const benchmark = await groqChat(
    [
      {
        role: "user",
        content: `Analyse concise (2-3 phrases) du prix FOB ${fobUsd.toFixed(2)} USD/unité pour "${description}" exporté d'Algérie vers ${destination}. Est-ce compétitif ? Réponds en français.`,
      },
    ],
    { maxTokens: 300, temperature: 0.5 },
  );
  console.log(`   (${((Date.now() - t2) / 1000).toFixed(1)}s)`);
  console.log(`   ${benchmark.trim().replace(/\n/g, "\n   ")}`);

  console.log("\n" + "═".repeat(64));
  console.log("✅ Test Groq terminé — description + prix OK");
  console.log("⚠️  Pense à révoquer/regénérer la clé Groq (elle a été exposée).");
  console.log("═".repeat(64));
}

main().catch(err => {
  console.error("\n❌ Erreur :", err.message);
  process.exit(1);
});
