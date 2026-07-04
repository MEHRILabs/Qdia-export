/**
 * Normalisation des catégories catalogue → rayons FR → 5 secteurs marketplace.
 */

export const MARKETPLACE_CATEGORIES = [
  "Agriculture & Food",
  "Energy & Chemicals",
  "Textiles & Apparel",
  "Construction Materials",
  "Handicrafts & Decor",
] as const;

export const CODE_TO_RAYON: Record<string, string> = {
  EPI: "Épicerie",
  PAP: "Papeterie",
  HYG: "Hygiène & Beauté",
  DRO: "Droguerie & Entretien",
  CDM: "Conserves & Condiments",
  BOI: "Boissons",
  LAI: "Produits laitiers",
  FRL: "Fruits & Légumes",
  CHA: "Charcuterie",
  BVO: "Boucherie & Volaille",
  BOU: "Boulangerie & Pâtisserie",
  POI: "Poissonnerie",
  ALI: "Agroalimentaire",
  AGR: "Agroalimentaire",
  TEX: "Textiles",
  TXT: "Textiles",
  BTP: "Construction",
  CON: "Construction",
  ART: "Artisanat",
  ENE: "Énergie",
  CHI: "Chimie",
  PHA: "Pharmaceutique",
  CMH: "Confort maison",
};

export const RAYON_TO_MARKETPLACE: Record<string, string> = {
  "Épicerie": "Agriculture & Food",
  "Conserves & Condiments": "Agriculture & Food",
  "Boissons": "Agriculture & Food",
  "Produits laitiers": "Agriculture & Food",
  "Fruits & Légumes": "Agriculture & Food",
  "Charcuterie": "Agriculture & Food",
  "Boucherie & Volaille": "Agriculture & Food",
  "Boulangerie & Pâtisserie": "Agriculture & Food",
  "Poissonnerie": "Agriculture & Food",
  Agroalimentaire: "Agriculture & Food",
  Pharmaceutique: "Agriculture & Food",
  "Hygiène & Beauté": "Energy & Chemicals",
  "Droguerie & Entretien": "Energy & Chemicals",
  Énergie: "Energy & Chemicals",
  Energie: "Energy & Chemicals",
  Chimie: "Energy & Chemicals",
  Textiles: "Textiles & Apparel",
  Construction: "Construction Materials",
  Artisanat: "Handicrafts & Decor",
  Papeterie: "Handicrafts & Decor",
  "Confort maison": "Handicrafts & Decor",
};

const UNCLASSIFIED = new Set([
  "",
  "non_classe",
  "non classe",
  "non classé",
  "sans categorie",
  "articles",
  "variantes",
  "produits",
  "catalogue",
  "listing",
  "sheet1",
  "feuille1",
]);

function normKey(value: unknown): string {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function extractCodeFromMasterId(masterId?: string | null): string | null {
  const parts = String(masterId ?? "").split("-");
  return parts.length >= 2 ? parts[1].toUpperCase() : null;
}

export function isUnclassified(name?: string | null): boolean {
  const key = normKey(name);
  return !key || UNCLASSIFIED.has(key) || key.includes("non classe");
}

function fuzzyRayonFromName(name: string): string | null {
  const key = normKey(name);
  if (!key) return null;
  for (const rayon of Object.keys(RAYON_TO_MARKETPLACE)) {
    const r = normKey(rayon);
    if (key === r || key.includes(r) || r.includes(key)) return rayon;
  }
  if (key.includes("agro") || key.includes("aliment") || key.includes("epicer")) return "Agroalimentaire";
  if (key.includes("textile") || key.includes("habille")) return "Textiles";
  if (key.includes("btp") || key.includes("construction") || key.includes("materiau")) return "Construction";
  if (key.includes("artisan")) return "Artisanat";
  if (key.includes("papeter")) return "Papeterie";
  if (key.includes("droguer") || key.includes("entretien")) return "Droguerie & Entretien";
  if (key.includes("confort") || key.includes("maison")) return "Confort maison";
  if (key.includes("energie") || key.includes("chimie") || key.includes("hygiene")) return "Droguerie & Entretien";
  return null;
}

export function resolveRayon(opts: {
  masterId?: string;
  categoryCode?: string;
  categoryName?: string;
  sheetName?: string;
} = {}): string {
  const { masterId, categoryCode, categoryName, sheetName } = opts;

  if (categoryName && !isUnclassified(categoryName)) {
    if (RAYON_TO_MARKETPLACE[categoryName]) return categoryName;
    const fuzzy = fuzzyRayonFromName(categoryName);
    if (fuzzy) return fuzzy;
  }

  const code = (categoryCode ?? extractCodeFromMasterId(masterId))?.toUpperCase();
  if (code && CODE_TO_RAYON[code]) return CODE_TO_RAYON[code];

  if (sheetName && !isUnclassified(sheetName)) {
    const sheetRayon = fuzzyRayonFromName(sheetName);
    if (sheetRayon) return sheetRayon;
    return sheetName.trim();
  }

  if (categoryName && !isUnclassified(categoryName)) return categoryName.trim();
  return "Agroalimentaire";
}

export function resolveMarketplaceCategory(opts: {
  masterId?: string;
  categoryCode?: string;
  categoryName?: string;
  sheetName?: string;
} = {}): string {
  const { masterId, categoryCode, categoryName, sheetName } = opts;

  if (categoryName && (MARKETPLACE_CATEGORIES as readonly string[]).includes(categoryName)) {
    return categoryName;
  }

  const rayon = resolveRayon({ masterId, categoryCode, categoryName, sheetName });
  if (RAYON_TO_MARKETPLACE[rayon]) return RAYON_TO_MARKETPLACE[rayon];

  const fuzzy = fuzzyRayonFromName(rayon ?? categoryName ?? sheetName ?? "");
  if (fuzzy && RAYON_TO_MARKETPLACE[fuzzy]) return RAYON_TO_MARKETPLACE[fuzzy];

  return "Agriculture & Food";
}

/** Valeurs `products.category` à matcher pour un filtre marketplace ou rayon FR. */
export function resolveCategoryFilterValues(categoryName: string): string[] {
  const trimmed = categoryName.trim();
  if (!trimmed) return [];

  if ((MARKETPLACE_CATEGORIES as readonly string[]).includes(trimmed)) {
    const rayons = Object.entries(RAYON_TO_MARKETPLACE)
      .filter(([, marketplace]) => marketplace === trimmed)
      .map(([rayon]) => rayon);
    return [...new Set([trimmed, ...rayons])];
  }

  const marketplace = RAYON_TO_MARKETPLACE[trimmed];
  if (marketplace) return resolveCategoryFilterValues(marketplace);

  const fuzzy = fuzzyRayonFromName(trimmed);
  if (fuzzy && RAYON_TO_MARKETPLACE[fuzzy]) {
    return resolveCategoryFilterValues(RAYON_TO_MARKETPLACE[fuzzy]);
  }

  return [trimmed];
}

export function toMarketplaceCategory(categoryName: string): string {
  const trimmed = categoryName.trim();
  if ((MARKETPLACE_CATEGORIES as readonly string[]).includes(trimmed)) return trimmed;
  if (RAYON_TO_MARKETPLACE[trimmed]) return RAYON_TO_MARKETPLACE[trimmed];
  const fuzzy = fuzzyRayonFromName(trimmed);
  if (fuzzy && RAYON_TO_MARKETPLACE[fuzzy]) return RAYON_TO_MARKETPLACE[fuzzy];
  return trimmed;
}
