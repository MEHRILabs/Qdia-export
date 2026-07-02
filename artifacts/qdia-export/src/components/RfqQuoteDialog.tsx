import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { platformApi } from "@/lib/platform-api";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nContext";
import { useState } from "react";

interface Props {
  rfqId: number;
  onDone: () => void;
}

export function RfqQuoteDialog({ rfqId, onDone }: Props) {
  const { toast } = useToast();
  const { tr } = useI18n();
  const [price, setPrice] = useState("");
  const [incoterm, setIncoterm] = useState("FOB");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      await platformApi.quoteRfq(rfqId, {
        quote_price: parseFloat(price),
        quote_incoterm: incoterm,
        quote_message: message,
      });
      toast({ title: tr("quote_dialog.sent"), description: tr("quote_dialog.sent_desc") });
      onDone();
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-3 bg-[#F0F4FF]">
      <p className="font-semibold text-sm text-[#073B74]">{tr("quote_dialog.title")}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">{tr("quote_dialog.price_usd")}</Label>
          <Input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="5000" />
        </div>
        <div>
          <Label className="text-xs">{tr("quote_dialog.incoterm")}</Label>
          <Input value={incoterm} onChange={e => setIncoterm(e.target.value)} />
        </div>
      </div>
      <div>
        <Label className="text-xs">{tr("quote_dialog.message")}</Label>
        <Textarea value={message} onChange={e => setMessage(e.target.value)} placeholder={tr("quote_dialog.message_placeholder")} rows={3} />
      </div>
      <Button onClick={submit} disabled={loading || !price} className="w-full">{tr("quote_dialog.send")}</Button>
    </div>
  );
}
