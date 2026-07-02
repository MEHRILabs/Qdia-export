import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, Package, MessageSquare, FileText,
  ShieldCheck, Sparkles, ClipboardCheck, Wand2, DollarSign, CreditCard,
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
  { href: "/admin", icon: ClipboardCheck, labelKey: "nav.admin" },
];

export const EXPORT_STEPS = [
  { step: 1, titleKey: "agent.title", descKey: "agent.subtitle", href: "/agent-ia", icon: Sparkles },
  { step: 2, titleKey: "nav.products", descKey: "agent.subtitle", href: "/agent-ia", icon: Package },
  { step: 3, titleKey: "agent.step_pricing", descKey: "agent.subtitle", href: "/agent-ia", icon: DollarSign },
  { step: 4, titleKey: "nav.studio", descKey: "studio.subtitle", href: "/studio", icon: Wand2 },
  { step: 5, titleKey: "agent.step_publish", descKey: "verification.title", href: "/agent-ia", icon: ShieldCheck },
] as const;

export const HOME_CATEGORIES = [
  { name: "Agriculture & Food", slug: "Agriculture & Food", emoji: "🌾" },
  { name: "Energy & Chemicals", slug: "Energy & Chemicals", emoji: "⚡" },
  { name: "Textiles & Apparel", slug: "Textiles & Apparel", emoji: "👔" },
  { name: "Construction", slug: "Construction Materials", emoji: "🏗️" },
  { name: "Handicrafts", slug: "Handicrafts & Decor", emoji: "🎨" },
] as const;
