import { eq, sql, or, isNull } from "drizzle-orm";
import { db, productsTable, type Product } from "@workspace/db";
import { aiCompleteMini, aiCompleteTextJson, aiGenerateProductImage } from "./ai/engine";
import { hasProviderKey, getProvider } from "./ai/config";
import { saveCatalogImage, saveCatalogSvg } from "./catalog-image-store";
import { generateClaudeProductSvg, canGenerateClaudeProductVisual } from "./claude-product-image";
import { FALLBACK_PORTS, getFreightDzd, calculateCustoms } from "./ports-customs";
import { logger } from "../lib/logger";

export interface EnrichProductOptions {
  generatePhotos?: boolean;
  skipPricing?: boolean;
  onlyWithoutPhoto?: boolean;
  destinationCountry?: string;
  vendorMarginPct?: number;
}

export interface EnrichOneResult {
  ok: boolean;
  product_id: number;
  pricing_updated?: boolean;
  photo_updated?: boolean;
  reason?: string;
}

export interface EnrichBatchResult {
  enriched: number;
  skipped: number;
  photos_generated: number;
  pricing_updated: number;
  errors: string[];
}

export interface EnrichmentStatus {
  total: number;
  without_photo: number;
  without_pricing: number;
  ready_for_review: number;
  published: number;
}

const PLACEHOLDER_PATTERNS = [
  "/qdia-photo-placeholder",
  "Photo IA à générer",
];

export function isPlaceholderCatalogImage(imageUrl?: string | null): boolean {
  if (!imageUrl?.trim()) return true;
  const u = imageUrl.trim();
  return PLACEHOLDER_PATTERNS.some(p => u.includes(p))
    || (u.startsWith("/uploads/catalog/") && u.endsWith(".svg") && u.includes("QDIA Photo"));
}

export function hasRealProductImage(imageUrl?: string | null): boolean {
  if (!imageUrl?.trim()) return false;
  const u = imageUrl.trim();
  if (isPlaceholderCatalogImage(u)) return false;
  if (u.startsWith("data:") || u.startsWith("http")) return true;
  if (u.startsWith("/uploads/catalog/")) return true;
  if (u.startsWith("/") && !u.endsWith(".svg")) return true;
  return false;
}

export function needsPricing(p: Product): boolean {
  return !p.priceFob || p.priceFob <= 1 || !p.priceExw || p.priceExw <= 1;
}

export function needsPhoto(p: Product): boolean {
  return !hasRealProductImage(p.imageUrl);
}

function estimateCostDzd(p: Product): number {
  if (p.priceRetail && p.priceRetail > 0) return p.priceRetail;
  if (p.priceWholesale && p.priceWholesale > 0) return p.priceWholesale;
  return 500;
}

export function calculateFormulaPricing(
  p: Product,
  opts: EnrichProductOptions = {},
): { exw: number; fob: number; cfr: number; cif: number; currency: string; unit: string } {
  const USD_RATE = parseFloat(process.env.DZD_USD_RATE ?? "0.0074");
  const destination = opts.destinationCountry ?? p.targetMarkets?.[0]?.slice(0, 2) ?? "FR";
  const port = FALLBACK_PORTS.find(x => x.country_code === "DZ") ?? FALLBACK_PORTS[0];

  const costDzd = estimateCostDzd(p);
  const packagingDzd = Math.max(50, costDzd * 0.05);
  const transportDzd = Math.max(100, costDzd * 0.03);
  const handling = port.handling_fee_dzd ?? 800;

  const exwDzd = costDzd + packagingDzd;
  const fobDzd = exwDzd + transportDzd + handling;
  const freightDzd = getFreightDzd(port, destination);
  const cfrDzd = fobDzd + freightDzd;
  const cifDzd = cfrDzd + cfrDzd * 0.005;

  const margin = 1 + (opts.vendorMarginPct ?? 15) / 100;
  const qdiaFee = 1.03;

  calculateCustoms({
    product_category: p.category,
    destination_code: destination as "FR" | "AE" | "US" | "DZ",
    cif_value_dzd: cifDzd,
    port_code: port.code,
  });

  return {
    exw: parseFloat((exwDzd * USD_RATE * margin * qdiaFee).toFixed(2)),
    fob: parseFloat((fobDzd * USD_RATE * margin * qdiaFee).toFixed(2)),
    cfr: parseFloat((cfrDzd * USD_RATE * margin * qdiaFee).toFixed(2)),
    cif: parseFloat((cifDzd * USD_RATE * margin * qdiaFee).toFixed(2)),
    currency: "USD",
    unit: p.priceUnit || `per ${p.moqUnit}`,
  };
}

async function enrichPricingWithAi(p: Product, base: ReturnType<typeof calculateFormulaPricing>): Promise<ReturnType<typeof calculateFormulaPricing>> {
  if (!hasProviderKey(getProvider("benchmark"))) return base;

  try {
    const prompt = `Produit export algérien B2B.
Nom: ${p.name}
Catégorie: ${p.category}
Prix détail DZD estimé: ${estimateCostDzd(p)}
FOB calculé USD: ${base.fob}

Réponds UNIQUEMENT en JSON:
{"fob_usd": number, "moq": number, "notes": "court commentaire"}`;

    const { data: raw } = await aiCompleteTextJson(
      "Tu es expert export produits algériens. Réponds uniquement en JSON valide.",
      prompt,
    );
    const data = JSON.parse(raw) as { fob_usd?: number; moq?: number; notes?: string };
    if (data.fob_usd && data.fob_usd > 0) {
      const ratio = data.fob_usd / base.fob;
      return {
        ...base,
        exw: parseFloat((base.exw * ratio).toFixed(2)),
        fob: parseFloat(data.fob_usd.toFixed(2)),
        cfr: parseFloat((base.cfr * ratio).toFixed(2)),
        cif: parseFloat((base.cif * ratio).toFixed(2)),
      };
    }
  } catch (err) {
    logger.warn({ err, productId: p.id }, "IA pricing benchmark échoué — formule conservée");
  }

  try {
    await aiCompleteMini(
      `Prix FOB ${base.fob} USD pour "${p.name}" exporté d'Algérie. Une phrase de validation.`,
    );
  } catch { /* non bloquant */ }

  return base;
}

function buildPhotoPrompt(p: Product): string {
  return [
    "Ultra-clean professional e-commerce product photography for B2B export catalog.",
    `Product: "${p.name}"`,
    `Category: ${p.category}`,
    p.description ? `Details: ${p.description.slice(0, 150)}` : null,
    "Pure white seamless background (#FFFFFF), soft studio lighting, single product centered.",
    "Photorealistic packaging only — NO text, NO labels, NO logos, NO watermarks, NO writing on package.",
    "NO people, NO props, NO colorful backgrounds, NO marketing graphics.",
  ].filter(Boolean).join(" ");
}

async function generateAndStoreProductPhoto(p: Product): Promise<string | null> {
  const masterId = p.sku?.trim() || `product-${p.id}`;

  if (hasProviderKey(getProvider("image"))) {
    try {
      const { imageBase64 } = await aiGenerateProductImage(buildPhotoPrompt(p));
      return await saveCatalogImage(masterId, imageBase64, "jpg");
    } catch (err) {
      logger.warn({ err, productId: p.id }, "Photo OpenAI/Gemini échouée — essai Claude SVG");
    }
  }

  if (canGenerateClaudeProductVisual()) {
    try {
      const svg = await generateClaudeProductSvg({
        name: p.name,
        category: p.category,
        description: p.description,
      });
      return await saveCatalogSvg(masterId, svg);
    } catch (err) {
      logger.warn({ err, productId: p.id }, "Visuel Claude SVG échoué");
    }
  }

  return null;
}

export async function enrichProductById(
  productId: number,
  opts: EnrichProductOptions = {},
): Promise<EnrichOneResult> {
  const [p] = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  if (!p) return { ok: false, product_id: productId, reason: "introuvable" };

  const patch: {
    priceExw?: number;
    priceFob?: number;
    priceCfr?: number;
    priceCif?: number;
    priceCurrency?: string;
    priceUnit?: string;
    imageUrl?: string;
    images?: string[];
  } = {};
  let pricingUpdated = false;
  let photoUpdated = false;

  if (!opts.skipPricing && needsPricing(p)) {
    let prices = calculateFormulaPricing(p, opts);
    prices = await enrichPricingWithAi(p, prices);
    patch.priceExw = prices.exw;
    patch.priceFob = prices.fob;
    patch.priceCfr = prices.cfr;
    patch.priceCif = prices.cif;
    patch.priceCurrency = prices.currency;
    patch.priceUnit = prices.unit;
    pricingUpdated = true;
  }

  const generatePhotos = opts.generatePhotos !== false;
  if (generatePhotos && needsPhoto(p)) {
    const imageUrl = await generateAndStoreProductPhoto(p);
    if (imageUrl) {
      patch.imageUrl = imageUrl;
      patch.images = [imageUrl];
      photoUpdated = true;
    }
  }

  if (!pricingUpdated && !photoUpdated) {
    return { ok: false, product_id: productId, reason: "rien_a_enrichir" };
  }

  await db.update(productsTable).set(patch).where(eq(productsTable.id, productId));

  if (photoUpdated) {
    const { promoteProductToFeatured } = await import("./featured-products");
    void promoteProductToFeatured(productId);
  }

  return {
    ok: true,
    product_id: productId,
    pricing_updated: pricingUpdated,
    photo_updated: photoUpdated,
  };
}

export async function enrichProductBatch(
  limit = 50,
  opts: EnrichProductOptions = {},
): Promise<EnrichBatchResult> {
  const result: EnrichBatchResult = {
    enriched: 0,
    skipped: 0,
    photos_generated: 0,
    pricing_updated: 0,
    errors: [],
  };

  const rows = await db.select().from(productsTable).limit(limit * 10);

  for (const p of rows) {
    if (result.enriched >= limit) break;

    const pricingMissing = !opts.skipPricing && needsPricing(p);
    const photoMissing = opts.generatePhotos !== false && needsPhoto(p);
    if (opts.onlyWithoutPhoto && !photoMissing) {
      result.skipped++;
      continue;
    }
    if (!pricingMissing && !photoMissing) {
      result.skipped++;
      continue;
    }

    try {
      const one = await enrichProductById(p.id, opts);
      if (one.ok) {
        result.enriched++;
        if (one.pricing_updated) result.pricing_updated++;
        if (one.photo_updated) result.photos_generated++;
      } else {
        result.skipped++;
      }
    } catch (e) {
      result.errors.push(`${p.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return result;
}

export async function getEnrichmentStatus(): Promise<EnrichmentStatus> {
  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(productsTable);

  const [{ withoutPhoto }] = await db.select({ withoutPhoto: sql<number>`count(*)::int` })
    .from(productsTable)
    .where(or(
      isNull(productsTable.imageUrl),
      sql`trim(${productsTable.imageUrl}) = ''`,
      sql`${productsTable.imageUrl} like '%.svg'`,
      sql`${productsTable.imageUrl} like '%qdia-photo-placeholder%'`,
    ));

  const [{ withoutPricing }] = await db.select({ withoutPricing: sql<number>`count(*)::int` })
    .from(productsTable)
    .where(or(
      isNull(productsTable.priceFob),
      sql`${productsTable.priceFob} <= 1`,
    ));

  const [{ ready }] = await db.select({ ready: sql<number>`count(*)::int` })
    .from(productsTable)
    .where(eq(productsTable.exportStatus, "pending"));

  const [{ published }] = await db.select({ published: sql<number>`count(*)::int` })
    .from(productsTable)
    .where(eq(productsTable.exportStatus, "published"));

  return {
    total: total ?? 0,
    without_photo: withoutPhoto ?? 0,
    without_pricing: withoutPricing ?? 0,
    ready_for_review: ready ?? 0,
    published: published ?? 0,
  };
}

/** Enrichissement asynchrone après création produit (ne bloque pas la réponse HTTP). */
export function scheduleProductEnrichment(productId: number, opts?: EnrichProductOptions): void {
  setImmediate(() => {
    enrichProductById(productId, opts).catch(err => {
      logger.warn({ err, productId }, "Enrichissement auto produit échoué");
    });
  });
}
