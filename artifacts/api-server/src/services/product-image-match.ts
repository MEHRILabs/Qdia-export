/**
 * Matching strict : phrase marque complète + mot type produit dans URL/alt.
 */

const UNIT_STOP =
  /^(g|kg|ml|cl|l|pcs?|piece|pi[eè]ces?|unit[eé]s?|pack|x\d+|\d+)$/i;

const GENERIC_STOP = new Set([
  "ar", "the", "and", "pour", "avec", "sans", "des", "les", "une", "aux",
  "produit", "product", "alimentaire", "food", "agriculture", "export",
  "liquide", "liquid", "nature", "classic", "original", "new", "extra",
]);

const PRODUCT_TYPE_WORDS =
  /^(cafe|caf[eé]|huile|datte|epice|miel|sucre|farine|lait|eau|jus|sauce|pates?|riz|confiture|vinaigre|semoule|couscous|harissa|tomate|fromage|yaourt|beurre|chocolat|biscuit|the|thé)$/i;

/** Lifestyle / personne — hors sujet sauf si dans le nom. */
const LIFESTYLE_RE =
  /\b(legume|l[eé]gumes?|vegetable|fruit|farmer|fermier|panier|basket|bio[_\-]?logo|organic.?farm|portrait|person|people|woman|man|girl|boy|smil|jardin|garden|harvest|r[eé]colte|carrots?|radish|salade)\b/i;

const PACKSHOT_RE = /packshot|emballage|flacon|bouteille|bottle|jar|sachet|boite|boîte|canette|tube|product|produit/i;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function significantProductTokens(productName: string): string[] {
  const raw = normalize(productName)
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !UNIT_STOP.test(t) && !GENERIC_STOP.has(t));

  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw) {
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 8) break;
  }
  return out;
}

/**
 * Marque = 1–2 premiers tokens (phrase).
 * Ex. "GLOBAL AROME AR LIQUIDE CAFE" → ["global", "arome"]
 */
export function extractBrandTokens(productName: string, explicitBrand?: string | null): string[] {
  if (explicitBrand?.trim()) {
    return significantProductTokens(explicitBrand).slice(0, 2);
  }
  const tokens = significantProductTokens(productName);
  if (!tokens.length) return [];
  const brand: string[] = [tokens[0]!];
  if (tokens[1] && (tokens[0]!.length < 5 || tokens[1].length >= 4)) {
    if (!PRODUCT_TYPE_WORDS.test(tokens[1])) {
      brand.push(tokens[1]);
    }
  }
  return brand;
}

/** Phrase marque normalisée, ex. "global arome". */
export function brandPhrase(productName: string, explicitBrand?: string | null): string {
  return extractBrandTokens(productName, explicitBrand).join(" ");
}

/** Tokens produit hors marque (type / variante). */
export function extractProductTypeTokens(productName: string, brandTokens: string[]): string[] {
  const brandSet = new Set(brandTokens);
  return significantProductTokens(productName).filter((t) => !brandSet.has(t));
}

export function countTokenHits(blob: string, tokens: string[]): number {
  const b = normalize(blob);
  let hits = 0;
  for (const t of tokens) {
    if (b.includes(t)) hits++;
  }
  return hits;
}

export function hasAllTokens(blob: string, tokens: string[]): boolean {
  if (!tokens.length) return false;
  const b = normalize(blob);
  return tokens.every((t) => b.includes(t));
}

export function hasAnyToken(blob: string, tokens: string[]): boolean {
  if (!tokens.length) return true;
  const b = normalize(blob);
  return tokens.some((t) => b.includes(t));
}

/** Marque OK si phrase contiguë OU tous les tokens marque présents. */
export function hasBrandMatch(blob: string, brand: string[]): boolean {
  if (!brand.length) return false;
  const b = normalize(blob);
  const phrase = brand.join(" ");
  if (phrase && b.includes(phrase)) return true;
  // Aussi accepter tokens séparés par - _ /
  const loose = brand.join("[\\s\\-_./]+");
  try {
    if (new RegExp(loose, "i").test(b)) return true;
  } catch {
    /* ignore */
  }
  return hasAllTokens(blob, brand);
}

/**
 * Image OK seulement si :
 * 1) phrase marque (ou tous tokens marque) dans URL/alt
 * 2) au moins 1 mot type produit
 * Refuse lifestyle hors sujet.
 */
export function isRelevantProductImage(
  url: string,
  productName: string,
  alt = "",
  explicitBrand?: string | null,
): boolean {
  const brand = extractBrandTokens(productName, explicitBrand);
  const typeTokens = extractProductTypeTokens(productName, brand);
  if (!brand.length) return false;

  const blob = `${url} ${alt}`;

  if (LIFESTYLE_RE.test(blob)) {
    const productOkLifestyle = /bio|legume|l[eé]gume|fruit|salade|jardin|vegetable/i.test(productName);
    if (!productOkLifestyle) return false;
  }

  // Marque complète obligatoire (plus seulement le 1er mot)
  if (!hasBrandMatch(blob, brand)) return false;

  if (typeTokens.length > 0) {
    if (!hasAnyToken(blob, typeTokens)) return false;
  } else if (!hasAllTokens(blob, brand)) {
    return false;
  }

  return true;
}

export function scoreNameMatch(
  url: string,
  productName: string,
  alt = "",
  explicitBrand?: string | null,
): number {
  if (!isRelevantProductImage(url, productName, alt, explicitBrand)) return -100;
  const brand = extractBrandTokens(productName, explicitBrand);
  const typeTokens = extractProductTypeTokens(productName, brand);
  const blob = `${url} ${alt}`;
  let s = 0;
  const phrase = brand.join(" ");
  if (normalize(blob).includes(phrase)) s += 15;
  s += countTokenHits(blob, brand) * 8;
  s += countTokenHits(blob, typeTokens) * 5;
  if (PACKSHOT_RE.test(blob)) s += 8;
  if (hasAllTokens(blob, brand) && countTokenHits(blob, typeTokens) >= 2) s += 10;
  if (LIFESTYLE_RE.test(blob)) s -= 20;
  return s;
}
