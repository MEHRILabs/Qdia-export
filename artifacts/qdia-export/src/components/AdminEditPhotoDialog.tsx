import { useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2, Sparkles, Trash2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ProductImage";
import { platformApi } from "@/lib/platform-api";
import { useI18n } from "@/contexts/I18nContext";
import { useToast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  product: { id: number; name: string; image_url?: string | null } | null;
  onClose: () => void;
  onSaved: (imageUrl: string | null) => void;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Lecture fichier impossible"));
    reader.readAsDataURL(file);
  });
}

export function AdminEditPhotoDialog({ open, product, onClose, onSaved }: Props) {
  const { tr } = useI18n();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!open || !product) {
      setPreview(null);
      return;
    }
    setPreview(product.image_url ?? null);
  }, [open, product]);

  if (!product) return null;

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
      const updated = await platformApi.uploadProductImage(product.id, dataUrl);
      const next = (updated.image_url as string) ?? null;
      setPreview(next);
      onSaved(next);
      toast({ title: tr("product_edit.photo_saved") });
    } catch (e) {
      toast({
        title: tr("common.error"),
        description: String(e instanceof Error ? e.message : e),
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const generatePhoto = async () => {
    setGenerating(true);
    try {
      const result = await platformApi.enrichProduct(product.id, { generate_photos: true, skip_pricing: true });
      if (!result.ok || !result.photo_updated) {
        throw new Error(tr("product_edit.photo_ai_failed"));
      }
      const fresh = `/api/products/${product.id}/image?t=${Date.now()}`;
      setPreview(fresh);
      onSaved(fresh);
      toast({ title: tr("product_edit.photo_ai_done") });
    } catch (e) {
      toast({
        title: tr("common.error"),
        description: String(e instanceof Error ? e.message : e),
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const removePhoto = async () => {
    if (!confirm(tr("admin.photo_remove_confirm") || "Retirer la photo de ce produit ?")) return;
    setRemoving(true);
    try {
      await platformApi.rejectPhotoReviews([product.id]);
      setPreview(null);
      onSaved(null);
      toast({ title: tr("admin.photo_removed") || "Photo retirée" });
    } catch (e) {
      toast({
        title: tr("common.error"),
        description: String(e instanceof Error ? e.message : e),
        variant: "destructive",
      });
    } finally {
      setRemoving(false);
    }
  };

  const busy = uploading || generating || removing;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-[#0461A5]" />
            {tr("admin.edit_photo") || "Modifier photo"}
          </DialogTitle>
          <DialogDescription className="line-clamp-2">{product.name}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="aspect-square w-full max-w-[280px] mx-auto rounded-xl border overflow-hidden bg-[#F8FAFC]">
            <ProductImage src={preview} alt={product.name} fit="contain" className="h-full w-full" />
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void uploadPhoto(file);
              e.target.value = "";
            }}
          />

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="gold"
              className="w-full gap-2 font-bold"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? tr("product_edit.photo_uploading") : tr("product_edit.photo_upload")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              disabled={busy}
              onClick={() => void generatePhoto()}
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? tr("product_edit.photo_generating") : tr("product_edit.photo_ai")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 text-red-600 hover:text-red-700"
              disabled={busy || !preview}
              onClick={() => void removePhoto()}
            >
              {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {tr("admin.photo_remove") || "Retirer la photo"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">{tr("product_edit.photo_hint")}</p>

          <div className="flex justify-end">
            <Button variant="outline" disabled={busy} onClick={onClose}>
              {tr("common.close") || "Fermer"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
