import { useMemo, useState } from "react";
import { Link } from "wouter";
import { BuyerHeader, BuyerFooter } from "@/components/BuyerHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { platformApi } from "@/lib/platform-api";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TrackingTimeline } from "@/components/TrackingTimeline";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";
import { RefreshCw, Package, Globe, Plus, FileText } from "lucide-react";

type RfqRow = {
  id: number;
  product_name: string;
  status: string;
  quote_price?: number;
  quote_message?: string;
  tracking_number?: string;
  destination_country: string;
  quantity?: number;
  quantity_unit?: string;
};

type StatusFilter = "all" | "active" | "done";

function statusBadge(
  status: string,
  tr: (k: string) => string,
): { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className?: string } {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
    pending: { label: tr("my_rfqs_page.status_pending"), variant: "secondary", className: "bg-amber-100 text-amber-800 border-amber-200" },
    quoted: { label: tr("my_rfqs_page.status_quoted"), variant: "default", className: "bg-blue-100 text-blue-800 border-blue-200" },
    accepted: { label: tr("my_rfqs_page.status_accepted"), variant: "default", className: "bg-green-100 text-green-800 border-green-200" },
    rejected: { label: tr("my_rfqs_page.status_rejected"), variant: "destructive" },
    shipped: { label: tr("my_rfqs_page.status_shipped"), variant: "outline", className: "bg-purple-100 text-purple-800 border-purple-200" },
    delivered: { label: tr("my_rfqs_page.status_delivered"), variant: "outline", className: "bg-green-100 text-green-800 border-green-200" },
  };
  return map[status] ?? { label: status, variant: "secondary" };
}

function MyRfqsContent() {
  const { toast } = useToast();
  const { tr } = useI18n();
  const qc = useQueryClient();
  const [payRfq, setPayRfq] = useState<RfqRow | null>(null);
  const [method, setMethod] = useState<"escrow" | "swift" | "lc">("escrow");
  const [swiftRef, setSwiftRef] = useState("");
  const [lcNumber, setLcNumber] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const { data: rfqsData, isLoading } = useQuery({
    queryKey: ["my-rfqs"],
    queryFn: () => platformApi.getRfqs(),
  });
  const rfqs = (rfqsData?.data ?? []) as RfqRow[];

  const filtered = useMemo(() => {
    if (filter === "all") return rfqs;
    if (filter === "active") return rfqs.filter(r => ["pending", "quoted", "accepted", "shipped"].includes(r.status));
    return rfqs.filter(r => ["delivered", "rejected"].includes(r.status));
  }, [rfqs, filter]);

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "all", label: tr("my_rfqs_page.filter_all") },
    { key: "active", label: tr("my_rfqs_page.filter_active") },
    { key: "done", label: tr("my_rfqs_page.filter_done") },
  ];

  const act = async (id: number, action: "reject") => {
    try {
      await platformApi.rejectRfq(id);
      toast({ title: tr("my_rfqs_page.quote_rejected") });
      qc.invalidateQueries({ queryKey: ["my-rfqs"] });
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    }
  };

  const confirmAccept = async () => {
    if (!payRfq) return;
    try {
      await platformApi.acceptRfqWithPayment(payRfq.id, method, {
        swift_reference: method === "swift" ? swiftRef : undefined,
        lc_number: method === "lc" ? lcNumber : undefined,
      });
      toast({ title: tr("my_rfqs_page.quote_accepted"), description: tr("my_rfqs_page.quote_accepted_desc") });
      setPayRfq(null);
      qc.invalidateQueries({ queryKey: ["my-rfqs"] });
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen qdia-buyer-page flex flex-col">
      <BuyerHeader />
      <main className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full pb-8">
        <div className="flex justify-between items-start mb-5 flex-wrap gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-black flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" />
              {tr("rfq.my_rfqs")}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {rfqs.length} demande{rfqs.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-1" asChild>
              <Link href="/commandes"><Package className="h-3.5 w-3.5" /> {tr("orders.title")}</Link>
            </Button>
            <Button size="sm" className="gap-1" asChild>
              <Link href="/rfq"><Plus className="h-3.5 w-3.5" /> {tr("my_rfqs_page.create")}</Link>
            </Button>
          </div>
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

        <div className="space-y-3">
          {isLoading && [...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}

          {filtered.map(r => {
            const st = statusBadge(r.status, tr);
            return (
              <Card key={r.id} className="overflow-hidden">
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm md:text-base leading-snug">{r.product_name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Globe className="h-3 w-3 shrink-0" /> {r.destination_country}
                        {r.quantity && (
                          <span className="ml-2">· {r.quantity} {r.quantity_unit ?? ""}</span>
                        )}
                      </p>
                    </div>
                    <Badge variant={st.variant} className={cn("shrink-0 text-[10px]", st.className)}>
                      {st.label}
                    </Badge>
                  </div>

                  {r.quote_price && (
                    <div className="rounded-lg bg-[#0461A5]/5 border border-[#0461A5]/20 p-2.5">
                      <p className="text-sm">
                        {tr("my_rfqs_page.quote_received")}{" "}
                        <strong className="text-[#0461A5]">${r.quote_price}</strong>
                      </p>
                      {r.quote_message && <p className="text-xs text-muted-foreground mt-0.5">{r.quote_message}</p>}
                    </div>
                  )}

                  {r.tracking_number && (
                    <p className="text-sm text-[#0461A5] flex items-center gap-1">
                      <Package className="h-3.5 w-3.5" />
                      {tr("my_rfqs_page.tracking")} {r.tracking_number}
                    </p>
                  )}

                  {(r.status === "shipped" || r.status === "accepted") && (
                    <TrackingTimeline status={r.status} trackingNumber={r.tracking_number} />
                  )}

                  {r.status === "quoted" && (
                    <div className="flex gap-2 flex-col sm:flex-row">
                      <Button size="sm" className="flex-1" onClick={() => setPayRfq(r)}>
                        {tr("payment.accept_quote")}
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => act(r.id, "reject")}>
                        {tr("my_rfqs_page.reject")}
                      </Button>
                    </div>
                  )}

                  {(r.status === "delivered" || r.status === "shipped") && (
                    <Button size="sm" variant="secondary" className="gap-1 w-full sm:w-auto" asChild>
                      <Link href="/commandes"><RefreshCw className="h-3 w-3" /> {tr("reorder.button")}</Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {!isLoading && !filtered.length && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                {tr("my_rfqs_page.empty")}{" "}
                <Link href="/rfq" className="text-primary underline">{tr("my_rfqs_page.create")}</Link>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <BuyerFooter />

      <Dialog open={!!payRfq} onOpenChange={o => !o && setPayRfq(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr("payment.escrow_title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-col gap-2">
              {(["escrow", "swift", "lc"] as const).map(m => (
                <Button key={m} variant={method === m ? "default" : "outline"} onClick={() => setMethod(m)}>
                  {m === "escrow" ? tr("payment.escrow") : m === "swift" ? tr("payment.swift") : tr("payment.lc")}
                </Button>
              ))}
            </div>
            {method === "swift" && (
              <div><Label>{tr("my_rfqs_page.swift_ref")}</Label><Input value={swiftRef} onChange={e => setSwiftRef(e.target.value)} placeholder="SWIFT-XXXX" /></div>
            )}
            {method === "lc" && (
              <div><Label>{tr("my_rfqs_page.lc_number")}</Label><Input value={lcNumber} onChange={e => setLcNumber(e.target.value)} placeholder="LC-XXXX" /></div>
            )}
            <Button className="w-full" onClick={confirmAccept}>{tr("payment.confirm_pay")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function MyRfqs() {
  return <MyRfqsContent />;
}
