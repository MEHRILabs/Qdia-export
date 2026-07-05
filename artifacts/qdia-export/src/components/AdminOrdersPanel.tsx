import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { platformApi } from "@/lib/platform-api";
import { useI18n } from "@/contexts/I18nContext";
import { useToast } from "@/hooks/use-toast";
import { Package, MessageSquare, CheckCircle2, Truck, Loader2 } from "lucide-react";

type OrderRow = {
  id: number;
  status: string;
  buyer_id?: number;
  buyer_name?: string | null;
  buyer_email?: string | null;
  supplier_id?: number | null;
  supplier_name?: string | null;
  supplier_user_id?: number | null;
  total_amount?: number;
  currency?: string;
  payment_method?: string;
  tracking_number?: string;
  carrier?: string;
  created_at?: string;
  items?: Array<{ product_name?: string; quantity?: number; incoterm?: string }>;
};

const STATUS_COLORS: Record<string, string> = {
  pending_payment: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  shipped: "bg-green-100 text-green-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-red-100 text-red-800",
};

export function AdminOrdersPanel() {
  const { tr } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [updating, setUpdating] = useState<number | null>(null);
  const [trackingDraft, setTrackingDraft] = useState<Record<number, string>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin-orders"],
    queryFn: () => platformApi.getOrders(),
  });
  const orders = (data?.data ?? []) as OrderRow[];

  const patchOrder = async (id: number, body: { status?: string; tracking_number?: string; carrier?: string }) => {
    setUpdating(id);
    try {
      await platformApi.patchOrder(id, body);
      toast({ title: tr("admin.order_updated") });
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
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="text-center py-16 text-muted-foreground border rounded-xl bg-card">
        <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">{tr("admin.orders_empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map(o => (
        <div key={o.id} className="border rounded-xl p-4 bg-card space-y-3">
          <div className="flex flex-wrap justify-between items-start gap-2">
            <div>
              <p className="font-bold">{tr("orders.order").replace("{id}", String(o.id))}</p>
              <p className="text-xs text-muted-foreground">
                {o.created_at ? new Date(o.created_at).toLocaleString("fr-FR") : ""}
              </p>
            </div>
            <Badge className={STATUS_COLORS[o.status] ?? ""}>{tr(`admin.order_status_${o.status}`) || o.status}</Badge>
          </div>

          <div className="grid sm:grid-cols-2 gap-2 text-sm">
            <p><span className="text-muted-foreground">{tr("admin.orders_buyer")} :</span> <strong>{o.buyer_name ?? `#${o.buyer_id}`}</strong></p>
            <p><span className="text-muted-foreground">{tr("admin.orders_supplier")} :</span> <strong>{o.supplier_name ?? "—"}</strong></p>
            {o.total_amount != null && (
              <p><span className="text-muted-foreground">{tr("orders.total")}</span> <strong>{o.total_amount.toFixed(2)} {o.currency ?? "USD"}</strong></p>
            )}
            {o.payment_method && (
              <p className="text-xs text-muted-foreground">{tr("transactions_page.method")} {o.payment_method}</p>
            )}
          </div>

          {o.items?.map((it, i) => (
            <p key={i} className="text-sm text-muted-foreground">
              {it.product_name} × {it.quantity} {it.incoterm ? `(${it.incoterm})` : ""}
            </p>
          ))}

          <div className="flex flex-wrap gap-2 items-center">
            {o.status === "pending_payment" && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-green-700"
                disabled={updating === o.id}
                onClick={() => void patchOrder(o.id, { status: "confirmed" })}
              >
                {updating === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                {tr("admin.order_confirm")}
              </Button>
            )}
            {(o.status === "confirmed" || o.status === "pending_payment") && (
              <div className="flex flex-wrap gap-2 items-center">
                <Input
                  className="h-8 w-40 text-xs"
                  placeholder={tr("admin.tracking_placeholder")}
                  value={trackingDraft[o.id] ?? o.tracking_number ?? ""}
                  onChange={e => setTrackingDraft(prev => ({ ...prev, [o.id]: e.target.value }))}
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  disabled={updating === o.id}
                  onClick={() => void patchOrder(o.id, {
                    status: "shipped",
                    tracking_number: trackingDraft[o.id] ?? o.tracking_number,
                    carrier: "dhl",
                  })}
                >
                  {updating === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Truck className="h-3 w-3" />}
                  {tr("admin.order_ship")}
                </Button>
              </div>
            )}
            {o.supplier_user_id && (
              <Button size="sm" variant="secondary" className="gap-1" asChild>
                <Link href={`/messages?user=${o.supplier_user_id}`}>
                  <MessageSquare className="h-3 w-3" /> {tr("messages.contact")}
                </Link>
              </Button>
            )}
            {o.buyer_id && (
              <Button size="sm" variant="ghost" className="gap-1" asChild>
                <Link href={`/messages?user=${o.buyer_id}`}>
                  <MessageSquare className="h-3 w-3" /> {tr("admin.contact_buyer")}
                </Link>
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
