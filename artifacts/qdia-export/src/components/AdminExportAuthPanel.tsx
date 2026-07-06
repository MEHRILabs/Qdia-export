import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { ProductImage } from "@/components/ProductImage";
import { platformApi } from "@/lib/platform-api";
import { useI18n } from "@/contexts/I18nContext";
import { useToast } from "@/hooks/use-toast";
import { BUYER_COUNTRIES } from "@/lib/incoterms-routing";
import { translateCategoryName } from "@/lib/nav";
import {
  Factory, CheckCircle2, XCircle, Loader2, MapPin, Search, MessageSquare,
  Layers, Pencil, ChevronDown, ChevronUp,
} from "lucide-react";

type ExportProduct = {
  id: number;
  name: string;
  category: string;
  sku?: string | null;
  image_url?: string | null;
  export_authorized?: boolean;
  stock_countries?: string[];
  origin_country?: string;
  target_markets?: string[];
};

const PAGE_SIZE = 200;

export function AdminExportAuthPanel() {
  const { tr } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "authorized" | "all">("pending");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(PAGE_SIZE);
  const [updating, setUpdating] = useState<number | null>(null);
  const [stockDraft, setStockDraft] = useState<Record<number, string>>({});
  const [contactLoading, setContactLoading] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin-export-products", filter, limit],
    queryFn: () => platformApi.listAdminExportProducts(filter, limit),
  });

  const allProducts = (data?.data ?? []) as ExportProduct[];

  const products = useMemo(() => allProducts.filter(p =>
    !search.trim()
    || p.name.toLowerCase().includes(search.toLowerCase())
    || p.sku?.toLowerCase().includes(search.toLowerCase())
    || p.category.toLowerCase().includes(search.toLowerCase()),
  ), [allProducts, search]);

  const stats = useMemo(() => ({
    shown: products.length,
    pending: products.filter(p => p.export_authorized !== true).length,
    authorized: products.filter(p => p.export_authorized === true).length,
  }), [products]);

  const byCategory = useMemo(() => {
    const map = new Map<string, ExportProduct[]>();
    for (const p of products) {
      const cat = p.category || tr("admin.export_uncategorized");
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "fr"));
  }, [products, tr]);

  const patch = async (id: number, body: { export_authorized?: boolean; stock_countries?: string[] }) => {
    setUpdating(id);
    try {
      await platformApi.patchProductExport(id, body);
      toast({ title: tr("admin.export_updated") });
      qc.invalidateQueries({ queryKey: ["admin-export-products"] });
    } catch (e) {
      toast({
        title: tr("common.error"),
        description: String(e instanceof Error ? e.message : e),
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const toggleStock = (productId: number, code: string, current: string[] = []) => {
    const set = new Set(current.map(c => c.toUpperCase()));
    if (set.has(code)) set.delete(code);
    else set.add(code);
    if (!set.size) set.add("DZ");
    return [...set];
  };

  const bulkAuth = async (authorized: boolean, opts?: { ids?: number[]; limit?: number }) => {
    setBulkLoading(true);
    try {
      const result = await platformApi.bulkExportAuth({
        export_authorized: authorized,
        ids: opts?.ids,
        filter: opts?.ids?.length ? undefined : (authorized ? "pending" : filter === "authorized" ? "authorized" : "pending"),
        limit: opts?.limit ?? 100,
      });
      toast({
        title: tr("admin.export_bulk_done"),
        description: tr("admin.export_bulk_count").replace("{count}", String(result.updated)),
      });
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["admin-export-products"] });
    } catch (e) {
      toast({
        title: tr("common.error"),
        description: String(e instanceof Error ? e.message : e),
        variant: "destructive",
      });
    } finally {
      setBulkLoading(false);
    }
  };

  const openExporterChat = async (productId: number) => {
    setContactLoading(productId);
    try {
      const contact = await platformApi.getProductContact(productId);
      if (!contact.supplier_user_id) {
        toast({
          title: tr("common.error"),
          description: tr("messages.no_exporter_account"),
          variant: "destructive",
        });
        return;
      }
      window.location.href = `/messages?user=${contact.supplier_user_id}`;
    } catch (e) {
      toast({
        title: tr("common.error"),
        description: String(e instanceof Error ? e.message : e),
        variant: "destructive",
      });
    } finally {
      setContactLoading(null);
    }
  };

  const toggleSelect = (id: number, checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleCategory = (items: ExportProduct[], checked: boolean) => {
    setSelected(prev => {
      const next = new Set(prev);
      for (const p of items) {
        if (checked) next.add(p.id);
        else next.delete(p.id);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-gradient-to-br from-amber-50 to-white p-4">
        <div className="flex items-start gap-3">
          <Factory className="h-8 w-8 text-amber-700 shrink-0" />
          <div>
            <h2 className="font-bold text-sm md:text-base text-amber-900">{tr("admin.export_intro_title")}</h2>
            <p className="text-xs md:text-sm text-amber-800/80 mt-1">{tr("admin.export_intro_desc")}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-lg font-black text-primary">{stats.shown}</p>
          <p className="text-[10px] text-muted-foreground uppercase">{tr("admin.export_stats_shown")}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-lg font-black text-amber-700">{stats.pending}</p>
          <p className="text-[10px] text-muted-foreground uppercase">{tr("admin.export_stats_pending")}</p>
        </div>
        <div className="rounded-lg border bg-card p-3 text-center">
          <p className="text-lg font-black text-green-700">{stats.authorized}</p>
          <p className="text-[10px] text-muted-foreground uppercase">{tr("admin.export_stats_authorized")}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {(["pending", "authorized", "all"] as const).map(f => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              className="shrink-0 h-9"
              onClick={() => { setFilter(f); setSelected(new Set()); }}
            >
              {tr(`admin.export_filter_${f}`)}
            </Button>
          ))}
        </div>
        <div className="relative flex-1 min-w-0 sm:max-w-xs sm:ms-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 h-10 sm:h-9 w-full"
            placeholder={tr("admin.export_search")}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-xs font-bold text-blue-900 flex-1 min-w-[140px]">
            {tr("admin.export_selected_count").replace("{count}", String(selected.size))}
          </p>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 gap-1"
            disabled={bulkLoading}
            onClick={() => void bulkAuth(true, { ids: [...selected] })}
          >
            {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
            {tr("admin.export_approve_selected")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={() => setSelected(new Set())}
          >
            {tr("common.cancel")}
          </Button>
        </div>
      )}

      {filter === "pending" && (
        <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
          <Layers className="h-4 w-4 text-green-700 shrink-0 mt-1" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-green-800">{tr("admin.export_bulk_title")}</p>
            <p className="text-[11px] text-green-700">{tr("admin.export_bulk_hint")}</p>
          </div>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 gap-1"
            disabled={bulkLoading}
            onClick={() => void bulkAuth(true, { limit: 100 })}
          >
            {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
            {tr("admin.export_bulk_100")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 border-green-400 text-green-800"
            disabled={bulkLoading}
            onClick={() => void bulkAuth(true, { limit: 500 })}
          >
            {tr("admin.export_bulk_500")}
          </Button>
        </div>
      )}

      {filter === "authorized" && (
        <Button
          size="sm"
          variant="outline"
          className="gap-1 text-amber-700 border-amber-300"
          disabled={bulkLoading}
          onClick={() => void bulkAuth(false, { limit: 100 })}
        >
          {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
          {tr("admin.export_bulk_revoke")}
        </Button>
      )}

      {!products.length && (
        <div className="text-center py-12 text-muted-foreground border rounded-xl bg-card">
          <Factory className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>{tr("admin.export_empty")}</p>
        </div>
      )}

      <div className="space-y-4">
        {byCategory.map(([category, items]) => {
          const open = expanded[category] !== false;
          const catPending = items.filter(p => p.export_authorized !== true);
          const allSelected = items.length > 0 && items.every(p => selected.has(p.id));
          return (
            <section key={category} className="border rounded-xl bg-card overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center gap-3 px-3 py-3 bg-muted/40 hover:bg-muted/60 transition-colors text-start"
                onClick={() => setExpanded(prev => ({ ...prev, [category]: !open }))}
              >
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={v => toggleCategory(items, v === true)}
                  onClick={e => e.stopPropagation()}
                  aria-label={tr("admin.export_select_category")}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{translateCategoryName(tr, category)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {items.length} {tr("admin.export_products_count")}
                    {catPending.length > 0 && ` · ${catPending.length} ${tr("admin.export_pending_badge").toLowerCase()}`}
                  </p>
                </div>
                {open ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
              </button>

              {open && (
                <div className="divide-y">
                  {items.map(p => {
                    const stock = p.stock_countries ?? ["DZ"];
                    const authorized = p.export_authorized === true;
                    return (
                      <div key={p.id} className="p-3 sm:p-4 flex flex-col gap-3">
                        <div className="flex gap-3 min-w-0">
                          <Checkbox
                            checked={selected.has(p.id)}
                            onCheckedChange={v => toggleSelect(p.id, v === true)}
                            className="mt-1 shrink-0"
                          />
                          <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-lg bg-muted overflow-hidden shrink-0">
                            <ProductImage src={p.image_url} alt={p.name} compact className="h-full w-full" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-wrap items-start gap-2">
                              <p className="font-semibold text-sm sm:text-base line-clamp-2 flex-1">{p.name}</p>
                              <Badge variant={authorized ? "default" : "outline"} className={authorized ? "bg-green-600 shrink-0" : "text-amber-700 border-amber-300 shrink-0"}>
                                {authorized ? tr("admin.export_authorized") : tr("admin.export_pending_badge")}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {p.sku ?? `#${p.id}`} · {tr("admin.export_origin")} {p.origin_country ?? "DZ"}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2 ps-0 sm:ps-7">
                          <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {tr("admin.export_stock_countries")}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {BUYER_COUNTRIES.map(c => {
                              const active = stock.includes(c.code);
                              return (
                                <Button
                                  key={c.code}
                                  type="button"
                                  size="sm"
                                  variant={active ? "default" : "outline"}
                                  className={`h-8 sm:h-7 text-xs px-2.5 ${active ? "bg-[#0461A5]" : ""}`}
                                  disabled={updating === p.id}
                                  onClick={() => void patch(p.id, { stock_countries: toggleStock(p.id, c.code, stock) })}
                                >
                                  {c.flag} {c.code}
                                </Button>
                              );
                            })}
                            <Input
                              className="h-8 sm:h-7 w-16 sm:w-20 text-xs"
                              placeholder="+ ES"
                              value={stockDraft[p.id] ?? ""}
                              onChange={e => setStockDraft(prev => ({ ...prev, [p.id]: e.target.value.toUpperCase() }))}
                              onKeyDown={e => {
                                if (e.key === "Enter" && stockDraft[p.id]?.length === 2) {
                                  void patch(p.id, { stock_countries: toggleStock(p.id, stockDraft[p.id], stock) });
                                  setStockDraft(prev => ({ ...prev, [p.id]: "" }));
                                }
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 ps-0 sm:ps-7">
                          <Button size="sm" variant="outline" className="gap-1 h-10 sm:h-9" asChild>
                            <Link href={`/admin/products/${p.id}/edit`}>
                              <Pencil className="h-3 w-3" /> {tr("admin.export_edit_product")}
                            </Link>
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="gap-1 h-10 sm:h-9"
                            disabled={contactLoading === p.id}
                            onClick={() => void openExporterChat(p.id)}
                          >
                            {contactLoading === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageSquare className="h-3 w-3" />}
                            {tr("messages.contact_exporter")}
                          </Button>
                          {!authorized ? (
                            <Button
                              size="sm"
                              className="gap-1 bg-green-600 hover:bg-green-700 h-10 sm:h-9 col-span-2 sm:col-span-1"
                              disabled={updating === p.id}
                              onClick={() => void patch(p.id, { export_authorized: true })}
                            >
                              {updating === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                              {tr("admin.export_approve")}
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1 text-amber-700 h-10 sm:h-9 col-span-2 sm:col-span-1"
                              disabled={updating === p.id}
                              onClick={() => void patch(p.id, { export_authorized: false })}
                            >
                              <XCircle className="h-3 w-3" /> {tr("admin.export_revoke")}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {allProducts.length >= limit && (
        <div className="text-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLimit(l => l + PAGE_SIZE)}
          >
            {tr("admin.export_load_more")}
          </Button>
        </div>
      )}
    </div>
  );
}
