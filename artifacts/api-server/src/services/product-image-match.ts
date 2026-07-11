/**
 * Matching strict : marque + mots du nom produit dans URL/alt image.
 */

const UNIT_STOP =
  /^(g|kg|ml|cl|l|pcs?|piece|pi[eè]ces?|unit[eé]s?|pack|x\d+|\d+)$/i;

const GENERIC_STOP = new Set([
  "ar", "the", "and", "pour", "avec", "sans", "des", "les", "une", "aux",
  "produit", "product", "alimentaire", "food", "agriculture", "export",
  "liquide", "liquid", "nature", "classic", "original", "new", "extra",
]);

/** Mots lifestyle / rayon générique — hors sujet sauf si dans le nom produit. */
const LIFESTYLE_RE =
  /\b(legume|l[eé]gumes?|vegetable|fruit|farmer|fermier|panier|basket|bio[_\-]?logo|organic.?farm|portrait|person|people|woman|man|girl|boy|smil|jardin|garden|harvest|r[eé]colte|carrots?|radish|salade)\b/i;

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
 * Marque = 1er token (ou 2 premiers si le 1er est court < 5, ex. "El Wajed").
 * Ex. "GLOBAL AROME AR LIQUIDE CAFE" → marque "global" (+ "arome" si besoin).
 */
export function extractBrandTokens(productName: string, explicitBrand?: string | null): string[] {
  if (explicitBrand?.trim()) {
    return significantProductTokens(explicitBrand).slice(0, 2);
  }
  const tokens = significantProductTokens(productName);
  if (!tokens.length) return [];
  const brand: string[] = [tokens[0]!];
  // Deuxième mot de marque si le premier est court (El, La, Al…) ou si 2e ≥ 4 lettres
  if (tokens[1] && (tokens[0]!.length < 5 || tokens[1].length >= 4)) {
    // Évite d'englober le type produit (cafe, huile…) comme marque
    if (!/^(cafe|caf[eé]|huile|datte|epice|miel|sucre|farine|lait|eau|jus|sauce|pates?|riz)$/i.test(tokens[1])) {
      brand.push(tokens[1]);
    }
  }
  return brand;
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

/**
 * Image OK seulement si :
 * 1) la marque apparaît dans URL ou alt
 * 2) au moins un autre mot du nom produit apparaît aussi
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

  // Marque obligatoire (tous les tokens marque, ou au moins le 1er si marque composée)
  const brandOk =
    brand.length === 1
      ? hasAllTokens(blob, brand)
      : hasAllTokens(blob, [brand[0]!]) || hasAllTokens(blob, brand);
  if (!brandOk) return false;

  // Au moins un mot du produit (hors marque) — sinon seulement marque = trop vague
  if (typeTokens.length > 0) {
    if (!hasAnyToken(blob, typeTokens)) return false;
  } else {
    // Nom = seulement marque : exige la marque complète
    if (!hasAllTokens(blob, brand)) return false;
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
  s += countTokenHits(blob, brand) * 8;
  s += countTokenHits(blob, typeTokens) * 5;
  if (hasAllTokens(blob, brand) && countTokenHits(blob, typeTokens) >= 2) s += 10;
  if (LIFESTYLE_RE.test(blob)) s -= 12;
  return s;
}
