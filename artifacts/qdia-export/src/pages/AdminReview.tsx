import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { SupplierSidebar } from "@/components/SupplierSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, XCircle, Clock, Loader2, Database, Sparkles, ImageIcon, DollarSign, Pencil } from "lucide-react";
import { ProductImage } from "@/components/ProductImage";
import { platformApi } from "@/lib/platform-api";
import { useI18n } from "@/contexts/I18nContext";

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

export default function AdminReview() {
  const { toast } = useToast();
  const { tr } = useI18n();
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
      toast({ title: "Photo générée", description: `Produit #${productId}` });
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
        title: "Enrichissement terminé",
        description: `${result.enriched} enrichi(s) · ${result.photos_generated} photo(s) · ${result.pricing_updated} prix`,
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
        headers: { "Content-Type": "application/json" },
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
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <SupplierSidebar activePath="/admin" />
      <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-4xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <Clock className="h-6 w-6 text-primary" /> {tr("admin.page_title")}
          </h1>
          <p className="text-muted-foreground text-sm">{tr("admin.page_subtitle")}</p>
          {adminStats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {(
                [
                  [tr("admin.users"), adminStats.users],
                  [tr("admin.products"), adminStats.products],
                  [tr("admin.volume_usd"), adminStats.transaction_volume_usd ?? 0],
                  [tr("admin.commission"), `$${adminStats.total_commission_usd ?? 0}`],
                ] as [string, string | number][]
              ).map(([label, val]) => (
                <div key={String(label)} className="rounded-lg border bg-card p-3 text-center">
                  <p className="text-lg font-black text-primary">{String(val)}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
                </div>
              ))}
            </div>
          )}
          {enrichStatus && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {(
                [
                  ["Total produits", enrichStatus.total, DollarSign],
                  ["Sans photo", enrichStatus.without_photo, ImageIcon],
                  ["Sans prix", enrichStatus.without_pricing, DollarSign],
                  ["En attente validation", enrichStatus.ready_for_review, Clock],
                ] as const
              ).map(([label, val, Icon]) => (
                <div key={label} className="rounded-lg border bg-card p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-4 w-4 text-primary" />
                    <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
                  </div>
                  <p className="text-xl font-black text-primary">{val}</p>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-4">
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
              Enrichir 50 produits (prix + photos IA)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={enriching}
              onClick={() => runEnrichment(200)}
            >
              Enrichir lot 200
            </Button>
          </div>
        </div>

        {loading && [...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full mb-3 rounded-xl" />)}

        {!loading && products.length === 0 && (
          <div className="text-center py-16 text-muted-foreground border rounded-xl bg-card">
            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">{tr("admin.no_pending")}</p>
          </div>
        )}

        <div className="space-y-3">
          {products.map(p => (
            <div key={p.id} className="flex items-center gap-4 p-4 border rounded-xl bg-card">
              <div className="h-14 w-14 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                <ProductImage src={p.image_url} alt={p.name} compact className="h-full w-full" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground flex flex-wrap gap-2 mt-0.5">
                  <Badge variant="outline">{p.category}</Badge>
                  <span>FOB ${p.prices.fob} · CIF ${p.prices.cif}</span>
                  <span>MOQ {p.moq} {p.moq_unit}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                <Link href={`/supplier/products/${p.id}/edit`}>
                  <Button size="sm" variant="outline" className="gap-1" title="Modifier / uploader photo">
                    <Pencil className="h-3 w-3" /> Photo
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  disabled={photoUpdating === p.id}
                  onClick={() => void generatePhoto(p.id)}
                >
                  {photoUpdating === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  IA
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-green-700 border-green-300"
                  disabled={updating === p.id}
                  onClick={() => updateStatus(p.id, "published")}>
                  {updating === p.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                  {tr("admin.approve")}
                </Button>
                <Button size="sm" variant="outline" className="gap-1 text-red-600 border-red-200"
                  disabled={updating === p.id}
                  onClick={() => updateStatus(p.id, "suspended")}>
                  <XCircle className="h-3 w-3" /> {tr("admin.reject")}
                </Button>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-center text-muted-foreground mt-6">
          <Link href="/products" className="text-primary underline">{tr("admin.view_catalog")}</Link>
        </p>
      </main>
    </div>
  );
}
