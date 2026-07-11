import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "wouter";
import { SupplierSidebar } from "@/components/SupplierSidebar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Clock, Loader2, Sparkles, ImageIcon, DollarSign, Package, MessageSquare, Factory, ChevronDown, Search } from "lucide-react";
import { platformApi } from "@/lib/platform-api";
import { useI18n } from "@/contexts/I18nContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminOrdersPanel } from "@/components/AdminOrdersPanel";
import { AdminExportAuthPanel } from "@/components/AdminExportAuthPanel";
import { AdminProductsPanel } from "@/components/AdminProductsPanel";
import { MessagesPanel } from "@/components/MessagesPanel";

const ADMIN_TABS = [
  { value: "products", icon: Clock, labelKey: "admin.tab_products" },
  { value: "orders", icon: Package, labelKey: "admin.tab_orders" },
  { value: "export", icon: Factory, labelKey: "admin.tab_export" },
  { value: "messages", icon: MessageSquare, labelKey: "admin.tab_messages" },
] as const;

const ADMIN_TAB_VALUES = new Set(ADMIN_TABS.map(t => t.value));

function tabFromSearch(search: string): string {
  const tab = new URLSearchParams(search).get("tab");
  return tab && ADMIN_TAB_VALUES.has(tab as typeof ADMIN_TABS[number]["value"]) ? tab : "products";
}

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
  const [searchParams, setSearchParams] = useSearchParams();

  const [adminStats, setAdminStats] = useState<Record<string, unknown> | null>(null);
  const [enrichStatus, setEnrichStatus] = useState<{
    total: number;
    without_photo: number;
    without_pricing: number;
    ready_for_review: number;
    published: number;
  } | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeJob, setScrapeJob] = useState<{
    status: string;
    total_products: number;
    without_photo: number;
    with_photo: number;
    processed: number;
    ok: number;
    failed: number;
    current_batch: number;
    message: string;
    last_product_name: string | null;
  } | null>(null);

  const [activeTab, setActiveTab] = useState(() => tabFromSearch(searchParams.toString()));
  const [toolsOpen, setToolsOpen] = useState(false);

  useEffect(() => {
    const tab = tabFromSearch(searchParams.toString());
    setActiveTab(prev => (prev === tab ? prev : tab));
  }, [searchParams]);

  const changeTab = useCallback((tab: string) => {
    setActiveTab(tab);
    const next = new URLSearchParams(searchParams.toString());
    if (tab === "products") next.delete("tab");
    else next.set("tab", tab);
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const loadStats = useCallback(async () => {
    try {
      const token = localStorage.getItem("qdia_auth_token");
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {};
      const [statsResp, enrichResp] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL ?? ""}/api/admin/stats`, { headers }),
        platformApi.getEnrichmentStatus().catch(() => null),
      ]);
      if (statsResp.ok) setAdminStats(await statsResp.json());
      if (enrichResp) setEnrichStatus(enrichResp);
    } catch {
      toast({ title: tr("common.error"), description: tr("admin.load_failed"), variant: "destructive" });
    }
  }, [toast, tr]);

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
      loadStats();
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

  const runScrapePhotos = async (_limit?: number) => {
    setScraping(true);
    try {
      const state = await platformApi.startScrapeJob(50);
      setScrapeJob({
        status: state.status,
        total_products: state.total_products,
        without_photo: state.without_photo,
        with_photo: state.with_photo,
        processed: 0,
        ok: 0,
        failed: 0,
        current_batch: 0,
        message: state.message,
        last_product_name: null,
      });
      toast({
        title: tr("admin.scrape_started"),
        description: tr("admin.scrape_started_desc").replace("{count}", String(state.without_photo)),
      });
    } catch (e) {
      setScraping(false);
      toast({
        title: tr("common.error"),
        description: String(e instanceof Error ? e.message : e),
        variant: "destructive",
      });
    }
  };

  const stopScrapePhotos = async () => {
    try {
      await platformApi.stopScrapeJob();
      toast({ title: tr("admin.scrape_stopping") });
    } catch (e) {
      toast({
        title: tr("common.error"),
        description: String(e instanceof Error ? e.message : e),
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!scraping && scrapeJob?.status !== "running" && scrapeJob?.status !== "stopping") return;
    const id = window.setInterval(() => {
      void platformApi.getScrapeJobStatus().then(s => {
        setScrapeJob({
          status: s.status,
          total_products: s.total_products,
          without_photo: s.without_photo,
          with_photo: s.with_photo,
          processed: s.processed,
          ok: s.ok,
          failed: s.failed,
          current_batch: s.current_batch,
          message: s.message,
          last_product_name: s.last_product_name,
        });
        if (s.status === "running" || s.status === "stopping") {
          setScraping(true);
        } else {
          setScraping(false);
          if (s.status === "done") {
            toast({
              title: tr("admin.scrape_done"),
              description: tr("admin.scrape_done_desc")
                .replace("{ok}", String(s.ok))
                .replace("{processed}", String(s.processed))
                .replace("{skipped}", String(s.skipped)),
            });
            void loadStats();
          }
        }
      }).catch(() => { /* ignore poll errors */ });
    }, 2000);
    return () => window.clearInterval(id);
  }, [scraping, scrapeJob?.status, toast, tr, loadStats]);

  useEffect(() => {
    void platformApi.getScrapeJobStatus().then(s => {
      if (s.status === "running" || s.status === "stopping") {
        setScraping(true);
        setScrapeJob({
          status: s.status,
          total_products: s.total_products,
          without_photo: s.without_photo,
          with_photo: s.with_photo,
          processed: s.processed,
          ok: s.ok,
          failed: s.failed,
          current_batch: s.current_batch,
          message: s.message,
          last_product_name: s.last_product_name,
        });
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => { void loadStats(); }, [loadStats]);

  return (
    <div className="min-h-dvh bg-background flex flex-col md:flex-row">
      <SupplierSidebar
        activePath={activeTab === "export" ? "/admin?tab=export" : "/admin"}
        variant="admin"
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 max-w-7xl mx-auto w-full">
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
              <p className="text-muted-foreground text-xs md:text-sm">{tr("admin.page_subtitle_table")}</p>
            </div>
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
          <div className="mt-3 md:mt-4 space-y-3">
            <div className="rounded-xl border-2 border-[#F5C518]/50 bg-gradient-to-br from-[#FFF8E1] to-white p-4 shadow-sm">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#073B74] flex items-center gap-2 text-sm md:text-base">
                      <Search className="h-4 w-4 text-[#0461A5] shrink-0" />
                      {tr("admin.scrape_card_title")}
                    </p>
                    <p className="text-xs text-[#656566] mt-1 leading-relaxed">
                      {tr("admin.scrape_card_desc")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <Button
                      variant="gold"
                      size="sm"
                      className="gap-2 font-bold"
                      disabled={scraping || enriching}
                      onClick={() => void runScrapePhotos(50)}
                    >
                      {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      {scraping ? tr("admin.scrape_running") : tr("admin.scrape_btn_start")}
                    </Button>
                    {scraping && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 font-bold border-red-300 text-red-700"
                        onClick={() => void stopScrapePhotos()}
                      >
                        {tr("admin.scrape_btn_stop")}
                      </Button>
                    )}
                  </div>
                </div>
                {scrapeJob && (scraping || scrapeJob.processed > 0) && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px] text-[#656566]">
                      <span>
                        {tr("admin.scrape_progress")
                          .replace("{done}", String(scrapeJob.with_photo))
                          .replace("{total}", String(scrapeJob.total_products || 0))}
                      </span>
                      <span>
                        {scrapeJob.ok} OK · {scrapeJob.failed} échecs · lot {scrapeJob.current_batch}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-[#E8EEF5] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[#0461A5] transition-all duration-500"
                        style={{
                          width: `${scrapeJob.total_products
                            ? Math.min(100, Math.round((scrapeJob.with_photo / scrapeJob.total_products) * 100))
                            : 0}%`,
                        }}
                      />
                    </div>
                    <p className="text-[11px] text-[#073B74] truncate">
                      {scrapeJob.message}
                      {scrapeJob.last_product_name ? ` — ${scrapeJob.last_product_name}` : ""}
                    </p>
                  </div>
                )}
              </div>
            </div>

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
            <Button
              variant="gold"
              size="sm"
              className="gap-2"
              disabled={enriching || scraping}
              onClick={() => runEnrichment(50)}
            >
              {enriching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {tr("admin.enrich_batch_50")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={enriching || scraping}
              onClick={() => runEnrichment(200)}
            >
              {tr("admin.enrich_batch_200")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={enriching || scraping}
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
                  loadStats();
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
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-[#0461A5]/40"
              disabled={enriching || scraping}
              onClick={async () => {
                setEnriching(true);
                try {
                  const result = await platformApi.enrichProductsBatch({
                    limit: 500,
                    generate_photos: true,
                    skip_pricing: true,
                    only_without_photo: true,
                  });
                  toast({
                    title: tr("admin.photos_batch_500"),
                    description: `${result.photos_generated} photo(s) · ${result.enriched} enrichi(s)`,
                  });
                  loadStats();
                } catch (e) {
                  toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
                } finally {
                  setEnriching(false);
                }
              }}
            >
              {enriching ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
              {tr("admin.photos_batch_500")}
            </Button>
          </div>
          </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={changeTab} className="w-full">
          <TabsList className="hidden md:flex mb-6 w-full flex-wrap h-auto gap-1">
            {ADMIN_TABS.map(({ value, icon: Icon, labelKey }) => (
              <TabsTrigger key={value} value={value} className="gap-1.5">
                <Icon className="h-4 w-4" /> {tr(labelKey)}
              </TabsTrigger>
            ))}
          </TabsList>

          <AdminMobileNav activeTab={activeTab} onChange={changeTab} tr={tr} />

          <TabsContent value="products">
            <AdminProductsPanel />
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
