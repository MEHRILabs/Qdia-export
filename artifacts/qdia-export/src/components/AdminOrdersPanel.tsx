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
import { cn } from "@/lib/utils";
import { Package, MessageSquare, CheckCircle2, Truck, Loader2, Copy } from "lucide-react";

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

  const copyTracking = (tracking: string) => {
    void navigator.clipboard.writeText(tracking);
    toast({ title: tr("admin.tracking_copied") });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
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
      <p className="text-xs text-muted-foreground md:hidden">{tr("admin.orders_mobile_hint")}</p>
      {orders.map(o => {
        const tracking = trackingDraft[o.id] ?? o.tracking_number ?? "";
        const statusLabel = tr(`admin.order_status_${o.status}`) || o.status;

        return (
          <div key={o.id} className="border rounded-xl p-3 sm:p-4 bg-card space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-sm sm:text-base">{tr("orders.order").replace("{id}", String(o.id))}</p>
                <p className="text-[11px] sm:text-xs text-muted-foreground">
                  {o.created_at ? new Date(o.created_at).toLocaleString("fr-FR") : ""}
                </p>
              </div>
              <Badge className={cn("shrink-0 text-[10px] sm:text-xs", STATUS_COLORS[o.status] ?? "")}>
                {statusLabel}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-sm">
              <p className="truncate">
                <span className="text-muted-foreground">{tr("admin.orders_buyer")} :</span>{" "}
                <strong>{o.buyer_name ?? `#${o.buyer_id}`}</strong>
              </p>
              <p className="truncate">
                <span className="text-muted-foreground">{tr("admin.orders_supplier")} :</span>{" "}
                <strong>{o.supplier_name ?? "—"}</strong>
              </p>
              {o.total_amount != null && (
                <p>
                  <span className="text-muted-foreground">{tr("orders.total")}</span>{" "}
                  <strong>{o.total_amount.toFixed(2)} {o.currency ?? "USD"}</strong>
                </p>
              )}
              {o.payment_method && (
                <p className="text-xs text-muted-foreground">{tr("transactions_page.method")} {o.payment_method}</p>
              )}
            </div>

            {!!o.items?.length && (
              <div className="rounded-lg bg-muted/40 p-2.5 space-y-1">
                {o.items.map((it, i) => (
                  <p key={i} className="text-xs sm:text-sm text-muted-foreground truncate">
                    · {it.product_name} × {it.quantity} {it.incoterm ? `(${it.incoterm})` : ""}
                  </p>
                ))}
              </div>
            )}

            {(o.tracking_number || o.status === "shipped" || o.status === "delivered") && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 flex items-start gap-2">
                <Truck className="h-4 w-4 text-green-700 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase text-green-800">{tr("tracking.page_title")}</p>
                  <p className="font-mono text-sm font-semibold text-green-900 break-all">
                    {o.tracking_number || "—"}
                  </p>
                  {o.carrier && (
                    <p className="text-xs text-green-700 mt-0.5">{tr("admin.carrier")} : {o.carrier.toUpperCase()}</p>
                  )}
                </div>
                {o.tracking_number && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-green-700"
                    onClick={() => copyTracking(o.tracking_number!)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
              {o.status === "pending_payment" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 text-green-700 w-full sm:w-auto h-10 sm:h-9"
                  disabled={updating === o.id}
                  onClick={() => void patchOrder(o.id, { status: "confirmed" })}
                >
                  {updating === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                  {tr("admin.order_confirm")}
                </Button>
              )}
              {(o.status === "confirmed" || o.status === "pending_payment") && (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Input
                    className="h-10 sm:h-8 w-full sm:w-44 text-sm sm:text-xs"
                    placeholder={tr("admin.tracking_placeholder")}
                    value={tracking}
                    onChange={e => setTrackingDraft(prev => ({ ...prev, [o.id]: e.target.value }))}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1 w-full sm:w-auto h-10 sm:h-9"
                    disabled={updating === o.id}
                    onClick={() => void patchOrder(o.id, {
                      status: "shipped",
                      tracking_number: tracking,
                      carrier: "dhl",
                    })}
                  >
                    {updating === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Truck className="h-3 w-3" />}
                    {tr("admin.order_ship")}
                  </Button>
                </div>
              )}
              <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto">
                {o.supplier_user_id && (
                  <Button size="sm" variant="secondary" className="gap-1 h-10 sm:h-9" asChild>
                    <Link href={`/messages?user=${o.supplier_user_id}`}>
                      <MessageSquare className="h-3 w-3" /> {tr("messages.contact")}
                    </Link>
                  </Button>
                )}
                {o.buyer_id && (
                  <Button size="sm" variant="ghost" className="gap-1 h-10 sm:h-9" asChild>
                    <Link href={`/messages?user=${o.buyer_id}`}>
                      <MessageSquare className="h-3 w-3" /> {tr("admin.contact_buyer")}
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
