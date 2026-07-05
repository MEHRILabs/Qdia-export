import { Link, useParams } from "wouter";
import { useGetProduct, getGetProductQueryKey } from "@workspace/api-client-react";
import { BuyerHeader, BuyerFooter } from "@/components/BuyerHeader";
import { ProductOrderFlow } from "@/components/ProductOrderFlow";
import { ProductEngagement } from "@/components/ProductEngagement";
import { ProductRecommendations } from "@/components/ProductRecommendations";
import { OemSamplePanel } from "@/components/OemSamplePanel";
import { SupplierReviewsSection } from "@/components/SupplierReviewsSection";
import { PortsCustomsPanel } from "@/components/PortsCustomsPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Star, ShieldCheck, ChevronRight, MapPin, FileDown, Factory } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { platformApi } from "@/lib/platform-api";
import { useI18n } from "@/contexts/I18nContext";
import { formatLocation, formatUnitLabel } from "@/lib/display-text";

export default function ProductDetail() {
  const params = useParams();
  const productId = parseInt(params.id || "0");

  const { data: product, isLoading: loading } = useGetProduct(productId, {
    query: {
      enabled: productId > 0,
      queryKey: getGetProductQueryKey(productId),
    },
  });
  const { tr } = useI18n();

  if (loading) {
    return (
      <div className="min-h-screen qdia-buyer-page flex flex-col">
        <BuyerHeader />
        <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
        <BuyerFooter />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen qdia-buyer-page flex flex-col">
        <BuyerHeader />
        <div className="flex-1 p-8 text-center space-y-4">
          <p>{tr("product_detail.not_found")}</p>
          <Button asChild><Link href="/products">{tr("product_detail.back_catalog")}</Link></Button>
        </div>
        <BuyerFooter />
      </div>
    );
  }

  const prices = product.prices as typeof product.prices & { retail?: number; wholesale?: number; ddp?: number };
  const unitLabel = formatUnitLabel(prices.unit, tr);
  const moqUnitLabel = formatUnitLabel(product.moq_unit, tr);
  const supplierLocation = formatLocation(product.supplier_location, tr);
  const productExt = product as typeof product & {
    origin_country?: string;
    export_authorized?: boolean;
    stock_countries?: string[];
  };

  return (
    <div className="min-h-screen qdia-buyer-page flex flex-col">
      <BuyerHeader />

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
        <div className="flex items-center text-sm text-muted-foreground mb-6 flex-wrap gap-1">
          <Link href="/products" className="hover:text-primary transition-colors">{tr("catalog.breadcrumb")}</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href={`/products?category=${encodeURIComponent(product.category)}`} className="hover:text-primary transition-colors">
            {product.category}
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground truncate max-w-[200px]">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12">
          <div className="space-y-4">
            <div className="aspect-square bg-white rounded-xl border overflow-hidden flex items-center justify-center p-4 shadow-sm">
              <ProductImage src={product.image_url} alt={product.name} fit="contain" className="max-w-full max-h-full w-full h-full rounded-lg" />
            </div>
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {product.images.slice(0, 4).map((img, i) => (
                  <div key={i} className="aspect-square bg-white rounded-lg border overflow-hidden p-2">
                    <img src={img} alt="" className="w-full h-full object-contain" />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <Badge className="bg-primary/10 text-primary border-primary/20">
                  <ShieldCheck className="h-3 w-3 mr-1" /> {tr("product_detail.verified_supplier")}
                </Badge>
                <span className="badge-algeria">🇩🇿 {tr("product_detail.made_in_algeria")}</span>
                {productExt.export_authorized === false && (
                  <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                    <Factory className="h-3 w-3 mr-1" /> {tr("order_flow.export_pending")}
                  </Badge>
                )}
                {product.sku && <Badge variant="outline" className="text-xs">{product.sku}</Badge>}
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A1A2E] mb-2">{product.name}</h1>
              <div className="flex items-center gap-4 text-sm flex-wrap text-[#656566]">
                <span className="flex items-center text-amber-500">
                  <Star className="h-4 w-4 fill-current mr-1" />
                  {product.rating?.toFixed(1) ?? "—"}
                </span>
                <span>{product.review_count ?? 0} {tr("product.reviews")}</span>
                <span>·</span>
                <span>{product.orders_fulfilled ?? 0} commandes</span>
              </div>
            </div>

            {product.description && (
              <div className="text-sm text-[#656566] leading-relaxed border-l-4 border-[#0461A5] pl-4">
                {product.description}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                [tr("product.moq"), `${product.moq} ${moqUnitLabel}`],
                [tr("product_detail.departure_port"), product.port_depart],
                [tr("product_detail.packaging"), product.packaging ?? tr("product_detail.export_standard")],
                [tr("product.origin"), product.origin_wilaya ?? tr("common.algeria")],
                ...(prices?.retail != null
                  ? [[tr("product_detail.retail_price"), `${prices.retail.toLocaleString()} DZD`]]
                  : []),
                ...(prices?.wholesale != null
                  ? [[tr("product_detail.wholesale_price"), `${prices.wholesale.toLocaleString()} DZD`]]
                  : []),
              ].map(([label, value]) => (
                <div key={label}>
                  <span className="text-[#9CA3AF] text-xs block mb-0.5">{label}</span>
                  <span className="font-medium text-[#1A1A2E]">{value}</span>
                </div>
              ))}
            </div>

            {product.certifications && product.certifications.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">{tr("product.certifications")}</h3>
                  <Button variant="outline" size="sm" className="gap-1" asChild>
                    <a href={platformApi.certificatePdfUrl(productId)} target="_blank" rel="noreferrer">
                      <FileDown className="h-3 w-3" /> {tr("product.certificate_pdf")}
                    </a>
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.certifications.map((cert, i) => (
                    <Badge key={i} variant="outline" className="bg-white">
                      <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" />{cert}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {product.target_markets && product.target_markets.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap text-sm">
                <MapPin className="h-4 w-4 text-[#0461A5]" />
                <span className="text-[#656566]">{tr("product_detail.target_markets")}</span>
                {product.target_markets.map(m => (
                  <Badge key={m} variant="secondary">{m}</Badge>
                ))}
              </div>
            )}

            <div className="rounded-xl border bg-[#FAFBFC] p-4 flex items-start gap-3">
              <div className="flex-1">
                <p className="font-bold text-[#1A1A2E]">{product.supplier_name ?? tr("product_detail.default_supplier")}</p>
                <p className="text-sm text-[#9CA3AF]">{supplierLocation}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-[#0461A5] shrink-0" />
            </div>

            <PortsCustomsPanel
              productCategory={product.category}
              portDepart={product.port_depart}
              showPricing={false}
            />

            <ProductOrderFlow
              product={productExt}
              unitLabel={unitLabel}
              moqUnitLabel={moqUnitLabel}
            />

            {product.supplier_id && (
              <SupplierReviewsSection supplierId={product.supplier_id} />
            )}

            <OemSamplePanel productId={product.id} supplierId={product.supplier_id} />

            <ProductEngagement productId={product.id} productName={product.name} category={product.category} />
          </div>
        </div>

        <div className="mt-12">
          <ProductRecommendations productId={product.id} />
        </div>
      </main>
      <BuyerFooter />
    </div>
  );
}
