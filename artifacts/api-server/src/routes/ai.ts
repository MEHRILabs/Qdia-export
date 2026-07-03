import { Router, type IRouter } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";
import { requireAuth, requireRole } from "../middleware/auth";
import { aiLimiter } from "../middleware/rate-limit";
import { agentOrchestrator } from "../services/agent-orchestrator";
import { AI_CREDIT_COSTS, getCreditsSummary } from "../services/ai-credits";
import { previewScrapedImages, runBulkImport } from "../services/bulk-import-agent";
import { formatAiError } from "../services/local-product-fallback";
import {
  AiGenerateProductBody,
  AiCalculatePricingBody,
  AiChatBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.use(requireAuth, requireRole("supplier", "admin"), aiLimiter);

const StudioBody = z.object({
  image_base64: z.string(),
  action: z.enum(["remove_background", "white_background", "studio_scene", "enhance"]),
  product_name: z.string().nullish(),
  scene_description: z.string().nullish(),
  session_id: z.string().uuid().nullish(),
});

const ScrapeBody = z.object({
  source_urls: z.array(z.string().url()).min(1).max(10),
});

const BulkImportBody = z.object({
  file_base64: z.string().optional(),
  source_urls: z.array(z.string().url()).optional(),
  image_urls: z.array(z.string().url()).optional(),
  scrape_images: z.boolean().optional(),
  enrich_with_ai: z.boolean().optional(),
  publish: z.boolean().optional(),
  destination_country: z.string().length(2).optional(),
  port_code: z.string().optional(),
});

function anyAiKey(): boolean {
  return !!(
    process.env.OPENAI_API_KEY ||
    process.env.GROQ_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.ANTHROPIC_API_KEY
  );
}

function requireAi(res: import("express").Response, opts?: { action?: string }): boolean {
  if (opts?.action === "remove_background" && process.env.REMOVEBG_API_KEY) return true;
  if (!anyAiKey()) {
    res.status(503).json({
      error: "Aucune clé IA configurée. Ajoutez GROQ_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY ou ANTHROPIC_API_KEY dans .env",
    });
    return false;
  }
  return true;
}

router.get("/ai/credits", (_req, res) => {
  res.json(getCreditsSummary());
});

import { hasProviderKey, getProvider } from "../services/ai/config";

function aiStatus() {
  return {
    openai: hasProviderKey("openai"),
    groq: hasProviderKey("groq"),
    gemini: hasProviderKey("gemini"),
    claude: hasProviderKey("claude"),
    removebg: !!process.env.REMOVEBG_API_KEY,
    chat_provider: getProvider("chat"),
    vision_provider: getProvider("vision"),
    image_provider: getProvider("image"),
    fallback_enabled: process.env.AI_FALLBACK_ENABLED !== "false",
    credit_costs: AI_CREDIT_COSTS,
  };
}

// ─── GET /ai/status ───────────────────────────────────────────────────────────
router.get("/ai/status", (_req, res): void => {
  res.json(aiStatus());
});

// ─── Sessions ─────────────────────────────────────────────────────────────────
router.post("/ai/sessions", async (_req, res): Promise<void> => {
  try {
    const session = await agentOrchestrator.createSession();
    res.json({
      id: session.id,
      current_step: session.currentStep,
      status: session.status,
      chat_history: session.chatHistory,
      extracted_data: session.extractedData,
      generated_product: session.generatedProduct,
      pricing_result: session.pricingResult,
      studio_images: session.studioImages,
    });
  } catch (err) {
    logger.error({ err }, "create session failed");
    res.status(500).json({ error: "Impossible de créer la session agent." });
  }
});

router.get("/ai/sessions/:id", async (req, res): Promise<void> => {
  const session = await agentOrchestrator.getSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session introuvable" });
    return;
  }
  res.json({
    id: session.id,
    current_step: session.currentStep,
    status: session.status,
    chat_history: session.chatHistory,
    extracted_data: session.extractedData,
    generated_product: session.generatedProduct,
    pricing_result: session.pricingResult,
    studio_images: session.studioImages,
    published_product_id: session.publishedProductId,
  });
});

router.post("/ai/sessions/:id/reset", async (req, res): Promise<void> => {
  const session = await agentOrchestrator.resetSession(req.params.id);
  if (!session) {
    res.status(404).json({ error: "Session introuvable" });
    return;
  }
  res.json({ ok: true, session_id: session.id, current_step: session.currentStep });
});

router.post("/ai/sessions/:id/complete", async (req, res): Promise<void> => {
  const productId = z.object({ product_id: z.number().int().positive() }).safeParse(req.body);
  if (!productId.success) {
    res.status(400).json({ error: "product_id requis" });
    return;
  }
  await agentOrchestrator.markPublished(req.params.id, productId.data.product_id);
  res.json({ ok: true });
});

// ─── POST /ai/generate-product ───────────────────────────────────────────────
router.post("/ai/generate-product", async (req, res): Promise<void> => {
  if (!requireAi(res)) return;
  try {
    const parsed = AiGenerateProductBody.extend({
      session_id: z.string().uuid().optional(),
    }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

    const { session_id, description, image_base64, target_market, cost_dzd } = parsed.data;

    const cost = cost_dzd != null && Number.isFinite(cost_dzd) ? cost_dzd : undefined;

    if (session_id) {
      const result = await agentOrchestrator.runGenerateProduct(session_id, {
        description,
        image_base64: image_base64 ?? undefined,
        target_market: target_market ?? undefined,
        cost_dzd: cost,
      });
      res.json(result);
    return;
  }

    const result = await agentOrchestrator.runGenerateProduct(
      (await agentOrchestrator.createSession()).id,
      { description, image_base64: image_base64 ?? undefined, target_market: target_market ?? undefined, cost_dzd: cost },
    );
  res.json(result);
  } catch (err) {
    logger.error({ err }, "generate-product failed");
    res.status(500).json({ error: formatAiError(err) });
  }
});

// ─── POST /ai/calculate-pricing ───────────────────────────────────────────────
router.post("/ai/calculate-pricing", async (req, res): Promise<void> => {
  try {
    const parsed = AiCalculatePricingBody.extend({
      session_id: z.string().uuid().optional(),
    }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

    const { session_id, ...pricingInput } = parsed.data;
    const sid = session_id ?? (await agentOrchestrator.createSession()).id;
    const result = await agentOrchestrator.runPricing(sid, {
      ...pricingInput,
      packaging_cost_dzd: pricingInput.packaging_cost_dzd ?? undefined,
      local_transport_dzd: pricingInput.local_transport_dzd ?? undefined,
      vendor_margin_pct: pricingInput.vendor_margin_pct ?? undefined,
    });
    res.json(result);
  } catch (err) {
    logger.error({ err }, "calculate-pricing failed");
    res.status(500).json({ error: "Erreur lors du calcul pricing." });
  }
});

// ─── POST /ai/studio ──────────────────────────────────────────────────────────
router.post("/ai/studio", async (req, res): Promise<void> => {
  try {
    const parsed = StudioBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

    const action = parsed.data.action;
    if (action === "remove_background") {
      if (!process.env.REMOVEBG_API_KEY && !anyAiKey()) {
        res.status(503).json({ error: "REMOVEBG_API_KEY ou une clé IA requise pour le studio." });
        return;
      }
    } else if (!requireAi(res)) {
      return;
    }

    const { session_id, ...studioInput } = parsed.data;
    const sid = session_id ?? (await agentOrchestrator.createSession()).id;
    const result = await agentOrchestrator.runStudio(sid, {
      image_base64: studioInput.image_base64,
      action: studioInput.action,
      product_name: studioInput.product_name ?? undefined,
      scene_description: studioInput.scene_description ?? undefined,
    });
    res.json({
      image_base64: result.image_base64,
      action_applied: result.action_applied,
      provider: result.provider,
      variants: result.variants,
      session_id: sid,
    });
  } catch (err) {
    logger.error({ err }, "studio failed");
    res.status(500).json({ error: formatAiError(err) });
  }
});

// ─── POST /ai/chat (SSE) ──────────────────────────────────────────────────────
router.post("/ai/chat", async (req, res): Promise<void> => {
  if (!requireAi(res)) return;
  try {
    const parsed = AiChatBody.extend({
      session_id: z.string().uuid().optional(),
    }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

    const { message, session_id } = parsed.data;
    let sid = session_id;
    if (!sid) {
      const created = await agentOrchestrator.createSession();
      sid = created.id;
    }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

    res.write(`data: ${JSON.stringify({ session_id: sid })}\n\n`);

    const meta = await agentOrchestrator.runChat(sid!, message, content => {
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    });

    res.write(`data: ${JSON.stringify({ done: true, ...meta })}\n\n`);
    res.end();
  } catch (err) {
    logger.error({ err }, "chat failed");
    if (!res.headersSent) {
      res.status(500).json({ error: "Erreur lors du chat IA." });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Erreur chat IA" })}\n\n`);
      res.end();
    }
  }
});

// ─── POST /ai/scrape-images ───────────────────────────────────────────────────
router.post("/ai/scrape-images", async (req, res): Promise<void> => {
  try {
    const parsed = ScrapeBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const images = await previewScrapedImages(parsed.data.source_urls);
    res.json({ count: images.length, images });
  } catch (err) {
    logger.error({ err }, "scrape-images failed");
    res.status(500).json({ error: err instanceof Error ? err.message : "Erreur scraping images" });
  }
});

// ─── POST /ai/bulk-import ─────────────────────────────────────────────────────
router.post("/ai/bulk-import", async (req, res): Promise<void> => {
  if (!requireAi(res)) return;
  try {
    const parsed = BulkImportBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const { file_base64, source_urls, image_urls } = parsed.data;
    if (!file_base64 && !(source_urls?.length) && !(image_urls?.length)) {
      res.status(400).json({ error: "Fournissez file_base64, source_urls ou image_urls" });
      return;
    }

    const result = await runBulkImport(parsed.data);
    res.json(result);
  } catch (err) {
    logger.error({ err }, "bulk-import failed");
    res.status(500).json({ error: err instanceof Error ? err.message : "Import en masse échoué" });
  }
});

export default router;
