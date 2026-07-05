import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SupplierSidebar } from "@/components/SupplierSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { platformApi } from "@/lib/platform-api";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nContext";
import { cn } from "@/lib/utils";
import { DollarSign, Shield, Unlock, AlertTriangle, CreditCard, TrendingUp } from "lucide-react";
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

type StatusFilter = "all" | "pending" | "funded" | "released";

function statusBadge(
  status: string,
  tr: (k: string) => string,
): { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className?: string } {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; className?: string }> = {
    pending: { label: tr("transactions_page.status_pending"), variant: "secondary", className: "bg-amber-100 text-amber-800 border-amber-200" },
    funded: { label: tr("transactions_page.status_funded"), variant: "default", className: "bg-blue-100 text-blue-800 border-blue-200" },
    released: { label: tr("transactions_page.status_released"), variant: "outline", className: "bg-green-100 text-green-800 border-green-200" },
    disputed: { label: tr("transactions_page.status_disputed"), variant: "destructive" },
  };
  return map[status] ?? { label: status, variant: "secondary" };
}

function paymentLabel(method: string, tr: (k: string) => string): string {
  const map: Record<string, string> = {
    escrow: tr("transactions_page.method_escrow"),
    swift: tr("transactions_page.method_swift"),
    lc: tr("transactions_page.method_lc"),
  };
  return map[method] ?? method;
}

function TransactionsContent() {
  const { toast } = useToast();
  const { tr } = useI18n();
  const qc = useQueryClient();
  const [disputeTx, setDisputeTx] = useState<Tx | null>(null);
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => platformApi.getTransactions(),
  });
  const txs = (data?.data ?? []) as Tx[];

  const stats = useMemo(() => ({
    total: txs.reduce((s, t) => s + t.amount, 0),
    pending: txs.filter(t => t.status === "pending").length,
    funded: txs.filter(t => t.status === "funded").length,
    released: txs.filter(t => t.status === "released").length,
  }), [txs]);

  const filtered = filter === "all" ? txs : txs.filter(t => t.status === filter);

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "all", label: tr("transactions_page.filter_all") },
    { key: "pending", label: tr("transactions_page.filter_pending") },
    { key: "funded", label: tr("transactions_page.filter_funded") },
    { key: "released", label: tr("transactions_page.filter_released") },
  ];

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
    <div className="min-h-dvh bg-background flex flex-col md:flex-row">
      <SupplierSidebar activePath="/transactions" />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full">
        <header className="md:hidden flex items-center justify-between mb-4 pb-3 border-b">
          <Link href="/dashboard" className="font-bold text-sm text-primary">{tr("mobile.brand_short")}</Link>
          <span className="font-bold text-sm">{tr("transactions.title")}</span>
          <span className="w-16" aria-hidden />
        </header>

        <div className="mb-6">
          <h1 className="text-xl md:text-2xl font-black mb-1 flex items-center gap-2">
            <DollarSign className="h-6 w-6 md:h-7 md:w-7 text-primary" /> {tr("transactions.title")}
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">{tr("transactions_page.subtitle")}</p>
        </div>

        {!isLoading && txs.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mb-5">
            <div className="rounded-xl border bg-card p-3 text-center">
              <TrendingUp className="h-4 w-4 text-primary mx-auto mb-1" />
              <p className="text-base md:text-lg font-black text-primary">${stats.total.toFixed(0)}</p>
              <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase">{tr("transactions_page.total_volume")}</p>
            </div>
            <div className="rounded-xl border bg-card p-3 text-center">
              <p className="text-base md:text-lg font-black text-amber-600">{stats.pending}</p>
              <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase">{tr("transactions_page.pending_count")}</p>
            </div>
            <div className="rounded-xl border bg-card p-3 text-center">
              <p className="text-base md:text-lg font-black text-blue-600">{stats.funded}</p>
              <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase">{tr("transactions_page.funded_count")}</p>
            </div>
            <div className="rounded-xl border bg-card p-3 text-center">
              <p className="text-base md:text-lg font-black text-green-600">{stats.released}</p>
              <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase">{tr("transactions_page.released_count")}</p>
            </div>
          </div>
        )}

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

        {isLoading && (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
          </div>
        )}

        <div className="space-y-3">
          {filtered.map(tx => {
            const st = statusBadge(tx.status, tr);
            return (
              <Card key={tx.id} className="overflow-hidden">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <CardTitle className="text-sm md:text-base font-bold">
                        {tr("transactions_page.transaction").replace("{id}", String(tx.id))}
                      </CardTitle>
                      {tx.rfq_id && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tr("transactions_page.linked_rfq")} #{tx.rfq_id}
                        </p>
                      )}
                    </div>
                    <Badge variant={st.variant} className={cn("shrink-0 text-[10px]", st.className)}>
                      {st.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <p className="text-[10px] text-muted-foreground uppercase">{tr("transactions_page.amount")}</p>
                      <p className="font-bold">{tx.amount.toFixed(2)} {tx.currency}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <p className="text-[10px] text-muted-foreground uppercase">{tr("transactions_page.net")}</p>
                      <p className="font-bold text-green-700">{tx.net_amount.toFixed(2)} {tx.currency}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <p className="text-[10px] text-muted-foreground uppercase">{tr("transactions_page.commission")}</p>
                      <p className="font-semibold">{tx.commission_amount.toFixed(2)} {tx.currency}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2.5">
                      <p className="text-[10px] text-muted-foreground uppercase">{tr("transactions_page.method")}</p>
                      <p className="font-semibold flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        {paymentLabel(tx.payment_method, tr)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {tx.status === "pending" && (
                      <Button size="sm" className="gap-1 flex-1 sm:flex-none" onClick={() => fund(tx.id)}>
                        <Shield className="h-3 w-3" /> {tr("transactions.confirm_payment")}
                      </Button>
                    )}
                    {tx.status === "funded" && (
                      <Button size="sm" variant="secondary" className="gap-1 flex-1 sm:flex-none" onClick={() => release(tx.id)}>
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
            );
          })}
          {!isLoading && !filtered.length && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground text-sm">
                {tr("transactions_page.empty")}
              </CardContent>
            </Card>
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
