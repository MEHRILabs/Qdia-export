/**
 * Recherche images packshot — priorité sites alimentaires algériens.
 * Filtre NSFW strict — refuse les URLs adult / hors produit.
 */
import { eq, or, isNull, sql, and } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { fetchImageAsBase64 } from "./image-scraper";
import { saveCatalogImage } from "./catalog-image-store";
import { hasRealProductImage, needsPhoto } from "./product-enrichment";
import {
  isNsfwOrBlockedImageUrl,
  scoreSafeProductCandidate,
  shouldPurgeCatalogImage,
} from "./catalog-image-safety";
import { searchAlgerianProductImageUrls } from "./algeria-product-images";

const MIN_BYTES = 8_000;
const MAX_CANDIDATES = 8;

export interface ScrapePhotosResult {
  processed: number;
  ok: number;
  skipped: number;
  errors: string[];
  ids_ok?: number[];
}

export interface PurgeUnsafeResult {
  cleared: number;
  ids: number[];
}

/** @deprecated conservé pour tests — préférer searchProductImageUrls */
export function extractBingImageUrls(html: string, productName = ""): string[] {
  const urls = new Set<string>();
  const murlRe = /murl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/gi;
  const jsonRe = /"murl"\s*:\s*"(https?:\/\/[^"]+)"/gi;
  for (const re of [murlRe, jsonRe]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      try {
        const url = decodeURIComponent(m[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/"));
        if (!/^https?:\/\//i.test(url)) continue;
        if (isNsfwOrBlockedImageUrl(url)) continue;
        urls.add(url);
      } catch {
        /* ignore */
      }
    }
  }
  return [...urls]
    .map((url) => ({ url, score: scoreSafeProductCandidate(url, productName) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATES)
    .map((x) => x.url);
}

export async function searchProductImageUrls(
  productName: string,
  category?: string | null,
): Promise<string[]> {
  return searchAlgerianProductImageUrls(productName, category);
}

async function tryDownloadAndSave(productId: number, imageUrl: string, productName?: string): Promise<string | null> {
  if (isNsfwOrBlockedImageUrl(imageUrl)) return null;

  const { base64, mime } = await fetchImageAsBase64(imageUrl);
  const raw = Buffer.from(base64, "base64");
  if (raw.byteLength < MIN_BYTES) return null;
  if (!mime.startsWith("image/")) return null;

  // Heuristique peau OU image non liée au nom → refuse
  const urlScore = scoreSafeProductCandidate(imageUrl, productName);
  if (urlScore < 4 && (await looksMostlySkinTone(raw))) {
    logger.warn({ productId, imageUrl: imageUrl.slice(0, 120) }, "image rejetée (heuristique peau)");
    return null;
  }

  const { isRelevantProductImage } = await import("./product-image-match");
  // data: URLs n'ont pas le nom — on a déjà filtré à la sélection; OK
  if (!imageUrl.startsWith("data:") && productName && !isRelevantProductImage(imageUrl, productName)) {
    logger.warn({ productId, imageUrl: imageUrl.slice(0, 120) }, "image rejetée (hors sujet nom)");
    return null;
  }

  // Render : on n'enregistre PAS l'URL source externe (risque NSFW / disparition).
  // On stocke en data-URL courte via proxy, ou on refuse si trop lourd → placeholder null.
  const ephemeralDisk = process.env.RENDER === "true" || process.env.CATALOG_IMAGE_MODE === "remote";
  if (ephemeralDisk) {
    // Compresser via sharp si dispo, sinon data URL limitée
    try {
      const { processCatalogPhoto } = await import("./catalog-image-process");
      const processed = await processCatalogPhoto(base64, productName);
      if (!processed?.base64) return null;
      const dataUrl = `data:image/jpeg;base64,${processed.base64}`;
      // Trop gros pour la DB → refuser (évite OOM) — l'admin pourra re-scraper plus tard
      if (dataUrl.length > 180_000) {
        logger.warn({ productId, len: dataUrl.length }, "image trop lourde après process, skip");
        return null;
      }
      return dataUrl;
    } catch (err) {
      logger.warn({ err, productId }, "process image Render échoué");
      return null;
    }
  }

  const { processCatalogPhoto } = await import("./catalog-image-process");
  const processed = await processCatalogPhoto(base64, productName);
  const outB64 = processed?.base64 ?? base64.replace(/^data:image\/\w+;base64,/, "");
  return saveCatalogImage(`product_${productId}`, outB64, "jpg");
}

/** Détection grossière NSFW via proportion de pixels « peau ». */
async function looksMostlySkinTone(buf: Buffer): Promise<boolean> {
  try {
    const sharp = (await import("sharp")).default;
    const { data, info } = await sharp(buf)
      .resize(64, 64, { fit: "inside" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const pixels = info.width * info.height;
    if (pixels < 16) return false;
    let skin = 0;
    for (let i = 0; i < data.length; i += 3) {
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      // Plages peau courantes (approximation)
      const isSkin =
        r > 95 && g > 40 && b > 20 &&
        r > g && r > b &&
        Math.abs(r - g) > 15 &&
        r - b > 15;
      if (isSkin) skin++;
    }
    return skin / pixels > 0.55;
  } catch {
    return false;
  }
}

export async function scrapeOneProductPhoto(
  productId: number,
): Promise<{ ok: boolean; image_url?: string; reason?: string }> {
  const [p] = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  if (!p) return { ok: false, reason: "introuvable" };

  // Purge si déjà une image dangereuse / non fiable
  if (shouldPurgeCatalogImage(p.imageUrl)) {
    await db
      .update(productsTable)
      .set({ imageUrl: null, images: [], isFeatured: false })
      .where(eq(productsTable.id, p.id));
  } else if (hasRealProductImage(p.imageUrl) && !needsPhoto(p)) {
    return { ok: true, image_url: p.imageUrl ?? undefined, reason: "deja_ok" };
  }

  const candidates = await searchProductImageUrls(p.name, p.category);
  for (const candidate of candidates) {
    if (isNsfwOrBlockedImageUrl(candidate)) continue;
    try {
      const saved = await tryDownloadAndSave(p.id, candidate, p.name);
      if (!saved) continue;
      if (isNsfwOrBlockedImageUrl(saved)) continue;
      // En attente de validation admin — pas visible dans le catalogue public
      await db
        .update(productsTable)
        .set({
          imageUrl: null,
          images: ["__qdia_photo_review__", saved],
          isFeatured: false,
        })
        .where(eq(productsTable.id, p.id));
      return { ok: true, image_url: saved };
    } catch (err) {
      logger.warn({ err, productId: p.id, candidate }, "candidat image rejeté");
    }
  }
  return { ok: false, reason: "aucune_image" };
}

/**
 * Retire du catalogue toutes les images web non fiables / NSFW
 * (URLs https scrapées Bing, domaines adult, etc.).
 */
export async function purgeUnsafeCatalogImages(): Promise<PurgeUnsafeResult> {
  const rows = await db
    .select({ id: productsTable.id, imageUrl: productsTable.imageUrl, images: productsTable.images })
    .from(productsTable)
    .where(
      and(
        sql`${productsTable.imageUrl} IS NOT NULL`,
        sql`trim(${productsTable.imageUrl}) <> ''`,
      ),
    );

  const ids: number[] = [];
  for (const row of rows) {
    const badMain = shouldPurgeCatalogImage(row.imageUrl);
    const badGallery = (row.images ?? []).some((u) => shouldPurgeCatalogImage(u));
    if (!badMain && !badGallery) continue;
    await db
      .update(productsTable)
      .set({ imageUrl: null, images: [], isFeatured: false })
      .where(eq(productsTable.id, row.id));
    ids.push(row.id);
  }

  logger.info({ cleared: ids.length }, "purge images catalogue non sûres");
  return { cleared: ids.length, ids: ids.slice(0, 200) };
}

export const PHOTO_REVIEW_MARKER = "__qdia_photo_review__";

export function getPendingReviewImage(images?: string[] | null): string | null {
  if (!images?.length) return null;
  if (images[0] === PHOTO_REVIEW_MARKER && images[1]) return images[1];
  return null;
}

export async function listPhotoReviews(ids?: number[]) {
  const rows = ids?.length
    ? await db
        .select({
          id: productsTable.id,
          name: productsTable.name,
          category: productsTable.category,
          images: productsTable.images,
          imageUrl: productsTable.imageUrl,
        })
        .from(productsTable)
        .where(sql`${productsTable.id} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`)
    : await db
        .select({
          id: productsTable.id,
          name: productsTable.name,
          category: productsTable.category,
          images: productsTable.images,
          imageUrl: productsTable.imageUrl,
        })
        .from(productsTable)
        .where(sql`${productsTable.images}[1] = ${PHOTO_REVIEW_MARKER}`)
        .limit(60);

  return rows
    .map((r) => {
      const pending = getPendingReviewImage(r.images);
      const url = pending ?? (hasRealProductImage(r.imageUrl) ? r.imageUrl : null);
      if (!url) return null;
      return {
        id: r.id,
        name: r.name,
        category: r.category,
        image_url: url.startsWith("data:") ? `/api/products/${r.id}/image?review=1` : url,
        pending: Boolean(pending),
      };
    })
    .filter(Boolean) as Array<{
    id: number;
    name: string;
    category: string | null;
    image_url: string;
    pending: boolean;
  }>;
}

export async function approvePhotoReviews(ids: number[]): Promise<{ approved: number }> {
  let approved = 0;
  for (const id of ids) {
    const [p] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!p) continue;
    const pending = getPendingReviewImage(p.images);
    if (!pending || isNsfwOrBlockedImageUrl(pending)) continue;
    await db
      .update(productsTable)
      .set({ imageUrl: pending, images: [pending], isFeatured: false })
      .where(eq(productsTable.id, id));
    approved++;
  }
  return { approved };
}

export async function rejectPhotoReviews(ids: number[]): Promise<{ rejected: number }> {
  let rejected = 0;
  for (const id of ids) {
    await db
      .update(productsTable)
      .set({ imageUrl: null, images: [], isFeatured: false })
      .where(eq(productsTable.id, id));
    rejected++;
  }
  return { rejected };
}

export async function rescrapeProductPhotoForReview(
  productId: number,
): Promise<{ ok: boolean; image_url?: string; reason?: string }> {
  // Force re-scrape même si pending
  await db
    .update(productsTable)
    .set({ imageUrl: null, images: [], isFeatured: false })
    .where(eq(productsTable.id, productId));
  return scrapeOneProductPhoto(productId);
}

export async function scrapeCatalogPhotosBatch(
  limit = 50,
  opts: { productIds?: number[] } = {},
): Promise<ScrapePhotosResult> {
  const result: ScrapePhotosResult = { processed: 0, ok: 0, skipped: 0, errors: [], ids_ok: [] };

  let rows;
  if (opts.productIds?.length) {
    rows = await db
      .select()
      .from(productsTable)
      .where(sql`${productsTable.id} IN (${sql.join(opts.productIds.map((id) => sql`${id}`), sql`, `)})`);
  } else {
    rows = await db
      .select()
      .from(productsTable)
      .where(
        or(
          isNull(productsTable.imageUrl),
          eq(productsTable.imageUrl, ""),
          sql`${productsTable.imageUrl} LIKE '%qdia-photo-placeholder%'`,
          sql`${productsTable.imageUrl} LIKE '%.svg'`,
        ),
      )
      .limit(limit);
  }

  for (const p of rows) {
    if (result.ok >= limit) break;
    if (!needsPhoto(p) || (hasRealProductImage(p.imageUrl) && !shouldPurgeCatalogImage(p.imageUrl))) {
      result.skipped++;
      continue;
    }

    result.processed++;
    try {
      const one = await scrapeOneProductPhoto(p.id);
      if (one.ok && one.reason !== "deja_ok") {
        result.ok++;
        result.ids_ok!.push(p.id);
      } else if (one.ok) {
        result.skipped++;
      } else {
        result.errors.push(`${p.id}: ${one.reason ?? "echec"}`);
      }
    } catch (e) {
      result.errors.push(`${p.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return result;
}
