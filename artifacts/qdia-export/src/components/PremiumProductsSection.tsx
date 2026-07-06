import { Link } from "wouter";
import { motion } from "framer-motion";
import { useListFeaturedProducts } from "@workspace/api-client-react";
import { PremiumProductCard } from "@/components/PremiumProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { hasRealProductImage } from "@/lib/images";
import { useI18n } from "@/contexts/I18nContext";
import { ArrowRight } from "lucide-react";

export function PremiumProductsSection() {
  const { tr, rtl } = useI18n();
  const { data: featuredProducts, isLoading } = useListFeaturedProducts();
  const products = (featuredProducts ?? []).filter(p => hasRealProductImage(p.image_url));

  return (
    <section className="relative max-w-7xl mx-auto px-6 pb-20 pt-4 overflow-hidden">
      <div className="absolute -top-20 right-0 w-72 h-72 rounded-full bg-[#F5C518]/10 blur-3xl pointer-events-none" />
      <div className="absolute top-40 -left-20 w-64 h-64 rounded-full bg-[#0461A5]/8 blur-3xl pointer-events-none" />

      <div className="relative flex items-end justify-between mb-8 gap-4">
        <div>
          <motion.p
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-xs font-bold uppercase tracking-widest text-[#0461A5] mb-1"
          >
            {tr("home.premium_selection")}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.05 }}
            className="text-2xl md:text-3xl font-black text-[#1A1A2E]"
          >
            {tr("home.featured_title")}
          </motion.h2>
          <p className="text-sm text-[#9CA3AF] mt-1">{tr("home.featured_subtitle")}</p>
        </div>
        <Button variant="outline" className="border-[#0461A5] text-[#0461A5] shrink-0 hidden sm:flex" asChild>
          <Link href="/products">
            {tr("home.see_all")} <ArrowRight className={`h-4 w-4 ms-1 ${rtl ? "rotate-180" : ""}`} />
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[360px] rounded-2xl" />)}
        </div>
      ) : products.length === 0 ? (
        <p className="text-center text-[#9CA3AF] py-12">{tr("home.empty_featured")}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {products.slice(0, 6).map((product, i) => (
            <PremiumProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      )}

      <div className="mt-10 text-center sm:hidden">
        <Button variant="gold" className="font-bold" asChild>
          <Link href="/products">{tr("home.see_full_catalog")}</Link>
        </Button>
      </div>
    </section>
  );
}
