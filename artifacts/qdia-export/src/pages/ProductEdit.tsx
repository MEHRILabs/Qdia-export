import { useState, useEffect, useRef } from "react";
import { useRoute, Link } from "wouter";
import { SupplierSidebar } from "@/components/SupplierSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { platformApi } from "@/lib/platform-api";
import { apiUrl } from "@/lib/api-base";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useI18n } from "@/contexts/I18nContext";
import { ProductImage } from "@/components/ProductImage";
import { ArrowLeft, Save, Upload, Sparkles, Loader2 } from "lucide-react";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Lecture fichier impossible"));
    reader.readAsDataURL(file);
  });
}

function ProductEditContent() {
  const [, params] = useRoute("/supplier/products/:id/edit");
  const id = parseInt(params?.id ?? "0", 10);
  const { toast } = useToast();
  const { tr } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [moq, setMoq] = useState(100);
  const [moqUnit, setMoqUnit] = useState("kg");
  const [portDepart, setPortDepart] = useState("Béjaïa");
  const [priceFob, setPriceFob] = useState(0);

  const loadProduct = () => {
    if (!id) return;
    setLoading(true);
    fetch(apiUrl(`/api/products/${id}`))
      .then(r => r.json())
      .then(p => {
        setName(p.name ?? "");
        setDescription(p.description ?? "");
        setCategory(p.category ?? "");
        setMoq(p.moq ?? 100);
        setMoqUnit(p.moq_unit ?? "kg");
        setPortDepart(p.port_depart ?? "Béjaïa");
        setPriceFob(p.prices?.fob ?? p.price_fob ?? 0);
        setImageUrl(p.image_url ?? null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProduct();
  }, [id]);

  const save = async () => {
    setSaving(true);
    try {
      const fob = Number.isFinite(priceFob) ? priceFob : 0;
      await platformApi.updateProduct(id, {
        name,
        description,
        category,
        moq,
        moq_unit: moqUnit,
        port_depart: portDepart,
        // Incoterms dérivés du FOB pour rester cohérents avec le catalogue
        prices: {
          exw: Math.round(fob * 0.92 * 100) / 100,
          fob,
          cfr: Math.round(fob * 1.08 * 100) / 100,
          cif: Math.round(fob * 1.12 * 100) / 100,
          currency: "USD",
        },
      });
      toast({ title: tr("product_edit.updated") });
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const uploadPhoto = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: tr("common.error"), description: tr("product_edit.photo_invalid"), variant: "destructive" });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast({ title: tr("common.error"), description: tr("product_edit.photo_too_large"), variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const updated = await platformApi.uploadProductImage(id, dataUrl);
      setImageUrl((updated.image_url as string) ?? null);
      toast({ title: tr("product_edit.photo_saved") });
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const generatePhoto = async () => {
    setGenerating(true);
    try {
      const result = await platformApi.enrichProduct(id, { generate_photos: true, skip_pricing: true });
      if (!result.ok || !result.photo_updated) {
        throw new Error(tr("product_edit.photo_ai_failed"));
      }
      loadProduct();
      toast({ title: tr("product_edit.photo_ai_done") });
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <p className="p-8">{tr("common.loading")}</p>;

  return (
    <div className="min-h-screen flex">
      <SupplierSidebar activePath="/supplier" />
      <main className="flex-1 p-6 md:p-8 max-w-2xl">
        <Link href="/supplier" className="text-sm text-[#0461A5] font-semibold flex items-center gap-1 mb-4">
          <ArrowLeft className="h-4 w-4" /> {tr("product_edit.back")}
        </Link>
        <h1 className="text-2xl font-black mb-6">{tr("product_edit.title")}</h1>
        <div className="space-y-4 border rounded-xl p-6 bg-white">
          <div className="space-y-3">
            <Label>{tr("product_edit.photo")}</Label>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <div className="h-36 w-36 rounded-xl border overflow-hidden bg-muted shrink-0">
                <ProductImage src={imageUrl} alt={name} fit="contain" className="h-full w-full" />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) void uploadPhoto(file);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2 justify-start"
                  disabled={uploading || generating}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? tr("product_edit.photo_uploading") : tr("product_edit.photo_upload")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2 justify-start"
                  disabled={uploading || generating}
                  onClick={() => void generatePhoto()}
                >
                  {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {generating ? tr("product_edit.photo_generating") : tr("product_edit.photo_ai")}
                </Button>
                <p className="text-xs text-muted-foreground">{tr("product_edit.photo_hint")}</p>
              </div>
            </div>
          </div>
          <div className="space-y-1.5"><Label>{tr("product_edit.name")}</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{tr("product_edit.description")}</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} /></div>
          <div className="space-y-1.5"><Label>{tr("product_edit.category")}</Label><Input value={category} onChange={e => setCategory(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>{tr("product_edit.moq")}</Label><Input type="number" value={moq} onChange={e => setMoq(parseInt(e.target.value, 10) || 0)} /></div>
            <div className="space-y-1.5"><Label>{tr("product_edit.unit")}</Label><Input value={moqUnit} onChange={e => setMoqUnit(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5"><Label>{tr("product_edit.departure_port")}</Label><Input value={portDepart} onChange={e => setPortDepart(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>{tr("product_edit.fob_price")}</Label><Input type="number" step="0.01" value={priceFob} onChange={e => setPriceFob(parseFloat(e.target.value) || 0)} /></div>
          </div>
          <Button className="gap-2" onClick={() => void save()} disabled={saving}>
            <Save className="h-4 w-4" /> {saving ? tr("common.saving") : tr("common.save")}
          </Button>
        </div>
      </main>
    </div>
  );
}

export default function ProductEdit() {
  return (
    <ProtectedRoute roles={["supplier", "admin"]}>
      <ProductEditContent />
    </ProtectedRoute>
  );
}
