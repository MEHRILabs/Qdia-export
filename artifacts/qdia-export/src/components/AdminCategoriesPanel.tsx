import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nContext";
import { platformApi, type AdminCategory } from "@/lib/platform-api";
import { apiUrl } from "@/lib/api-base";
import { HOME_CATEGORIES, CATEGORY_I18N_KEYS } from "@/lib/nav";

function resolveImg(src?: string | null) {
  if (!src) return "";
  if (src.startsWith("http") || src.startsWith("data:")) return src;
  return apiUrl(src);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Lecture fichier impossible"));
    reader.readAsDataURL(file);
  });
}

export function AdminCategoriesPanel() {
  const { tr } = useI18n();
  const { toast } = useToast();
  const [rows, setRows] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await platformApi.listAdminCategories();
      // Prioriser les 5 secteurs marketplace
      const preferred = new Set(HOME_CATEGORIES.map((c) => c.slug));
      const sorted = [...list].sort((a, b) => {
        const ap = preferred.has(a.name) ? 0 : 1;
        const bp = preferred.has(b.name) ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return a.name.localeCompare(b.name);
      });
      setRows(sorted);
    } catch (e) {
      toast({
        title: tr("common.error"),
        description: String(e instanceof Error ? e.message : e),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, tr]);

  useEffect(() => {
    void load();
  }, [load]);

  const labelFor = (name: string) => {
    const key = CATEGORY_I18N_KEYS[name];
    return key ? tr(key) : name;
  };

  const onPick = async (id: number, file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: tr("common.error"), description: "Fichier image requis (JPG/PNG).", variant: "destructive" });
      return;
    }
    setBusyId(id);
    try {
      const b64 = await fileToBase64(file);
      const updated = await platformApi.uploadCategoryImage(id, b64);
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast({ title: tr("admin.category_image_saved") || "Image catégorie enregistrée" });
    } catch (e) {
      toast({
        title: tr("common.error"),
        description: String(e instanceof Error ? e.message : e),
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const onRemove = async (id: number) => {
    setBusyId(id);
    try {
      const updated = await platformApi.deleteCategoryImage(id);
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
      toast({ title: tr("admin.category_image_removed") || "Image retirée" });
    } catch (e) {
      toast({
        title: tr("common.error"),
        description: String(e instanceof Error ? e.message : e),
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> {tr("common.loading") || "Chargement…"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-4">
        <h2 className="font-bold text-[#073B74] text-lg">{tr("admin.tab_categories") || "Catégories"}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {tr("admin.categories_desc") ||
            "Ajoutez une image pour chaque secteur. Elle s’affiche sur l’accueil et le catalogue."}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((cat) => (
          <div key={cat.id} className="rounded-xl border bg-card overflow-hidden flex flex-col">
            <div className="aspect-[4/3] bg-muted relative flex items-center justify-center">
              {cat.image_url ? (
                <img
                  src={resolveImg(cat.image_url)}
                  alt={cat.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <span className="text-4xl opacity-60">
                  {HOME_CATEGORIES.find((h) => h.slug === cat.name)?.emoji ?? "📦"}
                </span>
              )}
            </div>
            <div className="p-3 flex flex-col gap-2 flex-1">
              <div>
                <p className="font-semibold text-sm text-[#1A1A2E]">{labelFor(cat.name)}</p>
                <p className="text-xs text-muted-foreground truncate">{cat.name}</p>
              </div>
              <input
                ref={(el) => {
                  inputRefs.current[cat.id] = el;
                }}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => void onPick(cat.id, e.target.files?.[0] ?? null)}
              />
              <div className="flex gap-2 mt-auto">
                <Button
                  size="sm"
                  className="flex-1 gap-1.5"
                  disabled={busyId === cat.id}
                  onClick={() => inputRefs.current[cat.id]?.click()}
                >
                  {busyId === cat.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  {cat.image_url
                    ? tr("admin.category_replace") || "Remplacer"
                    : tr("admin.category_upload") || "Ajouter image"}
                </Button>
                {cat.image_url && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === cat.id}
                    onClick={() => void onRemove(cat.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
