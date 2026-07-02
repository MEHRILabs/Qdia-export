import { useState } from "react";
import { Link } from "wouter";
import { BuyerHeader, BuyerFooter } from "@/components/BuyerHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { platformApi } from "@/lib/platform-api";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TrackingTimeline } from "@/components/TrackingTimeline";
import { useI18n } from "@/contexts/I18nContext";
import { RefreshCw, Package } from "lucide-react";

type RfqRow = {
  id: number;
  product_name: string;
  status: string;
  quote_price?: number;
  quote_message?: string;
  tracking_number?: string;
  destination_country: string;
  quantity?: number;
};

function MyRfqsContent() {
  const { toast } = useToast();
  const { tr } = useI18n();
  const qc = useQueryClient();
  const [payRfq, setPayRfq] = useState<RfqRow | null>(null);
  const [method, setMethod] = useState<"escrow" | "swift" | "lc">("escrow");
  const [swiftRef, setSwiftRef] = useState("");
  const [lcNumber, setLcNumber] = useState("");

  const { data: rfqsData } = useQuery({
    queryKey: ["my-rfqs"],
    queryFn: () => platformApi.getRfqs(),
  });
  const rfqs = (rfqsData?.data ?? []) as RfqRow[];

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
      <main className="flex-1 p-8 max-w-3xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-2">
          <h1 className="text-2xl font-black">{tr("rfq.my_rfqs")}</h1>
          <Button variant="outline" size="sm" className="gap-1" asChild>
            <Link href="/commandes"><Package className="h-3.5 w-3.5" /> {tr("orders.title")}</Link>
          </Button>
        </div>
        <div className="space-y-4">
          {rfqs?.map(r => (
            <div key={r.id} className="border rounded-xl p-4 space-y-2">
              <div className="flex justify-between">
                <span className="font-semibold">{r.product_name}</span>
                <Badge>{r.status}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{r.destination_country}</p>
              {r.quote_price && <p className="text-sm">{tr("my_rfqs_page.quote_received")} <strong>${r.quote_price}</strong> — {r.quote_message}</p>}
              {r.tracking_number && <p className="text-sm text-[#0461A5]">{tr("my_rfqs_page.tracking")} {r.tracking_number}</p>}
              {(r.status === "shipped" || r.status === "accepted") && (
                <TrackingTimeline status={r.status} trackingNumber={r.tracking_number} />
              )}
              {r.status === "quoted" && (
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" onClick={() => setPayRfq(r)}>{tr("payment.accept_quote")}</Button>
                  <Button size="sm" variant="outline" onClick={() => act(r.id, "reject")}>{tr("my_rfqs_page.reject")}</Button>
                </div>
              )}
              {(r.status === "delivered" || r.status === "shipped") && (
                <Button size="sm" variant="secondary" className="gap-1" asChild>
                  <Link href="/commandes"><RefreshCw className="h-3 w-3" /> {tr("reorder.button")}</Link>
                </Button>
              )}
            </div>
          ))}
          {!rfqs?.length && <p className="text-muted-foreground">{tr("my_rfqs_page.empty")} <Link href="/rfq" className="text-primary underline">{tr("my_rfqs_page.create")}</Link></p>}
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
