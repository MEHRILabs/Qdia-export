import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { SupplierSidebar } from "@/components/SupplierSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, Clock, Loader2, Database, Sparkles, ImageIcon, DollarSign, Pencil, Package, MessageSquare, Factory, ChevronDown } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { platformApi } from "@/lib/platform-api";
import { useI18n } from "@/contexts/I18nContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminOrdersPanel } from "@/components/AdminOrdersPanel";
import { AdminExportAuthPanel } from "@/components/AdminExportAuthPanel";
import { MessagesPanel } from "@/components/MessagesPanel";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Product {
  id: number;
  name: string;
  category: string;
  export_status: string;
  prices: { fob: number; cif: number; currency?: string };
  moq: number;
  moq_unit: string;
  image_url?: string | null;
}

const ADMIN_TABS = [
  { value: "products", icon: Clock, labelKey: "admin.tab_products" },
  { value: "orders", icon: Package, labelKey: "admin.tab_orders" },
  { value: "export", icon: Factory, labelKey: "admin.tab_export" },
  { value: "messages", icon: MessageSquare, labelKey: "admin.tab_messages" },
] as const;

function AdminMobileNav({
  activeTab,
  onChange,
  tr,
}: {
  activeTab: string;
  onChange: (v: string) => void;
  tr: (key: string) => string;
}) {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-card shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-4">
        {ADMIN_TABS.map(({ value, icon: Icon, labelKey }) => (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-2.5 px-1 text-[10px] font-medium transition-colors",
              activeTab === value
                ? "text-[#0461A5] bg-[#0461A5]/5"
                : "text-muted-foreground",
            )}
          >
            <Icon className={cn("h-5 w-5", activeTab === value && "text-[#0461A5]")} />
            <span className="truncate max-w-full leading-tight">{tr(labelKey)}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}

export default function AdminReview() {
  const { toast } = useToast();
  const { tr } = useI18n();
  const isMobile = useIsMobile();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);

  const [adminStats, setAdminStats] = useState<Record<string, unknown> | null>(null);
  const [enrichStatus, setEnrichStatus] = useState<{
    total: number;
    without_photo: number;
    without_pricing: number;
    ready_for_review: number;
    published: number;
  } | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [photoUpdating, setPhotoUpdating] = useState<number | null>(null);

  const [activeTab, setActiveTab] = useState("products");
  const [toolsOpen, setToolsOpen] = useState(false);

  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem("qdia_auth_token");
    return token
      ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      : { "Content-Type": "application/json" };
  };

  const loadPending = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("qdia_auth_token");
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const [resp, statsResp, enrichResp] = await Promise.all([
        fetch(`${BASE}/api/products?scope=admin&export_status=pending&limit=50`),
        fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/admin/stats`, { headers }),
        platformApi.getEnrichmentStatus().catch(() => null),
      ]);
      const data = await resp.json();
      setProducts(data.data ?? []);
      if (statsResp.ok) setAdminStats(await statsResp.json());
      if (enrichResp) setEnrichStatus(enrichResp);
    } catch {
      toast({ title: tr("common.error"), description: tr("admin.load_failed"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast, tr]);

  const generatePhoto = async (productId: number) => {
    setPhotoUpdating(productId);
    try {
      const result = await platformApi.enrichProduct(productId, { generate_photos: true, skip_pricing: true });
      if (!result.ok || !result.photo_updated) {
        throw new Error("Photo IA non générée — vérifiez OPENAI_API_KEY");
      }
      toast({ title: tr("admin.photo_generated"), description: `#${productId}` });
      loadPending();
    } catch (e) {
      toast({
        title: tr("common.error"),
        description: String(e instanceof Error ? e.message : e),
        variant: "destructive",
      });
    } finally {
      setPhotoUpdating(null);
    }
  };

  const runEnrichment = async (limit = 50) => {
    setEnriching(true);
    try {
      const result = await platformApi.enrichProductsBatch({ limit, generate_photos: true });
      toast({
        title: tr("admin.enrich_done"),
        description: tr("admin.enrich_done_desc")
          .replace("{enriched}", String(result.enriched))
          .replace("{photos}", String(result.photos_generated))
          .replace("{pricing}", String(result.pricing_updated)),
      });
      const status = await platformApi.getEnrichmentStatus();
      setEnrichStatus(status);
      loadPending();
    } catch (e) {
      toast({
        title: tr("common.error"),
        description: String(e instanceof Error ? e.message : e),
        variant: "destructive",
      });
    } finally {
      setEnriching(false);
    }
  };

  useEffect(() => { loadPending(); }, [loadPending]);

  const updateStatus = async (id: number, export_status: "published" | "suspended") => {
    setUpdating(id);
    try {
      const resp = await fetch(`${BASE}/api/products/${id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ export_status }),
      });
      if (!resp.ok) throw new Error("Échec");
      toast({
        title: export_status === "published" ? tr("admin.approved") : tr("admin.rejected"),
        description: tr("admin.updated").replace("{id}", String(id)),
      });
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch {
      toast({ title: tr("common.error"), description: tr("admin.update_failed"), variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  const migrateMysql = async () => {
    try {
      const r = await platformApi.migrateMysql();
      toast({
        title: r.connected ? tr("admin.imported").replace("{count}", String(r.imported)) : tr("admin.mysql_not_connected"),
        description: r.errors[0] ?? undefined,
        variant: r.connected ? "default" : "destructive",
      });
      if (r.imported) loadPending();
    } catch (e) {
      toast({ title: tr("admin.migration_error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-dvh bg-background flex flex-col md:flex-row">
      <SupplierSidebar activePath="/admin" />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 max-w-5xl mx-auto w-full">
        <div className="mb-4 md:mb-6">
          <header className="md:hidden flex items-center justify-between mb-3 pb-3 border-b">
            <Link href="/" className="font-bold text-sm text-primary">{tr("mobile.brand_short")}</Link>
            <span className="font-bold text-sm">{tr("nav.admin")}</span>
            <span className="w-16" aria-hidden />
          </header>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h1 className="text-xl md:text-2xl font-bold mb-1 flex items-center gap-2">
                <Clock className="h-5 w-5 md:h-6 md:w-6 text-primary" /> {tr("admin.page_title")}
              </h1>
              <p className="text-muted-foreground text-xs md:text-sm">{tr("admin.page_subtitle")}</p>
            </div>
            {activeTab === "products" && !loading && products.length > 0 && (
              <Badge variant="secondary" className="shrink-0 mt-1">
                {tr("admin.pending_count").replace("{count}", String(products.length))}
              </Badge>
            )}
          </div>
          {adminStats && (activeTab === "products" || !isMobile) && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 md:gap-3 mt-3 md:mt-4">
              {(
                [
                  [tr("admin.users"), adminStats.users],
                  [tr("admin.products"), adminStats.products],
                  [tr("admin.orders_count"), adminStats.orders_count ?? 0],
                  [tr("admin.volume_usd"), adminStats.transaction_volume_usd ?? 0],
                  [tr("admin.commission"), `$${adminStats.total_commission_usd ?? 0}`],
                  [tr("admin.export_authorized_count"), adminStats.export_authorized ?? 0],
                  [tr("admin.export_pending_count"), adminStats.export_pending ?? 0],
                ] as [string, string | number][]
              ).map(([label, val]) => (
                <div key={String(label)} className="rounded-lg border bg-card p-3 text-center">
                  <p className="text-lg font-black text-primary">{String(val)}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
                </div>
              ))}
            </div>
          )}
          {enrichStatus && activeTab === "products" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 mt-3 md:mt-4">
              {(
                [
                  [tr("admin.enrich_total"), enrichStatus.total, DollarSign],
                  [tr("admin.enrich_no_photo"), enrichStatus.without_photo, ImageIcon],
                  [tr("admin.enrich_no_price"), enrichStatus.without_pricing, DollarSign],
                  [tr("admin.enrich_pending"), enrichStatus.ready_for_review, Clock],
                ] as const
              ).map(([label, val, Icon]) => (
                <div key={label} className="rounded-lg border bg-card p-2.5 md:p-3">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                    <p className="text-[9px] md:text-[10px] text-muted-foreground uppercase leading-tight">{label}</p>
                  </div>
                  <p className="text-lg md:text-xl font-black text-primary">{val}</p>
                </div>
              ))}
            </div>
          )}
          {activeTab === "products" && (
          <div className="mt-3 md:mt-4">
            <button
              type="button"
              className="md:hidden w-full flex items-center justify-between rounded-lg border bg-card px-3 py-2.5 text-sm font-medium"
              onClick={() => setToolsOpen(o => !o)}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                {tr("admin.tools_title")}
              </span>
              <ChevronDown className={cn("h-4 w-4 transition-transform", toolsOpen && "rotate-180")} />
            </button>
            <div className={cn(
              "flex flex-col sm:flex-row flex-wrap gap-2",
              "md:flex",
              toolsOpen ? "flex mt-2" : "hidden md:flex",
            )}>
            <Button variant="outline" size="sm" className="gap-2" onClick={migrateMysql}>
              <Database className="h-4 w-4" /> {tr("admin.migrate_mysql")}
            </Button>
            <Button
              variant="gold"
              size="sm"
              className="gap-2"
              disabled={enriching}
              onClick={() => runEnrichment(50)}
            >
              {enriching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {tr("admin.enrich_batch_50")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={enriching}
              onClick={() => runEnrichment(200)}
            >
              {tr("admin.enrich_batch_200")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={enriching}
              onClick={async () => {
                setEnriching(true);
                try {
                  const result = await platformApi.enrichProductsBatch({
                    limit: 50,
                    generate_photos: true,
                    skip_pricing: true,
                    only_without_photo: true,
                  });
                  toast({
                    title: tr("admin.photos_batch_btn"),
                    description: `${result.photos_generated} photo(s) · ${result.enriched} enrichi(s)`,
                  });
                  loadPending();
                } catch (e) {
                  toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
                } finally {
                  setEnriching(false);
                }
              }}
            >
              {enriching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              {tr("admin.photos_batch_btn")}
            </Button>
          </div>
          </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="hidden md:flex mb-6 w-full flex-wrap h-auto gap-1">
            {ADMIN_TABS.map(({ value, icon: Icon, labelKey }) => (
              <TabsTrigger key={value} value={value} className="gap-1.5">
                <Icon className="h-4 w-4" /> {tr(labelKey)}
              </TabsTrigger>
            ))}
          </TabsList>

          <AdminMobileNav activeTab={activeTab} onChange={setActiveTab} tr={tr} />

          <TabsContent value="products">
        {loading && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full mb-3 rounded-xl" />)}

        {!loading && products.length === 0 && (
          <div className="text-center py-16 text-muted-foreground border rounded-xl bg-card">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{tr("admin.no_pending")}</p>
          </div>
        )}

        <div className="space-y-3">
          {products.map(p => (
            <div key={p.id} className="flex flex-col gap-3 p-3 sm:p-4 border rounded-xl bg-card shadow-sm">
              <div className="flex items-start gap-3 min-w-0">
              <div className="h-16 w-16 sm:h-14 sm:w-14 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                <ProductImage src={p.image_url} alt={p.name} compact className="h-full w-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm sm:text-base leading-snug">{p.name}</div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-x-2 gap-y-1 mt-1">
                  <Badge variant="outline" className="text-[10px]">{p.category}</Badge>
                  <span>FOB ${p.prices.fob}</span>
                  <span>CIF ${p.prices.cif}</span>
                  <span>MOQ {p.moq} {p.moq_unit}</span>
                </div>
              </div>
              </div>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                <Link href={`/supplier/products/${p.id}/edit`} className="col-span-1">
                  <Button size="sm" variant="outline" className="gap-1 w-full sm:w-auto">
                    <Pencil className="h-3 w-3" /> {tr("admin.edit_photo")}
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1 col-span-1"
                  disabled={photoUpdating === p.id}
                  onClick={() => void generatePhoto(p.id)}
                >
                  {photoUpdating === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {tr("admin.ai_photo")}
                </Button>
                <Button size="sm" variant="default" className="gap-1 col-span-1"
                  disabled={updating === p.id}
                  onClick={() => updateStatus(p.id, "published")}>
                  {updating === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                  {tr("admin.approve")}
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200 col-span-1"
                  disabled={updating === p.id}
                  onClick={() => updateStatus(p.id, "suspended")}>
                  <XCircle className="h-3 w-3" /> {tr("admin.reject")}
                </Button>
              </div>
            </div>
          ))}
        </div>
          </TabsContent>

          <TabsContent value="orders">
            <AdminOrdersPanel />
          </TabsContent>

          <TabsContent value="export">
            <AdminExportAuthPanel />
          </TabsContent>

          <TabsContent value="messages">
            <div className={cn(
              "border rounded-xl overflow-hidden bg-card",
              isMobile ? "h-[calc(100dvh-14rem)]" : "",
            )}>
              <MessagesPanel compact={!isMobile} />
            </div>
          </TabsContent>
        </Tabs>

        <p className="text-xs text-center text-muted-foreground mt-6">
          <Link href="/products" className="text-primary underline">{tr("admin.view_catalog")}</Link>
        </p>
      </main>
    </div>
  );
}
