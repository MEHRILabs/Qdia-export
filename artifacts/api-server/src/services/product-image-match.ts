/**
 * Matching strict : marque + type produit dans URL/alt. Refuse lifestyle / hors-sujet.
 */

const UNIT_STOP =
  /^(g|kg|ml|cl|l|pcs?|piece|pi[eè]ces?|unit[eé]s?|pack|x\d+|\d+)$/i;

const GENERIC_STOP = new Set([
  "ar", "the", "and", "pour", "avec", "sans", "des", "les", "une", "aux",
  "produit", "product", "alimentaire", "food", "agriculture", "export",
  "liquide", "liquid", "nature", "classic", "original", "new", "extra",
  "ganul", "granule", "granules", "bocal", "same",
]);

/** Mots descriptifs (pas une marque) — souvent en tête du nom catalogue. */
const WEAK_NAME_WORDS = new Set([
  "support", "bloc", "note", "ruban", "adhesif", "adhesive", "surligneur",
  "stylo", "cahier", "papier", "carton", "boite", "lot", "set",
  "pack", "huile", "cafe", "datte", "epice", "miel", "sucre", "farine",
  "lait", "eau", "jus", "sauce", "pates", "riz", "confiture", "vinaigre",
  "semoule", "couscous", "harissa", "tomate", "fromage", "yaourt", "beurre",
  "chocolat", "biscuit", "neon", "promot", "promotion", "ail", "artichaut",
  "artichauts", "arome", "fond", "cur", "assila",
]);

const PRODUCT_TYPE_WORDS =
  /^(cafe|caf[eé]|huile|datte|epice|miel|sucre|farine|lait|eau|jus|sauce|pates?|riz|confiture|vinaigre|semoule|couscous|harissa|tomate|fromage|yaourt|beurre|chocolat|biscuit|the|thé|surligneur|ruban|stylo|cahier|support|bloc|note|ail|artichauts?|arome|arom[ae]|fond)$/i;

/** Images clairement hors produit B2B / packshot */
const OFFTOPIC_RE =
  /\b(snoopy|peanuts|piggy|ahorrando|surf(er|ing)?|wave|ocean|beach|plage|cartoon|comic|meme|wallpaper|stock.?photo|shutterstock|getty|unsplash|portrait|selfie|fashion|model|wedding|mariage|car\b|auto\b|moto|football|soccer|nba|celebrity)\b/i;

const LIFESTYLE_RE =
  /\b(legume|l[eé]gumes?|vegetable|fruit|farmer|fermier|panier|basket|bio[_\-]?logo|organic.?farm|portrait|person|people|woman|man|girl|boy|smil|jardin|garden|harvest|r[eé]colte|carrots?|radish|salade|ferme|farmer)\b/i;

const PACKSHOT_RE =
  /packshot|emballage|flacon|bouteille|bottle|jar|sachet|boite|bo[iî]te|canette|tube|bocal|pot\b|product|produit|marker|highlighter|tape|packaging|etiquette/i;

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
 * Marque : premier mot « fort », ou dernier token si le début est descriptif.
 */
export function extractBrandTokens(productName: string, explicitBrand?: string | null): string[] {
  if (explicitBrand?.trim()) {
    return significantProductTokens(explicitBrand).slice(0, 2);
  }
  const tokens = significantProductTokens(productName);
  if (!tokens.length) return [];

  const strong = tokens.filter((t) => !WEAK_NAME_WORDS.has(t) && !PRODUCT_TYPE_WORDS.test(t));
  if (strong.length && WEAK_NAME_WORDS.has(tokens[0]!)) {
    const last = strong[strong.length - 1]!;
    return [last];
  }

  const brand: string[] = [tokens[0]!];
  if (tokens[1] && !PRODUCT_TYPE_WORDS.test(tokens[1]) && !WEAK_NAME_WORDS.has(tokens[1])) {
    if (tokens[0]!.length < 5 || tokens[1].length >= 4) {
      brand.push(tokens[1]);
    }
  }
  if (WEAK_NAME_WORDS.has(brand[0]!) && strong[0]) {
    return [strong[0]];
  }
  return brand;
}

export function brandPhrase(productName: string, explicitBrand?: string | null): string {
  return extractBrandTokens(productName, explicitBrand).join(" ");
}

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

export function hasBrandMatch(blob: string, brand: string[]): boolean {
  if (!brand.length) return false;
  const b = normalize(blob);
  const phrase = brand.join(" ");
  if (phrase && b.includes(phrase)) return true;
  const primary = [...brand].sort((a, c) => c.length - a.length)[0]!;
  if (primary.length >= 4 && b.includes(primary)) return true;
  if (brand.length === 1) return b.includes(brand[0]!);
  return hasAllTokens(blob, brand);
}

function isOfftopicBlob(blob: string, productName: string): boolean {
  if (OFFTOPIC_RE.test(blob)) return true;
  if (LIFESTYLE_RE.test(blob)) {
    const productOkLifestyle = /bio|legume|l[eé]gume|fruit|salade|jardin|vegetable/i.test(productName);
    if (!productOkLifestyle) return true;
  }
  return false;
}

/**
 * Strict : marque obligatoire + au moins 1 mot produit (type).
 * Refuse cartoons / lifestyle / surf / stock hors sujet.
 */
export function isRelevantProductImage(
  url: string,
  productName: string,
  alt = "",
  explicitBrand?: string | null,
): boolean {
  const brand = extractBrandTokens(productName, explicitBrand);
  const allTokens = significantProductTokens(productName);
  if (!brand.length) return false;

  const blob = `${url} ${alt}`;
  if (isOfftopicBlob(blob, productName)) return false;
  if (!hasBrandMatch(blob, brand)) return false;

  const others = allTokens.filter((t) => !brand.includes(t));
  // Exiger un mot produit (ail, cafe, artichaut…) — pas la marque seule
  if (others.length > 0) {
    if (!hasAnyToken(blob, others)) return false;
  } else if (countTokenHits(blob, allTokens) < 1) {
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
  s += countTokenHits(blob, typeTokens) * 6;
  if (PACKSHOT_RE.test(blob)) s += 12;
  if (hasAllTokens(blob, brand) && countTokenHits(blob, typeTokens) >= 1) s += 10;
  if (LIFESTYLE_RE.test(blob) || OFFTOPIC_RE.test(blob)) s -= 40;
  return s;
}
