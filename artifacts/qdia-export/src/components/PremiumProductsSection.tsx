import { Link } from "wouter";
import { useMemo } from "react";
import { useListFeaturedProducts, useListProducts } from "@workspace/api-client-react";
import { PremiumProductCard } from "@/components/PremiumProductCard";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { hasRealProductImage } from "@/lib/images";
import { useI18n } from "@/contexts/I18nContext";
import { ArrowRight } from "lucide-react";
import type { Product } from "@workspace/api-client-react";

function sortProductsForHome(list: Product[]): Product[] {
  return [...list].sort((a, b) => {
    const ap = hasRealProductImage(a.image_url) ? 1 : 0;
    const bp = hasRealProductImage(b.image_url) ? 1 : 0;
    if (bp !== ap) return bp - ap;
    return (b.rating ?? 0) - (a.rating ?? 0);
  });
}

export function PremiumProductsSection() {
  const { tr, rtl } = useI18n();
  const { data: featuredProducts, isLoading: loadingFeatured } = useListFeaturedProducts();
  const needFallback = !loadingFeatured && !(featuredProducts?.length);
  const { data: catalogPage, isLoading: loadingCatalog } = useListProducts(
    { limit: 12, page: 1 },
    { query: { enabled: needFallback } },
  );

  const isLoading = loadingFeatured || (needFallback && loadingCatalog);

  const products = useMemo(() => {
    const source = featuredProducts?.length
      ? featuredProducts
      : (catalogPage?.data ?? []);
    return sortProductsForHome(source).slice(0, 6);
  }, [featuredProducts, catalogPage]);

  return (
    <section className="relative max-w-7xl mx-auto px-6 pb-20 pt-4">
      <div className="flex items-end justify-between mb-8 gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#0461A5] mb-1">
            {tr("home.premium_selection")}
          </p>
          <h2 className="text-2xl md:text-3xl font-black text-[#1A1A2E]">
            {tr("home.featured_title")}
          </h2>
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
          {products.map((product, i) => (
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
