/**
 * Matching strict nom produit ↔ URL/alt image (évite légumes pour un café, etc.).
 */

const UNIT_STOP =
  /^(g|kg|ml|cl|l|pcs?|piece|pi[eè]ces?|unit[eé]s?|pack|x\d+|\d+)$/i;

const GENERIC_STOP = new Set([
  "ar", "the", "and", "pour", "avec", "sans", "des", "les", "une", "aux",
  "produit", "product", "alimentaire", "food", "agriculture",
]);

/** Mots lifestyle / rayon générique — hors sujet sauf si dans le nom produit. */
const LIFESTYLE_RE =
  /\b(legume|l[eé]gumes?|vegetable|fruit|farmer|fermier|panier|basket|bio[_\-]?logo|organic.?farm|portrait|person|people|woman|man|girl|boy|smil|jardin|garden|harvest|r[eé]colte|carrots?|radish|salade)\b/i;

export function significantProductTokens(productName: string): string[] {
  const raw = productName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && !UNIT_STOP.test(t) && !GENERIC_STOP.has(t));

  // Dédup en gardant l'ordre (marque d'abord)
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

export function countTokenHits(blob: string, tokens: string[]): number {
  const b = blob.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  let hits = 0;
  for (const t of tokens) {
    if (b.includes(t)) hits++;
  }
  return hits;
}

/**
 * True si l'image semble vraiment liée au produit.
 * Exige des tokens du nom dans l'URL/alt ; refuse lifestyle hors sujet (légumes pour un café).
 */
export function isRelevantProductImage(
  url: string,
  productName: string,
  alt = "",
): boolean {
  const tokens = significantProductTokens(productName);
  if (!tokens.length) return false;
  const blob = `${url} ${alt}`;
  const hits = countTokenHits(blob, tokens);
  const need = tokens.length >= 2 ? 2 : 1;

  // Photo lifestyle (légumes, fermier, panier…) alors que le produit n'en parle pas → hors sujet
  if (LIFESTYLE_RE.test(blob)) {
    const productOkLifestyle = /bio|legume|l[eé]gume|fruit|salade|jardin|vegetable/i.test(productName);
    if (!productOkLifestyle) return false;
  }

  if (hits >= need) return true;

  // 1 hit fort (marque ≥5 lettres) acceptable si pas lifestyle
  const strong = tokens.filter((t) => t.length >= 5);
  const strongHits = countTokenHits(blob, strong);
  return strongHits >= 1 && hits >= 1;
}

export function scoreNameMatch(url: string, productName: string, alt = ""): number {
  if (!isRelevantProductImage(url, productName, alt)) return -100;
  const tokens = significantProductTokens(productName);
  const hits = countTokenHits(`${url} ${alt}`, tokens);
  let s = hits * 5;
  if (hits >= 3) s += 5;
  if (LIFESTYLE_RE.test(`${url} ${alt}`)) s -= 12;
  return s;
}
