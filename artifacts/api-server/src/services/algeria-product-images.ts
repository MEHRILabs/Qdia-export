/**
 * Recherche images produit — rapide (Bing only) pour tenir dans le timeout Render.
 */
import { logger } from "../lib/logger";
import { isNsfwOrBlockedImageUrl } from "./catalog-image-safety";
import {
  isRelevantProductImage,
  scoreNameMatch,
  significantProductTokens,
  extractBrandTokens,
  extractProductTypeTokens,
  hasBrandMatch,
} from "./product-image-match";

const SEARCH_TIMEOUT_MS = 8_000;
const MAX_CANDIDATES = 6;

function buildQuery(productName: string): { brand: string; q: string } {
  const brandTok = extractBrandTokens(productName);
  const typeTok = extractProductTypeTokens(productName, brandTok);
  const brand = brandTok.join(" ") || significantProductTokens(productName)[0] || productName.slice(0, 40);
  const typeWords = typeTok.slice(0, 2).join(" ");
  const q = [brand, typeWords].filter(Boolean).join(" ").slice(0, 70);
  return { brand, q };
}

async function fetchHtml(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      },
    });
    if (!resp.ok) return null;
    return await resp.text();
  } catch (err) {
    logger.warn({ err, url: url.slice(0, 120) }, "fetch search failed");
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function extractBingMurls(html: string): Array<{ url: string; alt: string }> {
  const titles: string[] = [];
  const titleRe = /t&quot;:&quot;([^&]+?)&quot;/gi;
  let tm: RegExpExecArray | null;
  while ((tm = titleRe.exec(html)) !== null) {
    try {
      titles.push(decodeURIComponent(tm[1].replace(/\\u0026/g, "&")));
    } catch {
      titles.push(tm[1]);
    }
  }
  const out: Array<{ url: string; alt: string }> = [];
  const seen = new Set<string>();
  const push = (raw: string, alt: string) => {
    try {
      const u = decodeURIComponent(raw.replace(/\\u0026/g, "&").replace(/\\\//g, "/"));
      if (!/^https?:\/\//i.test(u) || isNsfwOrBlockedImageUrl(u) || seen.has(u)) return;
      seen.add(u);
      out.push({ url: u, alt });
    } catch {
      /* ignore */
    }
  };

  // Images source (murl) — priorité
  const murlRe = /murl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/gi;
  let idx = 0;
  let m: RegExpExecArray | null;
  while ((m = murlRe.exec(html)) !== null) {
    push(m[1], titles[idx] ?? "");
    idx++;
  }

  // Miniatures Bing CDN — fiables à télécharger si hotlink murl échoue
  const turlRe = /turl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/gi;
  let tIdx = 0;
  while ((m = turlRe.exec(html)) !== null) {
    push(m[1], titles[tIdx] ?? "");
    tIdx++;
  }

  return out;
}

function rank(
  items: Array<{ url: string; alt: string }>,
  productName: string,
): string[] {
  const seen = new Set<string>();
  const brand = extractBrandTokens(productName);
  const scored = items
    .map((img) => {
      const blob = `${img.url} ${img.alt}`;
      let s = isRelevantProductImage(img.url, productName, img.alt)
        ? scoreNameMatch(img.url, productName, img.alt)
        : -1;
      // Assouplir : marque seule dans alt/url = candidat faible mais utilisable
      if (s < 0 && brand.length && hasBrandMatch(blob, brand)) {
        s = 2;
      }
      return { u: img.url, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);

  return scored
    .map((x) => x.u)
    .filter((u) => {
      if (seen.has(u)) return false;
      seen.add(u);
      return true;
    })
    .slice(0, MAX_CANDIDATES);
}

/**
 * 1 requête Bing max — priorise pertinence, sinon top images SafeSearch (validation admin ensuite).
 */
export async function searchAlgerianProductImageUrls(
  productName: string,
  _category?: string | null,
): Promise<string[]> {
  const { brand, q } = buildQuery(productName);
  if (!q.trim()) return [];

  const query = q || brand;
  const url =
    `https://www.bing.com/images/async?q=${encodeURIComponent(query)}` +
    `&async=1&first=1&count=35&adlt=strict&safesearch=strict`;
  const html = await fetchHtml(url);
  if (!html) {
    logger.warn({ productName: productName.slice(0, 60) }, "bing fetch vide");
    return [];
  }

  const items = extractBingMurls(html);
  const ranked = rank(items, productName);
  if (ranked.length) {
    logger.info({ productName: productName.slice(0, 40), n: ranked.length, brand }, "bing images ok");
    return ranked;
  }

  // Fallback : images SafeSearch sans filtre marque (mieux qu’un échec total)
  const safe = items
    .filter((i) => !isNsfwOrBlockedImageUrl(i.url))
    .map((i) => i.url)
    .filter((u, i, arr) => arr.indexOf(u) === i)
    .slice(0, MAX_CANDIDATES);
  if (safe.length) {
    logger.info({ productName: productName.slice(0, 40), n: safe.length, brand }, "bing fallback safe");
    return safe;
  }

  logger.warn({ productName: productName.slice(0, 60), brand }, "aucune image candidate");
  return [];
}

/** Conservé pour imports éventuels */
export const ALGERIA_FOOD_SITES = [] as const;
