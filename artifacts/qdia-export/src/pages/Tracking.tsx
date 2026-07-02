import { useEffect, useState } from "react";
import { BuyerHeader, BuyerFooter } from "@/components/BuyerHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { platformApi } from "@/lib/platform-api";
import { useI18n } from "@/contexts/I18nContext";
import { useToast } from "@/hooks/use-toast";
import { Truck, MapPin, Clock } from "lucide-react";

type TrackingResult = Awaited<ReturnType<typeof platformApi.trackParcel>>;

export default function Tracking() {
  const { tr } = useI18n();
  const { toast } = useToast();
  const [number, setNumber] = useState("");
  const [carrier, setCarrier] = useState<string>("auto");
  const [result, setResult] = useState<TrackingResult | null>(null);
  const [loading, setLoading] = useState(false);

  const search = async (trackingNumber: string, car: string) => {
    const n = trackingNumber.trim();
    if (!n) return;
    setLoading(true);
    try {
      const c = car === "auto" ? undefined : car as "dhl" | "fedex" | "maersk";
      const data = await platformApi.trackParcel(n, c);
      setResult(data);
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const n = params.get("number");
    const c = params.get("carrier");
    if (n) {
      setNumber(n);
      if (c) setCarrier(c);
      void search(n, c ?? "auto");
    }
  }, []);

  return (
    <div className="min-h-screen qdia-buyer-page flex flex-col">
      <BuyerHeader />
      <main className="flex-1 p-6 md:p-8 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-black mb-2 flex items-center gap-2">
          <Truck className="h-7 w-7 text-[#0461A5]" /> {tr("tracking.page_title")}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">{tr("tracking.page_subtitle")}</p>

        <div className="border rounded-xl p-4 space-y-3 mb-8">
          <div>
            <Label>{tr("tracking.number_input")}</Label>
            <Input value={number} onChange={e => setNumber(e.target.value)} placeholder="DHL1234567890" />
          </div>
          <div>
            <Label>{tr("tracking.carrier")}</Label>
            <Select value={carrier} onValueChange={setCarrier}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{tr("tracking.carrier_auto")}</SelectItem>
                <SelectItem value="dhl">DHL</SelectItem>
                <SelectItem value="fedex">FedEx</SelectItem>
                <SelectItem value="maersk">Maersk</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => void search(number, carrier)} disabled={loading || !number.trim()} className="w-full">
            {loading ? tr("common.loading") : tr("tracking.search")}
          </Button>
        </div>

        {result && (
          <div className="space-y-4">
            <div className="bg-[#F0F4FF] rounded-xl p-4">
              <p className="font-bold text-[#073B74]">{result.carrier}</p>
              <p className="text-sm font-mono mt-1">{result.tracking_number}</p>
              <p className="text-xs mt-2">
                {tr("tracking.current_status")}: <span className="font-semibold uppercase">{result.status.replace(/_/g, " ")}</span>
              </p>
            </div>
            <div className="space-y-3">
              {result.events.map((ev, i) => (
                <div key={i} className="flex gap-3 border-l-2 border-[#0461A5] pl-4 pb-3">
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{ev.description}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" /> {ev.location}
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" /> {new Date(ev.event_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <BuyerFooter />
    </div>
  );
}
