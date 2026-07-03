import { useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { BuyerHeader, BuyerFooter } from "@/components/BuyerHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductImage } from "@/components/ProductImage";
import { platformApi, type CartItem } from "@/lib/platform-api";
import { useI18n } from "@/contexts/I18nContext";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { CART_QUERY_KEY, useCart } from "@/hooks/useCart";
import { formatUnitLabel } from "@/lib/display-text";
import {
  ShoppingCart, Trash2, ArrowRight, Minus, Plus, ShieldCheck,
  Package, Truck, Sparkles, ShoppingBag,
} from "lucide-react";

function CartItemRow({
  item,
  onUpdate,
  onRemove,
  updating,
}: {
  item: CartItem;
  onUpdate: (qty: number) => void;
  onRemove: () => void;
  updating: boolean;
}) {
  const { tr } = useI18n();
  const moq = item.moq ?? 1;
  const unitLabel = formatUnitLabel(item.moq_unit, tr);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className="group relative bg-white rounded-2xl border border-[#E5E7EB] shadow-sm hover:shadow-md hover:border-[#0461A5]/30 transition-all overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#0461A5] to-[#04BB7B] opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4">
        <Link href={`/products/${item.product_id}`} className="shrink-0">
          <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-xl border bg-[#FAFBFC] overflow-hidden flex items-center justify-center">
            <ProductImage
              src={item.product_image}
              alt={item.product_name ?? tr("cart.product")}
              fit="contain"
              className="max-w-full max-h-full p-2"
            />
          </div>
        </Link>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link href={`/products/${item.product_id}`}>
                <h3 className="font-bold text-[#1A1A2E] hover:text-[#0461A5] transition-colors line-clamp-2">
                  {item.product_name ?? `${tr("cart.product")} #${item.product_id}`}
                </h3>
              </Link>
              {item.product_sku && (
                <p className="text-[11px] text-[#9CA3AF] mt-0.5">{item.product_sku}</p>
              )}
              {item.supplier_name && (
                <p className="text-xs text-[#656566] mt-1">{item.supplier_name}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 text-red-400 hover:text-red-600 hover:bg-red-50"
              onClick={onRemove}
              disabled={updating}
              aria-label={tr("common.delete")}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="incoterm" className="text-[10px] font-bold">{item.incoterm}</Badge>
            <span className="text-[10px] text-[#9CA3AF]">MOQ {moq} {unitLabel}</span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-1 bg-[#F0F4FF] rounded-lg border border-[#0461A5]/15 p-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={updating || item.quantity <= moq}
                onClick={() => onUpdate(Math.max(moq, item.quantity - moq))}
              >
                <Minus className="h-3.5 w-3.5" />
              </Button>
              <span className="w-12 text-center text-sm font-bold text-[#0461A5]">{item.quantity}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={updating}
                onClick={() => onUpdate(item.quantity + moq)}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="text-right">
              {item.unit_price != null && (
                <p className="text-xs text-[#9CA3AF]">
                  ${item.unit_price.toLocaleString()} / {unitLabel}
                </p>
              )}
              <p className="text-lg font-black text-[#0461A5]">
                {item.line_total != null ? `$${item.line_total.toLocaleString()}` : "—"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CartContent() {
  const { tr } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useCart();
  const items = data?.data ?? [];
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const total = items.reduce((sum, i) => sum + (i.line_total ?? 0), 0);

  const invalidate = () => qc.invalidateQueries({ queryKey: CART_QUERY_KEY });

  const remove = async (id: number) => {
    setUpdatingId(id);
    try {
      await platformApi.removeFromCart(id);
      await invalidate();
      toast({ title: tr("cart.removed") });
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const updateQty = async (id: number, quantity: number) => {
    setUpdatingId(id);
    try {
      await platformApi.updateCartItem(id, quantity);
      await invalidate();
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen qdia-buyer-page flex flex-col">
      <BuyerHeader />

      <main className="flex-1 p-6 md:p-8 max-w-6xl mx-auto w-full">
        {/* Hero header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-2xl overflow-hidden mb-8 bg-gradient-to-r from-[#0461A5] via-[#073B74] to-[#1A1A2E] p-6 md:p-8 text-white"
        >
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-8 w-32 h-32 rounded-full bg-[#F5C518] blur-3xl" />
            <div className="absolute bottom-0 left-12 w-24 h-24 rounded-full bg-[#04BB7B] blur-2xl" />
          </div>
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-12 w-12 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center">
                  <ShoppingCart className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-black">{tr("cart.title")}</h1>
                  <p className="text-white/70 text-sm">{tr("cart.subtitle")}</p>
                </div>
              </div>
            </div>
            {items.length > 0 && (
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                className="bg-white/15 backdrop-blur rounded-xl px-5 py-3 text-center border border-white/20"
              >
                <p className="text-xs uppercase tracking-wide text-white/70">{tr("cart.items_count")}</p>
                <p className="text-3xl font-black">{items.length}</p>
              </motion.div>
            )}
          </div>
        </motion.div>

        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 w-full rounded-2xl" />)}
          </div>
        )}

        {isError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
            <p className="text-red-700 font-medium">{tr("cart.load_error")}</p>
            <p className="text-sm text-red-600">{String(error instanceof Error ? error.message : error)}</p>
            <Button variant="outline" onClick={() => void refetch()}>{tr("common.retry")}</Button>
          </div>
        )}

        {!isLoading && !isError && !items.length && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16 px-6 rounded-2xl border-2 border-dashed border-[#0461A5]/20 bg-[#F0F4FF]/50"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-lg mb-6"
            >
              <ShoppingBag className="h-10 w-10 text-[#0461A5]" />
            </motion.div>
            <h2 className="text-xl font-black text-[#1A1A2E] mb-2">{tr("cart.empty_title")}</h2>
            <p className="text-[#656566] text-sm mb-6 max-w-md mx-auto">{tr("cart.empty")}</p>
            <Button size="lg" className="gap-2 font-bold" asChild>
              <Link href="/products">
                <Sparkles className="h-4 w-4" /> {tr("cart.explore_catalog")}
              </Link>
            </Button>
          </motion.div>
        )}

        {items.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <AnimatePresence mode="popLayout">
                {items.map(item => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    updating={updatingId === item.id}
                    onRemove={() => void remove(item.id)}
                    onUpdate={qty => void updateQty(item.id, qty)}
                  />
                ))}
              </AnimatePresence>
            </div>

            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="sticky top-24 rounded-2xl border-2 border-[#0461A5]/20 bg-white shadow-lg overflow-hidden"
              >
                <div className="bg-[#F0F4FF] px-5 py-4 border-b">
                  <h2 className="font-black text-[#073B74] flex items-center gap-2">
                    <Package className="h-5 w-5" /> {tr("cart.summary")}
                  </h2>
                </div>
                <div className="p-5 space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-[#656566]">
                      <span>{tr("cart.subtotal")}</span>
                      <span className="font-semibold text-[#1A1A2E]">${total.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[#656566]">
                      <span>{tr("cart.shipping")}</span>
                      <span className="text-xs text-[#9CA3AF]">{tr("cart.shipping_note")}</span>
                    </div>
                  </div>

                  <div className="border-t pt-4 flex justify-between items-center">
                    <span className="font-bold text-[#1A1A2E]">{tr("cart.total")}</span>
                    <span className="text-2xl font-black text-[#0461A5]">${total.toLocaleString()}</span>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-[#656566] bg-[#E8F2FB] rounded-lg p-3">
                    <ShieldCheck className="h-4 w-4 text-[#04BB7B] shrink-0 mt-0.5" />
                    {tr("cart.trade_assurance")}
                  </div>

                  <Button className="w-full gap-2 font-bold" size="lg" asChild>
                    <Link href="/checkout">
                      {tr("cart.checkout")} <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full gap-2" asChild>
                    <Link href="/products">
                      <Truck className="h-4 w-4" /> {tr("cart.continue_shopping")}
                    </Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </main>
      <BuyerFooter />
    </div>
  );
}

export default function Cart() {
  return <CartContent />;
}
