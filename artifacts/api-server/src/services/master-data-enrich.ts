import { eq } from "drizzle-orm";
import { db, catalogVariantsTable, type CatalogVariant } from "@workspace/db";
import { aiCompleteTextJson, aiGenerateProductImage } from "./ai/engine";
import { hasProviderKey, getProvider } from "./ai/config";
import { saveCatalogImage, saveCatalogPlaceholder } from "./catalog-image-store";
import { logger } from "../lib/logger";

export interface EnrichOptions {
  limit?: number;
  generatePhotos?: boolean;
}

export interface EnrichResult {
  enriched: number;
  skipped: number;
  photos_generated: number;
  errors: string[];
}

function buildPhotoPrompt(v: CatalogVariant): string {
  const parts = [
    "Professional e-commerce product photography for B2B export catalog.",
    `Product: "${v.name}"`,
    v.brandName ? `Brand: ${v.brandName}` : null,
    `Category: ${v.categoryName}${v.subcategory ? ` / ${v.subcategory}` : ""}`,
    v.description ? `Details: ${v.description.slice(0, 200)}` : null,
    "Algerian consumer product, studio lighting, clean white neutral background,",
    "commercial packshot, sharp focus, realistic packaging, high quality,",
    "no text overlay, no watermark, no people, single product centered.",
  ].filter(Boolean);
  return parts.join(" ");
}

function needsPricing(v: CatalogVariant): boolean {
  return !v.priceFobUsd || !v.moq || !v.hsCode;
}

function needsPhoto(v: CatalogVariant): boolean {
  return !v.imageUrl?.trim();
}

async function enrichPricing(v: CatalogVariant): Promise<Partial<CatalogVariant>> {
  const prompt = `Produit export algérien B2B.
Nom: ${v.name}
Marque: ${v.brandName ?? "—"}
Catégorie: ${v.categoryName}${v.subcategory ? ` / ${v.subcategory}` : ""}
Prix détail DZD: ${v.priceRetailDzd ?? "—"}
EAN: ${v.ean ?? "—"}

Réponds UNIQUEMENT en JSON:
{
  "price_fob_usd": number,
  "moq": number,
  "moq_unit": "kg|L|unité|carton",
  "hs_code": "code indicatif 6-10 chiffres",
  "description_export": "texte court FR pour acheteur étranger",
  "notes": "avertissements export si subvention probable"
}`;

  if (!hasProviderKey(getProvider("benchmark"))) {
    const retail = v.priceRetailDzd ?? 500;
    const fob = Math.round((retail / 220) * 0.65 * 100) / 100;
    return {
      priceFobUsd: v.priceFobUsd ?? fob,
      moq: v.moq ?? 100,
      moqUnit: v.moqUnit ?? "unité",
      hsCode: v.hsCode ?? "000000",
      description: v.description ?? v.name,
      aiNotes: "Estimation locale (IA non configurée)",
    };
  }

  const { data: raw } = await aiCompleteTextJson(
    "Tu es expert export produits algériens B2B. Réponds uniquement en JSON valide.",
    prompt,
  );
  const data = JSON.parse(raw) as {
    price_fob_usd?: number;
    moq?: number;
    moq_unit?: string;
    hs_code?: string;
    description_export?: string;
    notes?: string;
  };

  return {
    priceFobUsd: v.priceFobUsd ?? data.price_fob_usd,
    moq: v.moq ?? data.moq,
    moqUnit: v.moqUnit ?? data.moq_unit,
    hsCode: v.hsCode ?? data.hs_code,
    description: data.description_export ?? v.description,
    aiNotes: data.notes,
  };
}

async function generateAndStorePhoto(v: CatalogVariant): Promise<{ imageUrl: string; note?: string }> {
  const prompt = buildPhotoPrompt(v);

  if (hasProviderKey(getProvider("image"))) {
    try {
      const { imageBase64, provider } = await aiGenerateProductImage(prompt);
      const imageUrl = await saveCatalogImage(v.masterId, imageBase64, "jpg");
      return { imageUrl, note: `Photo IA (${provider})` };
    } catch (err) {
      logger.warn({ err, masterId: v.masterId }, "Génération photo IA échouée — placeholder");
    }
  }

  const imageUrl = await saveCatalogPlaceholder(v.masterId, v.name);
  return { imageUrl, note: "Placeholder (clé IA image absente)" };
}

async function enrichOneVariant(v: CatalogVariant, opts: EnrichOptions): Promise<{ ok: boolean; photo?: boolean }> {
  const updates: Record<string, unknown> = { updatedAt: new Date() };
  let changed = false;
  let photoGenerated = false;

  if (needsPricing(v)) {
    const pricing = await enrichPricing(v);
    Object.assign(updates, pricing);
    changed = true;
  }

  if (opts.generatePhotos !== false && needsPhoto(v)) {
    const { imageUrl, note } = await generateAndStorePhoto(v);
    updates.imageUrl = imageUrl;
    if (note) {
      updates.aiNotes = [v.aiNotes, note].filter(Boolean).join(" · ");
    }
    changed = true;
    photoGenerated = true;
  }

  if (!changed) return { ok: false };

  updates.aiEnrichedAt = new Date();
  await db.update(catalogVariantsTable).set(updates).where(eq(catalogVariantsTable.id, v.id));
  return { ok: true, photo: photoGenerated };
}

export async function enrichCatalogBatch(limit = 20, opts: EnrichOptions = {}): Promise<EnrichResult> {
  const result: EnrichResult = { enriched: 0, skipped: 0, photos_generated: 0, errors: [] };
  const generatePhotos = opts.generatePhotos !== false;

  const rows = await db.select().from(catalogVariantsTable)
    .where(eq(catalogVariantsTable.exportStatus, "a_valider"))
    .limit(limit * 5);

  for (const v of rows) {
    if (result.enriched >= limit) break;

    const pricingMissing = needsPricing(v);
    const photoMissing = generatePhotos && needsPhoto(v);
    if (!pricingMissing && !photoMissing) {
      result.skipped++;
      continue;
    }

    try {
      const { ok, photo } = await enrichOneVariant(v, { ...opts, generatePhotos });
      if (ok) {
        result.enriched++;
        if (photo) result.photos_generated++;
      } else {
        result.skipped++;
      }
    } catch (e) {
      result.errors.push(`${v.masterId}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return result;
}
