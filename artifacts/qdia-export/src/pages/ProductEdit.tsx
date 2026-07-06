import { useState, useEffect, useRef } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { SupplierSidebar } from "@/components/SupplierSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { platformApi } from "@/lib/platform-api";
import { apiUrl } from "@/lib/api-base";
import { useToast } from "@/hooks/use-toast";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useI18n } from "@/contexts/I18nContext";
import { ProductImage } from "@/components/ProductImage";
import { HOME_CATEGORIES } from "@/lib/nav";
import { ArrowLeft, Save, Upload, Sparkles, Loader2, Wand2, Copy, CheckCircle2 } from "lucide-react";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Lecture fichier impossible"));
    reader.readAsDataURL(file);
  });
}

function ProductEditContent({ adminMode = false }: { adminMode?: boolean }) {
  const [location, setLocation] = useLocation();
  const isNew = location.endsWith("/new");
  const [, supplierParams] = useRoute("/supplier/products/:id/edit");
  const [, adminParams] = useRoute("/admin/products/:id/edit");
  const id = isNew ? 0 : parseInt((adminMode ? adminParams?.id : supplierParams?.id) ?? "0", 10);
  const { toast } = useToast();
  const { tr } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingText, setGeneratingText] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState("pending");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Agriculture & Food");
  const [moq, setMoq] = useState(100);
  const [moqUnit, setMoqUnit] = useState("kg");
  const [portDepart, setPortDepart] = useState("Béjaïa");
  const [priceFob, setPriceFob] = useState(0);

  const backHref = adminMode ? "/admin" : "/supplier";
  const priceCif = Math.round(priceFob * 1.12 * 100) / 100;

  const loadProduct = () => {
    if (!id) return;
    setLoading(true);
    fetch(apiUrl(`/api/products/${id}`))
      .then(r => r.json())
      .then(p => {
        setName(p.name ?? "");
        setDescription(p.description ?? "");
        setCategory(p.category ?? "Agriculture & Food");
        setMoq(p.moq ?? 100);
        setMoqUnit(p.moq_unit ?? "kg");
        setPortDepart(p.port_depart ?? "Béjaïa");
        setPriceFob(p.prices?.fob ?? p.price_fob ?? 0);
        setImageUrl(p.image_url ?? null);
        setExportStatus(p.export_status ?? "pending");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!isNew) loadProduct();
    else setLoading(false);
  }, [id, isNew]);

  const buildPayload = () => {
    const fob = Number.isFinite(priceFob) ? priceFob : 0;
    return {
      name,
      description,
      category: category || "Agriculture & Food",
      moq,
      moq_unit: moqUnit,
      port_depart: portDepart,
      prices: {
        exw: Math.round(fob * 0.92 * 100) / 100,
        fob,
        cfr: Math.round(fob * 1.08 * 100) / 100,
        cif: Math.round(fob * 1.12 * 100) / 100,
        currency: "USD",
      },
    };
  };

  const save = async (approve = false) => {
    if (!name.trim()) {
      toast({ title: tr("common.error"), description: tr("product_edit.name_required"), variant: "destructive" });
      return;
    }
    if (priceFob <= 0) {
      toast({ title: tr("common.error"), description: tr("product_edit.price_required"), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = buildPayload();
      if (isNew) {
        const created = await platformApi.createProduct({ ...payload, export_status: adminMode ? "published" : "pending" }) as { id: number };
        toast({ title: adminMode ? tr("admin.save_approved") : tr("product_edit.created") });
        const editPath = adminMode
          ? `/admin/products/${created.id}/edit`
          : `/supplier/products/${created.id}/edit`;
        setLocation(editPath);
      } else {
        await platformApi.updateProduct(id, payload);
        if (approve || adminMode) {
          await platformApi.patchProductStatus(id, "published");
          toast({ title: tr("admin.save_approved"), description: tr("admin.catalog_visible") });
          setLocation(backHref);
        } else {
          toast({ title: tr("product_edit.updated") });
        }
      }
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

  const generateTextWithAi = async () => {
    const seed = [name, description, category !== "Agriculture & Food" ? category : ""]
      .filter(Boolean)
      .join(" — ")
      .trim();
    if (!seed) {
      toast({ title: tr("common.error"), description: tr("product_edit.text_ai_hint"), variant: "destructive" });
      return;
    }
    setGeneratingText(true);
    try {
      const data = await platformApi.generateProductSheet({ description: seed });
      if (data.name_fr) setName(data.name_fr);
      const desc = data.description_fr ?? data.description_en;
      if (desc) setDescription(desc);
      if (data.category) setCategory(data.category);
      if (data.moq) setMoq(data.moq);
      if (data.moq_unit) setMoqUnit(data.moq_unit);
      if (data.port_depart) setPortDepart(data.port_depart);
      const fob = data.pricing?.fob_usd;
      if (fob && fob > 0) setPriceFob(fob);
      toast({
        title: tr("product_edit.text_ai_done"),
        description: data._fallback ? (data._fallback_reason ?? tr("product_edit.text_ai_fallback")) : undefined,
        variant: data._fallback ? "destructive" : "default",
      });
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setGeneratingText(false);
    }
  };

  const duplicate = async () => {
    if (!id) return;
    setDuplicating(true);
    try {
      const copy = await platformApi.duplicateProduct(id);
      const newId = (copy as { id?: number }).id;
      toast({ title: tr("product_edit.duplicated") });
      if (newId) {
        setLocation(adminMode ? `/admin/products/${newId}/edit` : `/supplier/products/${newId}/edit`);
      }
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setDuplicating(false);
    }
  };

  if (loading) return <p className="p-8">{tr("common.loading")}</p>;

  const categoryOptions = [
    ...HOME_CATEGORIES.map(c => c.slug),
    ...(category && !HOME_CATEGORIES.some(c => c.slug === category) ? [category] : []),
  ];

  return (
    <div className="min-h-screen flex">
      <SupplierSidebar activePath={adminMode ? "/admin" : "/supplier"} variant={adminMode ? "admin" : "supplier"} />
      <main className="flex-1 p-6 md:p-8 max-w-3xl">
        <Link href={backHref} className="text-sm text-[#0461A5] font-semibold flex items-center gap-1 mb-4">
          <ArrowLeft className="h-4 w-4" /> {adminMode ? tr("admin.back_to_table") : tr("product_edit.back")}
        </Link>
        <div className="flex items-start justify-between gap-4 mb-6">
          <h1 className="text-2xl font-black">
            {isNew ? tr("product_edit.new_title") : tr("product_edit.title")}
          </h1>
          {!isNew && adminMode && (
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${
              exportStatus === "published" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
            }`}>
              {exportStatus === "published" ? tr("supplier.status_published") : tr("supplier.status_pending")}
            </span>
          )}
        </div>

        <div className="space-y-5 border rounded-xl p-6 bg-white shadow-sm">
          {!isNew && (
            <div className="space-y-3 pb-4 border-b">
              <Label>{tr("product_edit.photo")}</Label>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <div className="h-40 w-40 rounded-xl border overflow-hidden bg-muted shrink-0">
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
                    variant="gold"
                    className="gap-2 justify-start"
                    disabled={uploading || generating}
                    onClick={() => void generatePhoto()}
                  >
                    {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {generating ? tr("product_edit.photo_generating") : tr("product_edit.photo_ai")}
                  </Button>
                  <Button type="button" variant="outline" className="gap-2 justify-start" asChild>
                    <Link href={`/studio?product=${id}`}>
                      <Wand2 className="h-4 w-4" /> {tr("product_edit.open_studio")}
                    </Link>
                  </Button>
                  <p className="text-xs text-muted-foreground">{tr("product_edit.photo_hint")}</p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label>{tr("product_edit.name")}</Label>
              <Button
                type="button"
                variant="gold"
                size="sm"
                className="gap-1.5 h-8"
                disabled={generatingText}
                onClick={() => void generateTextWithAi()}
              >
                {generatingText ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {generatingText ? tr("product_edit.text_generating") : tr("product_edit.text_ai")}
              </Button>
            </div>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder={tr("product_edit.name_placeholder")} />
          </div>
          <div className="space-y-1.5">
            <Label>{tr("product_edit.description")}</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={5} placeholder={tr("product_edit.desc_placeholder")} />
            <p className="text-xs text-muted-foreground">{tr("product_edit.text_ai_hint")}</p>
          </div>
          <div className="space-y-1.5">
            <Label>{tr("product_edit.category")}</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder={tr("product_edit.category")} />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map(slug => (
                  <SelectItem key={slug} value={slug}>{slug}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{tr("product_edit.moq")}</Label>
              <Input type="number" value={moq} onChange={e => setMoq(parseInt(e.target.value, 10) || 0)} />
            </div>
            <div className="space-y-1.5">
              <Label>{tr("product_edit.unit")}</Label>
              <Input value={moqUnit} onChange={e => setMoqUnit(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>{tr("product_edit.departure_port")}</Label>
              <Input value={portDepart} onChange={e => setPortDepart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-primary font-bold">{tr("product_edit.fob_price")}</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={priceFob}
                onChange={e => setPriceFob(parseFloat(e.target.value) || 0)}
                className="font-bold text-lg"
              />
              <p className="text-xs text-muted-foreground">
                {tr("admin.price_cif_hint").replace("{cif}", String(priceCif))}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            {adminMode ? (
              <Button className="gap-2 flex-1" variant="gold" onClick={() => void save(true)} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                {saving ? tr("common.saving") : tr("admin.save_and_approve")}
              </Button>
            ) : (
              <Button className="gap-2 flex-1" onClick={() => void save(false)} disabled={saving}>
                <Save className="h-4 w-4" /> {saving ? tr("common.saving") : tr("common.save")}
              </Button>
            )}
            {!isNew && (
              <Button type="button" variant="outline" className="gap-2" disabled={duplicating} onClick={() => void duplicate()}>
                {duplicating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                {tr("product_edit.duplicate")}
              </Button>
            )}
          </div>
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

export function AdminProductEdit() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <ProductEditContent adminMode />
    </ProtectedRoute>
  );
}
