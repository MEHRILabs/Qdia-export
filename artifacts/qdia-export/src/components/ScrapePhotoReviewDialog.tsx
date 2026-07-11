import { useEffect, useState } from "react";
import { Check, Loader2, RefreshCw, Trash2, X, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { platformApi } from "@/lib/platform-api";
import { useI18n } from "@/contexts/I18nContext";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-base";

export type PhotoReviewItem = {
  id: number;
  name: string;
  category: string | null;
  brand: string;
  image_url: string;
  pending: boolean;
  candidate_count: number;
  candidate_index: number;
};

type Props = {
  open: boolean;
  ids: number[];
  onClose: () => void;
};

function resolveImg(src: string) {
  if (src.startsWith("http") || src.startsWith("data:") || src.startsWith("/")) {
    if (src.startsWith("/")) return apiUrl(src);
    return src;
  }
  return src;
}

export function ScrapePhotoReviewDialog({ open, ids, onClose }: Props) {
  const { tr } = useI18n();
  const { toast } = useToast();
  const [items, setItems] = useState<PhotoReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !ids.length) {
      setItems([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    platformApi
      .listPhotoReviews(ids)
      .then((r) => {
        if (!cancelled) setItems(r.data as PhotoReviewItem[]);
      })
      .catch((e) => {
        if (!cancelled) {
          toast({
            title: tr("common.error"),
            description: String(e instanceof Error ? e.message : e),
            variant: "destructive",
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, ids, toast, tr]);

  const approveAll = async () => {
    setSaving(true);
    try {
      const allIds = items.map((i) => i.id);
      const r = await platformApi.approvePhotoReviews(allIds);
      toast({
        title: tr("admin.review_approved"),
        description: tr("admin.review_approved_desc").replace("{n}", String(r.approved)),
      });
      onClose();
    } catch (e) {
      toast({
        title: tr("common.error"),
        description: String(e instanceof Error ? e.message : e),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const rejectOne = async (id: number) => {
    setBusyId(id);
    try {
      await platformApi.rejectPhotoReviews([id]);
      setItems((prev) => prev.filter((x) => x.id !== id));
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

  /** Image suivante parmi les candidats ; sinon re-scrape. */
  const nextOrRescrape = async (item: PhotoReviewItem) => {
    setBusyId(item.id);
    try {
      if (item.candidate_count > 1) {
        const r = await platformApi.nextPhotoReviewCandidate(item.id);
        if (r.ok && r.item) {
          setItems((prev) =>
            prev.map((x) =>
              x.id === item.id
                ? { ...r.item!, image_url: `${r.item!.image_url}${r.item!.image_url.includes("?") ? "&" : "?"}t=${Date.now()}` }
                : x,
            ),
          );
          return;
        }
      }
      const r = await platformApi.rescrapePhotoReview(item.id);
      if (r.ok && r.item) {
        setItems((prev) =>
          prev.map((x) =>
            x.id === item.id
              ? { ...r.item!, image_url: `${r.item!.image_url}${r.item!.image_url.includes("?") ? "&" : "?"}t=${Date.now()}` }
              : x,
          ),
        );
      } else {
        toast({
          title: tr("common.error"),
          description: r.reason ?? tr("admin.review_rescrape_fail"),
          variant: "destructive",
        });
      }
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

  const forceRescrape = async (id: number) => {
    setBusyId(id);
    try {
      const r = await platformApi.rescrapePhotoReview(id);
      if (r.ok && r.item) {
        setItems((prev) =>
          prev.map((x) =>
            x.id === id
              ? { ...r.item!, image_url: `${r.item!.image_url}${r.item!.image_url.includes("?") ? "&" : "?"}t=${Date.now()}` }
              : x,
          ),
        );
      } else {
        toast({
          title: tr("common.error"),
          description: r.reason ?? tr("admin.review_rescrape_fail"),
          variant: "destructive",
        });
      }
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{tr("admin.review_title")}</DialogTitle>
          <DialogDescription>{tr("admin.review_desc")}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 py-2">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              {tr("admin.review_loading")}
            </div>
          ) : items.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">{tr("admin.review_empty")}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border bg-card overflow-hidden flex flex-col">
                  <div className="aspect-square bg-[#F8FAFC] relative">
                    <img
                      src={resolveImg(item.image_url)}
                      alt={item.name}
                      className="w-full h-full object-contain"
                    />
                    {item.candidate_count > 1 && (
                      <span className="absolute top-2 end-2 text-[10px] font-bold bg-white/90 border rounded px-1.5 py-0.5">
                        1/{item.candidate_count}
                      </span>
                    )}
                  </div>
                  <div className="p-2.5 flex-1 flex flex-col gap-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[#0461A5]">
                      {tr("admin.review_brand")}: {item.brand || "—"}
                    </p>
                    <p className="text-xs font-semibold line-clamp-2 leading-snug">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">{item.category}</p>
                    <div className="mt-auto flex flex-col gap-1.5 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full gap-1 text-xs h-8"
                        disabled={busyId === item.id || saving}
                        onClick={() => void nextOrRescrape(item)}
                      >
                        {busyId === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : item.candidate_count > 1 ? (
                          <ChevronRight className="h-3 w-3" />
                        ) : (
                          <RefreshCw className="h-3 w-3" />
                        )}
                        {item.candidate_count > 1
                          ? tr("admin.review_next")
                          : tr("admin.review_modify")}
                      </Button>
                      <div className="flex gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 gap-1 text-xs h-8"
                          disabled={busyId === item.id || saving}
                          onClick={() => void forceRescrape(item.id)}
                          title={tr("admin.review_rescrape")}
                        >
                          <RefreshCw className="h-3 w-3" />
                          {tr("admin.review_rescrape")}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-8 w-8 p-0"
                          disabled={busyId === item.id || saving}
                          onClick={() => void rejectOne(item.id)}
                          title={tr("admin.review_reject")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 justify-end border-t pt-3">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            <X className="h-4 w-4 me-1" />
            {tr("admin.review_later")}
          </Button>
          <Button
            variant="gold"
            className="font-bold gap-1"
            disabled={saving || items.length === 0}
            onClick={() => void approveAll()}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {tr("admin.review_confirm_all")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
