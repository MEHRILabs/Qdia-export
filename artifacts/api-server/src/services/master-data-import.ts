import { eq, sql } from "drizzle-orm";
import { db, catalogVariantsTable, productsTable, suppliersTable } from "@workspace/db";
import { logger } from "../lib/logger";
import {
  parseMasterDataExcel,
  checkPublishReadiness,
  type ParsedCatalogVariant,
} from "./master-data-parser";

export interface CatalogImportResult {
  batch: string;
  parsed: number;
  inserted: number;
  updated: number;
  skipped: number;
  publishable: number;
  errors: string[];
}

async function ensureCatalogSupplier(): Promise<number> {
  const [existing] = await db.select().from(suppliersTable).limit(1);
  if (existing) return existing.id;
  const [created] = await db.insert(suppliersTable).values({
    companyName: "Catalogue Master Data QDIA",
    wilaya: "Alger",
    verified: true,
    verificationLevel: 2,
  }).returning();
  return created.id;
}

function toDbRow(v: ParsedCatalogVariant, batch: string) {
  return {
    masterId: v.master_id,
    parentProductId: v.parent_product_id,
    brandCode: v.brand_code,
    brandName: v.brand_name,
    categoryCode: v.category_code,
    categoryName: v.category_name,
    subcategory: v.subcategory,
    name: v.name,
    description: v.description,
    ean: v.ean,
    priceRetailDzd: v.price_retail_dzd,
    priceFobUsd: v.price_fob_usd,
    moq: v.moq,
    moqUnit: v.moq_unit,
    hsCode: v.hs_code,
    weightKg: v.weight_kg,
    volumeL: v.volume_l,
    unitsPerCarton: v.units_per_carton,
    cartonsPerPallet: v.cartons_per_pallet,
    cartonLengthCm: v.carton_length_cm,
    cartonWidthCm: v.carton_width_cm,
    cartonHeightCm: v.carton_height_cm,
    weightCartonKg: v.weight_carton_kg,
    weightPalletKg: v.weight_pallet_kg,
    subsidyStatus: v.subsidy_status ?? "N",
    phytoLevel: v.phyto_level ?? "X",
    exportStatus: v.export_status ?? "a_valider",
    imageUrl: v.image_url,
    packagingNotes: v.packaging_notes,
    importBatch: batch,
    updatedAt: new Date(),
  };
}

export async function importMasterDataBuffer(
  buffer: Buffer,
  opts?: { batch?: string; autoPublish?: boolean },
): Promise<CatalogImportResult> {
  const batch = opts?.batch ?? `MD-${Date.now()}`;
  const result: CatalogImportResult = {
    batch,
    parsed: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    publishable: 0,
    errors: [],
  };

  const rows = parseMasterDataExcel(buffer);
  result.parsed = rows.length;

  for (const v of rows) {
    try {
      const readiness = checkPublishReadiness(v);
      if (readiness.ready) result.publishable++;

      const [existing] = await db.select()
        .from(catalogVariantsTable)
        .where(eq(catalogVariantsTable.masterId, v.master_id))
        .limit(1);

      const payload = toDbRow(v, batch);

      if (existing) {
        await db.update(catalogVariantsTable).set(payload)
          .where(eq(catalogVariantsTable.id, existing.id));
        result.updated++;
      } else {
        await db.insert(catalogVariantsTable).values(payload);
        result.inserted++;
      }

      if (opts?.autoPublish && readiness.ready) {
        await publishVariantToMarketplace(v.master_id);
      }
    } catch (err) {
      result.skipped++;
      result.errors.push(`${v.master_id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  logger.info({ ...result }, "Master data import terminé");
  return result;
}

export async function getCatalogStats() {
  try {
    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` })
      .from(catalogVariantsTable);
    const [{ aValider }] = await db.select({ aValider: sql<number>`count(*)::int` })
      .from(catalogVariantsTable)
      .where(sql`lower(${catalogVariantsTable.exportStatus}) in ('a_valider', 'draft')`);
    const [{ published }] = await db.select({ published: sql<number>`count(*)::int` })
      .from(catalogVariantsTable)
      .where(eq(catalogVariantsTable.exportStatus, "published"));
    const [{ withImage }] = await db.select({ withImage: sql<number>`count(*)::int` })
      .from(catalogVariantsTable)
      .where(sql`${catalogVariantsTable.imageUrl} is not null and trim(${catalogVariantsTable.imageUrl}) <> ''`);
    const [{ withFob }] = await db.select({ withFob: sql<number>`count(*)::int` })
      .from(catalogVariantsTable)
      .where(sql`${catalogVariantsTable.priceFobUsd} is not null and ${catalogVariantsTable.priceFobUsd} > 0`);

    return {
      total: total ?? 0,
      a_valider: aValider ?? 0,
      published: published ?? 0,
      with_image: withImage ?? 0,
      with_fob: withFob ?? 0,
    };
  } catch {
    return { total: 0, a_valider: 0, published: 0, with_image: 0, with_fob: 0, db_error: true };
  }
}

export async function publishVariantToMarketplace(masterId: string): Promise<{ ok: boolean; product_id?: number; reason?: string }> {
  const [v] = await db.select().from(catalogVariantsTable)
    .where(eq(catalogVariantsTable.masterId, masterId)).limit(1);
  if (!v) return { ok: false, reason: "variante_introuvable" };

  const readiness = checkPublishReadiness({
    image_url: v.imageUrl,
    price_fob_usd: v.priceFobUsd,
    moq: v.moq,
    hs_code: v.hsCode,
    export_status: v.exportStatus,
    subsidy_status: v.subsidyStatus,
    name: v.name,
  });
  if (!readiness.ready) {
    return { ok: false, reason: `incomplet: ${readiness.missing.join(", ")}` };
  }

  const supplierId = await ensureCatalogSupplier();
  const fob = v.priceFobUsd!;
  const moq = v.moq ?? 100;
  const category = v.subcategory ? `${v.categoryName} > ${v.subcategory}` : v.categoryName;

  const productPayload = {
    name: v.name,
    description: v.description ?? `${v.brandName ?? ""} — ${v.name}`.trim(),
    category,
    sku: v.masterId,
    imageUrl: v.imageUrl!,
    images: v.imageUrl ? [v.imageUrl] : [],
    supplierId,
    supplierName: v.brandName ?? "Export DZ",
    supplierLocation: "Algérie",
    moq,
    moqUnit: v.moqUnit ?? "unité",
    portDepart: "Béjaïa",
    originWilaya: "Alger",
    certifications: [] as string[],
    packaging: v.packagingNotes ?? undefined,
    exportStatus: "published",
    priceExw: fob * 0.92,
    priceFob: fob,
    priceCfr: fob * 1.08,
    priceCif: fob * 1.12,
    priceCurrency: "USD",
    priceUnit: "unit",
    priceRetail: v.priceRetailDzd ?? undefined,
    priceWholesale: fob,
    isFeatured: false,
  };

  let productId = v.publishedProductId ?? undefined;
  if (productId) {
    await db.update(productsTable).set(productPayload).where(eq(productsTable.id, productId));
  } else {
    const [existing] = await db.select().from(productsTable)
      .where(eq(productsTable.sku, v.masterId)).limit(1);
    if (existing) {
      productId = existing.id;
      await db.update(productsTable).set(productPayload).where(eq(productsTable.id, productId));
    } else {
      const [created] = await db.insert(productsTable).values(productPayload).returning();
      productId = created.id;
    }
  }

  await db.update(catalogVariantsTable).set({
    exportStatus: "published",
    publishedProductId: productId,
    updatedAt: new Date(),
  }).where(eq(catalogVariantsTable.id, v.id));

  return { ok: true, product_id: productId };
}

export async function publishAllReady(limit = 100): Promise<{ published: number; failed: number }> {
  const rows = await db.select().from(catalogVariantsTable).limit(5000);
  let published = 0;
  let failed = 0;
  for (const v of rows) {
    if (published >= limit) break;
    const r = checkPublishReadiness({
      image_url: v.imageUrl,
      price_fob_usd: v.priceFobUsd,
      moq: v.moq,
      hs_code: v.hsCode,
      export_status: v.exportStatus,
      subsidy_status: v.subsidyStatus,
    });
    if (!r.ready) continue;
    const res = await publishVariantToMarketplace(v.masterId);
    if (res.ok) published++;
    else failed++;
  }
  return { published, failed };
}

export async function listCatalogVariants(opts?: { status?: string; limit?: number }) {
  const limit = opts?.limit ?? 50;
  if (opts?.status) {
    return db.select().from(catalogVariantsTable)
      .where(eq(catalogVariantsTable.exportStatus, opts.status))
      .limit(limit);
  }
  return db.select().from(catalogVariantsTable).limit(limit);
}
