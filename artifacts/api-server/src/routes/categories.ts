import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { db, categoriesTable } from "@workspace/db";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth";
import { normalizeImageBase64, type ImageMime } from "../lib/image-base64";
import { saveCategoryImage } from "../services/category-image-store";
import { MARKETPLACE_CATEGORIES } from "../lib/category-normalize";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SEED: Array<{ name: (typeof MARKETPLACE_CATEGORIES)[number]; slug: string; icon: string }> = [
  { name: "Agriculture & Food", slug: "agriculture-food", icon: "Wheat" },
  { name: "Energy & Chemicals", slug: "energy-chemicals", icon: "Flame" },
  { name: "Textiles & Apparel", slug: "textiles-apparel", icon: "Shirt" },
  { name: "Construction Materials", slug: "construction-materials", icon: "HardHat" },
  { name: "Handicrafts & Decor", slug: "handicrafts-decor", icon: "Palette" },
];

let schemaReady = false;

async function ensureCategorySchema() {
  if (schemaReady) return;
  try {
    await db.execute(sql`ALTER TABLE categories ADD COLUMN IF NOT EXISTS image_url text`);
    for (const row of SEED) {
      await db.execute(sql`
        INSERT INTO categories (name, slug, icon, product_count)
        VALUES (${row.name}, ${row.slug}, ${row.icon}, 0)
        ON CONFLICT (slug) DO NOTHING
      `);
    }
    schemaReady = true;
  } catch (err) {
    logger.warn({ err }, "ensureCategorySchema");
  }
}

function imageExtFromMime(mime: ImageMime | string): "jpg" | "png" | "webp" {
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  return "jpg";
}

function toCategoryShape(c: typeof categoriesTable.$inferSelect) {
  const raw = c.imageUrl?.trim() || null;
  const imageUrl =
    raw?.startsWith("data:") ? `/api/categories/${c.id}/image` : raw;
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    image_url: imageUrl,
    product_count: c.productCount,
  };
}

async function persistCategoryImage(categoryId: number, slug: string, fileBase64: string): Promise<string> {
  const { data, mimeType } = normalizeImageBase64(fileBase64);
  if (process.env.RENDER === "true" || process.env.CATALOG_IMAGE_MODE === "data") {
    const raw = data.replace(/^data:image\/\w+;base64,/, "");
    return `data:${mimeType};base64,${raw}`;
  }
  return saveCategoryImage(`cat-${slug || categoryId}`, data, imageExtFromMime(mimeType));
}

router.get("/categories", async (_req, res): Promise<void> => {
  await ensureCategorySchema();
  const categories = await db.select().from(categoriesTable);
  res.json(categories.map(toCategoryShape));
});

router.get("/categories/:id/image", async (req, res): Promise<void> => {
  await ensureCategorySchema();
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "ID invalide" });
    return;
  }
  const [row] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id)).limit(1);
  if (!row?.imageUrl) {
    res.status(404).json({ error: "Image introuvable" });
    return;
  }
  const url = row.imageUrl;
  if (url.startsWith("data:")) {
    const m = url.match(/^data:(image\/[\w.+-]+);base64,(.+)$/s);
    if (!m) {
      res.status(404).json({ error: "Image invalide" });
      return;
    }
    res.setHeader("Content-Type", m[1]);
    res.setHeader("Cache-Control", "public, max-age=300");
    res.send(Buffer.from(m[2], "base64"));
    return;
  }
  if (url.startsWith("http")) {
    res.redirect(302, url);
    return;
  }
  if (url.startsWith("/uploads/")) {
    res.redirect(302, url);
    return;
  }
  res.status(404).json({ error: "Image introuvable" });
});

router.post(
  "/categories/:id/image",
  requireAuth,
  requireRole("admin"),
  async (req: AuthedRequest, res): Promise<void> => {
    await ensureCategorySchema();
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }
    const parsed = z.object({ file_base64: z.string().min(10) }).safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "file_base64 requis (JPG/PNG en base64)" });
      return;
    }
    const [existing] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "Catégorie introuvable" });
      return;
    }
    try {
      const imageUrl = await persistCategoryImage(id, existing.slug, parsed.data.file_base64);
      const [updated] = await db
        .update(categoriesTable)
        .set({ imageUrl })
        .where(eq(categoriesTable.id, id))
        .returning();
      res.json(toCategoryShape(updated!));
    } catch (err) {
      logger.warn({ err, categoryId: id }, "upload image catégorie échoué");
      res.status(500).json({ error: err instanceof Error ? err.message : "Upload échoué" });
    }
  },
);

router.delete(
  "/categories/:id/image",
  requireAuth,
  requireRole("admin"),
  async (req: AuthedRequest, res): Promise<void> => {
    await ensureCategorySchema();
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "ID invalide" });
      return;
    }
    const [updated] = await db
      .update(categoriesTable)
      .set({ imageUrl: null })
      .where(eq(categoriesTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Catégorie introuvable" });
      return;
    }
    res.json(toCategoryShape(updated));
  },
);

export default router;
