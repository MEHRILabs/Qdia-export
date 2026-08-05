/**
 * Recherche images produit — multi-requêtes Bing (sites DZ + packshot + générique).
 * Agrège tous les résultats puis rank (strict puis soft). Jamais de fallback aléatoire.
 */
import { logger } from "../lib/logger";
import { isNsfwOrBlockedImageUrl } from "./catalog-image-safety";
import {
  isRelevantProductImage,
  scoreNameMatch,
  significantProductTokens,
  extractBrandTokens,
  extractProductTypeTokens,
  type MatchMode,
} from "./product-image-match";

const SEARCH_TIMEOUT_MS = 10_000;
const MAX_CANDIDATES = 12;
const MAX_QUERIES = 8;

/** Sites marketplace / marques DZ où les packshots sont plus fiables. */
export const ALGERIA_FOOD_SITES = [
  "tidjaria.com",
  "elwajed.com",
  "batolis.com",
  "yassir.com",
  "jumia.dz",
  "shop.cevital.com",
  "soummam.com",
  "carrefour.dz",
  "ouedkniss.com",
] as const;

export type ImageSearchOpts = {
  category?: string | null;
  description?: string | null;
  explicitBrand?: string | null;
  packaging?: string | null;
  ean?: string | null;
};

function buildQueries(
  productName: string,
  opts: ImageSearchOpts = {},
): { brand: string; queries: string[] } {
  const brandTok = extractBrandTokens(productName, opts.explicitBrand);
  const typeTok = extractProductTypeTokens(productName, brandTok);
  const brand =
    opts.explicitBrand?.trim() ||
    brandTok.join(" ") ||
    significantProductTokens(productName)[0] ||
    productName.slice(0, 40);
  const typeWords = typeTok.slice(0, 3).join(" ");
  const typeOne = typeTok[0] ?? "";
  const quoted = brand.includes(" ") ? `"${brand}"` : brand;
  const pack = (opts.packaging ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9àâäéèêëïîôùûüç\s]/gi, " ")
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 3)
    .slice(0, 2)
    .join(" ");
  const isFood =
    /food|agro|aliment|epice|huile|cafe|datte|miel|lait|fromage|semoule|couscous/i.test(
      `${opts.category ?? ""} ${productName}`,
    );
  const catHint = isFood ? "alimentaire" : "";
  const descTok = opts.description
    ? significantProductTokens(opts.description)
        .filter((t) => !brandTok.includes(t) && !typeTok.includes(t))
        .slice(0, 2)
        .join(" ")
    : "";

  const core = `${quoted} ${typeWords}`.trim();
  const shortName = productName
    .replace(/\d+\s*(g|kg|ml|cl|l|pcs?)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  const queries: string[] = [];

  // 1) EAN / code-barres — très précis quand dispo
  if (opts.ean && /^\d{8,14}$/.test(opts.ean.trim())) {
    queries.push(opts.ean.trim());
    queries.push(`${opts.ean.trim()} ${brand}`.trim());
  }

  // 2) Sites algériens (packshots plus fiables)
  for (const site of ALGERIA_FOOD_SITES.slice(0, 5)) {
    queries.push(`site:${site} ${core}`.trim());
    if (typeOne) queries.push(`site:${site} ${quoted} ${typeOne}`.trim());
  }

  // 3) Requêtes génériques marquées DZ / packshot
  queries.push(
    `${core} ${pack} ${descTok} packshot OR emballage OR flacon OR bocal OR sachet`.trim(),
    `"${shortName}" packshot OR produit`.trim(),
    `${core} produit Algerie OR Algeria ${catHint}`.trim(),
    `${quoted} ${typeOne} packshot`.trim(),
    `${core}`.trim(),
    `${quoted} ${typeOne} Algerie`.trim(),
    `${shortName}`.trim(),
  );

  return {
    brand,
    queries: queries.filter((q, i, arr) => q.length >= 4 && arr.indexOf(q) === i),
  };
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

export function extractBingMurls(html: string): Array<{ url: string; alt: string }> {
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

  // Fallback titres JSON classiques
  const titleJsonRe = /"t"\s*:\s*"([^"]+)"/gi;
  while ((tm = titleJsonRe.exec(html)) !== null) {
    try {
      titles.push(JSON.parse(`"${tm[1]}"`));
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
      // Miniatures Bing sans titre = peu utiles
      if (/bing\.net\/th|mm\.bing\.net/i.test(u) && !alt.trim()) return;
      seen.add(u);
      out.push({ url: u, alt });
    } catch {
      /* ignore */
    }
  };

  let idx = 0;
  let m: RegExpExecArray | null;
  const murlRe = /murl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/gi;
  while ((m = murlRe.exec(html)) !== null) {
    push(m[1], titles[idx] ?? "");
    idx++;
  }

  // Format JSON alternatif Bing
  const jsonMurl = /"murl"\s*:\s*"(https?:\/\/[^"]+)"/gi;
  let jIdx = 0;
  while ((m = jsonMurl.exec(html)) !== null) {
    push(m[1], titles[jIdx] ?? "");
    jIdx++;
  }

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
  explicitBrand?: string | null,
  mode: MatchMode = "strict",
  minScore = 6,
): string[] {
  const seen = new Set<string>();
  return items
    .map((img) => ({
      u: img.url,
      s: isRelevantProductImage(img.url, productName, img.alt, explicitBrand, mode)
        ? scoreNameMatch(img.url, productName, img.alt, explicitBrand, mode)
        : -1,
    }))
    .filter((x) => x.s >= minScore)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.u)
    .filter((u) => {
      if (seen.has(u)) return false;
      seen.add(u);
      return true;
    })
    .slice(0, MAX_CANDIDATES);
}

/**
 * Multi-requêtes Bing agrégées (sites DZ → packshot → générique).
 * 1) rank strict  2) rank soft si 0 résultat.
 */
export async function searchAlgerianProductImageUrls(
  productName: string,
  category?: string | null,
  description?: string | null,
  opts: Omit<ImageSearchOpts, "category" | "description"> = {},
): Promise<string[]> {
  const searchOpts: ImageSearchOpts = {
    category,
    description,
    explicitBrand: opts.explicitBrand,
    packaging: opts.packaging,
    ean: opts.ean,
  };
  const { brand, queries } = buildQueries(productName, searchOpts);
  if (!queries.length) return [];

  const pool: Array<{ url: string; alt: string }> = [];
  const seenUrl = new Set<string>();
  let queriesOk = 0;

  // Toujours parcourir plusieurs requêtes pour ne pas s'arrêter sur un mauvais "hit"
  for (const query of queries.slice(0, MAX_QUERIES)) {
    const url =
      `https://www.bing.com/images/async?q=${encodeURIComponent(query)}` +
      `&async=1&first=1&count=50&adlt=strict&safesearch=strict`;
    const html = await fetchHtml(url);
    if (!html) continue;
    const found = extractBingMurls(html);
    if (!found.length) continue;
    queriesOk++;
    for (const img of found) {
      if (seenUrl.has(img.url)) continue;
      seenUrl.add(img.url);
      pool.push(img);
    }
    // Assez de candidats bruts → on peut classer
    if (pool.length >= 40) break;
  }

  if (!pool.length) {
    logger.warn({ productName: productName.slice(0, 60), brand }, "bing: 0 raw murls");
    return [];
  }

  let ranked = rank(pool, productName, opts.explicitBrand ?? brand, "strict", 6);
  if (!ranked.length) {
    ranked = rank(pool, productName, opts.explicitBrand ?? brand, "soft", 4);
    if (ranked.length) {
      logger.info(
        { productName: productName.slice(0, 40), n: ranked.length, brand, mode: "soft", pool: pool.length },
        "bing images ok (soft match)",
      );
    }
  } else {
    logger.info(
      {
        productName: productName.slice(0, 40),
        n: ranked.length,
        brand,
        mode: "strict",
        pool: pool.length,
        queriesOk,
      },
      "bing images ok",
    );
  }

  if (!ranked.length) {
    logger.warn(
      { productName: productName.slice(0, 60), brand, pool: pool.length, queriesOk },
      "aucune image pertinente (marque+type)",
    );
  }
  return ranked;
}
