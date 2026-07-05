import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart, ShieldCheck, MessageSquare, ArrowRight, AlertTriangle,
  Globe, FileCheck, Calculator, Factory,
} from "lucide-react";
import type { Product } from "@workspace/api-client-react";
import { useI18n } from "@/contexts/I18nContext";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { platformApi } from "@/lib/platform-api";
import { CART_QUERY_KEY } from "@/hooks/useCart";
import { ProductIncotermPricing, type IncotermKey } from "@/components/ProductIncotermPricing";
import {
  BUYER_COUNTRIES,
  defaultIncoterm,
  getStoredBuyerCountry,
  resolveIncotermMode,
  setStoredBuyerCountry,
  inferStockCountries,
  availableIncoterms,
} from "@/lib/incoterms-routing";
import type { CustomsCalcResult } from "@/lib/api-auth";

type ProductExt = Product & {
  origin_country?: string;
  export_authorized?: boolean;
  stock_countries?: string[];
  prices: Product["prices"] & { ddp?: number };
};

interface Props {
  product: ProductExt;
  unitLabel: string;
  moqUnitLabel: string;
}

export function ProductOrderFlow({ product, unitLabel, moqUnitLabel }: Props) {
  const { tr } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const [buyerCountry, setBuyerCountry] = useState(getStoredBuyerCountry);
  const [qty, setQty] = useState(product.moq);
  const [ordering, setOrdering] = useState(false);
  const [contacting, setContacting] = useState(false);

  const stockCountries = product.stock_countries?.length
    ? product.stock_countries
    : inferStockCountries(product.target_markets ?? []);
  const originCountry = product.origin_country ?? "DZ";
  const mode = resolveIncotermMode(originCountry, buyerCountry, stockCountries);
  const allowedIncoterms = availableIncoterms(mode);
  const [selectedIncoterm, setSelectedIncoterm] = useState<IncotermKey>(() =>
    defaultIncoterm(mode) as IncotermKey,
  );

  useEffect(() => {
    setSelectedIncoterm(defaultIncoterm(mode) as IncotermKey);
  }, [mode, buyerCountry]);

  useEffect(() => {
    setStoredBuyerCountry(buyerCountry);
  }, [buyerCountry]);

  const { data: pricing } = useQuery({
    queryKey: ["product-pricing", product.id, buyerCountry, qty],
    queryFn: () => platformApi.getProductPricing(product.id, buyerCountry, qty),
  });

  const prices = useMemo(() => ({
    exw: pricing?.prices?.exw ?? product.prices.exw,
    fob: pricing?.prices?.fob ?? product.prices.fob,
    cfr: pricing?.prices?.cfr ?? product.prices.cfr,
    cif: pricing?.prices?.cif ?? product.prices.cif,
    ddp: pricing?.prices?.ddp ?? product.prices.ddp,
  }), [pricing, product.prices]);

  const customs = pricing?.customs as CustomsCalcResult | undefined;
  const exportOk = product.export_authorized !== false;
  const selectedPrice = prices[selectedIncoterm as keyof typeof prices];
  const incotermLabel = selectedIncoterm.toUpperCase();
  const lineTotal = selectedIncoterm === "ddp" && pricing?.line_total_usd?.ddp
    ? pricing.line_total_usd.ddp
    : (selectedPrice ?? 0) * qty;

  const placeOrder = async () => {
    if (!exportOk) {
      toast({ title: tr("order_flow.export_blocked"), variant: "destructive" });
      return;
    }
    if (!user) {
      sessionStorage.setItem("qdia_return_to", window.location.pathname);
      toast({ title: tr("cart.login_required"), variant: "destructive" });
      window.dispatchEvent(new Event("qdia-open-auth"));
      return;
    }
    setOrdering(true);
    try {
      await platformApi.addToCart({
        product_id: product.id,
        quantity: qty,
        incoterm: incotermLabel,
        notes: `${tr("order_flow.destination")}: ${buyerCountry}`,
      });
      await qc.invalidateQueries({ queryKey: CART_QUERY_KEY });
      toast({ title: tr("cart.added"), description: tr("order_flow.redirect_checkout") });
      setLocation("/checkout");
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setOrdering(false);
    }
  };

  const contactSupplier = async () => {
    if (!user) {
      sessionStorage.setItem("qdia_return_to", window.location.pathname);
      window.dispatchEvent(new Event("qdia-open-auth"));
      return;
    }
    setContacting(true);
    try {
      const contact = await platformApi.getProductContact(product.id);
      if (!contact.supplier_user_id) throw new Error(tr("buy_panel.no_supplier_contact"));
      const intro = tr("buy_panel.contact_intro").replace("{{product}}", product.name);
      setLocation(`/messages?user=${contact.supplier_user_id}`);
      await platformApi.sendMessage(contact.supplier_user_id, intro).catch(() => {});
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setContacting(false);
    }
  };

  const modeLabel = mode === "local_stock"
    ? tr("order_flow.mode_local_stock")
    : mode === "domestic"
      ? tr("order_flow.mode_domestic")
      : tr("order_flow.mode_export");

  return (
    <div className="rounded-xl border-2 border-[#0461A5]/25 bg-gradient-to-b from-[#F0F4FF] to-white p-5 space-y-5 shadow-sm">
      <div>
        <h3 className="font-bold text-[#073B74] text-lg flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" /> {tr("order_flow.title")}
        </h3>
        <p className="text-sm text-[#656566] mt-1">{tr("order_flow.subtitle")}</p>
      </div>

      {!exportOk && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm">
          <Factory className="h-5 w-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900">{tr("order_flow.export_auth_required")}</p>
            <p className="text-amber-800 mt-1">{tr("order_flow.export_auth_desc")}</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs font-bold text-[#334257] uppercase tracking-wide flex items-center gap-1">
          <Globe className="h-3.5 w-3.5" /> {tr("order_flow.your_country")}
        </p>
        <div className="flex flex-wrap gap-2">
          {BUYER_COUNTRIES.map(c => (
            <Button
              key={c.code}
              type="button"
              size="sm"
              variant={buyerCountry === c.code ? "default" : "outline"}
              className={buyerCountry === c.code ? "bg-[#0461A5]" : ""}
              onClick={() => setBuyerCountry(c.code)}
            >
              {c.flag} {tr(c.labelKey)}
            </Button>
          ))}
        </div>
        <Badge variant="secondary" className="text-[11px]">{modeLabel}</Badge>
      </div>

      <ProductIncotermPricing
        prices={prices}
        unitLabel={unitLabel}
        selected={selectedIncoterm}
        onSelect={setSelectedIncoterm}
        allowedIncoterms={allowedIncoterms}
      />

      {customs && selectedIncoterm === "ddp" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg border border-[#0461A5]/20 p-4 space-y-2 text-sm"
        >
          <p className="font-semibold text-[#073B74] flex items-center gap-1">
            <FileCheck className="h-4 w-4" /> {tr("order_flow.ddp_breakdown")}
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-muted-foreground">{tr("customs_panel.duty")}</span><p className="font-bold">{customs.duty_dzd.toLocaleString()} DZD</p></div>
            <div><span className="text-muted-foreground">{tr("customs_panel.vat")}</span><p className="font-bold">{customs.vat_dzd.toLocaleString()} DZD</p></div>
            <div><span className="text-muted-foreground">{tr("customs_panel.customs_fee")}</span><p className="font-bold">{customs.customs_fee_dzd.toLocaleString()} DZD</p></div>
            <div><span className="text-muted-foreground">{tr("customs_panel.documents")}</span><p className="font-bold">{customs.documentation_fee_dzd.toLocaleString()} DZD</p></div>
          </div>
          <p className="text-[#0461A5] font-black flex items-center gap-1 text-sm">
            <Calculator className="h-4 w-4" />
            {tr("customs_panel.total")} : {customs.total_customs_dzd.toLocaleString()} DZD
          </p>
          {customs.notes && <p className="text-[11px] text-muted-foreground italic">{customs.notes}</p>}
        </motion.div>
      )}

      <div className="bg-white rounded-xl border-2 border-[#0461A5]/30 p-4 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground uppercase">{tr("order_flow.total_line")}</p>
            <p className="text-3xl font-black text-[#0461A5]">
              ${lineTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              <span className="text-sm font-normal text-muted-foreground ml-2">{incotermLabel}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {qty} {moqUnitLabel} · {tr("product_detail.departure_port")} {product.port_depart}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{tr("cart.qty")}</span>
            <Input
              type="number"
              className="w-24 h-9"
              min={product.moq}
              value={qty}
              onChange={e => setQty(Math.max(product.moq, parseInt(e.target.value, 10) || product.moq))}
            />
          </div>
        </div>

        <Button
          size="lg"
          variant="gold"
          className="w-full font-black text-base gap-2 h-12"
          disabled={ordering || !exportOk}
          onClick={() => void placeOrder()}
        >
          {ordering ? tr("common.loading") : (
            <>
              {tr("order_flow.order_button")} <ArrowRight className="h-5 w-5" />
            </>
          )}
        </Button>

        {!exportOk && (
          <p className="text-xs text-amber-700 flex items-center gap-1 justify-center">
            <AlertTriangle className="h-3.5 w-3.5" /> {tr("order_flow.order_blocked_export")}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="flex-1 gap-1" onClick={() => void contactSupplier()} disabled={contacting}>
            <MessageSquare className="h-3.5 w-3.5" /> {tr("buy_panel.contact_supplier")}
          </Button>
          <Button size="sm" variant="outline" className="flex-1 gap-1" asChild>
            <Link href={`/rfq?product=${encodeURIComponent(product.name)}&incoterm=${incotermLabel}&destination=${buyerCountry}`}>
              {tr("product.request_quote")}
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-[#656566]">
        <ShieldCheck className="h-4 w-4 text-[#04BB7B]" />
        {tr("buy_panel.protected")}
      </div>
    </div>
  );
}
