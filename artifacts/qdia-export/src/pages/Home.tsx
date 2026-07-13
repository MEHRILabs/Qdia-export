import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BuyerHeader, BuyerFooter } from "@/components/BuyerHeader";
import { PortsCustomsPanel } from "@/components/PortsCustomsPanel";
import { PremiumProductsSection } from "@/components/PremiumProductsSection";
import { HomeHero } from "@/components/HomeHero";
import { ExportWorkflow } from "@/components/ExportWorkflow";
import { AppDownloadSection } from "@/components/AppDownloadSection";
import { HOME_CATEGORIES } from "@/lib/nav";
import { ShieldCheck, Award, Ship, Camera, ArrowRight } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";
import { apiUrl } from "@/lib/api-base";

const TRUST_ITEMS = [
  { icon: ShieldCheck, titleKey: "home.trust_verified", descKey: "home.trust_verified_desc" },
  { icon: Award, titleKey: "home.trust_certifs", descKey: "home.trust_certifs_desc" },
  { icon: Ship, titleKey: "home.trust_incoterms_title", descKey: "home.trust_incoterms_desc" },
  { icon: Camera, titleKey: "home.trust_studio", descKey: "home.trust_studio_desc" },
];

function AnimatedSection({ children, className = "", id }: { children: ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export default function Home() {
  const { tr, rtl } = useI18n();
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(apiUrl("/api/categories"));
        if (!res.ok) return;
        const data = (await res.json()) as Array<{ name: string; image_url?: string | null }>;
        if (cancelled) return;
        const map: Record<string, string> = {};
        for (const c of data) {
          if (c.image_url) map[c.name] = c.image_url.startsWith("http") ? c.image_url : apiUrl(c.image_url);
        }
        setCategoryImages(map);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen qdia-buyer-page flex flex-col">
      <BuyerHeader />

      <main className="flex-1">
        <HomeHero />

        {/* Trust bar */}
        <section className="bg-white border-b border-[#E5E7EB] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#E8F2FB]/50 via-transparent to-[#FFF8E1]/40 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {TRUST_ITEMS.map(({ icon: Icon, titleKey, descKey }, i) => (
              <motion.div
                key={titleKey}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.45 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="flex items-start gap-3 group cursor-default"
              >
                <div className="h-11 w-11 rounded-xl bg-[#E8F2FB] flex items-center justify-center shrink-0 group-hover:bg-[#0461A5] transition-colors duration-300">
                  <Icon className="h-5 w-5 text-[#0461A5] group-hover:text-white transition-colors duration-300" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-[#1A1A2E]">{tr(titleKey)}</p>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">{tr(descKey)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <AnimatedSection className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between mb-6 gap-3 sm:gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-[#0461A5] mb-1">{tr("header.explore_catalog")}</p>
              <h2 className="text-2xl font-black text-[#1A1A2E]">{tr("home.sectors_title")}</h2>
            </div>
            <Link href="/products" className="text-sm font-semibold text-[#0461A5] hover:underline shrink-0 inline-flex items-center gap-1 self-start sm:self-auto">
              {tr("nav.catalog")} <ArrowRight className={`h-3.5 w-3.5 ${rtl ? "rotate-180" : ""}`} />
            </Link>
          </div>
          <div className="flex w-full gap-3 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible justify-start [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {HOME_CATEGORIES.map(({ nameKey, slug, emoji }, i) => {
              const img = categoryImages[slug];
              return (
              <motion.div
                key={slug}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
                whileHover={{ scale: 1.04, y: -2 }}
                className="shrink-0 sm:shrink"
              >
                <Link
                  href={`/products?category=${encodeURIComponent(slug)}`}
                  className="inline-flex items-center gap-2 px-4 sm:px-5 py-3 bg-white border border-[#E5E7EB] rounded-2xl text-sm font-semibold text-[#334257] hover:border-[#0461A5] hover:text-[#0461A5] hover:shadow-md transition-all duration-200 whitespace-nowrap"
                >
                  {img ? (
                    <img src={img} alt="" className="h-8 w-8 rounded-lg object-cover shrink-0" />
                  ) : (
                    <span className="text-lg shrink-0">{emoji}</span>
                  )}
                  <span>{tr(nameKey)}</span>
                </Link>
              </motion.div>
              );
            })}
          </div>
        </AnimatedSection>

        <ExportWorkflow />

        <PremiumProductsSection />

        <AnimatedSection id="emplacement" className="py-10 md:py-16 px-6 md:px-8 max-w-7xl mx-auto scroll-mt-20">
          <div className="text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0461A5] mb-1">{tr("home.logistics_badge")}</p>
            <h2 className="text-2xl md:text-3xl font-black text-[#1A1A2E]">{tr("home.ports_title")}</h2>
            <p className="text-sm text-[#656566] mt-2 max-w-xl mx-auto">
              {tr("home.ports_subtitle")}
            </p>
          </div>
          <PortsCustomsPanel productCategory="Agriculture & Food" portDepart="Béjaïa" showPricing={false} variant="hero" />
        </AnimatedSection>

        <AppDownloadSection />

      </main>

      <BuyerFooter />
    </div>
  );
}

