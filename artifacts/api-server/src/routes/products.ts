import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, pool, productsTable, suppliersTable, categoriesTable, productViewsTable, usersTable } from "@workspace/db";
import { eq, ilike, and, or, sql, gte, lte, desc, inArray, type SQL } from "drizzle-orm";
import { requireAuth, requireRole, optionalAuth, type AuthedRequest } from "../middleware/auth";
import { writeLimiter } from "../middleware/rate-limit";
import { canModifyProduct } from "../middleware/access-control";
import {
  ListProductsQueryParams,
  GetProductParams,
  ListProductsResponse,
  ListFeaturedProductsResponse,
  GetProductResponse,
  CreateProductBody,
} from "@workspace/api-zod";
import { parseExcelProducts, wholesaleToIncoterms, buildTemplateWorkbook } from "../services/excel-import";
import { filterProducts, getRecommendations } from "../services/marketplace";
import {
  enrichProductById,
  enrichProductBatch,
  getEnrichmentStatus,
  scheduleProductEnrichment,
} from "../services/product-enrichment";
import { verifyToken, getUserById } from "../services/auth";
import { logger } from "../lib/logger";
import {
  MARKETPLACE_CATEGORIES,
  resolveCategoryFilterValues,
  toMarketplaceCategory,
} from "../lib/category-normalize";
import { saveCatalogImage } from "../services/catalog-image-store";
import { normalizeImageBase64, type ImageMime } from "../lib/image-base64";

function imageExtFromMime(mime: ImageMime): "jpg" | "png" | "webp" {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

async function persistProductImage(
  product: { id: number; sku?: string | null },
  fileBase64: string,
): Promise<string> {
  const masterId = product.sku?.trim() || `product-${product.id}`;
  const { data, mimeType } = normalizeImageBase64(fileBase64);
  return saveCatalogImage(masterId, data, imageExtFromMime(mimeType));
}

const router: IRouter = Router();

type ExportStatus = "draft" | "pending" | "published" | "suspended";

function parseExportStatus(value: unknown): ExportStatus {
  if (value === "draft" || value === "pending" || value === "published" || value === "suspended") {
    return value;
  }
  return "pending";
}

async function ensureDefaultSupplier(): Promise<number> {
  const [existing] = await db.select().from(suppliersTable).limit(1);
  if (existing) return existing.id;
  const [created] = await db.insert(suppliersTable).values({
    companyName: "Coopérative QDIA Demo",
    wilaya: "Béjaïa",
    verified: true,
    verificationLevel: 2,
  }).returning();
  return created.id;
}

async function resolveSupplierForUser(user?: AuthedRequest["user"]): Promise<number> {
  if (user?.supplier_id) return user.supplier_id;
  if (!user) return ensureDefaultSupplier();

  const companyName = user.company_name?.trim() || user.name || "Exportateur QDIA";
  const wilaya = user.wilaya?.trim() || "Alger";
  const [created] = await db.insert(suppliersTable).values({
    companyName,
    wilaya,
    verified: false,
    verificationLevel: 1,
  }).returning();

  await db.update(usersTable)
    .set({ supplierId: created.id })
    .where(eq(usersTable.id, user.id));

  return created.id;
}

function toProductShape(p: typeof productsTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    sku: p.sku,
    image_url: p.imageUrl,
    images: p.images ?? [],
    supplier_id: p.supplierId,
    supplier_name: p.supplierName,
    supplier_location: p.supplierLocation,
    moq: p.moq,
    moq_unit: p.moqUnit,
    port_depart: p.portDepart,
    origin_wilaya: p.originWilaya,
    certifications: p.certifications ?? [],
    packaging: p.packaging,
    processing: p.processing,
    export_status: p.exportStatus as ExportStatus,
    prices: {
      exw: p.priceExw,
      fob: p.priceFob,
      cfr: p.priceCfr,
      cif: p.priceCif,
      currency: p.priceCurrency,
      unit: p.priceUnit,
      retail: p.priceRetail ?? undefined,
      wholesale: p.priceWholesale ?? undefined,
    },
    rating: p.rating,
    review_count: p.reviewCount,
    orders_fulfilled: p.ordersFulfilled,
    target_markets: p.targetMarkets ?? [],
    is_featured: p.isFeatured,
  };
}

router.get("/products", optionalAuth, async (req: AuthedRequest, res): Promise<void> => {
  const params = ListProductsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { category_id, search, page = 1, limit = 20 } = params.data;
  const categoryName = typeof req.query.category === "string" ? req.query.category.trim() : "";
  const scope = req.query.scope as string | undefined;
  const exportStatusFilter = req.query.export_status as string | undefined;
  const moqMin = req.query.moq_min ? parseFloat(String(req.query.moq_min)) : undefined;
  const moqMax = req.query.moq_max ? parseFloat(String(req.query.moq_max)) : undefined;
  const priceMin = req.query.price_min ? parseFloat(String(req.query.price_min)) : undefined;
  const priceMax = req.query.price_max ? parseFloat(String(req.query.price_max)) : undefined;
  const originWilaya = req.query.origin_wilaya as string | undefined;
  const supplierIdFilter = req.query.supplier_id ? parseInt(String(req.query.supplier_id), 10) : undefined;
  const incotermFilter = req.query.incoterm as string | undefined;
  const conditions: SQL[] = [];

  if (exportStatusFilter) {
    if (req.user?.role === "admin" || req.user?.role === "supplier") {
      conditions.push(eq(productsTable.exportStatus, exportStatusFilter));
    } else {
      conditions.push(eq(productsTable.exportStatus, "published"));
    }
  } else if (scope === "admin" && req.user?.role === "admin") {
    // admin voit tous les statuts
  } else if (scope === "supplier" && req.user && ["supplier", "admin"].includes(req.user.role)) {
    // fournisseur authentifié voit tous les statuts
  } else {
    conditions.push(eq(productsTable.exportStatus, "published"));
  }

  if (categoryName) {
    const categoryValues = resolveCategoryFilterValues(categoryName);
    if (categoryValues.length > 1) {
      conditions.push(inArray(productsTable.category, categoryValues));
    } else if (categoryValues.length === 1) {
      conditions.push(eq(productsTable.category, categoryValues[0]));
    } else {
      conditions.push(eq(productsTable.category, categoryName));
    }
  } else if (category_id != null) {
    const [cat] = await db.select().from(categoriesTable)
      .where(eq(categoriesTable.id, category_id));
    if (cat) {
      conditions.push(eq(productsTable.category, cat.name));
    }
  }
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(or(
      ilike(productsTable.name, pattern),
      ilike(productsTable.sku, pattern),
      ilike(productsTable.category, pattern),
      ilike(productsTable.description, pattern),
    )!);
  }
  if (moqMin != null && !Number.isNaN(moqMin)) {
    conditions.push(gte(productsTable.moq, moqMin));
  }
  if (moqMax != null && !Number.isNaN(moqMax)) {
    conditions.push(lte(productsTable.moq, moqMax));
  }
  if (priceMin != null && !Number.isNaN(priceMin)) {
    conditions.push(gte(productsTable.priceFob, priceMin));
  }
  if (priceMax != null && !Number.isNaN(priceMax)) {
    conditions.push(lte(productsTable.priceFob, priceMax));
  }
  if (originWilaya) {
    conditions.push(eq(productsTable.originWilaya, originWilaya));
  }
  if (supplierIdFilter != null && !Number.isNaN(supplierIdFilter)) {
    conditions.push(eq(productsTable.supplierId, supplierIdFilter));
  }

  const query = db.select().from(productsTable).$dynamic();
  let rows = conditions.length > 0
    ? await query.where(and(...conditions))
    : await query;

  if (incotermFilter) {
    const inc = incotermFilter.toUpperCase();
    rows = rows.filter(p => {
      if (inc === "EXW") return p.priceExw > 0;
      if (inc === "FOB") return p.priceFob > 0;
      if (inc === "CFR") return p.priceCfr > 0;
      if (inc === "CIF") return p.priceCif > 0;
      return true;
    });
  }

  rows = filterProducts(rows, {
    moq_min: moqMin, moq_max: moqMax, price_min: priceMin, price_max: priceMax,
    origin_wilaya: originWilaya, supplier_id: supplierIdFilter, search: search ?? undefined,
  });

  const offset = ((page ?? 1) - 1) * (limit ?? 20);
  const paginated = rows.slice(offset, offset + (limit ?? 20));

  res.json(ListProductsResponse.parse({
    data: paginated.map(toProductShape),
    total: rows.length,
    page: page ?? 1,
    limit: limit ?? 20,
  }));
});

router.post("/products", requireAuth, requireRole("supplier", "admin"), writeLimiter, async (req: AuthedRequest, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const extras = req.body as {
    export_status?: unknown;
    image_url?: string;
    images?: string[];
    price_retail?: number;
    price_wholesale?: number;
  };
  const d = parsed.data;
  const supplierId = await ensureDefaultSupplier();
  const [product] = await db.insert(productsTable).values({
    name: d.name,
    description: d.description,
    category: d.category,
    sku: d.sku,
    imageUrl: extras.image_url,
    images: extras.images ?? [],
    moq: d.moq,
    moqUnit: d.moq_unit,
    portDepart: d.port_depart,
    originWilaya: d.origin_wilaya,
    certifications: d.certifications ?? [],
    packaging: d.packaging,
    processing: d.processing,
    exportStatus: parseExportStatus(extras.export_status),
    priceExw: d.prices.exw,
    priceFob: d.prices.fob,
    priceCfr: d.prices.cfr,
    priceCif: d.prices.cif,
    priceCurrency: d.prices.currency ?? "USD",
    priceUnit: d.prices.unit ?? "per kg",
    priceRetail: extras.price_retail,
    priceWholesale: extras.price_wholesale,
    targetMarkets: d.target_markets ?? [],
    supplierId,
  }).returning();
  scheduleProductEnrichment(product.id, { generatePhotos: true });
  res.status(201).json(GetProductResponse.parse(toProductShape(product)));
});

router.get("/products/import-template", (_req, res): void => {
  const buffer = buildTemplateWorkbook();
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", "attachment; filename=qdia-produits-template.xlsx");
  res.send(buffer);
});

router.post("/products/import-excel", requireAuth, requireRole("supplier", "admin"), writeLimiter, async (req: AuthedRequest, res): Promise<void> => {
  const parsed = z.object({
    file_base64: z.string().min(1),
    publish: z.boolean().optional(),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "file_base64 requis (fichier Excel encodé base64)" });
    return;
  }

  try {
    const buffer = Buffer.from(parsed.data.file_base64, "base64");
    const rows = parseExcelProducts(buffer);
    if (rows.length === 0) {
      res.status(400).json({ error: "Aucun produit trouvé dans le fichier Excel." });
      return;
    }

    const supplierId = await resolveSupplierForUser(req.user);
    const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, supplierId));
    const inserted: ReturnType<typeof toProductShape>[] = [];
    const errors: string[] = [];
    const shouldEnrichNow = rows.length <= 100;

    for (const row of rows) {
      try {
        const wholesale = row.price_wholesale ?? row.price_retail;
        const incoterms = wholesale
          ? wholesaleToIncoterms(wholesale, row.price_currency ?? "DZD")
          : { exw: 0, fob: 0, cfr: 0, cif: 0 };

        const [product] = await db.insert(productsTable).values({
          name: row.name,
          description: row.description,
          category: row.category,
          sku: row.sku,
          moq: row.moq,
          moqUnit: row.moq_unit,
          portDepart: row.port_depart,
          originWilaya: row.origin_wilaya,
          certifications: row.certifications ?? [],
          packaging: row.packaging,
          exportStatus: parsed.data.publish ? "published" : "pending",
          priceExw: incoterms.exw,
          priceFob: incoterms.fob,
          priceCfr: incoterms.cfr,
          priceCif: incoterms.cif,
          priceCurrency: row.price_currency?.toUpperCase() === "DZD" ? "USD" : (row.price_currency ?? "USD"),
          priceUnit: `per ${row.moq_unit}`,
          priceRetail: row.price_retail,
          priceWholesale: row.price_wholesale,
          supplierId,
          supplierName: supplier?.companyName,
          supplierLocation: supplier?.wilaya,
        }).returning();

        inserted.push(toProductShape(product));
        if (shouldEnrichNow) {
          scheduleProductEnrichment(product.id, { generatePhotos: true });
        }
      } catch (err) {
        errors.push(`${row.name}: ${err instanceof Error ? err.message : "erreur"}`);
      }
    }

    res.json({
      imported: inserted.length,
      total_rows: rows.length,
      ai_enrichment_scheduled: shouldEnrichNow,
      products: inserted,
      errors,
    });
  } catch (err) {
    logger.error({ err }, "excel import failed");
    res.status(400).json({ error: err instanceof Error ? err.message : "Import Excel échoué" });
  }
});

router.get("/products/enrich/status", requireAuth, requireRole("supplier", "admin"), async (_req, res): Promise<void> => {
  const status = await getEnrichmentStatus();
  res.json(status);
});

router.post("/products/enrich", requireAuth, requireRole("supplier", "admin"), async (req, res): Promise<void> => {
  const parsed = z.object({
    limit: z.number().int().positive().max(500).optional(),
    generate_photos: z.boolean().optional(),
    skip_pricing: z.boolean().optional(),
    destination_country: z.string().length(2).optional(),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const result = await enrichProductBatch(parsed.data.limit ?? 50, {
    generatePhotos: parsed.data.generate_photos,
    skipPricing: parsed.data.skip_pricing,
    destinationCountry: parsed.data.destination_country,
  });
  res.json(result);
});

router.post("/products/:id/image", requireAuth, requireRole("supplier", "admin"), async (req: AuthedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "ID invalide" });
    return;
  }

  const parsed = z.object({
    file_base64: z.string().min(10),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "file_base64 requis (image JPG/PNG en base64)" });
    return;
  }

  const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Produit introuvable" });
    return;
  }

  try {
    const imageUrl = await persistProductImage(existing, parsed.data.file_base64);
    const [product] = await db.update(productsTable)
      .set({ imageUrl, images: [imageUrl] })
      .where(eq(productsTable.id, id))
      .returning();
    res.json(GetProductResponse.parse(toProductShape(product!)));
  } catch (err) {
    logger.warn({ err, productId: id }, "upload image produit échoué");
    res.status(400).json({ error: err instanceof Error ? err.message : "Upload image échoué" });
  }
});

router.post("/products/enrich/:id", requireAuth, requireRole("supplier", "admin"), async (req, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "ID invalide" });
    return;
  }

  const parsed = z.object({
    generate_photos: z.boolean().optional(),
    skip_pricing: z.boolean().optional(),
    destination_country: z.string().length(2).optional(),
  }).safeParse(req.body ?? {});

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const result = await enrichProductById(id, {
    generatePhotos: parsed.data.generate_photos,
    skipPricing: parsed.data.skip_pricing,
    destinationCountry: parsed.data.destination_country,
  });

  if (!result.ok && result.reason === "introuvable") {
    res.status(404).json({ error: "Produit introuvable" });
    return;
  }

  res.json(result);
});

router.get("/products/meta/categories", async (req, res): Promise<void> => {
  const scope = req.query.scope as string | undefined;
  const publishedOnly = scope !== "supplier" && scope !== "admin";
  const result = publishedOnly
    ? await pool.query<{ category: string; count: string }>(`
        SELECT category, COUNT(*)::text AS count
        FROM products
        WHERE category IS NOT NULL AND trim(category) <> '' AND export_status = 'published'
        GROUP BY category
        ORDER BY category
      `)
    : await pool.query<{ category: string; count: string }>(`
        SELECT category, COUNT(*)::text AS count
        FROM products
        WHERE category IS NOT NULL AND trim(category) <> ''
        GROUP BY category
        ORDER BY category
      `);
  const aggregated = new Map<string, number>();
  for (const row of result.rows) {
    const name = toMarketplaceCategory(row.category);
    aggregated.set(name, (aggregated.get(name) ?? 0) + (parseInt(row.count, 10) || 0));
  }
  const data = [...MARKETPLACE_CATEGORIES, ...aggregated.keys()]
    .filter((name, i, arr) => arr.indexOf(name) === i)
    .map(name => ({ name, count: aggregated.get(name) ?? 0 }))
    .filter(row => row.count > 0 || (MARKETPLACE_CATEGORIES as readonly string[]).includes(row.name))
    .sort((a, b) => b.count - a.count);

  res.json({ data });
});

router.get("/products/lookup", async (req, res): Promise<void> => {
  const code = String(req.query.code ?? "").trim();
  if (!code) {
    res.status(400).json({ error: "code requis" });
    return;
  }

  const directId = parseInt(code, 10);
  if (!Number.isNaN(directId)) {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, directId)).limit(1);
    if (product) {
      res.json(GetProductResponse.parse(toProductShape(product)));
      return;
    }
  }

  const [bySku] = await db.select().from(productsTable).where(eq(productsTable.sku, code)).limit(1);
  if (bySku) {
    res.json(GetProductResponse.parse(toProductShape(bySku)));
    return;
  }

  const ean = code.replace(/\s/g, "");
  const eanResult = await pool.query<{ id: number }>(
    `SELECT p.id
     FROM products p
     JOIN articles a ON a.code_id = p.sku
     WHERE a.code_barre_ean = $1 OR a.code_barre_ean = $2
     LIMIT 1`,
    [code, ean],
  );
  if (eanResult.rows[0]?.id) {
    const [product] = await db.select().from(productsTable)
      .where(eq(productsTable.id, eanResult.rows[0].id))
      .limit(1);
    if (product) {
      res.json(GetProductResponse.parse(toProductShape(product)));
      return;
    }
  }

  res.status(404).json({ error: "Produit introuvable" });
});

router.get("/products/recommendations", async (req, res): Promise<void> => {
  const productId = req.query.product_id ? parseInt(String(req.query.product_id), 10) : undefined;
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 8;
  let userId: number | null = null;
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const payload = await verifyToken(authHeader.slice(7));
      const user = await getUserById(payload.sub);
      userId = user?.id ?? null;
    } catch { /* anonymous */ }
  }
  const data = await getRecommendations(userId, productId, limit);
  res.json({ data });
});

router.get("/products/featured", async (_req, res): Promise<void> => {
  let rows = await db.select().from(productsTable)
    .where(and(
      eq(productsTable.isFeatured, true),
      eq(productsTable.exportStatus, "published"),
    ))
    .limit(6);

  if (rows.length === 0) {
    rows = await db.select().from(productsTable)
      .where(eq(productsTable.exportStatus, "published"))
      .orderBy(desc(productsTable.rating), desc(productsTable.id))
      .limit(6);
  }

  res.json(ListFeaturedProductsResponse.parse(rows.map(toProductShape)));
});

router.patch("/products/:id", requireAuth, requireRole("supplier", "admin"), async (req: AuthedRequest, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: "Invalid product id" });
    return;
  }
  const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  if (!canModifyProduct(req.user!, existing)) {
    res.status(403).json({ error: "Accès non autorisé à ce produit." });
    return;
  }
  const export_status = parseExportStatus(req.body?.export_status);
  const [product] = await db.update(productsTable)
    .set({ exportStatus: export_status })
    .where(eq(productsTable.id, id))
    .returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(GetProductResponse.parse(toProductShape(product)));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetProductParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [product] = await db.select().from(productsTable)
    .where(eq(productsTable.id, params.data.id));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  let views = 0;
  try {
    await db.insert(productViewsTable).values({ productId: product.id });
    const [row] = await db.select({ views: sql<number>`count(*)::int` })
      .from(productViewsTable).where(eq(productViewsTable.productId, product.id));
    views = row?.views ?? 0;
  } catch (err) {
    logger.warn({ err, productId: product.id }, "product_views indisponible — vue non comptée");
  }
  res.json({ ...GetProductResponse.parse(toProductShape(product)), view_count: views });
});

const UpdateProductBody = CreateProductBody.partial().extend({
  // Autoriser une mise à jour partielle des prix (ex. formulaire n'éditant que le FOB)
  prices: z
    .object({
      exw: z.number(),
      fob: z.number(),
      cfr: z.number(),
      cif: z.number(),
      currency: z.string().optional(),
      unit: z.string().optional(),
    })
    .partial()
    .optional(),
});

router.put("/products/:id", requireAuth, requireRole("supplier", "admin"), async (req: AuthedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const extras = req.body as { image_url?: string; images?: string[]; file_base64?: string };
  const [before] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
  if (!before) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  if (!canModifyProduct(req.user!, before)) {
    res.status(403).json({ error: "Accès non autorisé à ce produit." });
    return;
  }

  let imageUrl = extras.image_url;
  let images = extras.images;
  if (extras.file_base64) {
    imageUrl = await persistProductImage(before, extras.file_base64);
    images = [imageUrl];
  }

  const [product] = await db.update(productsTable).set({
    ...(d.name ? { name: d.name } : {}),
    ...(d.description ? { description: d.description } : {}),
    ...(d.category ? { category: d.category } : {}),
    ...(d.moq != null ? { moq: d.moq } : {}),
    ...(d.moq_unit ? { moqUnit: d.moq_unit } : {}),
    ...(d.port_depart ? { portDepart: d.port_depart } : {}),
    ...(d.origin_wilaya ? { originWilaya: d.origin_wilaya } : {}),
    ...(d.certifications ? { certifications: d.certifications } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(images ? { images } : {}),
    ...(d.prices?.exw != null ? { priceExw: d.prices.exw } : {}),
    ...(d.prices?.fob != null ? { priceFob: d.prices.fob } : {}),
    ...(d.prices?.cfr != null ? { priceCfr: d.prices.cfr } : {}),
    ...(d.prices?.cif != null ? { priceCif: d.prices.cif } : {}),
  }).where(eq(productsTable.id, id)).returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json(GetProductResponse.parse(toProductShape(product)));
});

router.delete("/products/:id", requireAuth, requireRole("supplier", "admin"), async (req: AuthedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  if (!canModifyProduct(req.user!, existing)) {
    res.status(403).json({ error: "Accès non autorisé à ce produit." });
    return;
  }
  const [product] = await db.delete(productsTable).where(eq(productsTable.id, id)).returning();
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  res.json({ ok: true });
});

export default router;
