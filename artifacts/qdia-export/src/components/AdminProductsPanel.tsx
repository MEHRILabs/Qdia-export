import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductImage } from "@/components/ProductImage";
import { platformApi } from "@/lib/platform-api";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nContext";
import { HOME_CATEGORIES } from "@/lib/nav";
import { ALL_CATEGORIES } from "@/lib/catalog-categories";
import {
  CheckCircle2,
  Loader2,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  XCircle,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Product {
  id: number;
  name: string;
  category: string;
  sku?: string | null;
  image_url?: string | null;
  export_status: string;
  moq: number;
  moq_unit: string;
  prices: { fob?: number; cif?: number; retail?: number; wholesale?: number };
}

const STATUS_CLASS: Record<string, string> = {
  published: "bg-green-100 text-green-700 border-green-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  suspended: "bg-red-100 text-red-700 border-red-200",
};

export function AdminProductsPanel() {
  const { toast } = useToast();
  const { tr } = useI18n();
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState(ALL_CATEGORIES);
  const [statusFilter, setStatusFilter] = useState("all");
  const [updating, setUpdating] = useState<number | null>(null);
  const [photoUpdating, setPhotoUpdating] = useState<number | null>(null);

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      published: tr("supplier.status_published"),
      pending: tr("supplier.status_pending"),
      draft: tr("supplier.status_draft"),
      suspended: tr("supplier.status_rejected"),
    };
    return map[status] ?? status;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("qdia_auth_token");
      const params = new URLSearchParams({ scope: "admin", limit: "100" });
      if (statusFilter !== "all") params.set("export_status", statusFilter);
      if (categoryFilter !== ALL_CATEGORIES) params.set("category", categoryFilter);
      if (search.trim()) params.set("search", search.trim());
      const resp = await fetch(`${BASE}/api/products?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await resp.json();
      setProducts(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch {
      toast({ title: tr("common.error"), description: tr("admin.load_failed"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, search, statusFilter, toast, tr]);

  useEffect(() => {
    const t = setTimeout(() => void load(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of products) {
      const cat = p.category?.trim() || tr("admin.uncategorized");
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(p);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "fr"));
  }, [products, tr]);

  const updateStatus = async (id: number, export_status: "published" | "suspended") => {
    setUpdating(id);
    try {
      await platformApi.patchProductStatus(id, export_status);
      toast({
        title: export_status === "published" ? tr("admin.approved") : tr("admin.rejected"),
        description: tr("admin.updated").replace("{id}", String(id)),
      });
      void load();
    } catch {
      toast({ title: tr("common.error"), description: tr("admin.update_failed"), variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  const removeProduct = async (id: number) => {
    if (!confirm(tr("admin.delete_confirm"))) return;
    setUpdating(id);
    try {
      await platformApi.deleteProduct(id);
      toast({ title: tr("admin.deleted") });
      void load();
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  const generatePhoto = async (productId: number) => {
    setPhotoUpdating(productId);
    try {
      const result = await platformApi.enrichProduct(productId, { generate_photos: true, skip_pricing: true });
      if (!result.ok || !result.photo_updated) {
        throw new Error(tr("product_edit.photo_ai_failed"));
      }
      toast({ title: tr("admin.photo_generated"), description: `#${productId}` });
      void load();
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={tr("admin.products_search")}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={tr("product_edit.category")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_CATEGORIES}>{tr("supplier_page.filter_all")}</SelectItem>
              {HOME_CATEGORIES.map(c => (
                <SelectItem key={c.slug} value={c.slug}>{tr(c.nameKey)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {[
            ["all", tr("supplier_page.filter_all")],
            ["pending", tr("supplier_page.filter_pending")],
            ["published", tr("supplier_page.filter_published")],
            ["suspended", tr("supplier.status_rejected")],
          ].map(([val, label]) => (
            <Button
              key={val}
              size="sm"
              variant={statusFilter === val ? "default" : "outline"}
              onClick={() => setStatusFilter(val)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{tr("admin.products_table_count").replace("{count}", String(total))}</span>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/products/new">{tr("product_edit.new_title")}</Link>
        </Button>
      </div>

      <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="min-w-[280px]">{tr("supplier_page.col_product")}</TableHead>
                <TableHead>{tr("supplier_page.col_category")}</TableHead>
                <TableHead>{tr("supplier_page.col_fob")}</TableHead>
                <TableHead>{tr("admin.col_cif")}</TableHead>
                <TableHead>{tr("supplier_page.col_moq")}</TableHead>
                <TableHead>{tr("supplier_page.col_status")}</TableHead>
                <TableHead className="text-right min-w-[220px]">{tr("supplier_page.col_actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && [...Array(6)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}><Skeleton className="h-12 w-full" /></TableCell>
                </TableRow>
              ))}

              {!loading && products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    {tr("admin.products_empty")}
                  </TableCell>
                </TableRow>
              )}

              {!loading && grouped.map(([category, items]) => (
                <Fragment key={category}>
                  <TableRow key={`cat-${category}`} className="bg-primary/5 hover:bg-primary/5">
                    <TableCell colSpan={7} className="py-2 font-bold text-primary text-sm">
                      {category}
                      <Badge variant="secondary" className="ml-2 text-[10px]">{items.length}</Badge>
                    </TableCell>
                  </TableRow>
                  {items.map(product => {
                    const st = product.export_status;
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted shrink-0">
                              <ProductImage src={product.image_url} alt={product.name} compact className="h-full w-full" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-sm line-clamp-2">{product.name}</div>
                              <div className="text-xs text-muted-foreground">#{product.id} · {product.sku || "—"}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] max-w-[120px] truncate">{product.category}</Badge>
                        </TableCell>
                        <TableCell className="font-bold text-primary">
                          ${product.prices.fob?.toLocaleString() ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          ${product.prices.cif?.toLocaleString() ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {product.moq} {product.moq_unit}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={STATUS_CLASS[st] ?? ""}>
                            {statusLabel(st)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-wrap justify-end gap-1">
                            <Button variant="outline" size="sm" className="h-8 gap-1" asChild>
                              <Link href={`/admin/products/${product.id}/edit`}>
                                <Pencil className="h-3.5 w-3.5" />
                                {tr("common.edit")}
                              </Link>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1"
                              disabled={photoUpdating === product.id}
                              onClick={() => void generatePhoto(product.id)}
                            >
                              {photoUpdating === product.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Sparkles className="h-3.5 w-3.5" />}
                              {tr("admin.ai_photo")}
                            </Button>
                            {st !== "published" && (
                              <Button
                                size="sm"
                                className="h-8 gap-1"
                                disabled={updating === product.id}
                                onClick={() => void updateStatus(product.id, "published")}
                              >
                                {updating === product.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <CheckCircle2 className="h-3.5 w-3.5" />}
                                {tr("admin.approve")}
                              </Button>
                            )}
                            {st === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-red-600"
                                disabled={updating === product.id}
                                onClick={() => void updateStatus(product.id, "suspended")}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-red-600"
                              disabled={updating === product.id}
                              onClick={() => void removeProduct(product.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
