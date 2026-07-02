import { useState } from "react";
import { Link, useLocation } from "wouter";
import { BuyerHeader, BuyerFooter } from "@/components/BuyerHeader";
import { Button } from "@/components/ui/button";
import { platformApi } from "@/lib/platform-api";
import { useI18n } from "@/contexts/I18nContext";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CreditCard, ShieldCheck } from "lucide-react";

function CheckoutContent() {
  const { tr } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [method, setMethod] = useState<"escrow" | "swift" | "lc">("escrow");
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    setLoading(true);
    try {
      const order = await platformApi.checkoutCart(method);
      toast({ title: tr("checkout.success"), description: tr("checkout.success_desc").replace("{id}", String(order.id ?? "")) });
      setLocation("/commandes");
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen qdia-buyer-page flex flex-col">
      <BuyerHeader />
      <main className="flex-1 p-6 md:p-8 max-w-lg mx-auto w-full">
        <h1 className="text-2xl font-black mb-2">{tr("checkout.title")}</h1>
        <p className="text-sm text-muted-foreground mb-6 flex items-center gap-1">
          <ShieldCheck className="h-4 w-4 text-[#04BB7B]" /> {tr("checkout.trade_assurance")}
        </p>
        <div className="space-y-3 mb-6">
          <p className="text-sm font-semibold">{tr("checkout.payment_method")}</p>
          {(["escrow", "swift", "lc"] as const).map(m => (
            <Button key={m} variant={method === m ? "default" : "outline"} className="w-full justify-start gap-2" onClick={() => setMethod(m)}>
              <CreditCard className="h-4 w-4" />
              {m === "escrow" ? tr("payment.escrow") : m === "swift" ? tr("payment.swift") : tr("payment.lc")}
            </Button>
          ))}
        </div>
        <Button className="w-full" size="lg" onClick={() => void confirm()} disabled={loading}>
          {loading ? tr("common.loading") : tr("checkout.confirm")}
        </Button>
        <Button variant="ghost" className="w-full mt-2" asChild>
          <Link href="/panier">{tr("common.back")}</Link>
        </Button>
      </main>
      <BuyerFooter />
    </div>
  );
}

export default function Checkout() {
  return (
    <ProtectedRoute>
      <CheckoutContent />
    </ProtectedRoute>
  );
}
