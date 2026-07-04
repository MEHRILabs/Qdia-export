/**
 * Normalisation des catégories catalogue → rayons FR → 5 secteurs marketplace.
 * Le code catégorie est extrait du master_id : DZ-EPI-MO3-00003-N-X-01 → EPI
 */

export const MARKETPLACE_CATEGORIES = [
  "Agriculture & Food",
  "Energy & Chemicals",
  "Textiles & Apparel",
  "Construction Materials",
  "Handicrafts & Decor",
];

/** Libellés rayon FR par code (12 rayons alimentaire + codes export) */
export const CODE_TO_RAYON = {
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

/** Rayon FR ou nom de feuille → catégorie marketplace */
export const RAYON_TO_MARKETPLACE = {
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
  "non classé",
  "sans categorie",
  "sans catégorie",
  "articles",
  "variantes",
  "produits",
  "catalogue",
  "listing",
  "sheet1",
  "feuille1",
]);

function normKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function extractCodeFromMasterId(masterId) {
  const parts = String(masterId ?? "").split("-");
  return parts.length >= 2 ? parts[1].toUpperCase() : null;
}

export function isUnclassified(name) {
  const key = normKey(name);
  return !key || UNCLASSIFIED.has(key) || key.includes("non classe");
}

export function isMarketplaceCategory(name) {
  return MARKETPLACE_CATEGORIES.includes(String(name ?? "").trim());
}

function fuzzyRayonFromName(name) {
  const key = normKey(name);
  if (!key) return null;
  for (const [rayon, marketplace] of Object.entries(RAYON_TO_MARKETPLACE)) {
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

/** Résout le rayon FR (Épicerie, Papeterie, …) */
export function resolveRayon({ masterId, categoryCode, categoryName, sheetName } = {}) {
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
    if (!isUnclassified(sheetName)) return sheetName.trim();
  }

  if (categoryName && !isUnclassified(categoryName)) return categoryName.trim();

  return code && CODE_TO_RAYON[code] ? CODE_TO_RAYON[code] : "Agroalimentaire";
}

/** Résout la catégorie marketplace affichée dans products.category */
export function resolveMarketplaceCategory({ masterId, categoryCode, categoryName, sheetName } = {}) {
  if (categoryName && isMarketplaceCategory(categoryName)) return categoryName;

  const rayon = resolveRayon({ masterId, categoryCode, categoryName, sheetName });
  if (RAYON_TO_MARKETPLACE[rayon]) return RAYON_TO_MARKETPLACE[rayon];

  const fuzzy = fuzzyRayonFromName(rayon ?? categoryName ?? sheetName);
  if (fuzzy && RAYON_TO_MARKETPLACE[fuzzy]) return RAYON_TO_MARKETPLACE[fuzzy];

  return "Agriculture & Food";
}

/** Expression SQL CASE pour mapper master_id/sku → catégorie marketplace */
export function marketplaceCategorySql(alias = "cv", idColumn = "master_id", categoryNameColumn = "category_name") {
  const codeExpr = `UPPER(split_part(${alias}.${idColumn}, '-', 2))`;
  const codeCases = Object.entries(CODE_TO_RAYON)
    .map(([code, rayon]) => {
      const marketplace = RAYON_TO_MARKETPLACE[rayon] ?? "Agriculture & Food";
      return `WHEN ${codeExpr} = '${code}' THEN '${marketplace.replace(/'/g, "''")}'`;
    })
    .join("\n        ");

  const nameCases = Object.entries(RAYON_TO_MARKETPLACE)
    .map(([rayon, marketplace]) =>
      `WHEN lower(trim(${alias}.${categoryNameColumn})) = lower('${rayon.replace(/'/g, "''")}') THEN '${marketplace.replace(/'/g, "''")}'`,
    )
    .join("\n        ");

  return `CASE
        ${codeCases}
        ${nameCases}
        WHEN lower(trim(${alias}.${categoryNameColumn})) IN ('non_classe','non classe','non classé','articles','variantes','produits','catalogue') THEN 'Agriculture & Food'
        ELSE 'Agriculture & Food'
      END`;
}
