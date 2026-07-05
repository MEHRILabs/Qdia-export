import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { platformApi } from "@/lib/platform-api";
import { useI18n } from "@/contexts/I18nContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Package, CheckCircle2, XCircle, Truck, Loader2 } from "lucide-react";

type OrderRow = {
  id: number;
  status: string;
  buyer_name?: string | null;
  total_amount?: number;
  currency?: string;
  tracking_number?: string;
  created_at?: string;
  items?: Array<{ product_name?: string; quantity?: number }>;
};

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-green-100 text-green-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

export function SupplierOrdersPanel({ compact = false }: { compact?: boolean }) {
  const { tr } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [updating, setUpdating] = useState<number | null>(null);
  const [trackingDraft, setTrackingDraft] = useState<Record<number, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["supplier-orders"],
    queryFn: () => platformApi.getOrders(),
  });

  const orders = ((data?.data ?? []) as OrderRow[]).filter(o =>
    o.status !== "delivered" || !compact,
  );

  const patch = async (id: number, body: { status?: string; tracking_number?: string; carrier?: string }) => {
    setUpdating(id);
    try {
      await platformApi.patchOrder(id, body);
      toast({ title: tr("admin.order_updated") });
      qc.invalidateQueries({ queryKey: ["supplier-orders"] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (e) {
      toast({
        title: tr("common.error"),
        description: String(e instanceof Error ? e.message : e),
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="text-center py-10 text-muted-foreground border rounded-xl bg-card">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">{tr("supplier_orders.empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map(o => (
        <div key={o.id} className="border rounded-xl p-3 sm:p-4 bg-card space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-sm">{tr("orders.order").replace("{id}", String(o.id))}</p>
              <p className="text-xs text-muted-foreground">{o.buyer_name ?? tr("supplier_orders.buyer")}</p>
            </div>
            <Badge className={cn("text-[10px]", STATUS_COLORS[o.status] ?? "")}>
              {tr(`admin.order_status_${o.status}`) || o.status}
            </Badge>
          </div>
          {o.items?.map((it, i) => (
            <p key={i} className="text-xs text-muted-foreground truncate">· {it.product_name} × {it.quantity}</p>
          ))}
          {o.total_amount != null && (
            <p className="text-sm font-semibold">{o.total_amount.toFixed(2)} {o.currency ?? "USD"}</p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {o.status === "pending_payment" && (
              <>
                <Button size="sm" className="gap-1 h-9 bg-green-600 hover:bg-green-700" disabled={updating === o.id}
                  onClick={() => void patch(o.id, { status: "confirmed" })}>
                  {updating === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                  {tr("supplier_orders.accept")}
                </Button>
                <Button size="sm" variant="outline" className="gap-1 h-9 text-red-600" disabled={updating === o.id}
                  onClick={() => void patch(o.id, { status: "cancelled" })}>
                  <XCircle className="h-3 w-3" /> {tr("supplier_orders.reject")}
                </Button>
              </>
            )}
            {o.status === "confirmed" && (
              <div className="flex flex-col sm:flex-row gap-2 w-full">
                <Input
                  className="h-9 text-xs"
                  placeholder={tr("admin.tracking_placeholder")}
                  value={trackingDraft[o.id] ?? o.tracking_number ?? ""}
                  onChange={e => setTrackingDraft(prev => ({ ...prev, [o.id]: e.target.value }))}
                />
                <Button size="sm" variant="outline" className="gap-1 h-9" disabled={updating === o.id}
                  onClick={() => void patch(o.id, { status: "shipped", tracking_number: trackingDraft[o.id] ?? o.tracking_number, carrier: "dhl" })}>
                  <Truck className="h-3 w-3" /> {tr("admin.order_ship")}
                </Button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
