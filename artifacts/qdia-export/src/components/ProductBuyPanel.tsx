import { Link, useLocation } from "wouter";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, ShieldCheck, Truck, FileText, ArrowRight, ShoppingCart } from "lucide-react";
import type { Product } from "@workspace/api-client-react";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { platformApi } from "@/lib/platform-api";
import { CART_QUERY_KEY } from "@/hooks/useCart";
import type { IncotermKey } from "@/components/ProductIncotermPricing";

type ProductPrices = Product["prices"] & { retail?: number; wholesale?: number };

interface Props {
  product: Product;
  selectedIncoterm: IncotermKey;
  unitLabel: string;
  moqUnitLabel: string;
}

export function ProductBuyPanel({ product, selectedIncoterm, unitLabel, moqUnitLabel }: Props) {
  const { tr } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const [qty, setQty] = useState(product.moq);
  const [adding, setAdding] = useState(false);
  const prices = product.prices as ProductPrices;
  const selectedPrice = prices[selectedIncoterm];
  const incotermLabel = selectedIncoterm.toUpperCase();
  const rfqHref = `/rfq?product=${encodeURIComponent(product.name)}&qty=${product.moq}&unit=${encodeURIComponent(moqUnitLabel)}&incoterm=${incotermLabel}`;

  const addToCart = async () => {
    if (!user) {
      toast({ title: tr("cart.login_required"), variant: "destructive" });
      window.dispatchEvent(new Event("qdia-open-auth"));
      return;
    }
    setAdding(true);
    try {
      await platformApi.addToCart({ product_id: product.id, quantity: qty, incoterm: incotermLabel });
      await qc.invalidateQueries({ queryKey: CART_QUERY_KEY });
      toast({ title: tr("cart.added"), description: tr("cart.added_desc") });
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const paymentMethods = [
    { icon: CreditCard, label: tr("payment.swift"), desc: tr("buy_panel.swift_desc") },
    { icon: FileText, label: tr("payment.lc"), desc: tr("buy_panel.lc_desc") },
    { icon: ShieldCheck, label: tr("payment.escrow"), desc: tr("buy_panel.escrow_desc") },
  ];

  const orderSteps = [
    tr("buy_panel.order_step1"),
    tr("buy_panel.order_step2"),
    tr("buy_panel.order_step3"),
    tr("buy_panel.order_step4"),
  ];

  const goToCart = () => {
    if (!user) {
      sessionStorage.setItem("qdia_return_to", "/panier");
      toast({ title: tr("cart.login_required"), variant: "destructive" });
      window.dispatchEvent(new Event("qdia-open-auth"));
      return;
    }
    setLocation("/panier");
  };

  return (
    <div className="rounded-xl border-2 border-[#0461A5]/20 bg-[#F0F4FF] p-5 space-y-5">
      <div>
        <h3 className="font-bold text-[#073B74] text-lg mb-1">{tr("buy_panel.title")}</h3>
        <p className="text-sm text-[#656566]">{tr("buy_panel.subtitle")}</p>
      </div>

      <div className="bg-white rounded-lg border border-[#E5E7EB] p-4">
        <p className="text-xs text-[#9CA3AF] uppercase tracking-wide mb-2">
          {tr("buy_panel.indicative_incoterm").replace("{{incoterm}}", incotermLabel)}
        </p>
        <p className="text-3xl font-black text-[#0461A5]">
          ${selectedPrice?.toLocaleString() ?? "—"}
          <span className="text-sm font-normal text-[#9CA3AF] ml-2">{unitLabel}</span>
        </p>
        <p className="text-xs text-[#9CA3AF] mt-1">{tr("product.moq")} : {product.moq} {moqUnitLabel} · {tr("product_detail.departure_port")} {product.port_depart}</p>
        {(prices?.retail != null || prices?.wholesale != null) && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {prices?.retail != null && (
              <div className="bg-[#FFF8E1] rounded-lg px-3 py-2 border border-[#F5C518]/30">
                <p className="text-[#9CA3AF] uppercase tracking-wide">{tr("buy_panel.unit_price")}</p>
                <p className="font-bold text-[#1A1A2E]">{prices.retail.toLocaleString()} DZD</p>
              </div>
            )}
            {prices?.wholesale != null && (
              <div className="bg-[#E8F2FB] rounded-lg px-3 py-2 border border-[#0461A5]/20">
                <p className="text-[#9CA3AF] uppercase tracking-wide">{tr("buy_panel.bulk_price")}</p>
                <p className="font-bold text-[#0461A5]">{prices.wholesale.toLocaleString()} DZD</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-[#334257] uppercase tracking-wide">{tr("buy_panel.how_to_order")}</p>
        {orderSteps.map((text, i) => (
          <div key={text} className="flex items-center gap-3 text-sm">
            <span className="h-6 w-6 rounded-full bg-[#0461A5] text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
            <span className="text-[#334257]">{text}</span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-[#334257] uppercase tracking-wide">{tr("buy_panel.payment_methods")}</p>
        <div className="grid gap-2">
          {paymentMethods.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-center gap-3 bg-white rounded-lg border border-[#E5E7EB] px-3 py-2">
              <Icon className="h-4 w-4 text-[#0461A5] shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#1A1A2E]">{label}</p>
                <p className="text-[11px] text-[#9CA3AF]">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-1">
        <Button size="lg" variant="default" className="flex-1 font-bold gap-2" onClick={() => void addToCart()} disabled={adding}>
          <ShoppingCart className="h-4 w-4" /> {tr("cart.add_to_cart")}
        </Button>
        <Button size="lg" variant="gold" className="flex-1 font-bold gap-2" asChild>
          <Link href={rfqHref}>
            {tr("buy_panel.order_now")} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{tr("cart.qty")}</span>
        <Input type="number" className="w-24 h-8" min={product.moq} value={qty} onChange={e => setQty(parseInt(e.target.value, 10) || product.moq)} />
        <Button size="sm" variant="outline" className="gap-1.5 font-semibold border-[#0461A5] text-[#0461A5]" onClick={goToCart}>
          <ShoppingCart className="h-3.5 w-3.5" /> {tr("cart.view")}
        </Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Button size="lg" variant="outline" className="flex-1 border-[#0461A5] text-[#0461A5]" asChild>
          <Link href={`/rfq?product=${encodeURIComponent(product.name)}&incoterm=${incotermLabel}`}>
            <Truck className="h-4 w-4 mr-2" /> {tr("product.request_quote")}
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-2 text-xs text-[#656566]">
        <ShieldCheck className="h-4 w-4 text-[#04BB7B]" />
        {tr("buy_panel.protected")}
      </div>
    </div>
  );
}
