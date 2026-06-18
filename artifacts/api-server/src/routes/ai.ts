import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { logger } from "../lib/logger";
import {
  AiGenerateProductBody,
  AiCalculatePricingBody,
  AiStudioBody,
  AiChatBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ─── POST /ai/generate-product ───────────────────────────────────────────────
router.post("/ai/generate-product", async (req, res): Promise<void> => {
  const parsed = AiGenerateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { description, image_base64, target_market, cost_dzd } = parsed.data;

  const systemPrompt = `Tu es l'Agent IA QDIA Export, expert en commerce international algérien et en rédaction de fiches produit B2B.
Tu génères des fiches produit professionnelles pour la plateforme d'export QDIA (style Alibaba) destinées aux acheteurs internationaux.
Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans code block, sans explication.`;

  const userPrompt = `Génère une fiche produit export complète pour ce produit algérien.

Description du producteur: "${description}"
${target_market ? `Marché cible: ${target_market}` : ""}
${cost_dzd ? `Coût de revient: ${cost_dzd} DZD` : ""}

Retourne un JSON avec exactement ces champs:
{
  "name_fr": "Nom commercial en français (court, professionnel)",
  "name_en": "Nom commercial en anglais",
  "name_ar": "Nom commercial en arabe",
  "description_fr": "Description SEO professionnelle en français (150-200 mots), adaptée aux acheteurs B2B internationaux",
  "description_en": "Professional SEO description in English (150-200 words)",
  "description_ar": "وصف احترافي بالعربية (150-200 كلمة)",
  "category": "Une des catégories: Agriculture & Food | Energy & Chemicals | Textiles & Apparel | Construction Materials | Handicrafts & Decor",
  "specs": {
    "Origine": "Wilaya algérienne",
    "Conditionnement": "...",
    "Durée de vie": "...",
    "Normes": "..."
  },
  "suggested_moq": 500,
  "suggested_moq_unit": "kg | liters | units | tons",
  "suggested_port": "Alger | Oran | Annaba | Béjaïa",
  "certifications": ["Halal Certificate", "ISO 22000", "Bio Certified", ...],
  "seo_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "compliance_alerts": ["alerte réglementaire si applicable, sinon tableau vide"]
}`;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
  ];

  if (image_base64) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: userPrompt },
        {
          type: "image_url",
          image_url: { url: `data:image/jpeg;base64,${image_base64}`, detail: "high" },
        },
      ],
    });
  } else {
    messages.push({ role: "user", content: userPrompt });
  }

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages,
    max_tokens: 2000,
    temperature: 0.3,
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let result: Record<string, unknown>;
  try {
    result = JSON.parse(raw);
  } catch {
    logger.error({ raw }, "Failed to parse AI product JSON");
    res.status(500).json({ error: "La génération IA a retourné un format invalide." });
    return;
  }

  res.json(result);
});

// ─── POST /ai/calculate-pricing ───────────────────────────────────────────────
router.post("/ai/calculate-pricing", async (req, res): Promise<void> => {
  const parsed = AiCalculatePricingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const {
    product_name,
    cost_dzd,
    quantity,
    quantity_unit = "kg",
    destination_country,
    packaging_cost_dzd = 0,
    local_transport_dzd = 0,
    vendor_margin_pct = 15,
  } = parsed.data;

  // Taux de change approximatifs (en production, utiliser une API)
  const USD_RATE = 0.0074; // 1 DZD ≈ 0.0074 USD
  const EUR_RATE = 0.0068; // 1 DZD ≈ 0.0068 EUR

  // Calcul déterministe Incoterms
  const exw_dzd = cost_dzd + (packaging_cost_dzd ?? 0);
  const fob_dzd = exw_dzd + (local_transport_dzd ?? 0) + 500 + 300; // port fees + docs
  const freight_dzd = destination_country === "FR" || destination_country === "ES" || destination_country === "IT"
    ? 1200 : destination_country === "US" || destination_country === "CA"
    ? 2800 : 2000;
  const cfr_dzd = fob_dzd + freight_dzd;
  const insurance_dzd = cfr_dzd * 0.005;
  const cif_dzd = cfr_dzd + insurance_dzd;

  const margin = 1 + (vendor_margin_pct ?? 15) / 100;
  const qdia_fee = 1.03; // 3% commission QDIA

  const exw_usd = parseFloat((exw_dzd * USD_RATE * margin * qdia_fee).toFixed(2));
  const fob_usd = parseFloat((fob_dzd * USD_RATE * margin * qdia_fee).toFixed(2));
  const cfr_usd = parseFloat((cfr_dzd * USD_RATE * margin * qdia_fee).toFixed(2));
  const cif_usd = parseFloat((cif_dzd * USD_RATE * margin * qdia_fee).toFixed(2));
  const exw_eur = parseFloat((exw_dzd * EUR_RATE * margin * qdia_fee).toFixed(2));
  const fob_eur = parseFloat((fob_dzd * EUR_RATE * margin * qdia_fee).toFixed(2));

  // Enrichissement IA : benchmark marché
  const aiPrompt = `Tu es expert en commerce international. Donne une analyse concise (2-3 phrases max) du prix FOB ${fob_usd} USD/${quantity_unit} pour "${product_name}" exporté d'Algérie vers ${destination_country}. Compare avec le marché mondial. Réponds en français.`;

  let benchmark: string | null = null;
  try {
    const aiRes = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: aiPrompt }],
      max_tokens: 200,
      temperature: 0.5,
    });
    benchmark = aiRes.choices[0]?.message?.content ?? null;
  } catch {
    logger.warn("AI benchmark call failed, continuing without it");
  }

  res.json({
    exw_usd,
    fob_usd,
    cfr_usd,
    cif_usd,
    exw_eur,
    fob_eur,
    exchange_rate_dzd_usd: USD_RATE,
    breakdown: {
      "Coût produit (DZD)": cost_dzd,
      "Emballage (DZD)": packaging_cost_dzd ?? 0,
      "Transport local (DZD)": local_transport_dzd ?? 0,
      "Frais port + docs (DZD)": 800,
      "Fret maritime (DZD)": freight_dzd,
      "Assurance (DZD)": parseFloat(insurance_dzd.toFixed(0)),
      "Marge vendeur (%)": vendor_margin_pct ?? 15,
      "Commission QDIA (%)": 3,
    },
    market_benchmark: benchmark,
    price_range_note: `Prix indicatif FOB pour ${quantity} ${quantity_unit} vers ${destination_country}`,
  });
});

// ─── POST /ai/studio ──────────────────────────────────────────────────────────
router.post("/ai/studio", async (req, res): Promise<void> => {
  const parsed = AiStudioBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { image_base64, action, product_name, scene_description } = parsed.data;

  let prompt = "";
  if (action === "studio_scene") {
    prompt = `Professional product photography studio scene for export catalog. The product is${product_name ? ` "${product_name}"` : " an Algerian product"}. ${scene_description ?? "Natural lighting, clean white or warm neutral background, professional commercial packshot style. Made in Algeria quality product. High-end export catalog image."}`;
  } else if (action === "white_background") {
    prompt = `Same product, completely white clean background, professional product photography, centered, slight shadow, export catalog style.`;
  } else {
    prompt = `Enhanced professional product photo, better lighting, sharper, export catalog quality, Made in Algeria.`;
  }

  const imageBuffer = Buffer.from(image_base64, "base64");
  const blob = new Blob([imageBuffer], { type: "image/jpeg" });
  const file = new File([blob], "product.jpg", { type: "image/jpeg" });

  const result = await openai.images.edit({
    model: "gpt-image-1",
    image: file,
    prompt,
    size: "1024x1024",
  });

  const b64 = result.data?.[0]?.b64_json ?? "";
  res.json({ image_base64: b64, action_applied: action });
});

// ─── POST /ai/chat (SSE) ──────────────────────────────────────────────────────
router.post("/ai/chat", async (req, res): Promise<void> => {
  const parsed = AiChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { message, history = [] } = parsed.data;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const systemPrompt = `Tu es l'Agent IA QDIA Export, un assistant expert pour les producteurs algériens qui veulent exporter leurs produits à l'international.

Tes compétences:
- **ProductWriter**: Génère des fiches produit professionnelles en FR/EN/AR
- **ExportPricer**: Calcule les prix EXW, FOB, CFR, CIF selon les coûts fournis
- **ComplianceChecker**: Vérifie les règles export (halal, bio, phytosanitaire, embargo)
- **MOQAdvisor**: Conseille sur les quantités minimales de commande
- **CategoryMatcher**: Classe les produits dans le bon secteur export

Tu guides le producteur étape par étape pour publier son produit sur QDIA Export. Tu poses des questions précises pour collecter les informations nécessaires.

Réponds toujours en français. Sois professionnel, concis et actionnable.`;

  const chatMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...(history as OpenAI.ChatCompletionMessageParam[]),
    { role: "user", content: message },
  ];

  const stream = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: chatMessages,
    max_tokens: 1000,
    temperature: 0.7,
    stream: true,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }
  }

  res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  res.end();
});

export default router;
