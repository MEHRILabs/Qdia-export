/**
 * Recherche web d'images packshot (Bing) + enregistrement catalogue.
 * Utilisé par le bouton admin « Scraper photos » (pas besoin de Python/CLI).
 */
import { eq } from "drizzle-orm";
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
  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  return saveCatalogImage(`product_${productId}`, base64, ext);
}

export async function scrapeCatalogPhotosBatch(limit = 50): Promise<ScrapePhotosResult> {
  const result: ScrapePhotosResult = { processed: 0, ok: 0, skipped: 0, errors: [] };
  const rows = await db.select().from(productsTable).limit(Math.max(limit * 8, 200));

  for (const p of rows) {
    if (result.ok >= limit) break;
    if (!needsPhoto(p) || hasRealProductImage(p.imageUrl)) {
      result.skipped++;
      continue;
    }

    result.processed++;
    try {
      const candidates = await searchProductImageUrls(p.name);
      let saved: string | null = null;
      for (const candidate of candidates) {
        try {
          saved = await tryDownloadAndSave(p.id, candidate);
          if (saved) break;
        } catch (err) {
          logger.warn({ err, productId: p.id, candidate }, "candidat image rejeté");
        }
      }

      if (!saved) {
        result.errors.push(`${p.id}: aucune image`);
        continue;
      }

      await db
        .update(productsTable)
        .set({ imageUrl: saved, images: [saved] })
        .where(eq(productsTable.id, p.id));
      void promoteProductToFeatured(p.id);
      result.ok++;
      logger.info({ productId: p.id, saved }, "photo scrapée");
    } catch (e) {
      result.errors.push(`${p.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return result;
}
