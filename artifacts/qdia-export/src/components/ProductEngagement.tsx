import { useEffect, useState } from "react";
import { Heart, Star, QrCode, Truck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { platformApi } from "@/lib/platform-api";
import { useToast } from "@/hooks/use-toast";

interface Props {
  productId: number;
  productName: string;
  category: string;
  destination?: string;
}

export function ProductEngagement({ productId, productName, category, destination = "FR" }: Props) {
  const { user } = useAuth();
  const { tr } = useI18n();
  const { toast } = useToast();
  const [favorited, setFavorited] = useState(false);
  const [reviews, setReviews] = useState<{ average: number; count: number }>({ average: 0, count: 0 });
  const [alerts, setAlerts] = useState<string[]>([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  const productUrl = `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, "")}/products/${productId}`;

  const trackingSteps = [
    tr("engagement.step_rfq"),
    tr("engagement.step_quote"),
    tr("engagement.step_contract"),
    tr("engagement.step_shipment"),
    tr("engagement.step_delivery"),
  ];

  useEffect(() => {
    platformApi.getReviews(productId).then(r => setReviews({ average: r.average, count: r.count })).catch(() => {});
    platformApi.complianceAlerts(destination, category).then(r => setAlerts(r.alerts)).catch(() => {});
    if (user) {
      platformApi.getFavorites().then(res => setFavorited(res.product_ids.includes(productId))).catch(() => {});
    }
  }, [productId, category, destination, user]);

  const toggleFavorite = async () => {
    if (!user) {
      toast({ title: tr("engagement.login_required"), variant: "destructive" });
      return;
    }
    await platformApi.toggleFavorite(productId, !favorited);
    setFavorited(!favorited);
    toast({ title: favorited ? tr("engagement.removed_favorite") : tr("engagement.added_favorite") });
  };

  const submitReview = async () => {
    if (!user) {
      toast({ title: tr("engagement.login_required"), variant: "destructive" });
      return;
    }
    await platformApi.postReview(productId, rating, comment || undefined);
    toast({ title: tr("engagement.review_published") });
    setComment("");
    const r = await platformApi.getReviews(productId);
    setReviews({ average: r.average, count: r.count });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={toggleFavorite} className="gap-1">
          <Heart className={`h-4 w-4 ${favorited ? "fill-red-500 text-red-500" : ""}`} />
          {favorited ? tr("engagement.favorite") : tr("engagement.add_favorite")}
        </Button>
        <a
          href={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(productUrl)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs border rounded-md px-3 py-2 hover:bg-muted"
        >
          <QrCode className="h-4 w-4" /> {tr("engagement.qr_product")}
        </a>
      </div>

      {alerts.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
          <p className="font-semibold flex items-center gap-1 text-amber-800 mb-1">
            <AlertTriangle className="h-4 w-4" /> {tr("engagement.compliance")} — {destination}
          </p>
          <ul className="list-disc pl-5 text-amber-900 text-xs space-y-0.5">
            {alerts.map(a => <li key={a}>{a}</li>)}
          </ul>
        </div>
      )}

      <div className="rounded-lg border p-4 space-y-2">
        <p className="font-semibold text-sm flex items-center gap-1">
          <Star className="h-4 w-4 text-amber-500" />
          {tr("engagement.reviews").replace("{count}", String(reviews.count)).replace("{avg}", reviews.average.toFixed(1))}
        </p>
        {user && (
          <div className="space-y-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => setRating(n)}>
                  <Star className={`h-5 w-5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
                </button>
              ))}
            </div>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder={tr("engagement.review_placeholder")} rows={2} />
            <Button size="sm" onClick={submitReview}>{tr("engagement.publish_review")}</Button>
          </div>
        )}
      </div>

      <div className="rounded-lg border p-4 text-sm">
        <p className="font-semibold flex items-center gap-1 mb-2"><Truck className="h-4 w-4" /> {tr("engagement.order_tracking")}</p>
        <div className="space-y-2 text-xs text-muted-foreground">
          {trackingSteps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${i === 0 ? "bg-[#0461A5]" : "bg-gray-300"}`} />
              {s}
            </div>
          ))}
        </div>
        <p className="text-[10px] mt-2 text-[#9CA3AF]">{tr("engagement.tracking_hint")}</p>
      </div>
    </div>
  );
}
