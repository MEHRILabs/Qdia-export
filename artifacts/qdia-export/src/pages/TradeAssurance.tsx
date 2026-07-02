import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BuyerHeader, BuyerFooter } from "@/components/BuyerHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { platformApi } from "@/lib/platform-api";
import { useI18n } from "@/contexts/I18nContext";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Shield, AlertTriangle } from "lucide-react";

type DisputeRow = {
  id: number;
  status?: string;
  reason?: string;
  description?: string;
  transaction_id?: number;
  order_id?: number;
  created_at?: string;
};

function TradeAssuranceContent() {
  const { tr } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [txId, setTxId] = useState("");
  const [orderId, setOrderId] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["disputes"],
    queryFn: () => platformApi.getDisputes(),
  });
  const disputes = (data?.data ?? []) as DisputeRow[];

  const submit = async () => {
    const transaction_id = parseInt(txId, 10);
    if (!transaction_id || reason.trim().length < 3) return;
    setLoading(true);
    try {
      await platformApi.createDispute({
        transaction_id,
        reason: reason.trim(),
        order_id: orderId ? parseInt(orderId, 10) : undefined,
        description: description || undefined,
      });
      toast({ title: tr("trade_assurance.opened") });
      setReason("");
      setDescription("");
      qc.invalidateQueries({ queryKey: ["disputes"] });
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen qdia-buyer-page flex flex-col">
      <BuyerHeader />
      <main className="flex-1 p-6 md:p-8 max-w-3xl mx-auto w-full space-y-8">
        <div>
          <h1 className="text-2xl font-black mb-2 flex items-center gap-2">
            <Shield className="h-7 w-7 text-[#0461A5]" /> {tr("trade_assurance.title")}
          </h1>
          <p className="text-sm text-muted-foreground">{tr("trade_assurance.subtitle")}</p>
        </div>

        <div className="border rounded-xl p-4 space-y-3 bg-[#F0F4FF]">
          <h2 className="font-bold flex items-center gap-2"><AlertTriangle className="h-4 w-4" /> {tr("trade_assurance.open_dispute")}</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{tr("trade_assurance.transaction_id")}</Label>
              <Input type="number" value={txId} onChange={e => setTxId(e.target.value)} />
            </div>
            <div>
              <Label>{tr("trade_assurance.order_id")}</Label>
              <Input type="number" value={orderId} onChange={e => setOrderId(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>{tr("trade_assurance.reason")}</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder={tr("trade_assurance.reason_placeholder")} />
          </div>
          <div>
            <Label>{tr("trade_assurance.description")}</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
          </div>
          <Button onClick={() => void submit()} disabled={loading || !txId || reason.trim().length < 3}>
            {tr("trade_assurance.submit")}
          </Button>
        </div>

        <div>
          <h2 className="font-bold mb-4">{tr("trade_assurance.my_disputes")}</h2>
          {isLoading && <p className="text-muted-foreground">{tr("common.loading")}</p>}
          <div className="space-y-3">
            {disputes.map(d => (
              <div key={d.id} className="border rounded-xl p-4">
                <div className="flex justify-between">
                  <span className="font-semibold">#{d.id}</span>
                  <Badge>{d.status ?? "open"}</Badge>
                </div>
                <p className="text-sm mt-1">{d.reason}</p>
                {d.description && <p className="text-xs text-muted-foreground mt-1">{d.description}</p>}
                {d.transaction_id && <p className="text-xs text-muted-foreground mt-1">TX #{d.transaction_id}</p>}
              </div>
            ))}
            {!isLoading && !disputes.length && <p className="text-muted-foreground text-sm">{tr("trade_assurance.empty")}</p>}
          </div>
        </div>
      </main>
      <BuyerFooter />
    </div>
  );
}

export default function TradeAssurance() {
  return (
    <ProtectedRoute>
      <TradeAssuranceContent />
    </ProtectedRoute>
  );
}
