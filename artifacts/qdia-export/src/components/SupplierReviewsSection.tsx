import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { platformApi } from "@/lib/platform-api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { useToast } from "@/hooks/use-toast";

interface Props {
  supplierId: number;
}

export function SupplierReviewsSection({ supplierId }: Props) {
  const { user } = useAuth();
  const { tr } = useI18n();
  const { toast } = useToast();
  const [stats, setStats] = useState<{ average: number; count: number; reviews: Array<{ rating: number; comment?: string }> }>({
    average: 0,
    count: 0,
    reviews: [],
  });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const load = () => {
    platformApi.getSupplierReviews(supplierId).then(setStats).catch(() => {});
  };

  useEffect(() => { load(); }, [supplierId]);

  const submit = async () => {
    if (!user) {
      toast({ title: tr("engagement.login_required"), variant: "destructive" });
      return;
    }
    await platformApi.postSupplierReview(supplierId, rating, comment || undefined);
    toast({ title: tr("engagement.review_published") });
    setComment("");
    load();
  };

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <p className="font-semibold text-sm flex items-center gap-1">
        <Star className="h-4 w-4 text-amber-500" />
        {tr("supplier_reviews.title").replace("{avg}", stats.average.toFixed(1)).replace("{count}", String(stats.count))}
      </p>
      {stats.reviews.slice(0, 5).map((r, i) => (
        <div key={i} className="text-sm border-b pb-2 last:border-0">
          <div className="flex gap-0.5 mb-1">
            {[1, 2, 3, 4, 5].map(n => (
              <Star key={n} className={`h-3 w-3 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
            ))}
          </div>
          {r.comment && <p className="text-muted-foreground text-xs">{r.comment}</p>}
        </div>
      ))}
      {!stats.reviews.length && <p className="text-xs text-muted-foreground">{tr("supplier_reviews.empty")}</p>}
      {user && (
        <div className="space-y-2 pt-2 border-t">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => setRating(n)}>
                <Star className={`h-5 w-5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
              </button>
            ))}
          </div>
          <Textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} placeholder={tr("supplier_reviews.placeholder")} />
          <Button size="sm" onClick={() => void submit()}>{tr("engagement.publish_review")}</Button>
        </div>
      )}
    </div>
  );
}
