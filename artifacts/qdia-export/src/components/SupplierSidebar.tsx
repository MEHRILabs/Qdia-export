import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/BrandLogo";
import { SUPPLIER_NAV } from "@/lib/nav";
import { useI18n } from "@/contexts/I18nContext";
import { Sparkles } from "lucide-react";

interface Props {
  activePath: string;
}

export function SupplierSidebar({ activePath }: Props) {
  const { tr } = useI18n();
  const onStudio = activePath === "/studio";
  const onAgent = activePath === "/agent-ia";

  return (
    <aside className="w-[260px] qdia-sidebar hidden md:flex flex-col shrink-0">
      <div className="p-5 border-b border-white/10">
        <BrandLogo variant="sidebar" />
        <p className="text-[11px] text-white/55 mt-3 leading-relaxed">
          {tr("brand.tagline")} 🇩🇿
        </p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {SUPPLIER_NAV.map(({ href, icon: Icon, labelKey }) => {
          const active = activePath === href;
          return (
            <Link key={href} href={href} className="block relative">
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
            </Link>
          );
        })}
      </nav>

      {!onStudio && !onAgent && (
        <div className="p-4 border-t border-white/10">
          <Button variant="gold" className="w-full text-sm font-bold" asChild>
            <Link href="/agent-ia?new=1"><Sparkles className="h-4 w-4" /> {tr("supplier.add_product")}</Link>
          </Button>
        </div>
      )}
    </aside>
  );
}
