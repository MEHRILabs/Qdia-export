import { useState } from "react";
import { Link } from "wouter";
import { SupplierSidebar } from "@/components/SupplierSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RfqQuoteDialog } from "@/components/RfqQuoteDialog";
import { platformApi } from "@/lib/platform-api";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nContext";
import { MessageSquare, Globe, Package, Truck } from "lucide-react";
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

export default function Inquiries() {
  const { toast } = useToast();
  const { tr } = useI18n();
  const qc = useQueryClient();
  const [quotingId, setQuotingId] = useState<number | null>(null);
  const [shippingId, setShippingId] = useState<number | null>(null);
  const [tracking, setTracking] = useState("");

  const statusLabels = (): Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> => ({
    pending: { label: tr("inquiries_page.status_pending"), variant: "secondary" },
    quoted: { label: tr("inquiries_page.status_quoted"), variant: "default" },
    accepted: { label: tr("inquiries_page.status_accepted"), variant: "default" },
    rejected: { label: tr("inquiries_page.status_rejected"), variant: "destructive" },
    shipped: { label: tr("inquiries_page.status_shipped"), variant: "outline" },
  });

  const { data: rfqsData, isLoading } = useQuery({
    queryKey: ["rfqs"],
    queryFn: () => platformApi.getRfqs(),
  });
  const rfqs = (rfqsData?.data ?? []) as RfqRow[];

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
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <SupplierSidebar activePath="/inquiries" />
      <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-5xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
            <MessageSquare className="h-7 w-7 text-primary" /> {tr("inquiries_page.title")}
          </h1>
          <p className="text-muted-foreground">{tr("inquiries_page.subtitle")}</p>
        </div>

        <div className="grid gap-4">
          {isLoading && [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}

          {!isLoading && rfqs?.length === 0 && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              {tr("inquiries_page.empty")}
            </CardContent></Card>
          )}

          {rfqs?.map(rfq => {
            const st = STATUS_LABELS[rfq.status] ?? STATUS_LABELS.pending;
            return (
              <Card key={rfq.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />{rfq.product_name}
                    </CardTitle>
                    <Badge variant={st.variant}>{st.label}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-3">
                  <div className="flex flex-wrap gap-4 text-muted-foreground">
                    <span>{rfq.quantity} {rfq.quantity_unit}</span>
                    <span className="flex items-center gap-1"><Globe className="h-3 w-3" />{rfq.destination_country}</span>
                    <span>{tr("inquiries_page.incoterm")} {rfq.requested_incoterm}</span>
                    {rfq.target_price && <span>{tr("inquiries_page.budget")} ${rfq.target_price}</span>}
                  </div>
                  {rfq.message && <p className="text-xs border-l-2 pl-3">{rfq.message}</p>}
                  {rfq.quote_price && (
                    <p className="text-xs font-semibold text-[#0461A5]">
                      {tr("inquiries_page.your_quote")} ${rfq.quote_price} — {rfq.quote_message}
                    </p>
                  )}
                  {rfq.tracking_number && (
                    <p className="text-xs flex items-center gap-1"><Truck className="h-3 w-3" /> {tr("inquiries_page.tracking")} {rfq.tracking_number}</p>
                  )}

                  {rfq.status === "pending" && quotingId !== rfq.id && (
                    <Button size="sm" onClick={() => setQuotingId(rfq.id)}>{tr("inquiries_page.respond_quote")}</Button>
                  )}
                  {quotingId === rfq.id && (
                    <RfqQuoteDialog rfqId={rfq.id} onDone={() => { setQuotingId(null); refresh(); }} />
                  )}
                  {rfq.status === "accepted" && shippingId !== rfq.id && (
                    <Button size="sm" variant="outline" onClick={() => setShippingId(rfq.id)}>{tr("inquiries.ship")}</Button>
                  )}
                  {shippingId === rfq.id && (
                    <div className="flex gap-2">
                      <input className="border rounded px-2 text-sm flex-1" placeholder={tr("inquiries_page.tracking_placeholder")} value={tracking} onChange={e => setTracking(e.target.value)} />
                      <Button size="sm" onClick={() => ship(rfq.id)}>{tr("inquiries.confirm_ship")}</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground mt-6 text-center">
          {tr("inquiries_page.buyer_portal")} <Link href="/mes-rfq" className="text-primary underline">{tr("inquiries_page.my_rfqs_link")}</Link>
        </p>
      </main>
    </div>
  );
}
