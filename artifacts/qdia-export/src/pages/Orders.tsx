import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BuyerHeader, BuyerFooter } from "@/components/BuyerHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { platformApi } from "@/lib/platform-api";
import { useI18n } from "@/contexts/I18nContext";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { TrackingTimeline } from "@/components/TrackingTimeline";
import { Package, RefreshCw, MapPin } from "lucide-react";

type OrderRow = {
  id: number;
  status: string;
  total_amount?: number;
  currency?: string;
  payment_method?: string;
  tracking_number?: string;
  carrier?: string;
  created_at?: string;
  items?: Array<{ product_name?: string; quantity?: number }>;
};

function OrdersContent() {
  const { tr } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => platformApi.getOrders(),
  });
  const orders = (data?.data ?? []) as OrderRow[];

  const reorder = async (id: number) => {
    try {
      await platformApi.reorder(id);
      toast({ title: tr("reorder.success") });
      qc.invalidateQueries({ queryKey: ["cart"] });
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen qdia-buyer-page flex flex-col">
      <BuyerHeader />
      <main className="flex-1 p-6 md:p-8 max-w-3xl mx-auto w-full">
        <h1 className="text-2xl font-black mb-6 flex items-center gap-2">
          <Package className="h-7 w-7 text-[#0461A5]" /> {tr("orders.title")}
        </h1>
        {isLoading && <p className="text-muted-foreground">{tr("common.loading")}</p>}
        <div className="space-y-4">
          {orders.map(o => (
            <div key={o.id} className="border rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-start gap-2">
                <span className="font-semibold">{tr("orders.order").replace("{id}", String(o.id))}</span>
                <Badge>{o.status}</Badge>
              </div>
              {o.total_amount != null && (
                <p className="text-sm">{tr("orders.total")} <strong>{o.total_amount.toFixed(2)} {o.currency ?? "USD"}</strong></p>
              )}
              {o.payment_method && <p className="text-xs text-muted-foreground">{tr("transactions_page.method")} {o.payment_method}</p>}
              {o.items?.map((it, i) => (
                <p key={i} className="text-sm text-muted-foreground">{it.product_name} × {it.quantity}</p>
              ))}
              {o.tracking_number && (
                <p className="text-sm text-[#0461A5] flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" /> {tr("tracking.number")} {o.tracking_number}
                  {o.carrier && ` (${o.carrier})`}
                </p>
              )}
              {(o.status === "shipped" || o.tracking_number) && (
                <TrackingTimeline status={o.status} trackingNumber={o.tracking_number} />
              )}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="outline" className="gap-1" onClick={() => void reorder(o.id)}>
                  <RefreshCw className="h-3 w-3" /> {tr("reorder.button")}
                </Button>
                {o.tracking_number && (
                  <Button size="sm" variant="secondary" asChild>
                    <Link href={`/suivi?number=${encodeURIComponent(o.tracking_number)}${o.carrier ? `&carrier=${o.carrier}` : ""}`}>
                      {tr("tracking.page_title")}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          ))}
          {!isLoading && !orders.length && <p className="text-muted-foreground text-sm">{tr("orders.empty")}</p>}
        </div>
      </main>
      <BuyerFooter />
    </div>
  );
}

export default function Orders() {
  return (
    <ProtectedRoute>
      <OrdersContent />
    </ProtectedRoute>
  );
}
