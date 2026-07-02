import { useQuery } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { BuyerHeader, BuyerFooter } from "@/components/BuyerHeader";
import { SupplierReviewsSection } from "@/components/SupplierReviewsSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { platformApi } from "@/lib/platform-api";
import { ProductImage } from "@/components/ProductImage";
import { apiUrl } from "@/lib/api-base";
import { MapPin, ShieldCheck } from "lucide-react";
import { useI18n } from "@/contexts/I18nContext";

export default function SupplierPublic() {
  const { tr } = useI18n();
  const [, params] = useRoute("/suppliers/:id");
  const id = parseInt(params?.id ?? "0", 10);

  const { data: supplier } = useQuery({
    queryKey: ["supplier", id],
    queryFn: () => platformApi.getSupplier(id),
    enabled: id > 0,
  });

  const { data: products } = useQuery({
    queryKey: ["supplier-products", id],
    queryFn: async () => {
      const res = await fetch(apiUrl(`/api/products?supplier_id=${id}&limit=20`));
      return res.json() as Promise<{ data: Array<{ id: number; name: string; category: string; image_url?: string; prices?: { fob?: number } }> }>;
    },
    enabled: id > 0,
  });

  const s = supplier as { company_name?: string; wilaya?: string; verified?: boolean; verification_level?: number } | undefined;

  return (
    <div className="min-h-screen qdia-buyer-page flex flex-col">
      <BuyerHeader />
      <main className="flex-1 p-6 md:p-8 max-w-5xl mx-auto w-full">
        <div className="bg-white rounded-2xl border p-6 mb-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-[#073B74]">{s?.company_name ?? tr("supplier_public.default_name").replace("{id}", String(id))}</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="h-4 w-4" /> {s?.wilaya ?? tr("common.algeria")} 🇩🇿
              </p>
              {s?.verified && (
                <Badge className="mt-2 gap-1"><ShieldCheck className="h-3 w-3" /> {tr("supplier_public.verified")}</Badge>
              )}
            </div>
            <Button asChild><Link href="/rfq">{tr("supplier_public.request_quote")}</Link></Button>
          </div>
        </div>
        <h2 className="text-lg font-bold mb-4">{tr("supplier_public.catalog_title")}</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(products?.data ?? []).map(p => (
            <Link key={p.id} href={`/products/${p.id}`} className="border rounded-xl overflow-hidden hover:shadow-md transition-shadow block">
              <div className="aspect-[4/3] bg-[#F8FAFC]">
                <ProductImage src={p.image_url} alt={p.name} className="w-full h-full" />
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm line-clamp-2">{p.name}</p>
                <p className="text-[#0461A5] font-bold text-sm mt-1">${p.prices?.fob ?? "—"} {tr("product.fob")}</p>
              </div>
            </Link>
          ))}
        </div>
        {!products?.data?.length && (
          <p className="text-muted-foreground text-sm">{tr("supplier_public.empty")}</p>
        )}

        <div className="mt-10">
          <SupplierReviewsSection supplierId={id} />
        </div>
      </main>
      <BuyerFooter />
    </div>
  );
}
