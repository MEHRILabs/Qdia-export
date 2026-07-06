import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Package, MessageSquare, FileText,
  ShieldCheck, Sparkles, ClipboardCheck, Wand2, DollarSign, CreditCard, Pencil, Factory,
} from "lucide-react";

export const BUYER_NAV_KEYS = [
  { href: "/supplier", labelKey: "header.supplier_space" },
  { href: "/favoris", labelKey: "nav.favorites" },
  { href: "/panier", labelKey: "cart.title" },
  { href: "/commandes", labelKey: "orders.title" },
  { href: "/suivi", labelKey: "tracking.page_title" },
] as const;

export const SUPPLIER_NAV: { href: string; labelKey: string; icon: LucideIcon }[] = [
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { href: "/supplier", icon: Package, labelKey: "nav.products" },
  { href: "/agent-ia", icon: Sparkles, labelKey: "nav.agent_ia" },
  { href: "/studio", icon: Wand2, labelKey: "nav.studio" },
  { href: "/inquiries", icon: MessageSquare, labelKey: "nav.inquiries" },
  { href: "/transactions", icon: CreditCard, labelKey: "nav.transactions" },
  { href: "/facturation", icon: DollarSign, labelKey: "nav.billing" },
  { href: "/messages", icon: MessageSquare, labelKey: "nav.messages" },
  { href: "/profile", icon: ShieldCheck, labelKey: "nav.profile" },
  { href: "/rfq", icon: FileText, labelKey: "nav.rfq_portal" },
  { href: "/verification", icon: ShieldCheck, labelKey: "nav.verification" },
];

/** Lien admin réservé aux comptes administrateur (injecté dans la sidebar fournisseur). */
export const SUPPLIER_ADMIN_LINK = { href: "/admin", icon: ClipboardCheck, labelKey: "nav.admin" } as const;

/** Navigation latérale admin — modifier produits, export usine, facturation, RFQ */
export const ADMIN_NAV: { href: string; labelKey: string; icon: LucideIcon }[] = [
  { href: "/admin", icon: Pencil, labelKey: "nav.edit_products" },
  { href: "/admin?tab=export", icon: Factory, labelKey: "admin.tab_export" },
  { href: "/facturation", icon: DollarSign, labelKey: "nav.billing" },
  { href: "/rfq", icon: FileText, labelKey: "nav.rfq_portal" },
  { href: "/mes-rfq", icon: FileText, labelKey: "nav.my_rfqs" },
  { href: "/inquiries", icon: MessageSquare, labelKey: "nav.inquiries" },
  { href: "/transactions", icon: CreditCard, labelKey: "nav.transactions" },
  { href: "/messages", icon: MessageSquare, labelKey: "nav.messages" },
];

export const EXPORT_STEPS = [
  { step: 1, titleKey: "agent.title", descKey: "agent.subtitle", href: "/agent-ia", icon: Sparkles },
  { step: 2, titleKey: "nav.products", descKey: "agent.subtitle", href: "/agent-ia", icon: Package },
  { step: 3, titleKey: "agent.step_pricing", descKey: "agent.subtitle", href: "/agent-ia", icon: DollarSign },
  { step: 4, titleKey: "nav.studio", descKey: "studio.subtitle", href: "/studio", icon: Wand2 },
  { step: 5, titleKey: "agent.step_publish", descKey: "verification.title", href: "/agent-ia", icon: ShieldCheck },
] as const;

export const HOME_CATEGORIES = [
  { nameKey: "home.sector_agro", slug: "Agriculture & Food", emoji: "🌾" },
  { nameKey: "home.sector_energy", slug: "Energy & Chemicals", emoji: "⚡" },
  { nameKey: "home.sector_textiles", slug: "Textiles & Apparel", emoji: "👔" },
  { nameKey: "home.sector_construction", slug: "Construction Materials", emoji: "🏗️" },
  { nameKey: "home.sector_handicrafts", slug: "Handicrafts & Decor", emoji: "🎨" },
] as const;

/** Mappe les noms de catégories API (anglais) vers des clés i18n. */
const HOME_CATEGORY_KEYS = Object.fromEntries(
  HOME_CATEGORIES.map(c => [c.slug, c.nameKey]),
) as Record<string, string>;

export const CATEGORY_I18N_KEYS: Record<string, string> = {
  ...HOME_CATEGORY_KEYS,
  Construction: "home.sector_construction",
  Handicrafts: "home.sector_handicrafts",
  Agroalimentaire: "home.sector_agro",
  Épicerie: "home.sector_agro",
  "Conserves & Condiments": "home.sector_agro",
  Boissons: "home.sector_agro",
  "Produits laitiers": "home.sector_agro",
  "Fruits & Légumes": "home.sector_agro",
  Charcuterie: "home.sector_agro",
  "Boucherie & Volaille": "home.sector_agro",
  "Boulangerie & Pâtisserie": "home.sector_agro",
  Poissonnerie: "home.sector_agro",
  "Hygiène & Beauté": "home.sector_energy",
  "Droguerie & Entretien": "home.sector_energy",
  Textiles: "home.sector_textiles",
  Papeterie: "home.sector_handicrafts",
  "Confort maison": "home.sector_handicrafts",
  Artisanat: "home.sector_handicrafts",
  NON_CLASSE: "home.sector_agro",
};

export function translateCategoryName(tr: (key: string) => string, name: string): string {
  const key = CATEGORY_I18N_KEYS[name];
  return key ? tr(key) : name;
}
