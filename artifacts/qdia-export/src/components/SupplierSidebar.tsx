import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { SUPPLIER_NAV, ADMIN_NAV, SUPPLIER_ADMIN_LINK } from "@/lib/nav";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { isAdmin } from "@/lib/roles";
import { useAppNavigate } from "@/lib/navigate";
import { Sparkles, Plus } from "lucide-react";
interface Props {
  activePath: string;
  variant?: "supplier" | "admin";
}

function isNavActive(activePath: string, href: string): boolean {
  const [path, query] = href.split("?");
  if (query) {
    const params = new URLSearchParams(window.location.search);
    const expected = new URLSearchParams(query);
    for (const [k, v] of expected.entries()) {
      if (params.get(k) !== v) return false;
    }
    return activePath === path || activePath.startsWith(`${path}?`);
  }
  if (activePath === href) return true;
  if (href === "/admin" && activePath.startsWith("/admin") && !window.location.search.includes("tab=export")) return true;
  if (href === "/supplier" && activePath.startsWith("/supplier/products")) return true;
  return false;
}

export function SupplierSidebar({ activePath, variant = "supplier" }: Props) {
  const { tr } = useI18n();
  const { user } = useAuth();
  const goTo = useAppNavigate();
  const onStudio = activePath === "/studio";
  const onAgent = activePath === "/agent-ia";
  const isAdminVariant = variant === "admin";
  const navItems = isAdminVariant
    ? ADMIN_NAV
    : (isAdmin(user) ? [...SUPPLIER_NAV, SUPPLIER_ADMIN_LINK] : SUPPLIER_NAV);

  return (
    <aside className="w-[260px] qdia-sidebar hidden md:flex flex-col shrink-0">
      <div className="p-5 border-b border-white/10">
        <BrandLogo variant="sidebar" />
        <p className="text-[11px] text-white/55 mt-3 leading-relaxed">
          {isAdminVariant ? tr("admin.sidebar_title") : tr("brand.tagline")} 🇩🇿
        </p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, labelKey }) => {
          const active = isNavActive(activePath, href);
          return (
            <button
              key={`${href}::${labelKey}`}
              type="button"
              onClick={() => goTo(href)}
              className="block relative w-full text-start"
            >
              {active && (
                <motion.span
                  layoutId="qdia-sidebar-active"
                  className="absolute inset-0 rounded-lg bg-white/12 shadow-sm"
                  style={{ borderLeft: "3px solid #F5C518" }}
                  transition={{ type: "spring", stiffness: 420, damping: 32 }}
                />
              )}
              <span
                className={`relative z-10 flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium rounded-lg transition-colors ${
                  active ? "text-white" : "text-white/70 hover:text-white"
                }`}
              >
                <motion.span
                  animate={active ? { scale: [1, 1.12, 1], rotate: [0, -4, 4, 0] } : { scale: 1, rotate: 0 }}
                  transition={active ? { duration: 0.45, ease: "easeOut" } : { duration: 0.2 }}
                  className="inline-flex shrink-0"
                >
                  <Icon className={`h-4 w-4 ${active ? "text-[#F5C518]" : ""}`} />
                </motion.span>
                {tr(labelKey)}
              </span>
            </button>
          );
        })}
      </nav>

      {!onStudio && !onAgent && (
        <div className="p-4 border-t border-white/10 space-y-2">
          {isAdminVariant ? (
            <>
              <Button variant="gold" className="w-full text-sm font-bold gap-2" asChild>
                <Link href="/admin/products/new"><Plus className="h-4 w-4" /> {tr("product_edit.new_title")}</Link>
              </Button>
              <Button variant="outline" className="w-full text-sm font-semibold border-white/20 text-white hover:bg-white/10" asChild>
                <Link href="/agent-ia?new=1"><Sparkles className="h-4 w-4" /> {tr("nav.agent_ia")}</Link>
              </Button>
            </>
          ) : (
            <Button variant="gold" className="w-full text-sm font-bold" asChild>
              <Link href="/agent-ia?new=1"><Sparkles className="h-4 w-4" /> {tr("supplier.add_product")}</Link>
            </Button>
          )}
        </div>
      )}
    </aside>
  );
}
