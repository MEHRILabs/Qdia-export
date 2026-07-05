import { useMemo, useState } from "react";
import { Link } from "wouter";
import { SupplierSidebar } from "@/components/SupplierSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RfqQuoteDialog } from "@/components/RfqQuoteDialog";
import { platformApi } from "@/lib/platform-api";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";
import { MessageSquare, Globe, Package, Truck, Calendar } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type RfqRow = {
  id: number;
  product_name: string;
  quantity: number;
  quantity_unit: string;
  destination_country: string;
  requested_incoterm: string;
  target_price?: number;
  message?: string;
  status: string;
  quote_price?: number;
  quote_message?: string;
  tracking_number?: string;
  created_at: string;
};

type StatusFilter = "all" | "pending" | "quoted" | "accepted" | "shipped";

export default function Inquiries() {
  const { toast } = useToast();
  const { tr } = useI18n();
  const qc = useQueryClient();
  const [quotingId, setQuotingId] = useState<number | null>(null);
  const [shippingId, setShippingId] = useState<number | null>(null);
  const [tracking, setTracking] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const statusLabels = (): Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> => ({
    pending: { label: tr("inquiries_page.status_pending"), variant: "secondary", className: "bg-amber-100 text-amber-800 border-amber-200" },
    quoted: { label: tr("inquiries_page.status_quoted"), variant: "default", className: "bg-blue-100 text-blue-800 border-blue-200" },
    accepted: { label: tr("inquiries_page.status_accepted"), variant: "default", className: "bg-green-100 text-green-800 border-green-200" },
    rejected: { label: tr("inquiries_page.status_rejected"), variant: "destructive" },
    shipped: { label: tr("inquiries_page.status_shipped"), variant: "outline", className: "bg-purple-100 text-purple-800 border-purple-200" },
  });

  const { data: rfqsData, isLoading } = useQuery({
    queryKey: ["rfqs"],
    queryFn: () => platformApi.getRfqs(),
  });
  const rfqs = (rfqsData?.data ?? []) as RfqRow[];

  const filtered = useMemo(() => {
    if (filter === "all") return rfqs;
    if (filter === "accepted") return rfqs.filter(r => r.status === "accepted" || r.status === "shipped");
    return rfqs.filter(r => r.status === filter);
  }, [rfqs, filter]);

  const pendingCount = rfqs.filter(r => r.status === "pending").length;

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "all", label: tr("inquiries_page.filter_all") },
    { key: "pending", label: tr("inquiries_page.filter_pending") },
    { key: "quoted", label: tr("inquiries_page.filter_quoted") },
    { key: "accepted", label: tr("inquiries_page.filter_active") },
  ];

  const refresh = () => qc.invalidateQueries({ queryKey: ["rfqs"] });

  const ship = async (id: number) => {
    try {
      await platformApi.shipRfq(id, tracking);
      toast({
        title: tr("inquiries_page.shipped"),
        description: tr("inquiries_page.shipped_desc").replace("{tracking}", tracking),
      });
      setShippingId(null);
      setTracking("");
      refresh();
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    }
  };

  const STATUS_LABELS = statusLabels();

  return (
    <div className="min-h-dvh bg-background flex flex-col md:flex-row">
      <SupplierSidebar activePath="/inquiries" />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto w-full">
        <header className="md:hidden flex items-center justify-between mb-4 pb-3 border-b">
          <Link href="/dashboard" className="font-bold text-sm text-primary">{tr("mobile.brand_short")}</Link>
          <span className="font-bold text-sm">{tr("inquiries_page.title")}</span>
          <span className="w-16" aria-hidden />
        </header>

        <div className="mb-5 md:mb-8 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-3xl font-bold mb-1 flex items-center gap-2">
              <MessageSquare className="h-6 w-6 md:h-7 md:w-7 text-primary" /> {tr("inquiries_page.title")}
            </h1>
            <p className="text-xs md:text-base text-muted-foreground">{tr("inquiries_page.subtitle")}</p>
          </div>
          {pendingCount > 0 && (
            <Badge variant="secondary" className="shrink-0 bg-amber-100 text-amber-800">
              {pendingCount} {tr("inquiries_page.filter_pending").toLowerCase()}
            </Badge>
          )}
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 scrollbar-none">
          {filters.map(f => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium border transition-colors",
                filter === f.key
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:gap-4">
          {isLoading && [...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}

          {!isLoading && filtered.length === 0 && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              {tr("inquiries_page.empty")}
            </CardContent></Card>
          )}

          {filtered.map(rfq => {
            const st = STATUS_LABELS[rfq.status] ?? STATUS_LABELS.pending;
            return (
              <Card key={rfq.id} className="overflow-hidden">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-sm md:text-base flex items-center gap-2 leading-snug">
                      <Package className="h-4 w-4 text-primary shrink-0" />
                      {rfq.product_name}
                    </CardTitle>
                    <Badge variant={st.variant} className={cn("shrink-0 text-[10px]", st.className)}>
                      {st.label}
                    </Badge>
                  </div>
                  {rfq.created_at && (
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(rfq.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </CardHeader>
                <CardContent className="px-4 pb-4 text-sm space-y-3">
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4 text-muted-foreground">
                    <span className="rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs">
                      {rfq.quantity} {rfq.quantity_unit}
                    </span>
                    <span className="rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs flex items-center gap-1">
                      <Globe className="h-3 w-3" />{rfq.destination_country}
                    </span>
                    <span className="rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs">
                      {tr("inquiries_page.incoterm")} {rfq.requested_incoterm}
                    </span>
                    {rfq.target_price && (
                      <span className="rounded-lg bg-muted/50 px-2.5 py-1.5 text-xs">
                        {tr("inquiries_page.budget")} ${rfq.target_price}
                      </span>
                    )}
                  </div>
                  {rfq.message && (
                    <p className="text-xs border-l-2 border-primary/30 pl-3 text-muted-foreground italic">
                      {rfq.message}
                    </p>
                  )}
                  {rfq.quote_price && (
                    <div className="rounded-lg bg-[#0461A5]/5 border border-[#0461A5]/20 p-2.5">
                      <p className="text-xs font-semibold text-[#0461A5]">
                        {tr("inquiries_page.your_quote")} ${rfq.quote_price}
                      </p>
                      {rfq.quote_message && <p className="text-xs text-muted-foreground mt-0.5">{rfq.quote_message}</p>}
                    </div>
                  )}
                  {rfq.tracking_number && (
                    <p className="text-xs flex items-center gap-1 text-[#0461A5]">
                      <Truck className="h-3 w-3" /> {tr("inquiries_page.tracking")} {rfq.tracking_number}
                    </p>
                  )}

                  {rfq.status === "pending" && quotingId !== rfq.id && (
                    <Button size="sm" className="w-full sm:w-auto" onClick={() => setQuotingId(rfq.id)}>
                      {tr("inquiries_page.respond_quote")}
                    </Button>
                  )}
                  {quotingId === rfq.id && (
                    <RfqQuoteDialog rfqId={rfq.id} onDone={() => { setQuotingId(null); refresh(); }} />
                  )}
                  {rfq.status === "accepted" && shippingId !== rfq.id && (
                    <Button size="sm" variant="outline" className="w-full sm:w-auto gap-1" onClick={() => setShippingId(rfq.id)}>
                      <Truck className="h-3 w-3" /> {tr("inquiries.ship")}
                    </Button>
                  )}
                  {shippingId === rfq.id && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        className="text-sm flex-1"
                        placeholder={tr("inquiries_page.tracking_placeholder")}
                        value={tracking}
                        onChange={e => setTracking(e.target.value)}
                      />
                      <Button size="sm" onClick={() => ship(rfq.id)} disabled={!tracking.trim()}>
                        {tr("inquiries.confirm_ship")}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-6 text-center">
          {tr("inquiries_page.buyer_portal")}{" "}
          <Link href="/mes-rfq" className="text-primary underline">{tr("inquiries_page.my_rfqs_link")}</Link>
        </p>
      </main>
    </div>
  );
}
