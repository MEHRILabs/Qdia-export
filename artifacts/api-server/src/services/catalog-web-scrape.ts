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
import { verifyProductPhoto } from "./photo-vision-check";

const MIN_BYTES = 3_000;
const MAX_CANDIDATES = 8;

export const PHOTO_REVIEW_MARKER = "__qdia_photo_review__";
export const PHOTO_MISS_MARKER = "__qdia_scrape_miss__";

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
  description?: string | null,
): Promise<string[]> {
  return searchAlgerianProductImageUrls(productName, category, description);
}

async function tryDownloadAndSave(productId: number, imageUrl: string, productName?: string): Promise<string | null> {
  if (isNsfwOrBlockedImageUrl(imageUrl)) return null;

  const { base64, mime } = await fetchImageAsBase64(imageUrl);
  const raw = Buffer.from(base64, "base64");
  if (raw.byteLength < MIN_BYTES) return null;
  if (!mime.startsWith("image/")) return null;

  // Pertinence déjà filtrée à la recherche (URL + alt Bing). Ne pas re-filtrer sur l'URL seule
  // (les CDN n'ont souvent pas le nom produit dans le path → faux négatifs).
  const urlScore = scoreSafeProductCandidate(imageUrl, productName);
  if (urlScore < 4 && (await looksMostlySkinTone(raw))) {
    logger.warn({ productId, imageUrl: imageUrl.slice(0, 120) }, "image rejetée (heuristique peau)");
    return null;
  }

  const ephemeralDisk = process.env.RENDER === "true" || process.env.CATALOG_IMAGE_MODE === "remote";

  const asDataUrl = (b64: string, m = "image/jpeg") => {
    const url = `data:${m};base64,${b64.replace(/^data:image\/\w+;base64,/, "")}`;
    return url.length <= 220_000 ? url : null;
  };

  // 1) Traitement catalogue (filigrane) si possible
  try {
    const { processCatalogPhoto } = await import("./catalog-image-process");
    const processed = await processCatalogPhoto(base64, productName);
    if (processed?.base64) {
      const dataUrl = asDataUrl(processed.base64);
      if (dataUrl) {
        if (!ephemeralDisk) {
          return saveCatalogImage(`product_${productId}`, processed.base64, "jpg");
        }
        return dataUrl;
      }
    }
  } catch (err) {
    logger.warn({ err, productId }, "processCatalogPhoto échoué — fallback");
  }

  // 2) Fallback sharp compress
  try {
    const sharp = (await import("sharp")).default;
    const buf = await sharp(raw).resize(640, 640, { fit: "inside" }).jpeg({ quality: 62 }).toBuffer();
    const b64 = buf.toString("base64");
    if (!ephemeralDisk) return saveCatalogImage(`product_${productId}`, b64, "jpg");
    const dataUrl = asDataUrl(b64);
    if (dataUrl) return dataUrl;
  } catch (err) {
    logger.warn({ err, productId }, "sharp compress échoué — fallback brut");
  }

  // 3) Dernier recours : data URL brute si assez petite
  const rawData = asDataUrl(base64, mime.startsWith("image/") ? mime : "image/jpeg");
  if (rawData) return rawData;

  logger.warn({ productId, bytes: raw.byteLength }, "image trop lourde, abandon");
  return null;
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

  const candidates = await searchProductImageUrls(p.name, p.category, p.description);
  if (!candidates.length) {
    logger.warn({ productId: p.id, name: p.name }, "scrape: 0 candidats");
    await db
      .update(productsTable)
      .set({ images: [PHOTO_MISS_MARKER, String(Date.now())] })
      .where(eq(productsTable.id, p.id));
    return { ok: false, reason: "aucune_candidat" };
  }
  const savedList: string[] = [];
  let visionCalls = 0;
  let visionRejects = 0;
  const MAX_VISION_CALLS = 4;
  for (const candidate of candidates.slice(0, 6)) {
    if (savedList.length >= 3) break; // jusqu'à 3 candidats pour « Image suivante »
    if (isNsfwOrBlockedImageUrl(candidate)) continue;
    try {
      const saved = await tryDownloadAndSave(p.id, candidate, p.name);
      if (!saved) continue;
      if (isNsfwOrBlockedImageUrl(saved)) continue;
      if (savedList.includes(saved)) continue;
      // Vérification IA vision : l'image montre-t-elle bien CE produit ?
      if (saved.startsWith("data:") && visionCalls < MAX_VISION_CALLS) {
        visionCalls++;
        const check = await verifyProductPhoto(saved, p.name, p.description);
        if (check.checked && !check.match) {
          visionRejects++;
          logger.info(
            { productId: p.id, reason: check.reason?.slice(0, 80) },
            "candidat rejeté par vision IA",
          );
          continue;
        }
      }
      savedList.push(saved);
    } catch (err) {
      logger.warn({ err, productId: p.id, candidate }, "candidat image rejeté");
    }
  }

  if (!savedList.length) {
    logger.warn(
      { productId: p.id, tried: candidates.length, visionRejects },
      "scrape: aucun candidat retenu",
    );
    await db
      .update(productsTable)
      .set({ images: [PHOTO_MISS_MARKER, String(Date.now())] })
      .where(eq(productsTable.id, p.id));
    return { ok: false, reason: visionRejects > 0 ? "rejete_par_ia" : "download_echec" };
  }

  // Ne PAS publier dans imageUrl tant que l'admin n'a pas validé
  // (évite Snoopy / surf / panier BIO dans le catalogue)
  await db
    .update(productsTable)
    .set({
      imageUrl: null,
      images: [PHOTO_REVIEW_MARKER, ...savedList],
      isFeatured: false,
    })
    .where(eq(productsTable.id, p.id));
  return { ok: true, image_url: savedList[0] };
}

/**
 * Retire du catalogue les images web non fiables / NSFW.
 * Ne touche PAS aux candidatures en attente de validation admin (PHOTO_REVIEW_MARKER).
 */
export async function purgeUnsafeCatalogImages(): Promise<PurgeUnsafeResult> {
  const rows = await db
    .select({ id: productsTable.id, imageUrl: productsTable.imageUrl, images: productsTable.images })
    .from(productsTable)
    .where(
      or(
        and(
          sql`${productsTable.imageUrl} IS NOT NULL`,
          sql`trim(${productsTable.imageUrl}) <> ''`,
        ),
        sql`COALESCE(${productsTable.images}::text, '') LIKE ${"%" + PHOTO_MISS_MARKER + "%"}`,
      ),
    );

  const ids: number[] = [];
  for (const row of rows) {
    // Garder les photos en attente de validation
    if (row.images?.[0] === PHOTO_REVIEW_MARKER) continue;
    const badMain = shouldPurgeCatalogImage(row.imageUrl);
    const hasMiss = (row.images ?? []).includes(PHOTO_MISS_MARKER);
    const badGallery = (row.images ?? []).some(
      (u) => u !== PHOTO_MISS_MARKER && shouldPurgeCatalogImage(u),
    );
    if (!badMain && !badGallery && !hasMiss) continue;
    await db
      .update(productsTable)
      .set({
        imageUrl: badMain || hasMiss ? null : row.imageUrl,
        images: [],
        isFeatured: false,
      })
      .where(eq(productsTable.id, row.id));
    ids.push(row.id);
  }

  logger.info({ cleared: ids.length }, "purge images catalogue non sûres (hors pending review)");
  return { cleared: ids.length, ids: ids.slice(0, 200) };
}

/**
 * Purge agressive : data: scrapées, pending review, et images http distantes
 * (Google/Bing/paysages) — garde uniquement uploads manuels /api ou /uploads.
 */
export async function purgePublishedScrapeDataUrls(): Promise<PurgeUnsafeResult> {
  const rows = await db
    .select({ id: productsTable.id, imageUrl: productsTable.imageUrl, images: productsTable.images })
    .from(productsTable)
    .where(
      or(
        sql`${productsTable.imageUrl} LIKE 'data:%'`,
        sql`${productsTable.imageUrl} LIKE 'http%'`,
        sql`${productsTable.images}[1] = ${PHOTO_REVIEW_MARKER}`,
        sql`COALESCE(${productsTable.images}::text, '') LIKE '%http%'`,
        sql`COALESCE(${productsTable.images}::text, '') LIKE '%data:%'`,
      ),
    );

  const ids: number[] = [];
  for (const row of rows) {
    await db
      .update(productsTable)
      .set({ imageUrl: null, images: [], isFeatured: false })
      .where(eq(productsTable.id, row.id));
    ids.push(row.id);
  }
  logger.info({ cleared: ids.length }, "purge scrapes data/http publiés");
  return { cleared: ids.length, ids: ids.slice(0, 200) };
}

export function getPendingReviewImage(images?: string[] | null): string | null {
  if (!images?.length) return null;
  if (images[0] === PHOTO_REVIEW_MARKER && images[1]) return images[1];
  return null;
}

export function getPendingReviewCandidates(images?: string[] | null): string[] {
  if (!images?.length || images[0] !== PHOTO_REVIEW_MARKER) return [];
  return images.slice(1).filter(Boolean);
}

export async function listPhotoReviews(ids?: number[]) {
  const { brandPhrase } = await import("./product-image-match");
  const rows = ids?.length
    ? await db
        .select({
          id: productsTable.id,
          name: productsTable.name,
          description: productsTable.description,
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
          description: productsTable.description,
          category: productsTable.category,
          images: productsTable.images,
          imageUrl: productsTable.imageUrl,
        })
        .from(productsTable)
        .where(sql`${productsTable.images}[1] = ${PHOTO_REVIEW_MARKER}`)
        .limit(60);

  return rows
    .map((r) => {
      const candidates = getPendingReviewCandidates(r.images);
      const pending = candidates[0] ?? null;
      const url = pending ?? (hasRealProductImage(r.imageUrl) ? r.imageUrl : null);
      if (!url) return null;
      return {
        id: r.id,
        name: r.name,
        description: r.description?.slice(0, 200) ?? null,
        category: r.category,
        brand: brandPhrase(r.name),
        image_url: url.startsWith("data:") ? `/api/products/${r.id}/image?review=1` : url,
        pending: candidates.length > 0,
        candidate_count: candidates.length,
        candidate_index: 0,
      };
    })
    .filter(Boolean) as Array<{
    id: number;
    name: string;
    category: string | null;
    brand: string;
    image_url: string;
    pending: boolean;
    candidate_count: number;
    candidate_index: number;
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

/** Passe au candidat suivant sans re-scrape. Retourne null si plus de candidats. */
export async function nextPhotoReviewCandidate(productId: number): Promise<{
  ok: boolean;
  cycled: boolean;
  image_url?: string;
  candidate_count: number;
  reason?: string;
}> {
  const [p] = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  if (!p) return { ok: false, cycled: false, candidate_count: 0, reason: "introuvable" };
  const cands = getPendingReviewCandidates(p.images);
  if (cands.length <= 1) {
    return { ok: false, cycled: false, candidate_count: cands.length, reason: "plus_de_candidats" };
  }
  // Rotation : [a,b,c] → [b,c,a]
  const rotated = [...cands.slice(1), cands[0]!];
  await db
    .update(productsTable)
    .set({ images: [PHOTO_REVIEW_MARKER, ...rotated], imageUrl: null, isFeatured: false })
    .where(eq(productsTable.id, productId));
  const url = rotated[0]!;
  return {
    ok: true,
    cycled: true,
    image_url: url.startsWith("data:") ? `/api/products/${productId}/image?review=1&t=${Date.now()}` : url,
    candidate_count: rotated.length,
  };
}

/** Publie dans le catalogue toutes les photos encore « pending » (imageUrl vide). */
export async function syncPendingPhotosToCatalog(): Promise<{ synced: number }> {
  const rows = await db
    .select({ id: productsTable.id, images: productsTable.images, imageUrl: productsTable.imageUrl })
    .from(productsTable)
    .where(sql`${productsTable.images}[1] = ${PHOTO_REVIEW_MARKER}`)
    .limit(500);

  let synced = 0;
  for (const row of rows) {
    const pending = getPendingReviewImage(row.images);
    if (!pending || isNsfwOrBlockedImageUrl(pending)) continue;
    if (row.imageUrl === pending) continue;
    await db
      .update(productsTable)
      .set({ imageUrl: pending })
      .where(eq(productsTable.id, row.id));
    synced++;
  }
  logger.info({ synced }, "sync photos pending → catalogue");
  return { synced };
}

export async function rescrapeProductPhotoForReview(
  productId: number,
): Promise<{ ok: boolean; image_url?: string; reason?: string }> {
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
    // Exactement `limit` lignes candidates (pas 8×) — timeout Render ~30s
    rows = await db
      .select()
      .from(productsTable)
      .where(
        and(
          or(
            isNull(productsTable.imageUrl),
            eq(productsTable.imageUrl, ""),
            sql`${productsTable.imageUrl} LIKE '%qdia-photo-placeholder%'`,
            sql`${productsTable.imageUrl} LIKE '%.svg'`,
            sql`${productsTable.imageUrl} LIKE '/uploads/%'`,
            sql`${productsTable.imageUrl} LIKE 'http%'`,
          ),
          sql`NOT (COALESCE(${productsTable.images}::text, '') LIKE ${"%" + PHOTO_MISS_MARKER + "%"})`,
        ),
      )
      .orderBy(sql`${productsTable.id} ASC`)
      .limit(Math.max(limit * 3, limit));
  }

  for (const p of rows) {
    // Stop après N tentatives (succès OU échec) — ne pas boucler jusqu'à N succès
    if (result.processed >= limit) break;
    const mustReplace = shouldPurgeCatalogImage(p.imageUrl);
    if (!mustReplace && (!needsPhoto(p) || hasRealProductImage(p.imageUrl))) {
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
