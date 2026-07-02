import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { platformApi } from "@/lib/platform-api";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import { useToast } from "@/hooks/use-toast";
import { Factory, Package } from "lucide-react";

interface Props {
  productId: number;
  supplierId?: number;
}

export function OemSamplePanel({ productId, supplierId }: Props) {
  const { user } = useAuth();
  const { tr } = useI18n();
  const { toast } = useToast();
  const [oemType, setOemType] = useState<"oem" | "odm">("oem");
  const [specs, setSpecs] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [oemQty, setOemQty] = useState("");
  const [sampleQty, setSampleQty] = useState("1");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const requireAuth = () => {
    if (!user) {
      toast({ title: tr("oem.login_required"), variant: "destructive" });
      window.dispatchEvent(new Event("qdia-open-auth"));
      return false;
    }
    return true;
  };

  const submitOem = async () => {
    if (!requireAuth() || specs.trim().length < 5) return;
    setLoading(true);
    try {
      await platformApi.createOemRequest({
        product_id: productId,
        request_type: oemType,
        specs: specs.trim(),
        supplier_id: supplierId,
        logo_url: logoUrl || undefined,
        quantity: oemQty ? parseInt(oemQty, 10) : undefined,
      });
      toast({ title: tr("oem.sent") });
      setSpecs("");
      setLogoUrl("");
      setOemQty("");
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const submitSample = async () => {
    if (!requireAuth() || address.trim().length < 5) return;
    setLoading(true);
    try {
      await platformApi.createSampleRequest({
        product_id: productId,
        shipping_address: address.trim(),
        quantity: parseInt(sampleQty, 10) || 1,
        supplier_id: supplierId,
      });
      toast({ title: tr("samples.sent") });
      setAddress("");
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border bg-white p-4 space-y-3">
      <h3 className="font-bold text-[#073B74] flex items-center gap-2">
        <Factory className="h-4 w-4" /> {tr("oem.title")}
      </h3>
      <Tabs defaultValue="oem">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="oem">{tr("oem.tab_oem")}</TabsTrigger>
          <TabsTrigger value="sample">{tr("samples.tab")}</TabsTrigger>
        </TabsList>
        <TabsContent value="oem" className="space-y-3 mt-3">
          <div className="flex gap-2">
            {(["oem", "odm"] as const).map(t => (
              <Button key={t} size="sm" variant={oemType === t ? "default" : "outline"} onClick={() => setOemType(t)}>
                {t === "oem" ? tr("oem.type_oem") : tr("oem.type_odm")}
              </Button>
            ))}
          </div>
          <div>
            <Label>{tr("oem.specs")}</Label>
            <Textarea value={specs} onChange={e => setSpecs(e.target.value)} rows={3} placeholder={tr("oem.specs_placeholder")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{tr("oem.logo_url")}</Label>
              <Input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div>
              <Label>{tr("oem.quantity")}</Label>
              <Input type="number" value={oemQty} onChange={e => setOemQty(e.target.value)} min={1} />
            </div>
          </div>
          <Button onClick={() => void submitOem()} disabled={loading || specs.trim().length < 5}>
            {tr("oem.submit")}
          </Button>
        </TabsContent>
        <TabsContent value="sample" className="space-y-3 mt-3">
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Package className="h-4 w-4" /> {tr("samples.desc")}
          </p>
          <div>
            <Label>{tr("samples.quantity")}</Label>
            <Input type="number" value={sampleQty} onChange={e => setSampleQty(e.target.value)} min={1} />
          </div>
          <div>
            <Label>{tr("samples.address")}</Label>
            <Textarea value={address} onChange={e => setAddress(e.target.value)} rows={2} placeholder={tr("samples.address_placeholder")} />
          </div>
          <Button onClick={() => void submitSample()} disabled={loading || address.trim().length < 5}>
            {tr("samples.submit")}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
