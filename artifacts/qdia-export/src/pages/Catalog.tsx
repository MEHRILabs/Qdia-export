import { useState, useDeferredValue } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { BuyerHeader, BuyerFooter } from "@/components/BuyerHeader";
import { AdvancedCatalogFilters, DEFAULT_CATALOG_FILTERS, type CatalogFilters } from "@/components/AdvancedCatalogFilters";
import { CategoryFilter } from "@/components/CategoryFilter";
import { CatalogProductGrid } from "@/components/CatalogProductGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, FileDown } from "lucide-react";
import { platformApi } from "@/lib/platform-api";
import { ALL_CATEGORIES } from "@/lib/catalog-categories";
import { useCatalogCategory } from "@/hooks/useCatalogCategory";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { isExporterOnly } from "@/lib/roles";
import type { Product } from "@workspace/api-client-react";

export default function Catalog() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_CATALOG_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const { categoryName, setCategory, categoryId, options } = useCatalogCategory();
  const { tr } = useI18n();
  const { user } = useAuth();

  const { data: productList, isLoading, isError } = useQuery({
    queryKey: ["catalog-products", deferredSearch, categoryName, filters],
    queryFn: () => platformApi.listProductsFiltered({
      search: deferredSearch || undefined,
      category: categoryName !== ALL_CATEGORIES ? categoryName : undefined,
      category_id: categoryId ?? undefined,
      incoterm: filters.incoterm || undefined,
      moq_min: filters.moqMin ? parseFloat(filters.moqMin) : undefined,
      moq_max: filters.moqMax ? parseFloat(filters.moqMax) : undefined,
      price_min: filters.priceMin ? parseFloat(filters.priceMin) : undefined,
      price_max: filters.priceMax ? parseFloat(filters.priceMax) : undefined,
      origin_wilaya: filters.originWilaya || undefined,
      supplier_id: filters.supplierId ? parseInt(filters.supplierId, 10) : undefined,
      limit: 50,
    }),
  });

  const products: Product[] = (productList?.data as Product[] | undefined) ?? [];

  return (
    <div className="min-h-screen qdia-buyer-page flex flex-col">
      <BuyerHeader />

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-[28px] font-black text-[#1A1A2E] mb-1">{tr("catalog.title")}</h1>
            <p className="text-sm text-[#656566]">
              {tr("catalog.subtitle")} 🇩🇿
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" className="font-bold gap-2" onClick={() => window.open(platformApi.catalogPdfUrl(), "_blank")}>
              <FileDown className="h-4 w-4" /> {tr("catalog.pdf")}
            </Button>
            {isExporterOnly(user) && (
              <Button variant="gold" className="font-bold gap-2" asChild>
                <Link href="/agent-ia?new=1">
                  <Plus className="h-4 w-4" /> {tr("supplier.add_product")}
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start mb-8">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF] pointer-events-none" />
            <Input
              placeholder={tr("catalog.search_placeholder")}
              className="ps-9 h-11 w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto sm:items-start">
            <CategoryFilter
              value={categoryName}
              onChange={setCategory}
              options={options}
              className="flex-1 sm:flex-none"
            />
            <Button variant="outline" className="h-11 shrink-0 px-4" onClick={() => setShowFilters(v => !v)}>
              {tr("filters.title")}
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="mb-8">
            <AdvancedCatalogFilters
              filters={filters}
              onChange={setFilters}
              onReset={() => setFilters(DEFAULT_CATALOG_FILTERS)}
            />
          </div>
        )}

        <CatalogProductGrid
          categoryKey={`${categoryName}-${deferredSearch}`}
          products={products}
          isLoading={isLoading}
          isError={isError}
          showPublishCta={isExporterOnly(user)}
        />
      </main>

      <BuyerFooter />
    </div>
  );
}
