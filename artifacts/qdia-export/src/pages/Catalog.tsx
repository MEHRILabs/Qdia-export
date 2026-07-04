import { useState, useEffect, useMemo, useDeferredValue } from "react";
import { Link } from "wouter";
import { useListCategories } from "@workspace/api-client-react";
import type { Product } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { BuyerHeader, BuyerFooter } from "@/components/BuyerHeader";
import { AdvancedCatalogFilters, DEFAULT_CATALOG_FILTERS, type CatalogFilters } from "@/components/AdvancedCatalogFilters";
import { translateCategoryName } from "@/lib/nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Plus, Sparkles, FileDown } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { platformApi } from "@/lib/platform-api";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { isSupplier } from "@/lib/roles";

export default function Catalog() {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [categoryName, setCategoryName] = useState<string>("ALL");
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_CATALOG_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const cat = new URLSearchParams(window.location.search).get("category");
    if (cat) setCategoryName(cat);
  }, []);

  const { data: categories } = useListCategories();
  const { data: productCategories } = useQuery({
    queryKey: ["product-categories"],
    queryFn: () => platformApi.getProductCategories(),
  });
  const categoryId = categoryName !== "ALL"
    ? categories?.find(c => c.name === categoryName)?.id ?? null
    : null;

  const incoterm = filters.incoterm || undefined;

  const { data: productList, isLoading, isError } = useQuery({
    queryKey: ["catalog-products", deferredSearch, categoryName, filters],
    queryFn: () => platformApi.listProductsFiltered({
      search: deferredSearch || undefined,
      category: categoryName !== "ALL" ? categoryName : undefined,
      category_id: categoryId ?? undefined,
      incoterm,
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

  const categoryOptions = useMemo(() => {
    const fromApi = productCategories?.data?.map(c => c.name) ?? [];
    const fromDb = categories?.map(c => c.name) ?? [];
    return [...new Set([...fromApi, ...fromDb])].sort();
  }, [productCategories, categories]);
  const { tr } = useI18n();
  const { user } = useAuth();

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
            {isSupplier(user) && (
            <Button variant="gold" className="font-bold gap-2" asChild>
            <Link href="/agent-ia?new=1">
              <Plus className="h-4 w-4" /> {tr("supplier.add_product")}
            </Link>
            </Button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center mb-8">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9CA3AF] pointer-events-none" />
            <Input
              placeholder={tr("catalog.search_placeholder")}
              className="ps-9 h-11 w-full"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={categoryName} onValueChange={setCategoryName}>
              <SelectTrigger className="flex-1 sm:w-[220px] h-11">
                <SelectValue placeholder={tr("catalog.categories_placeholder")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{tr("catalog.all_categories")}</SelectItem>
                {categoryOptions.map(cat => (
                  <SelectItem key={cat} value={cat}>{translateCategoryName(tr, cat)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {products.map(product => (
              <Link key={product.id} href={`/products/${product.id}`} className="qdia-product-card group overflow-hidden block">
                <div className="aspect-[4/3] overflow-hidden relative bg-[#F8FAFC]">
                  <ProductImage
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-3 start-3 badge-algeria text-[10px]">🇩🇿 {tr("common.algeria")}</span>
                </div>
                <div className="p-4">
                  <p className="text-[11px] text-[#9CA3AF] mb-1">{product.category}</p>
                  <h3 className="font-bold text-[#1A1A2E] text-sm line-clamp-2 leading-snug mb-2">{product.name}</h3>
                  <p className="text-xl font-black text-[#0461A5]">
                    ${product.prices?.fob?.toLocaleString() ?? "—"}
                    <span className="text-xs font-normal text-[#9CA3AF] ms-1">{tr("product.fob")}</span>
                  </p>
                  <p className="text-xs text-[#9CA3AF] mt-1">MOQ {product.moq} {product.moq_unit} · {product.port_depart}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <Badge variant="incoterm" className="text-[10px]">{tr("product.fob")}</Badge>
                    <span className="text-xs font-semibold text-[#0461A5] group-hover:underline">{tr("common.view_details")}</span>
                  </div>
                </div>
              </Link>
            ))}
            {products.length === 0 && !isLoading && (
              <div className="col-span-full py-16 text-center space-y-4">
                <p className="text-[#9CA3AF]">{isError ? tr("catalog.load_error") : tr("catalog.no_results")}</p>
                {isSupplier(user) && (
                <Button asChild>
                  <Link href="/agent-ia?new=1"><Sparkles className="h-4 w-4 me-2" /> {tr("catalog.publish_first")}</Link>
                </Button>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <BuyerFooter />
    </div>
  );
}
