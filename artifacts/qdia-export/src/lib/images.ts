import { apiUrl } from "./api-base";

/** Chemins des images locales (dossier public/) */
export const IMAGES = {
  logo: "/logo.png",
  hero: "/hero.png",
  oliveOil: "/olive-oil.png",
  dates: "/dates.png",
  honey: "/honey.png",
  textile: "/rug.png",
  couscous: "/couscous.png",
  pottery: "/pottery.png",
  agriculture: "/images/category-agriculture.jpg",
  /** Placeholder affiché tant qu'aucune photo IA n'est générée */
  qdiaPhoto: "/qdia-photo-placeholder.svg",
} as const;

/** Vrai visuel produit (pas placeholder ni image démo générique) */
export function hasRealProductImage(imageUrl?: string | null): boolean {
  if (!imageUrl?.trim()) return false;
  const u = imageUrl.trim();
  if (u === IMAGES.qdiaPhoto) return false;
  if (u.includes("/qdia-photo-placeholder")) return false;
  if (u.includes("Photo IA à générer")) return false;
  if (u.startsWith("/uploads/catalog/") && u.endsWith(".svg") && u.includes("QDIA Photo")) return false;
  if (u.startsWith("data:") || u.startsWith("http")) return true;
  if (u.startsWith("/uploads/catalog/")) return true;
  if (u.startsWith("/") && !u.endsWith(".svg")) return true;
  return false;
}

/** URL à afficher : photo réelle ou placeholder « QDIA Photo » */
export function productImage(imageUrl?: string | null, _category?: string): string {
  if (hasRealProductImage(imageUrl)) return resolveProductImageUrl(imageUrl);
  return IMAGES.qdiaPhoto;
}

/** Préfixe API pour /uploads/… (dev proxy ou VITE_API_URL en prod) */
export function resolveProductImageUrl(imageUrl?: string | null): string {
  if (!imageUrl?.trim()) return "";
  const u = imageUrl.trim();
  if (u.startsWith("http") || u.startsWith("data:")) return u;
  if (u.startsWith("/uploads/")) return apiUrl(u);
  return u;
}
