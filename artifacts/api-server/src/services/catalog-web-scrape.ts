/**
 * Recherche web d'images packshot (Bing) + enregistrement catalogue.
 * Utilisé par le bouton admin « Scraper photos » (pas besoin de Python/CLI).
 */
import { eq, or, isNull, sql } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { fetchImageAsBase64 } from "./image-scraper";
import { saveCatalogImage } from "./catalog-image-store";
import { hasRealProductImage, needsPhoto } from "./product-enrichment";
import { promoteProductToFeatured } from "./featured-products";

const SEARCH_TIMEOUT_MS = 15_000;
const MIN_BYTES = 8_000;
const MAX_CANDIDATES = 8;

export interface ScrapePhotosResult {
  processed: number;
  ok: number;
  skipped: number;
  errors: string[];
  ids_ok?: number[];
}

function scoreCandidate(url: string): number {
  const u = url.toLowerCase();
  let s = 0;
  if (/\.(jpe?g|png|webp)(\?|$)/i.test(u)) s += 3;
  if (/product|pack|catalog|produit|epice|huile|datte/.test(u)) s += 2;
  if (/logo|icon|avatar|sprite|favicon|1x1|pixel|banner/.test(u)) s -= 6;
  if (/bing\.com\/th|thumbnail/.test(u)) s -= 1;
  return s;
}

/** Extrait des URLs d'images depuis la réponse async Bing Images. */
export function extractBingImageUrls(html: string): string[] {
  const urls = new Set<string>();
  const murlRe = /murl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/gi;
  const jsonRe = /"murl"\s*:\s*"(https?:\/\/[^"]+)"/gi;
  for (const re of [murlRe, jsonRe]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(html)) !== null) {
      try {
        const url = decodeURIComponent(m[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/"));
        if (/^https?:\/\//i.test(url)) urls.add(url);
      } catch {
        /* ignore */
      }
    }
  }
  return [...urls].sort((a, b) => scoreCandidate(b) - scoreCandidate(a)).slice(0, MAX_CANDIDATES);
}

export async function searchProductImageUrls(productName: string): Promise<string[]> {
  const q = `${productName} product packshot`;
  const url = `https://www.bing.com/images/async?q=${encodeURIComponent(q)}&async=1&first=1&count=35`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!resp.ok) throw new Error(`Bing HTTP ${resp.status}`);
    const html = await resp.text();
    return extractBingImageUrls(html);
  } finally {
    clearTimeout(timer);
  }
}

async function tryDownloadAndSave(productId: number, imageUrl: string): Promise<string | null> {
  const { base64, mime } = await fetchImageAsBase64(imageUrl);
  const raw = Buffer.from(base64, "base64");
  if (raw.byteLength < MIN_BYTES) return null;
  if (!mime.startsWith("image/")) return null;

  // Sur Render le disque est éphémère : on garde l'URL https source (durable).
  const ephemeralDisk = process.env.RENDER === "true" || process.env.CATALOG_IMAGE_MODE === "remote";
  if (ephemeralDisk) {
    return imageUrl;
  }

  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  return saveCatalogImage(`product_${productId}`, base64, ext);
}

export async function scrapeOneProductPhoto(
  productId: number,
): Promise<{ ok: boolean; image_url?: string; reason?: string }> {
  const [p] = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  if (!p) return { ok: false, reason: "introuvable" };
  if (hasRealProductImage(p.imageUrl) && !needsPhoto(p)) {
    return { ok: true, image_url: p.imageUrl ?? undefined, reason: "deja_ok" };
  }

  const candidates = await searchProductImageUrls(p.name);
  for (const candidate of candidates) {
    try {
      const saved = await tryDownloadAndSave(p.id, candidate);
      if (!saved) continue;
      await db
        .update(productsTable)
        .set({ imageUrl: saved, images: [saved] })
        .where(eq(productsTable.id, p.id));
      void promoteProductToFeatured(p.id);
      return { ok: true, image_url: saved };
    } catch (err) {
      logger.warn({ err, productId: p.id, candidate }, "candidat image rejeté");
    }
  }
  return { ok: false, reason: "aucune_image" };
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
    if (!needsPhoto(p) || hasRealProductImage(p.imageUrl)) {
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
