import { HOME_CATEGORIES, translateCategoryName } from "@/lib/nav";

export const ALL_CATEGORIES = "ALL" as const;

export type MarketplaceCategorySlug = (typeof HOME_CATEGORIES)[number]["slug"];

/** Alias FR / anciennes catégories → slug marketplace */
const LEGACY_SLUG_ALIASES: Record<string, MarketplaceCategorySlug> = {
  Agroalimentaire: "Agriculture & Food",
  Épicerie: "Agriculture & Food",
  "Conserves & Condiments": "Agriculture & Food",
  Boissons: "Agriculture & Food",
  "Produits laitiers": "Agriculture & Food",
  "Fruits & Légumes": "Agriculture & Food",
  Charcuterie: "Agriculture & Food",
  "Boucherie & Volaille": "Agriculture & Food",
  "Boulangerie & Pâtisserie": "Agriculture & Food",
  Poissonnerie: "Agriculture & Food",
  "Hygiène & Beauté": "Energy & Chemicals",
  "Droguerie & Entretien": "Energy & Chemicals",
  Textiles: "Textiles & Apparel",
  Papeterie: "Handicrafts & Decor",
  "Confort maison": "Handicrafts & Decor",
  Artisanat: "Handicrafts & Decor",
  Construction: "Construction Materials",
  Handicrafts: "Handicrafts & Decor",
};

export function normalizeCategorySlug(name: string): MarketplaceCategorySlug | null {
  const hit = HOME_CATEGORIES.find(c => c.slug === name);
  if (hit) return hit.slug;
  return LEGACY_SLUG_ALIASES[name] ?? null;
}

export function readCategoryFromUrl(): string {
  const raw = new URLSearchParams(window.location.search).get("category");
  if (!raw) return ALL_CATEGORIES;
  return normalizeCategorySlug(raw) ?? raw;
}

export function writeCategoryToUrl(value: string) {
  const url = new URL(window.location.href);
  if (value === ALL_CATEGORIES) url.searchParams.delete("category");
  else url.searchParams.set("category", value);
  window.history.replaceState({}, "", `${url.pathname}${url.search}`);
}

export type CatalogCategoryOption = {
  slug: string;
  labelKey: string;
  emoji: string;
  count?: number;
};

export function buildCatalogCategoryOptions(
  counts?: Record<string, number>,
): CatalogCategoryOption[] {
  return HOME_CATEGORIES.map(({ slug, nameKey, emoji }) => ({
    slug,
    labelKey: nameKey,
    emoji,
    count: counts?.[slug],
  }));
}

export function getCategoryDisplay(
  tr: (key: string) => string,
  slug: string,
  options: CatalogCategoryOption[],
): { label: string; emoji: string | null } {
  if (slug === ALL_CATEGORIES) {
    return { label: tr("catalog.all_categories"), emoji: null };
  }
  const meta = options.find(o => o.slug === slug);
  if (meta) return { label: tr(meta.labelKey), emoji: meta.emoji };
  return { label: translateCategoryName(tr, slug), emoji: null };
}
