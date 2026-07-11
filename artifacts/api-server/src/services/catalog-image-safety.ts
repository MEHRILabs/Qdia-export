/**
 * Filtre anti-NSFW / images hors-sujet pour le scrape catalogue.
 */

/** Domaines / mots souvent liés au contenu adulte ou hors catalogue B2B. */
const NSFW_URL_RE =
  /porn|xxx|xvideos|xhamster|xnxx|onlyfans|fansly|chaturbate|stripchat|camgirl|camsex|adult|erotica|erotic|nude|naked|nsfw|sexshop|sex-shop|lingerie|hentai|rule34|boob|breast|pussy|penis|anal|fetish|bdsm|escort|webcam|pornhub|redtube|youporn|spankbang|thots|leaked|nsfw|hotgirl|sexygirl|teen-?porn|milf|blowjob|deepthroat|hardcore|softcore|playboy|penthouse|babes?\.com|imagefap|motherless|gelbooru|danbooru|nhentai|fapello|coomer|thothub|pornstar|amateur-?porn|escort| escort|dating-hookup/i;

const NSFW_HOST_RE =
  /(?:^|\.)(?:pornhub|xvideos|xhamster|xnxx|onlyfans|chaturbate|stripchat|redtube|youporn|spankbang|imagefap|motherless|gelbooru|danbooru|nhentai|fapello|coomer|thothub|bongacams|livejasmin|myfreecams|camsoda)\./i;

/** Mots UI / hors produit */
const JUNK_URL_RE =
  /logo|favicon|sprite|avatar|1x1|pixel|spacer|banner-ad|advert|tracking|emoji|sticker/i;

/** Hôtes autorisés pour conserver une image distante (sinon purge des scrapes web). */
const TRUSTED_HOST_RE =
  /(?:^|\.)(?:onrender\.com|qdiadz\.com|qdia-export|cloudinary\.com|imgur\.com|googleusercontent\.com|ggpht\.com|alicdn\.com|alibaba\.com|alibaba-inc\.com|slatic\.net|shopify\.com|amazonaws\.com|cloudfront\.net|tidjaria\.com|elwajed\.com|batolis\.com|yassir\.com)$/i;

export function isNsfwOrBlockedImageUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  const u = url.trim().toLowerCase();
  if (u.startsWith("data:") || u.startsWith("/uploads/") || u.startsWith("/api/products/")) return false;
  if (NSFW_URL_RE.test(u) || NSFW_HOST_RE.test(u) || JUNK_URL_RE.test(u)) return true;
  try {
    const host = new URL(u).hostname.toLowerCase();
    if (NSFW_HOST_RE.test(host)) return true;
  } catch {
    /* ignore */
  }
  return false;
}

/** Image distante http(s) hors hôtes de confiance = typiquement scrape Bing non contrôlé. */
export function isUntrustedRemoteCatalogImage(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  const u = url.trim();
  if (u.startsWith("data:") || u.startsWith("/") || u.startsWith("blob:")) return false;
  if (!/^https?:\/\//i.test(u)) return false;
  if (isNsfwOrBlockedImageUrl(u)) return true;
  try {
    const host = new URL(u).hostname.toLowerCase();
    // Autoriser uniquement quelques CDN B2B / notre hébergeur
    if (TRUSTED_HOST_RE.test(host)) return false;
    // Tout le reste (imgur random, adult CDNs, blogs…) = non fiable pour le catalogue
    return true;
  } catch {
    return true;
  }
}

export function shouldPurgeCatalogImage(url: string | null | undefined): boolean {
  return isNsfwOrBlockedImageUrl(url) || isUntrustedRemoteCatalogImage(url);
}

export function scoreSafeProductCandidate(url: string, productName = ""): number {
  const u = url.toLowerCase();
  let s = 0;
  if (isNsfwOrBlockedImageUrl(u)) return -100;
  if (/\.(jpe?g|png|webp)(\?|$)/i.test(u)) s += 3;
  if (/product|pack|packshot|catalog|produit|emballage|bottle|jar|box|sachet|epice|huile|datte|agro/i.test(u)) s += 4;
  if (/tidjaria|elwajed|batolis|yassir|cevital|soummam/i.test(u)) s += 8;
  if (/white.?background|isolated|studio/i.test(u)) s += 2;
  const tokens = productName
    .toLowerCase()
    .split(/[^a-z0-9àâäéèêëïîôùûüç]+/i)
    .filter((t) => t.length >= 4)
    .slice(0, 6);
  for (const t of tokens) {
    if (u.includes(t)) s += 2;
  }
  if (JUNK_URL_RE.test(u)) s -= 8;
  if (/bing\.com\/th|thumbnail|sprite/i.test(u)) s -= 2;
  return s;
}
