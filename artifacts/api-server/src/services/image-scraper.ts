import { logger } from "../lib/logger";

const MAX_IMAGES_PER_PAGE = 24;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 12_000;

export interface ScrapedImage {
  url: string;
  source_page?: string;
  alt?: string;
  width_hint?: number;
  height_hint?: number;
}

function isAllowedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function resolveUrl(src: string, base: string): string | null {
  try {
    if (src.startsWith("data:")) return null;
    const resolved = new URL(src, base).href;
    return isAllowedUrl(resolved) ? resolved : null;
  } catch {
    return null;
  }
}

function scoreImageUrl(url: string, alt = ""): number {
  const lower = `${url} ${alt}`.toLowerCase();
  let score = 0;
  if (/product|produit|item|catalog|thumb|gallery|pack|export/.test(lower)) score += 3;
  if (/\.(jpg|jpeg|png|webp)(\?|$)/i.test(url)) score += 2;
  if (/logo|icon|avatar|banner|sprite|pixel|1x1|favicon/.test(lower)) score -= 5;
  if (url.includes("150x") || url.includes("50x")) score -= 2;
  return score;
}

export function extractImageUrlsFromHtml(html: string, pageUrl: string): ScrapedImage[] {
  const found = new Map<string, ScrapedImage>();

  const imgTagRe = /<img[^>]+>/gi;
  const srcRe = /\bsrc=["']([^"']+)["']/i;
  const dataSrcRe = /\bdata-src=["']([^"']+)["']/i;
  const altRe = /\balt=["']([^"']*)["']/i;

  for (const tag of html.match(imgTagRe) ?? []) {
    const src = tag.match(srcRe)?.[1] ?? tag.match(dataSrcRe)?.[1];
    if (!src) continue;
    const url = resolveUrl(src, pageUrl);
    if (!url) continue;
    const alt = tag.match(altRe)?.[1];
    const existing = found.get(url);
    if (!existing || scoreImageUrl(url, alt) > scoreImageUrl(url, existing.alt)) {
      found.set(url, { url, source_page: pageUrl, alt });
    }
  }

  const ogRe = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i;
  const og = html.match(ogRe)?.[1];
  if (og) {
    const url = resolveUrl(og, pageUrl);
    if (url) found.set(url, { url, source_page: pageUrl, alt: "og:image" });
  }

  return [...found.values()]
    .sort((a, b) => scoreImageUrl(b.url, b.alt) - scoreImageUrl(a.url, a.alt))
    .slice(0, MAX_IMAGES_PER_PAGE);
}

export async function fetchPageHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "QDIA-Export-Bot/1.0 (+https://qdiadz.com; bulk-import)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    return await resp.text();
  } finally {
    clearTimeout(timer);
  }
}

export async function scrapeImagesFromPage(pageUrl: string): Promise<ScrapedImage[]> {
  if (!isAllowedUrl(pageUrl)) throw new Error(`URL non autorisée: ${pageUrl}`);
  const html = await fetchPageHtml(pageUrl);
  return extractImageUrlsFromHtml(html, pageUrl);
}

export async function scrapeImagesFromPages(pageUrls: string[]): Promise<ScrapedImage[]> {
  const all: ScrapedImage[] = [];
  const seen = new Set<string>();

  for (const pageUrl of pageUrls.slice(0, 10)) {
    try {
      const images = await scrapeImagesFromPage(pageUrl);
      for (const img of images) {
        if (!seen.has(img.url)) {
          seen.add(img.url);
          all.push(img);
        }
      }
    } catch (err) {
      logger.warn({ err, pageUrl }, "scrape page failed");
    }
  }

  return all;
}

export async function fetchImageAsBase64(imageUrl: string): Promise<{ base64: string; mime: string }> {
  if (!isAllowedUrl(imageUrl)) throw new Error(`URL image non autorisée`);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const resp = await fetch(imageUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
        Referer: "https://www.bing.com/",
      },
      redirect: "follow",
    });
    if (!resp.ok) throw new Error(`Image HTTP ${resp.status}`);

    const buf = Buffer.from(await resp.arrayBuffer());
    if (buf.byteLength > MAX_IMAGE_BYTES) {
      throw new Error(`Image trop volumineuse (max ${MAX_IMAGE_BYTES / 1024 / 1024} Mo)`);
    }

    const mime = resp.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
    // Certains CDN renvoient application/octet-stream
    if (!mime.startsWith("image/") && mime !== "application/octet-stream") {
      throw new Error("Le fichier n'est pas une image");
    }

    return { base64: buf.toString("base64"), mime: mime.startsWith("image/") ? mime : "image/jpeg" };
  } finally {
    clearTimeout(timer);
  }
}

export function toDataUrl(base64: string, mime = "image/jpeg"): string {
  return `data:${mime};base64,${base64}`;
}
