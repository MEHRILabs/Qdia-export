import { Link } from "wouter";
import { motion, useInView } from "framer-motion";
import { useRef, type ReactNode } from "react";
import { useListFeaturedProducts } from "@workspace/api-client-react";
import { BuyerHeader, BuyerFooter } from "@/components/BuyerHeader";
import { PortsCustomsPanel } from "@/components/PortsCustomsPanel";
import { HomeHero } from "@/components/HomeHero";
import { ExportWorkflow } from "@/components/ExportWorkflow";
import { ProductImage } from "@/components/ProductImage";
import { HOME_CATEGORIES } from "@/lib/nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldCheck, Award, Ship, Camera, ArrowRight } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

const TRUST_ITEMS = [
  { icon: ShieldCheck, title: "Fournisseurs vérifiés", desc: "Audit QDIA" },
  { icon: Award, title: "Certifications", desc: "ISO · Bio · Halal" },
  { icon: Ship, title: "Incoterms", desc: "EXW → CIF" },
  { icon: Camera, title: "Studio IA", desc: "Photos export pro" },
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
  const { tr } = useI18n();
  const { data: featuredProducts, isLoading } = useListFeaturedProducts();
  const products = featuredProducts ?? [];

  return (
    <div className="min-h-screen qdia-buyer-page flex flex-col">
      <BuyerHeader />

      <main className="flex-1">
        <HomeHero />

        {/* Trust bar */}
        <section className="bg-white border-b border-[#E5E7EB] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-[#E8F2FB]/50 via-transparent to-[#FFF8E1]/40 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {TRUST_ITEMS.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
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
                <div>
                  <p className="font-semibold text-sm text-[#1A1A2E]">{title}</p>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Categories */}
        <AnimatedSection className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-end justify-between mb-6 gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#0461A5] mb-1">{tr("header.explore_catalog")}</p>
              <h2 className="text-2xl font-black text-[#1A1A2E]">{tr("home.sectors_title")}</h2>
            </div>
            <Link href="/products" className="text-sm font-semibold text-[#0461A5] hover:underline shrink-0 flex items-center gap-1">
              {tr("nav.catalog")} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="flex flex-wrap gap-3">
            {HOME_CATEGORIES.map(({ name, slug, emoji }, i) => (
              <motion.div
                key={slug}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.35 }}
                whileHover={{ scale: 1.04, y: -2 }}
              >
                <Link
                  href={`/products?category=${encodeURIComponent(slug)}`}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-white border border-[#E5E7EB] rounded-2xl text-sm font-semibold text-[#334257] hover:border-[#0461A5] hover:text-[#0461A5] hover:shadow-md transition-all duration-200"
                >
                  <span className="text-lg">{emoji}</span> {name}
                </Link>
              </motion.div>
            ))}
          </div>
        </AnimatedSection>

        <ExportWorkflow />

        {/* Products */}
        <AnimatedSection className="max-w-7xl mx-auto px-6 pb-20 pt-4">
          <div className="flex items-end justify-between mb-8 gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-[#0461A5] mb-1">{tr("home.premium_selection")}</p>
              <h2 className="text-2xl md:text-3xl font-black text-[#1A1A2E]">{tr("home.featured_title")}</h2>
              <p className="text-sm text-[#9CA3AF] mt-1">{tr("home.featured_subtitle")}</p>
            </div>
            <Button variant="outline" className="border-[#0461A5] text-[#0461A5] shrink-0 hidden sm:flex" asChild>
              <Link href="/products">{tr("home.see_all")} <ArrowRight className="h-4 w-4 ml-1" /></Link>
            </Button>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[340px] rounded-xl" />)}
            </div>
          ) : products.length === 0 ? (
            <p className="text-center text-[#9CA3AF] py-12">{tr("home.empty_featured")}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {products.slice(0, 6).map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.45 }}
                >
                  <Link href={`/products/${product.id}`} className="qdia-product-card group overflow-hidden block">
                    <div className="aspect-[4/3] overflow-hidden relative bg-[#F8FAFC]">
                      <ProductImage
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full group-hover:scale-110 transition-transform duration-700"
                      />
                      <span className="absolute top-3 left-3 badge-algeria text-[10px]">🇩🇿 Algeria</span>
                      <div className="absolute inset-0 bg-gradient-to-t from-[#073B74]/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                        <span className="text-white text-sm font-bold flex items-center gap-1">
                          Voir & commander <ArrowRight className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-[#1A1A2E] text-sm line-clamp-2 leading-snug mb-2 min-h-[2.5rem] group-hover:text-[#0461A5] transition-colors">
                        {product.name}
                      </h3>
                      <p className="text-xl font-black text-[#0461A5]">
                        ${product.prices?.fob?.toLocaleString() ?? "—"}
                        <span className="text-xs font-normal text-[#9CA3AF] ml-1">FOB</span>
                      </p>
                      <p className="text-xs text-[#9CA3AF] mt-1">MOQ {product.moq} {product.moq_unit}</p>
                      <div className="mt-3 flex items-center gap-2">
                        <Badge variant="incoterm" className="text-[10px]">FOB</Badge>
                        <span className="text-[11px] text-[#9CA3AF]">{product.port_depart}</span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          <div className="mt-10 text-center sm:hidden">
            <Button variant="gold" className="font-bold" asChild>
              <Link href="/products">{tr("home.see_full_catalog")}</Link>
            </Button>
          </div>
        </AnimatedSection>

        <AnimatedSection id="emplacement" className="py-10 md:py-16 px-6 md:px-8 max-w-7xl mx-auto scroll-mt-20">
          <div className="text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-[#0461A5] mb-1">{tr("home.logistics_badge")}</p>
            <h2 className="text-2xl md:text-3xl font-black text-[#1A1A2E]">{tr("home.ports_title")}</h2>
            <p className="text-sm text-[#656566] mt-2 max-w-xl mx-auto">
              {tr("home.ports_subtitle")}
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <PortsCustomsPanel productCategory="Agriculture & Food" portDepart="Béjaïa" fobPrice={51000} />
          </div>
        </AnimatedSection>

      </main>

      <BuyerFooter />
    </div>
  );
}
