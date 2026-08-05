/**
 * Matching marque + type produit (URL ou alt Bing).
 * Mode strict pour ranking, mode assoupli pour ne pas rater packshots CDN sans slug.
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
  "artichauts", "arome", "fond", "cur", "net",
]);

const PRODUCT_TYPE_WORDS =
  /^(cafe|caf[eé]|huile|datte|epice|miel|sucre|farine|lait|eau|jus|sauce|pates?|riz|confiture|vinaigre|semoule|couscous|harissa|tomate|fromage|yaourt|beurre|chocolat|biscuit|the|thé|surligneur|ruban|stylo|cahier|support|bloc|note|ail|artichauts?|arome|arom[ae]|fond)$/i;

/** Images clairement hors produit B2B / packshot */
const OFFTOPIC_RE =
  /\b(snoopy|peanuts|piggy|ahorrando|surf(er|ing)?|wave|ocean|beach|plage|cartoon|comic|meme|wallpaper|stock.?photo|shutterstock|getty|unsplash|portrait|selfie|fashion|model|wedding|mariage|car\b|auto\b|moto|football|soccer|nba|celebrity)\b/i;

const LIFESTYLE_RE =
  /\b(legume|l[eé]gumes?|vegetable|fruit|farmer|fermier|panier|basket|bio[_\-]?logo|organic.?farm|portrait|person|people|woman|man|girl|boy|smil|jardin|garden|harvest|r[eé]colte|carrots?|radish|salade|ferme|farmer)\b/i;

const PACKSHOT_RE =
  /packshot|emballage|flacon|bouteille|bottle|jar|sachet|boite|bo[iî]te|canette|tube|bocal|pot\b|product|produit|marker|highlighter|tape|packaging|etiquette|sku|ean|upc|catalog/i;

const DZ_HOST_RE =
  /tidjaria|elwajed|batolis|yassir|jumia\.dz|cevital|soummam|maghreb|alger|oran|constantine|\.dz\//i;

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
  // Marques courtes (3 chars) acceptées si token exact
  if (primary.length >= 3 && new RegExp(`(?:^|[^a-z0-9])${primary}(?:[^a-z0-9]|$)`).test(b)) {
    return true;
  }
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

export type MatchMode = "strict" | "soft";

/**
 * strict : marque + (type | packshot | host DZ + marque dans alt)
 * soft   : marque dans le titre/alt Bing suffit + pas offtopic (CDN sans slug OK)
 */
export function isRelevantProductImage(
  url: string,
  productName: string,
  alt = "",
  explicitBrand?: string | null,
  mode: MatchMode = "strict",
): boolean {
  const brand = extractBrandTokens(productName, explicitBrand);
  const allTokens = significantProductTokens(productName);
  if (!brand.length) return false;

  const blob = `${url} ${alt}`;
  if (isOfftopicBlob(blob, productName)) return false;

  // Priorité au titre Bing (souvent le seul endroit où apparaît la marque sur un CDN)
  const brandInAlt = hasBrandMatch(alt, brand);
  const brandInUrl = hasBrandMatch(url, brand);
  if (!brandInAlt && !brandInUrl) return false;

  const others = allTokens.filter((t) => !brand.includes(t));
  const dzHost = DZ_HOST_RE.test(url);
  const typeInBlob = others.length ? hasAnyToken(blob, others) : countTokenHits(blob, allTokens) >= 1;
  const typeInAlt = others.length ? hasAnyToken(alt, others) : hasAnyToken(alt, allTokens);
  const pack = PACKSHOT_RE.test(blob);

  if (mode === "soft") {
    // Soft : marque dans le titre = ok si pas de type contradictoire offtopic
    // Bonus si type produit ou packshot ou host DZ
    if (brandInAlt || brandInUrl) {
      if (typeInAlt || typeInBlob || pack || dzHost) return true;
      // Marque seule dans un titre long qui ressemble au produit
      const nameHits = countTokenHits(alt, allTokens);
      if (nameHits >= 2) return true;
      // Marque seule + EAN dans le nom produit souvent trop rare sur image → gardons
      if (brandInAlt && alt.trim().length >= 8) return true;
    }
    return false;
  }

  // Marque + (mot produit OU packshot OU (marque claire dans alt + site DZ) OU type dans alt)
  if (others.length > 0) {
    if (!typeInBlob && !typeInAlt && !pack && !(brandInAlt && dzHost)) {
      return false;
    }
  } else if (!typeInBlob && !pack && !(brandInAlt && dzHost)) {
    return false;
  }

  return true;
}

export function scoreNameMatch(
  url: string,
  productName: string,
  alt = "",
  explicitBrand?: string | null,
  mode: MatchMode = "strict",
): number {
  if (!isRelevantProductImage(url, productName, alt, explicitBrand, mode)) return -100;
  const brand = extractBrandTokens(productName, explicitBrand);
  const typeTokens = extractProductTypeTokens(productName, brand);
  const blob = `${url} ${alt}`;
  let s = 0;
  const phrase = brand.join(" ");
  if (normalize(blob).includes(phrase)) s += 15;
  if (hasBrandMatch(alt, brand)) s += 12; // titre Bing très fort
  s += countTokenHits(blob, brand) * 8;
  s += countTokenHits(blob, typeTokens) * 6;
  s += countTokenHits(alt, typeTokens) * 4;
  if (PACKSHOT_RE.test(blob)) s += 12;
  if (DZ_HOST_RE.test(url)) s += 10;
  if (hasAllTokens(blob, brand) && countTokenHits(blob, typeTokens) >= 1) s += 10;
  // Similarité nom complet
  const nameTokens = significantProductTokens(productName);
  const nameHits = countTokenHits(alt, nameTokens);
  if (nameHits >= 3) s += 8;
  if (LIFESTYLE_RE.test(blob) || OFFTOPIC_RE.test(blob)) s -= 40;
  if (mode === "soft") s -= 3; // préférer strict en ranking
  return s;
}
