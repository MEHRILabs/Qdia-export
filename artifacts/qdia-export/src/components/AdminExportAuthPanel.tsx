import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductImage } from "@/components/ProductImage";
import { platformApi } from "@/lib/platform-api";
import { useI18n } from "@/contexts/I18nContext";
import { useToast } from "@/hooks/use-toast";
import { BUYER_COUNTRIES } from "@/lib/incoterms-routing";
import { Factory, CheckCircle2, XCircle, Loader2, MapPin, Search, MessageSquare, Layers } from "lucide-react";

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

export function AdminExportAuthPanel() {
  const { tr } = useI18n();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "authorized" | "all">("pending");
  const [search, setSearch] = useState("");
  const [updating, setUpdating] = useState<number | null>(null);
  const [stockDraft, setStockDraft] = useState<Record<number, string>>({});
  const [contactLoading, setContactLoading] = useState<number | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-export-products", filter],
    queryFn: () => platformApi.listAdminExportProducts(filter),
  });

  const products = ((data?.data ?? []) as ExportProduct[]).filter(p =>
    !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku?.includes(search),
  );

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

  const bulkAuth = async (authorized: boolean, limit = 100) => {
    setBulkLoading(true);
    try {
      const result = await platformApi.bulkExportAuth({
        export_authorized: authorized,
        filter: authorized ? "pending" : filter === "authorized" ? "authorized" : "pending",
        limit,
      });
      toast({
        title: tr("admin.export_bulk_done"),
        description: tr("admin.export_bulk_count").replace("{count}", String(result.updated)),
      });
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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {(["pending", "authorized", "all"] as const).map(f => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            className="shrink-0 h-9"
            onClick={() => setFilter(f)}
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
            onClick={() => void bulkAuth(true, 100)}
          >
            {bulkLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
            {tr("admin.export_bulk_100")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1 border-green-400 text-green-800"
            disabled={bulkLoading}
            onClick={() => void bulkAuth(true, 500)}
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
          onClick={() => void bulkAuth(false, 100)}
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

      <div className="space-y-3">
        {products.map(p => {
          const stock = p.stock_countries ?? ["DZ"];
          const authorized = p.export_authorized === true;
          return (
            <div key={p.id} className="flex flex-col gap-3 p-3 sm:p-4 border rounded-xl bg-card">
              <div className="flex gap-3 min-w-0">
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
                  {p.category} · {p.sku ?? `#${p.id}`} · {tr("admin.export_origin")} {p.origin_country ?? "DZ"}
                </p>
              </div>
              </div>
              <div className="space-y-2">
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
              <div className="grid grid-cols-2 sm:flex sm:flex-col gap-2">
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
                    className="gap-1 bg-green-600 hover:bg-green-700 h-10 sm:h-9"
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
                    className="gap-1 text-amber-700 h-10 sm:h-9"
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
    </div>
  );
}
