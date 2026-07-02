import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { BuyerHeader, BuyerFooter } from "@/components/BuyerHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { platformApi } from "@/lib/platform-api";
import { ProductImage } from "@/components/ProductImage";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useI18n } from "@/contexts/I18nContext";
import { Heart, ArrowRight } from "lucide-react";
import { useListProducts } from "@workspace/api-client-react";

function FavoritesContent() {
  const { tr } = useI18n();
  const { data: favData } = useQuery({
    queryKey: ["favorites"],
    queryFn: () => platformApi.getFavorites(),
  });
  const ids = new Set(favData?.product_ids ?? []);
  const { data: productList } = useListProducts({ limit: 100 });
  const favorites = (productList?.data ?? []).filter(p => ids.has(p.id));

  return (
    <div className="min-h-screen qdia-buyer-page flex flex-col">
      <BuyerHeader />
      <main className="flex-1 p-6 md:p-8 max-w-5xl mx-auto w-full">
        <h1 className="text-2xl font-black mb-2 flex items-center gap-2">
          <Heart className="h-7 w-7 text-red-500" /> {tr("favorites.title")}
        </h1>
        <p className="text-sm text-muted-foreground mb-8">{tr("catalog.subtitle")}</p>
        {!favorites.length ? (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              {tr("favorites.empty")} <Link href="/products" className="text-[#0461A5] font-semibold">{tr("nav.catalog")}</Link>.
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map(p => (
              <Link key={p.id} href={`/products/${p.id}`} className="qdia-product-card block overflow-hidden group">
                <div className="aspect-[4/3] bg-[#F8FAFC] overflow-hidden">
                  <ProductImage src={p.image_url} alt={p.name} className="w-full h-full group-hover:scale-105 transition-transform" />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-sm line-clamp-2">{p.name}</h3>
                  <p className="text-[#0461A5] font-black mt-1">${p.prices?.fob ?? "—"} FOB</p>
                  <Button variant="link" className="p-0 h-auto text-xs gap-1 mt-2">Voir la fiche <ArrowRight className="h-3 w-3" /></Button>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <BuyerFooter />
    </div>
  );
}

export default function Favorites() {
  return (
    <ProtectedRoute>
      <FavoritesContent />
    </ProtectedRoute>
  );
}
