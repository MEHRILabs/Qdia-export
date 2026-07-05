import { useState } from "react";
import { Link, useLocation } from "wouter";
import { BuyerHeader, BuyerFooter } from "@/components/BuyerHeader";
import { Button } from "@/components/ui/button";
import { platformApi, type CheckoutResult } from "@/lib/platform-api";
import { useI18n } from "@/contexts/I18nContext";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CreditCard, ShieldCheck, Mail, Phone, MessageCircle, CheckCircle2 } from "lucide-react";

function CheckoutContent() {
  const { tr } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [method, setMethod] = useState<"escrow" | "swift" | "lc">("escrow");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckoutResult | null>(null);

  const confirm = async () => {
    setLoading(true);
    try {
      const order = await platformApi.checkoutCart(method);
      setResult(order);
      toast({
        title: tr("checkout.success"),
        description: tr("checkout.success_desc").replace("{id}", String(order.id ?? "")),
      });
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const contact = result?.supplier_contact;

  if (result) {
    return (
      <div className="min-h-screen qdia-buyer-page flex flex-col">
        <BuyerHeader />
        <main className="flex-1 p-6 md:p-8 max-w-lg mx-auto w-full">
          <div className="text-center mb-6">
            <CheckCircle2 className="h-14 w-14 text-[#04BB7B] mx-auto mb-3" />
            <h1 className="text-2xl font-black mb-1">{tr("checkout.success")}</h1>
            <p className="text-sm text-muted-foreground">
              {tr("checkout.success_desc").replace("{id}", String(result.id ?? ""))}
            </p>
            <p className="text-sm font-semibold text-[#0461A5] mt-2">{tr("checkout.order_sent")}</p>
          </div>

          {contact && (contact.email || contact.phone || contact.supplier_user_id) && (
            <div className="rounded-xl border border-[#0461A5]/20 bg-[#F0F4FF] p-5 space-y-4 mb-6">
              <p className="font-bold text-[#073B74]">{tr("checkout.contact_supplier")}</p>
              {contact.name && <p className="text-sm font-semibold">{contact.name}{contact.company ? ` · ${contact.company}` : ""}</p>}
              <div className="flex flex-col gap-2">
                {contact.email && (
                  <Button variant="outline" className="justify-start gap-2" asChild>
                    <a href={`mailto:${contact.email}`}>
                      <Mail className="h-4 w-4" /> {tr("checkout.contact_email")}: {contact.email}
                    </a>
                  </Button>
                )}
                {contact.phone && (
                  <Button variant="outline" className="justify-start gap-2" asChild>
                    <a href={`tel:${contact.phone}`}>
                      <Phone className="h-4 w-4" /> {tr("checkout.contact_phone")}: {contact.phone}
                    </a>
                  </Button>
                )}
                {contact.supplier_user_id && (
                  <Button className="justify-start gap-2 bg-[#0461A5]" asChild>
                    <Link href={`/messages?user=${contact.supplier_user_id}`}>
                      <MessageCircle className="h-4 w-4" /> {tr("checkout.contact_message")}
                    </Link>
                  </Button>
                )}
              </div>
              <p className="text-xs text-[#9CA3AF]">{tr("checkout.supplier_notified")}</p>
            </div>
          )}

          {result.transaction_id && (
            <div className="rounded-xl border border-[#0461A5]/20 bg-[#F0F4FF] p-4 mb-4 text-sm">
              <p className="font-semibold text-[#073B74] mb-1">{tr("checkout.transaction_created").replace("{id}", String(result.transaction_id))}</p>
              <Button className="w-full mt-2 gap-2" asChild>
                <Link href="/transactions"><ShieldCheck className="h-4 w-4" /> {tr("checkout.view_transaction")}</Link>
              </Button>
            </div>
          )}

          <Button className="w-full" size="lg" onClick={() => setLocation("/commandes")}>
            {tr("checkout.view_orders")}
          </Button>
          <Button variant="ghost" className="w-full mt-2" asChild>
            <Link href="/products">{tr("cart.continue_shopping")}</Link>
          </Button>
        </main>
        <BuyerFooter />
      </div>
    );
  }

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
