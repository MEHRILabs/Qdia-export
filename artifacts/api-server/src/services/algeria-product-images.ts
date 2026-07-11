/**
 * Sources images produits : sites algériens alimentation / e-commerce local.
 */
import { logger } from "../lib/logger";
import { extractImageUrlsFromHtml } from "./image-scraper";
import {
  isNsfwOrBlockedImageUrl,
  scoreSafeProductCandidate,
} from "./catalog-image-safety";

const SEARCH_TIMEOUT_MS = 12_000;
const MAX_CANDIDATES = 10;

/** Domaines e-commerce / alimentaire algériens (priorité haute). */
export const ALGERIA_FOOD_SITES = [
  {
    host: "aliments.tidjaria.com",
    search: (q: string) =>
      `https://aliments.tidjaria.com/recherche?controller=search&s=${encodeURIComponent(q)}`,
  },
  {
    host: "www.tidjaria.com",
    search: (q: string) =>
      `https://www.tidjaria.com/recherche?controller=search&s=${encodeURIComponent(q)}`,
  },
  {
    host: "elwajed.com",
    search: (q: string) =>
      `https://elwajed.com/?s=${encodeURIComponent(q)}&post_type=product`,
  },
  {
    host: "www.batolis.com",
    search: (q: string) =>
      `https://www.batolis.com/catalogsearch/result/?q=${encodeURIComponent(q)}`,
  },
] as const;

const ALGERIA_HOST_BOOST =
  /tidjaria|elwajed|batolis|yassir|cevital|soummam|candia|sim|hamoud|bimo|trio|ifri|ghardaia|dz|alger/i;

function simplifyQuery(productName: string): string {
  return productName
    .replace(/\b\d+\s*(g|kg|ml|l|cl|pcs?|pièces?)\b/gi, " ")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

function scoreDzCandidate(url: string, productName: string, alt = ""): number {
  let s = scoreSafeProductCandidate(url, productName);
  if (isNsfwOrBlockedImageUrl(url)) return -100;
  const blob = `${url} ${alt}`.toLowerCase();
  if (ALGERIA_HOST_BOOST.test(blob)) s += 8;
  if (/tidjaria|elwajed|batolis/.test(blob)) s += 6;
  if (/product|produit|catalog|woocommerce|media/.test(blob)) s += 2;
  return s;
}

async function fetchBingSiteImages(query: string, productName: string): Promise<string[]> {
  const url =
    `https://www.bing.com/images/async?q=${encodeURIComponent(query)}` +
    `&async=1&first=1&count=30&adlt=strict&safesearch=strict`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "fr-DZ,fr;q=0.9,ar;q=0.8",
      },
    });
    if (!resp.ok) return [];
    const html = await resp.text();
    const urls = new Set<string>();
    const murlRe = /murl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/gi;
    const jsonRe = /"murl"\s*:\s*"(https?:\/\/[^"]+)"/gi;
    for (const re of [murlRe, jsonRe]) {
      let m: RegExpExecArray | null;
      while ((m = re.exec(html)) !== null) {
        try {
          const u = decodeURIComponent(m[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/"));
          if (/^https?:\/\//i.test(u) && !isNsfwOrBlockedImageUrl(u)) urls.add(u);
        } catch {
          /* ignore */
        }
      }
    }
    return [...urls]
      .map((u) => ({ u, s: scoreDzCandidate(u, productName) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.u);
  } catch (err) {
    logger.warn({ err, query }, "bing site search failed");
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function scrapeSearchPageImages(pageUrl: string, productName: string): Promise<string[]> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
    let html: string;
    try {
      const resp = await fetch(pageUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "fr-DZ,fr;q=0.9,ar;q=0.8",
        },
      });
      if (!resp.ok) return [];
      html = await resp.text();
    } finally {
      clearTimeout(timer);
    }
    const imgs = extractImageUrlsFromHtml(html, pageUrl);
    return imgs
      .map((img) => ({ u: img.url, s: scoreDzCandidate(img.url, productName, img.alt ?? "") }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.u);
  } catch (err) {
    logger.warn({ err, pageUrl }, "scrape page DZ failed");
    return [];
  }
}

/**
 * Cherche des images packshot sur sites alimentaires algériens,
 * puis Bing restreint aux mêmes domaines, puis fallback Algérie agroalimentaire.
 */
export async function searchAlgerianProductImageUrls(
  productName: string,
  category?: string | null,
): Promise<string[]> {
  const q = simplifyQuery(productName);
  if (!q) return [];
  const found = new Set<string>();
  const ordered: string[] = [];

  const push = (urls: string[]) => {
    for (const u of urls) {
      if (found.has(u) || isNsfwOrBlockedImageUrl(u)) continue;
      found.add(u);
      ordered.push(u);
      if (ordered.length >= MAX_CANDIDATES) return true;
    }
    return false;
  };

  // 1) Pages recherche des sites DZ
  for (const site of ALGERIA_FOOD_SITES) {
    const urls = await scrapeSearchPageImages(site.search(q), productName);
    if (push(urls)) return ordered.slice(0, MAX_CANDIDATES);
  }

  // 2) Bing site:restreint domaines algériens
  const siteFilter = ALGERIA_FOOD_SITES.map((s) => `site:${s.host}`).join(" OR ");
  const bingDz = await fetchBingSiteImages(
    `(${siteFilter}) ${q} produit alimentaire`,
    productName,
  );
  if (push(bingDz)) return ordered.slice(0, MAX_CANDIDATES);

  // 3) Fallback : Algérie + catégorie (toujours SafeSearch)
  const cat = (category ?? "agroalimentaire").trim();
  const fallback = await fetchBingSiteImages(
    `${q} ${cat} Algérie packshot emballage produit -lingerie -nude -sexy -porn`,
    productName,
  );
  push(fallback);

  return ordered.slice(0, MAX_CANDIDATES);
}
