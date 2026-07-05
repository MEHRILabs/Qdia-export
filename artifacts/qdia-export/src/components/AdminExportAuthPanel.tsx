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
import { Factory, CheckCircle2, XCircle, Loader2, MapPin, Search } from "lucide-react";

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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        {(["pending", "authorized", "all"] as const).map(f => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
          >
            {tr(`admin.export_filter_${f}`)}
          </Button>
        ))}
        <div className="relative flex-1 min-w-[180px] max-w-xs ms-auto">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 h-9"
            placeholder={tr("admin.export_search")}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

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
            <div key={p.id} className="flex flex-col sm:flex-row gap-4 p-4 border rounded-xl bg-card">
              <div className="h-16 w-16 rounded-lg bg-muted overflow-hidden shrink-0">
                <ProductImage src={p.image_url} alt={p.name} compact className="h-full w-full" />
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex flex-wrap items-start gap-2">
                  <p className="font-semibold truncate flex-1">{p.name}</p>
                  <Badge variant={authorized ? "default" : "outline"} className={authorized ? "bg-green-600" : "text-amber-700 border-amber-300"}>
                    {authorized ? tr("admin.export_authorized") : tr("admin.export_pending_badge")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.category} · {p.sku ?? `#${p.id}`} · {tr("admin.export_origin")} {p.origin_country ?? "DZ"}
                </p>
                <div>
                  <p className="text-[10px] font-bold uppercase text-muted-foreground mb-1 flex items-center gap-1">
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
                          className={`h-7 text-xs px-2 ${active ? "bg-[#0461A5]" : ""}`}
                          disabled={updating === p.id}
                          onClick={() => void patch(p.id, { stock_countries: toggleStock(p.id, c.code, stock) })}
                        >
                          {c.flag} {c.code}
                        </Button>
                      );
                    })}
                    <Input
                      className="h-7 w-20 text-xs"
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
              </div>
              <div className="flex sm:flex-col gap-2 shrink-0 justify-end">
                {!authorized ? (
                  <Button
                    size="sm"
                    className="gap-1 bg-green-600 hover:bg-green-700"
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
                    className="gap-1 text-amber-700"
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
