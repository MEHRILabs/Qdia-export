/**
 * Sources images produits : sites algériens + matching strict nom ↔ image.
 */
import { logger } from "../lib/logger";
import { extractImageUrlsFromHtml } from "./image-scraper";
import { isNsfwOrBlockedImageUrl } from "./catalog-image-safety";
import {
  isRelevantProductImage,
  scoreNameMatch,
  significantProductTokens,
} from "./product-image-match";

const SEARCH_TIMEOUT_MS = 12_000;
const MAX_CANDIDATES = 8;

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

function simplifyQuery(productName: string): string {
  const tokens = significantProductTokens(productName);
  return tokens.slice(0, 4).join(" ").slice(0, 60);
}

function hitsInText(text: string, tokens: string[]): number {
  const t = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return tokens.filter((x) => t.includes(x)).length;
}

function scoreCandidate(url: string, productName: string, alt = ""): number {
  if (isNsfwOrBlockedImageUrl(url)) return -100;
  if (!isRelevantProductImage(url, productName, alt)) return -100;
  let s = scoreNameMatch(url, productName, alt);
  const blob = `${url} ${alt}`.toLowerCase();
  if (/tidjaria|elwajed|batolis/.test(blob)) s += 3;
  if (/packshot|emballage|flacon|bouteille|bottle|jar|sachet|product/.test(blob)) s += 4;
  if (/\.(jpe?g|png|webp)(\?|$)/i.test(url)) s += 1;
  return s;
}

function rankUrls(
  items: Array<{ url: string; alt?: string }>,
  productName: string,
): string[] {
  return items
    .map((img) => ({
      u: img.url,
      s: scoreCandidate(img.url, productName, img.alt ?? ""),
    }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.u);
}

async function fetchHtml(pageUrl: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);
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
    if (!resp.ok) return null;
    return await resp.text();
  } catch (err) {
    logger.warn({ err, pageUrl }, "fetch page failed");
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchBingImages(query: string, productName: string): Promise<string[]> {
  const url =
    `https://www.bing.com/images/async?q=${encodeURIComponent(query)}` +
    `&async=1&first=1&count=35&adlt=strict&safesearch=strict`;
  const html = await fetchHtml(url);
  if (!html) return [];
  const urls: Array<{ url: string; alt: string }> = [];
  const murlRe = /murl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/gi;
  const titleRe = /t&quot;:&quot;([^&]+?)&quot;/gi;
  const titles: string[] = [];
  let tm: RegExpExecArray | null;
  while ((tm = titleRe.exec(html)) !== null) {
    try {
      titles.push(decodeURIComponent(tm[1].replace(/\\u0026/g, "&")));
    } catch {
      titles.push(tm[1]);
    }
  }
  let idx = 0;
  let m: RegExpExecArray | null;
  while ((m = murlRe.exec(html)) !== null) {
    try {
      const u = decodeURIComponent(m[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/"));
      if (!/^https?:\/\//i.test(u) || isNsfwOrBlockedImageUrl(u)) {
        idx++;
        continue;
      }
      const alt = titles[idx] ?? "";
      idx++;
      if (!isRelevantProductImage(u, productName, alt)) continue;
      urls.push({ url: u, alt });
    } catch {
      /* ignore */
    }
  }
  return rankUrls(urls, productName);
}

function extractMatchingProductPages(html: string, baseUrl: string, productName: string): string[] {
  const tokens = significantProductTokens(productName);
  if (!tokens.length) return [];
  const need = Math.min(2, tokens.length);
  const hrefRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  const pages = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = hrefRe.exec(html)) !== null) {
    const href = m[1];
    const text = m[2].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (!href || text.length < 3) continue;
    if (hitsInText(text, tokens) < need) continue;
    try {
      const abs = new URL(href, baseUrl).href.split("#")[0]!;
      if (!/^https?:\/\//i.test(abs)) continue;
      pages.add(abs);
      if (pages.size >= 5) break;
    } catch {
      /* ignore */
    }
  }
  return [...pages];
}

async function scrapeProductPageImage(pageUrl: string, productName: string): Promise<string[]> {
  const html = await fetchHtml(pageUrl);
  if (!html) return [];
  const tokens = significantProductTokens(productName);
  const title =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
    ?? "";
  if (title && hitsInText(title, tokens) < 1) return [];

  const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1]
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)?.[1];

  const imgs = extractImageUrlsFromHtml(html, pageUrl);
  const withAlt = imgs.map((i) => ({ url: i.url, alt: `${i.alt ?? ""} ${title}` }));
  if (og) {
    try {
      withAlt.unshift({ url: new URL(og, pageUrl).href, alt: title });
    } catch {
      /* ignore */
    }
  }
  return rankUrls(withAlt, productName);
}

async function scrapeSearchThenProductPages(pageUrl: string, productName: string): Promise<string[]> {
  const html = await fetchHtml(pageUrl);
  if (!html) return [];

  const imgs = extractImageUrlsFromHtml(html, pageUrl);
  let ranked = rankUrls(
    imgs.map((i) => ({ url: i.url, alt: i.alt ?? "" })),
    productName,
  );

  const pages = extractMatchingProductPages(html, pageUrl, productName);
  for (const p of pages) {
    const fromProduct = await scrapeProductPageImage(p, productName);
    ranked = [...fromProduct, ...ranked];
    if (ranked.length >= MAX_CANDIDATES) break;
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of ranked) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
    if (out.length >= MAX_CANDIDATES) break;
  }
  return out;
}

/**
 * Cherche une image vraiment liée au nom produit.
 * Refuse les images génériques (légumes bio pour un café, etc.).
 */
export async function searchAlgerianProductImageUrls(
  productName: string,
  _category?: string | null,
): Promise<string[]> {
  const q = simplifyQuery(productName);
  if (!q) return [];
  const tokens = significantProductTokens(productName);
  const brand = tokens[0] ?? q;
  const found = new Set<string>();
  const ordered: string[] = [];

  const push = (urls: string[]) => {
    for (const u of urls) {
      if (found.has(u) || isNsfwOrBlockedImageUrl(u)) continue;
      if (!isRelevantProductImage(u, productName)) continue;
      found.add(u);
      ordered.push(u);
      if (ordered.length >= MAX_CANDIDATES) return true;
    }
    return false;
  };

  for (const site of ALGERIA_FOOD_SITES) {
    const urls = await scrapeSearchThenProductPages(site.search(q), productName);
    if (push(urls)) return ordered;
  }

  const exactQueries = [
    `"${brand}" ${tokens.slice(1, 3).join(" ")} flacon OR bouteille OR packshot OR emballage`,
    `${q} produit packshot flacon -legume -vegetable -bio -farmer -panier`,
  ];
  for (const query of exactQueries) {
    const urls = await fetchBingImages(query, productName);
    if (push(urls)) return ordered;
  }

  const siteFilter = ALGERIA_FOOD_SITES.map((s) => `site:${s.host}`).join(" OR ");
  const bingDz = await fetchBingImages(`(${siteFilter}) ${q}`, productName);
  push(bingDz);

  return ordered.slice(0, MAX_CANDIDATES);
}
