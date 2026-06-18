import { Router, type IRouter } from "express";
import { db, productsTable } from "@workspace/db";
import { eq, ilike, and, type SQL } from "drizzle-orm";
import {
  ListProductsQueryParams,
  GetProductParams,
  ListProductsResponse,
  ListFeaturedProductsResponse,
  GetProductResponse,
  CreateProductBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

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
    export_status: p.exportStatus as "draft" | "pending" | "published" | "suspended",
    prices: {
      exw: p.priceExw,
      fob: p.priceFob,
      cfr: p.priceCfr,
      cif: p.priceCif,
      currency: p.priceCurrency,
      unit: p.priceUnit,
    },
    rating: p.rating,
    review_count: p.reviewCount,
    orders_fulfilled: p.ordersFulfilled,
    target_markets: p.targetMarkets ?? [],
    is_featured: p.isFeatured,
  };
}

router.get("/products", async (req, res): Promise<void> => {
  const params = ListProductsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { category_id, search, page = 1, limit = 20 } = params.data;
  const conditions: SQL[] = [];

  if (category_id != null) {
    // category stored as text name, filter by id isn't directly supported
  }
  if (search) {
    conditions.push(ilike(productsTable.name, `%${search}%`));
  }

  const query = db.select().from(productsTable)
    .$dynamic();

  const rows = conditions.length > 0
    ? await query.where(and(...conditions))
    : await query;

  const offset = ((page ?? 1) - 1) * (limit ?? 20);
  const paginated = rows.slice(offset, offset + (limit ?? 20));

  res.json(ListProductsResponse.parse({
    data: paginated.map(toProductShape),
    total: rows.length,
    page: page ?? 1,
    limit: limit ?? 20,
  }));
});

router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const [product] = await db.insert(productsTable).values({
    name: d.name,
    description: d.description,
    category: d.category,
    sku: d.sku,
    moq: d.moq,
    moqUnit: d.moq_unit,
    portDepart: d.port_depart,
    originWilaya: d.origin_wilaya,
    certifications: d.certifications ?? [],
    packaging: d.packaging,
    processing: d.processing,
    priceExw: d.prices.exw,
    priceFob: d.prices.fob,
    priceCfr: d.prices.cfr,
    priceCif: d.prices.cif,
    priceCurrency: d.prices.currency ?? "USD",
    priceUnit: d.prices.unit ?? "per kg",
    targetMarkets: d.target_markets ?? [],
    supplierId: 1,
  }).returning();
  res.status(201).json(GetProductResponse.parse(toProductShape(product)));
});

router.get("/products/featured", async (_req, res): Promise<void> => {
  const rows = await db.select().from(productsTable)
    .where(eq(productsTable.isFeatured, true));
  res.json(ListFeaturedProductsResponse.parse(rows.map(toProductShape)));
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
  res.json(GetProductResponse.parse(toProductShape(product)));
});

export default router;
