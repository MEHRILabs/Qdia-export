import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { platformApi } from "@/lib/platform-api";
import { ProductImage } from "@/components/ProductImage";
import { useI18n } from "@/contexts/I18nContext";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  productId?: number;
  limit?: number;
}

export function ProductRecommendations({ productId, limit = 8 }: Props) {
  const { tr } = useI18n();
  const { data, isLoading } = useQuery({
    queryKey: ["recommendations", productId, limit],
    queryFn: () => platformApi.getRecommendations(productId, limit),
  });
  const products = data?.data ?? [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
    );
  }

  if (!products.length) return null;

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg text-[#1A1A2E]">{tr("recommendations.title")}</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {products.map(p => {
          const id = p.id as number;
          const name = String(p.name ?? "");
          const category = String(p.category ?? "");
          const fob = (p.prices as { fob?: number } | undefined)?.fob;
          return (
            <Link key={id} href={`/products/${id}`} className="border rounded-xl overflow-hidden hover:shadow-md transition-shadow block">
              <div className="aspect-square bg-[#F8FAFC]">
                <ProductImage src={p.image_url as string | undefined} alt={name} compact className="w-full h-full" />
              </div>
              <div className="p-2">
                <p className="text-xs font-semibold line-clamp-2">{name}</p>
                {fob != null && <p className="text-[#0461A5] font-bold text-xs mt-1">${fob} {tr("product.fob")}</p>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
