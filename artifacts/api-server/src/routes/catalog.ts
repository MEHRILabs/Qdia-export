import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth";
import {
  importMasterDataBuffer,
  getCatalogStats,
  publishAllReady,
  publishVariantToMarketplace,
  listCatalogVariants,
} from "../services/master-data-import";
import { enrichCatalogBatch } from "../services/master-data-enrich";
import { checkPublishReadiness } from "../services/master-data-parser";

const router: IRouter = Router();

router.get("/catalog/stats", requireAuth, async (_req, res) => {
  const stats = await getCatalogStats();
  res.json(stats);
});

router.get("/catalog/variants", requireAuth, async (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, 200);
  const rows = await listCatalogVariants({ status, limit });
  res.json({
    data: rows.map(v => ({
      ...v,
      readiness: checkPublishReadiness({
        image_url: v.imageUrl,
        price_fob_usd: v.priceFobUsd,
        moq: v.moq,
        hs_code: v.hsCode,
        export_status: v.exportStatus,
        subsidy_status: v.subsidyStatus,
      }),
    })),
  });
});

router.post("/catalog/import", requireAuth, requireRole("supplier", "admin"), async (req: AuthedRequest, res) => {
  const parsed = z.object({
    file_base64: z.string().min(10),
    auto_publish: z.boolean().optional(),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const buffer = Buffer.from(parsed.data.file_base64, "base64");
    const result = await importMasterDataBuffer(buffer, {
      autoPublish: parsed.data.auto_publish ?? false,
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : "Import échoué — vérifiez PostgreSQL et catalog_variants",
    });
  }
});

router.post("/catalog/enrich", requireAuth, requireRole("supplier", "admin"), async (req, res) => {
  const parsed = z.object({
    limit: z.number().int().min(1).max(100).default(20),
    generate_photos: z.boolean().default(true),
  }).safeParse(req.body);
  const limit = parsed.success ? parsed.data.limit : 20;
  const generatePhotos = parsed.success ? parsed.data.generate_photos : true;
  try {
    const result = await enrichCatalogBatch(limit, { generatePhotos });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Enrichissement échoué" });
  }
});

router.post("/catalog/publish-ready", requireAuth, requireRole("supplier", "admin"), async (req, res) => {
  const parsed = z.object({ limit: z.number().int().min(1).max(500).default(50) }).safeParse(req.body);
  const limit = parsed.success ? parsed.data.limit : 50;
  try {
    const result = await publishAllReady(limit);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Publication échouée" });
  }
});

router.post("/catalog/publish/:masterId", requireAuth, requireRole("supplier", "admin"), async (req, res) => {
  const masterId = String(req.params.masterId);
  try {
    const result = await publishVariantToMarketplace(masterId);
    if (!result.ok) {
      res.status(400).json(result);
      return;
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Erreur publication" });
  }
});

export default router;
