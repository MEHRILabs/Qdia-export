import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SupplierSidebar } from "@/components/SupplierSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { platformApi } from "@/lib/platform-api";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nContext";
import { DollarSign, Shield, Unlock, AlertTriangle } from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";

type Tx = {
  id: number;
  rfq_id?: number;
  amount: number;
  currency: string;
  commission_amount: number;
  net_amount: number;
  payment_method: string;
  status: string;
  created_at?: string;
};

function TransactionsContent() {
  const { toast } = useToast();
  const { tr } = useI18n();
  const qc = useQueryClient();
  const [disputeTx, setDisputeTx] = useState<Tx | null>(null);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => platformApi.getTransactions(),
  });
  const txs = (data?.data ?? []) as Tx[];

  const fund = async (id: number) => {
    try {
      await platformApi.fundPayment(id);
      toast({ title: tr("transactions_page.payment_confirmed") });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    }
  };

  const release = async (id: number) => {
    try {
      await platformApi.releasePayment(id);
      toast({ title: tr("transactions_page.funds_released") });
      qc.invalidateQueries({ queryKey: ["transactions"] });
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    }
  };

  const openDispute = async () => {
    if (!disputeTx || reason.trim().length < 3) return;
    try {
      await platformApi.createDispute({
        transaction_id: disputeTx.id,
        reason: reason.trim(),
        description: description || undefined,
      });
      toast({ title: tr("trade_assurance.opened") });
      setDisputeTx(null);
      setReason("");
      setDescription("");
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex">
      <SupplierSidebar activePath="/transactions" />
      <main className="flex-1 p-6 md:p-8 max-w-4xl">
        <h1 className="text-2xl font-black mb-2 flex items-center gap-2">
          <DollarSign className="h-7 w-7 text-primary" /> {tr("transactions.title")}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">{tr("transactions_page.subtitle")}</p>
        {isLoading && <p className="text-muted-foreground">{tr("common.loading")}</p>}
        <div className="space-y-4">
          {txs.map(tx => (
            <Card key={tx.id}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-base">{tr("transactions_page.transaction").replace("{id}", String(tx.id))}</CardTitle>
                  <Badge>{tx.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p><strong>{tr("transactions_page.amount")}</strong> {tx.amount.toFixed(2)} {tx.currency}</p>
                <p><strong>{tr("transactions_page.commission")}</strong> {tx.commission_amount.toFixed(2)} {tx.currency}</p>
                <p><strong>{tr("transactions_page.net")}</strong> {tx.net_amount.toFixed(2)} {tx.currency}</p>
                <p><strong>{tr("transactions_page.method")}</strong> {tx.payment_method}</p>
                {tx.rfq_id && <p className="text-muted-foreground">RFQ #{tx.rfq_id}</p>}
                <div className="flex gap-2 pt-2 flex-wrap">
                  {tx.status === "pending" && (
                    <Button size="sm" className="gap-1" onClick={() => fund(tx.id)}>
                      <Shield className="h-3 w-3" /> {tr("transactions.confirm_payment")}
                    </Button>
                  )}
                  {tx.status === "funded" && (
                    <Button size="sm" variant="secondary" className="gap-1" onClick={() => release(tx.id)}>
                      <Unlock className="h-3 w-3" /> {tr("transactions.release_funds")}
                    </Button>
                  )}
                  {(tx.status === "funded" || tx.status === "released") && (
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => setDisputeTx(tx)}>
                      <AlertTriangle className="h-3 w-3" /> {tr("trade_assurance.open_dispute")}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" asChild>
                    <Link href="/trade-assurance">{tr("trade_assurance.title")}</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {!isLoading && !txs.length && (
            <p className="text-muted-foreground text-sm">{tr("transactions_page.empty")}</p>
          )}
        </div>
      </main>

      <Dialog open={!!disputeTx} onOpenChange={o => !o && setDisputeTx(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr("trade_assurance.open_dispute")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{tr("transactions_page.transaction").replace("{id}", String(disputeTx?.id ?? ""))}</p>
            <div>
              <Label>{tr("trade_assurance.reason")}</Label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder={tr("trade_assurance.reason_placeholder")} />
            </div>
            <div>
              <Label>{tr("trade_assurance.description")}</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} />
            </div>
            <Button className="w-full" onClick={() => void openDispute()} disabled={reason.trim().length < 3}>
              {tr("trade_assurance.submit")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Transactions() {
  return (
    <ProtectedRoute roles={["supplier", "admin", "buyer"]}>
      <TransactionsContent />
    </ProtectedRoute>
  );
}
