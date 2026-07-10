import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useGetDashboardStats } from "@workspace/api-client-react";
import { SupplierSidebar } from "@/components/SupplierSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Sparkles, Trash2, Pencil } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductImage } from "@/components/ProductImage";
import { ExcelImportButton, ExcelImportHint } from "@/components/ExcelImportButton";
import { BulkImportAgent } from "@/components/BulkImportAgent";
import { BulkImportTemplateCard } from "@/components/BulkImportTemplateCard";
import { SupplierOrdersPanel } from "@/components/SupplierOrdersPanel";
import { platformApi } from "@/lib/platform-api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { AuthModal } from "@/components/AuthModal";

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
  prices: { fob?: number; retail?: number; wholesale?: number };
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  published: "bg-green-100 text-green-700 hover:bg-green-100 border-green-200",
  pending: "bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200",
  draft: "",
  suspended: "bg-red-100 text-red-700 hover:bg-red-100 border-red-200",
};

export default function Supplier() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { tr } = useI18n();

  const statusBadge = (status: string) => {
    const labels: Record<string, string> = {
      published: tr("supplier.status_published"),
      pending: tr("supplier.status_pending"),
      draft: tr("supplier.status_draft"),
      suspended: tr("supplier.status_rejected"),
    };
    const key = status in labels ? status : "draft";
    return { label: labels[key], className: STATUS_BADGE_CLASS[key] ?? STATUS_BADGE_CLASS.draft };
  };
  const [authOpen, setAuthOpen] = useState(false);
  const [productList, setProductList] = useState<{ data: Product[]; total: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { data: stats } = useGetDashboardStats();

  useEffect(() => {
    setIsLoading(true);
    const params = new URLSearchParams({ scope: "supplier", limit: "50" });
    if (statusFilter !== "all") params.set("export_status", statusFilter);
    fetch(`${BASE}/api/products?${params}`)
      .then(r => r.json())
      .then(setProductList)
      .finally(() => setIsLoading(false));
  }, [statusFilter]);

  const products = productList?.data ?? [];

  const reload = () => {
    setIsLoading(true);
    fetch(`${BASE}/api/products?scope=supplier&limit=50`)
      .then(r => r.json()).then(setProductList).finally(() => setIsLoading(false));
  };

  const removeProduct = async (id: number) => {
    if (!confirm(tr("common.confirm_delete"))) return;
    try {
      await platformApi.deleteProduct(id);
      toast({ title: tr("supplier_page.deleted") });
      reload();
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen qdia-producer-page flex flex-col md:flex-row">
      <SupplierSidebar activePath="/supplier" />

      <main className="flex-1 overflow-y-auto">
        <header className="border-b bg-card h-16 flex items-center px-6 shrink-0 md:hidden sticky top-0 z-10">
          <Link href="/" className="font-bold text-xl flex items-center gap-2 text-primary">{tr("mobile.brand_short")}</Link>
        </header>

        <div className="p-6 md:p-8 max-w-7xl mx-auto">
          {!user && (
            <div className="mb-6 rounded-xl border border-[#F5C518]/40 bg-[#FFF8E1] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-bold text-[#1A1A2E]">{tr("supplier_page.login_title")}</p>
                <p className="text-sm text-[#656566]">{tr("supplier_page.login_desc")}</p>
              </div>
              <Button variant="gold" className="font-bold shrink-0" onClick={() => setAuthOpen(true)}>
                {tr("header.login")}
              </Button>
            </div>
          )}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-1">{tr("supplier_page.my_products")}</h1>
              <p className="text-muted-foreground">{tr("supplier_page.catalog_desc")}</p>
            </div>
          <div className="flex gap-2 flex-wrap">
              <ExcelImportButton onDone={() => {
                setIsLoading(true);
                fetch(`${BASE}/api/products?scope=supplier&limit=50`)
                  .then(r => r.json()).then(setProductList).finally(() => setIsLoading(false));
              }} />
              <Button variant="outline" className="gap-2 font-semibold" asChild>
                <Link href="/supplier/products/new"><Plus className="h-4 w-4" /> {tr("product_edit.new_title")}</Link>
              </Button>
              <Button className="gap-2 font-semibold" asChild>
                <Link href="/agent-ia?new=1"><Plus className="h-4 w-4" /> {tr("supplier_page.new_product")}</Link>
            </Button>
            </div>
          </div>

          <BulkImportTemplateCard />

          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="bg-card rounded-xl border p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">{tr("supplier_page.total_products")}</h3>
              <div className="text-3xl font-bold">{productList?.total ?? 0}</div>
            </div>
            <div className="bg-card rounded-xl border p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">{tr("supplier_page.active_listings")}</h3>
              <div className="text-3xl font-bold text-green-600">
                {products.filter(p => p.export_status === "published").length}
              </div>
            </div>
            <div className="bg-card rounded-xl border p-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">{tr("supplier_page.ai_suggestions")}</h3>
              <div className="text-3xl font-bold text-primary">{stats?.ai_suggestions ?? 0}</div>
              <p className="text-xs text-muted-foreground mt-2">{tr("supplier_page.pending_validation")}</p>
            </div>
          </div>

          <div className="mb-6">
            <ExcelImportHint />
          </div>

          <div className="mb-8">
            <BulkImportAgent onDone={() => {
              setIsLoading(true);
              fetch(`${BASE}/api/products?scope=supplier&limit=50`)
                .then(r => r.json()).then(setProductList).finally(() => setIsLoading(false));
            }} />
          </div>

          <div className="mb-8">
            <h2 className="font-semibold mb-3">{tr("supplier_orders.title")}</h2>
            <SupplierOrdersPanel compact />
          </div>

          <div className="bg-card rounded-xl border overflow-hidden shadow-sm">
            <div className="p-4 border-b flex justify-between items-center bg-muted/20 gap-4 flex-wrap">
              <h2 className="font-semibold">{tr("supplier_page.my_catalog")}</h2>
              <div className="flex gap-1">
                {[
                  ["all", tr("supplier_page.filter_all")],
                  ["published", tr("supplier_page.filter_published")],
                  ["pending", tr("supplier_page.filter_pending")],
                  ["draft", tr("supplier_page.filter_drafts")],
                ].map(([val, label]) => (
                  <Button key={val} size="sm" variant={statusFilter === val ? "default" : "ghost"}
                    onClick={() => setStatusFilter(val)} className="text-xs h-7">
                    {label}
                  </Button>
                ))}
              </div>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">{tr("supplier_page.col_product")}</TableHead>
                  <TableHead>{tr("supplier_page.col_category")}</TableHead>
                  <TableHead>{tr("supplier_page.col_retail")}</TableHead>
                  <TableHead>{tr("supplier_page.col_wholesale")}</TableHead>
                  <TableHead>{tr("supplier_page.col_fob")}</TableHead>
                  <TableHead>{tr("supplier_page.col_moq")}</TableHead>
                  <TableHead>{tr("supplier_page.col_status")}</TableHead>
                  <TableHead className="text-right">{tr("supplier_page.col_actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={8}><Skeleton className="h-10 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : products.map(product => {
                  const st = statusBadge(product.export_status);
                  return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
                            <ProductImage src={product.image_url} alt={product.name} compact className="h-full w-full" />
                        </div>
                        <div>
                          <div className="font-medium line-clamp-1">{product.name}</div>
                            <div className="text-xs text-muted-foreground">{product.sku || tr("supplier_page.no_sku")}</div>
                          </div>
                      </div>
                    </TableCell>
                      <TableCell><Badge variant="outline" className="bg-muted/50">{product.category}</Badge></TableCell>
                      <TableCell className="text-sm">
                        {product.prices.retail != null
                          ? `${product.prices.retail.toLocaleString()} DZD`
                          : "—"}
                    </TableCell>
                      <TableCell className="text-sm">
                        {product.prices.wholesale != null
                          ? `${product.prices.wholesale.toLocaleString()} DZD`
                          : "—"}
                    </TableCell>
                      <TableCell className="font-medium">${product.prices.fob?.toLocaleString() ?? "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">MOQ: {product.moq} {product.moq_unit}</TableCell>
                    <TableCell>
                        <Badge variant="secondary" className={st.className}>{st.label}</Badge>
                    </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href="/studio">{tr("nav.studio")}</Link>
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href="/agent-ia"><Sparkles className="h-3 w-3" /></Link>
                        </Button>
                      <Button variant="ghost" size="sm" asChild>
                          <Link href={user?.role === "admin" ? `/admin/products/${product.id}/edit` : `/supplier/products/${product.id}/edit`}>
                            <Pencil className="h-3 w-3" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600" onClick={() => removeProduct(product.id)}>
                          <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                  );
                })}
                {!isLoading && products.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {tr("supplier_page.empty")} <Link href="/agent-ia?new=1" className="text-primary underline">{tr("supplier_page.publish_ai")}</Link>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
      <AuthModal open={authOpen} onOpenChange={setAuthOpen} onSuccess={() => reload()} />
    </div>
  );
}
