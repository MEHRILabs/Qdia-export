import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BuyerHeader, BuyerFooter } from "@/components/BuyerHeader";
import { Button } from "@/components/ui/button";
import { platformApi } from "@/lib/platform-api";
import { useI18n } from "@/contexts/I18nContext";
import { useToast } from "@/hooks/use-toast";
import { ShoppingCart, Trash2, ArrowRight } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

function CartContent() {
  const { tr } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["cart"],
    queryFn: () => platformApi.getCart(),
  });
  const items = data?.data ?? [];

  const remove = async (id: number) => {
    try {
      await platformApi.removeFromCart(id);
      qc.invalidateQueries({ queryKey: ["cart"] });
      toast({ title: tr("cart.removed") });
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen qdia-buyer-page flex flex-col">
      <BuyerHeader />
      <main className="flex-1 p-6 md:p-8 max-w-3xl mx-auto w-full">
        <h1 className="text-2xl font-black mb-6 flex items-center gap-2">
          <ShoppingCart className="h-7 w-7 text-[#0461A5]" /> {tr("cart.title")}
        </h1>
        {isLoading && <p className="text-muted-foreground">{tr("common.loading")}</p>}
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="border rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">{tr("cart.product")} #{item.product_id}</p>
                <p className="text-sm text-muted-foreground">
                  {tr("cart.qty")} {item.quantity} · {item.incoterm}
                </p>
                {item.notes && <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => void remove(item.id)} aria-label={tr("common.delete")}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
          {!isLoading && !items.length && (
            <p className="text-muted-foreground text-sm">{tr("cart.empty")} <Link href="/products" className="text-primary underline">{tr("catalog.breadcrumb")}</Link></p>
          )}
        </div>
        {items.length > 0 && (
          <Button className="mt-6 w-full gap-2" size="lg" asChild>
            <Link href="/checkout">{tr("cart.checkout")} <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        )}
      </main>
      <BuyerFooter />
    </div>
  );
}

export default function Cart() {
  return (
    <ProtectedRoute>
      <CartContent />
    </ProtectedRoute>
  );
}
