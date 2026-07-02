import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UploadCloud, CheckCircle2, ArrowRight, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BuyerHeader, BuyerFooter } from "@/components/BuyerHeader";
import { useI18n } from "@/contexts/I18nContext";
import { getAuthToken, logisticsApi, type PortInfo } from "@/lib/api-auth";
import { apiUrl } from "@/lib/api-base";

const rfqSchema = z.object({
  product_name: z.string().min(1, "Le nom du produit est requis"),
  product_description: z.string().optional(),
  quantity: z.coerce.number().min(1, "La quantité doit être au moins 1"),
  quantity_unit: z.string().min(1, "L'unité est requise"),
  destination_country: z.string().optional(),
  port_depart: z.string().optional(),
  port_arrival: z.string().optional(),
  requested_incoterm: z.string().optional(),
  target_price: z.coerce.number().optional(),
  message: z.string().optional(),
});

const rfqStep2Schema = z.object({
  destination_country: z.string().min(1, "Le pays de destination est requis"),
  port_depart: z.string().min(1, "Le port de départ est requis"),
  requested_incoterm: z.string().min(1, "L'Incoterm est requis"),
});

const rfqSubmitSchema = rfqSchema.extend({
  destination_country: z.string().min(1, "Le pays de destination est requis"),
  port_depart: z.string().min(1, "Le port de départ est requis"),
  requested_incoterm: z.string().min(1, "L'Incoterm est requis"),
});

type RfqFormValues = z.infer<typeof rfqSchema>;

type PendingFile = { name: string; mime: string; data: string };

async function fileToBase64(file: File): Promise<PendingFile> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return { name: file.name, mime: file.type || "application/octet-stream", data: btoa(binary) };
}

export default function Rfq() {
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [ports, setPorts] = useState<PortInfo[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { tr } = useI18n();

  const form = useForm<RfqFormValues>({
    resolver: zodResolver(rfqSchema),
    defaultValues: {
      product_name: "",
      product_description: "",
      quantity: 100,
      quantity_unit: "kg",
      destination_country: "",
      port_depart: "",
      port_arrival: "",
      requested_incoterm: "",
      target_price: undefined,
      message: "",
    },
  });

  useEffect(() => {
    logisticsApi.getPorts().then(r => setPorts(r.ports)).catch(() => {});
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const name = params.get("product");
    if (name) form.setValue("product_name", decodeURIComponent(name));
    const qty = params.get("qty");
    if (qty) form.setValue("quantity", parseInt(qty, 10) || 100);
    const unit = params.get("unit");
    if (unit) form.setValue("quantity_unit", decodeURIComponent(unit));
  }, [form]);

  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const added: PendingFile[] = [];
    for (const f of Array.from(list)) {
      if (f.size > 10 * 1024 * 1024) {
        toast({ title: "Fichier trop volumineux", description: f.name, variant: "destructive" });
        continue;
      }
      added.push(await fileToBase64(f));
    }
    setFiles(prev => [...prev, ...added].slice(0, 5));
  };

  const goNextStep = async () => {
    if (step === 1) {
      const ok = await form.trigger(["product_name", "quantity", "quantity_unit"]);
      if (ok) setStep(2);
      else toast({ title: "Champs requis", description: "Complétez le produit et la quantité.", variant: "destructive" });
      return;
    }
    if (step === 2) {
      const values = form.getValues();
      const parsed = rfqStep2Schema.safeParse({
        destination_country: values.destination_country,
        port_depart: values.port_depart,
        requested_incoterm: values.requested_incoterm,
      });
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          const field = issue.path[0] as keyof RfqFormValues;
          form.setError(field, { message: issue.message });
        }
        toast({ title: "Logistique incomplète", description: "Renseignez destination, port et Incoterm.", variant: "destructive" });
        return;
      }
      setStep(3);
    }
  };

  const onSubmit = async (data: RfqFormValues) => {
    const parsed = rfqSubmitSchema.safeParse(data);
    if (!parsed.success) {
      toast({ title: "Formulaire incomplet", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const token = getAuthToken();
      const res = await fetch(apiUrl("/api/rfq"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ ...parsed.data, attachments: files }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Erreur envoi");
      toast({
        title: "Demande envoyée",
        description: "Votre RFQ a été transmise aux exportateurs vérifiés QDIA.",
      });
      setLocation("/mes-rfq");
    } catch (e) {
      toast({
        title: "Échec de l'envoi",
        description: e instanceof Error ? e.message : "Réessayez.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const currentData = form.watch();

  return (
    <div className="min-h-screen qdia-buyer-page flex flex-col">
      <BuyerHeader />

      <main className="flex-1 p-6 md:p-8 max-w-3xl mx-auto w-full">
        <h1 className="text-3xl font-bold mb-2 text-center text-[#073B74]">{tr("rfq.title")}</h1>
        <p className="text-center text-sm text-[#9CA3AF] mb-8">
          {tr("rfq.subtitle")} 🇩🇿
        </p>

        <div className="flex items-center justify-between mb-8 relative">
          <div className="absolute top-1/2 left-0 w-full h-1 bg-muted -z-10 -translate-y-1/2 rounded-full" />
          <div
            className="absolute top-1/2 left-0 h-1 bg-primary -z-10 -translate-y-1/2 rounded-full transition-all duration-300"
            style={{ width: `${(step - 1) * 50}%` }}
          />
          {[
            { n: 1, label: tr("rfq.step_product") },
            { n: 2, label: tr("rfq.step_logistics") },
            { n: 3, label: tr("rfq.step_validation") },
          ].map(({ n, label }) => (
            <div key={n} className="flex flex-col items-center gap-2 bg-background px-2">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors
                ${step >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground border"}`}>
                {step > n ? <CheckCircle2 className="h-5 w-5" /> : n}
              </div>
              <span className={`text-xs font-medium ${step >= n ? "text-primary" : "text-muted-foreground"}`}>
                {label}
              </span>
            </div>
          ))}
        </div>

        <Card>
          <CardContent className="p-6 md:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {step === 1 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <FormField
                      control={form.control}
                      name="product_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{tr("rfq.product_name")}</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex : Huile d'olive extra vierge, bouteille 750 ml" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{tr("rfq.quantity")}</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="1000" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="quantity_unit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{tr("rfq.unit")}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder={tr("rfq_page.choose_unit")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="kg">Kilogrammes (kg)</SelectItem>
                                <SelectItem value="tons">{tr("rfq_page.tons")}</SelectItem>
                                <SelectItem value="liters">{tr("rfq_page.liters")}</SelectItem>
                                <SelectItem value="units">{tr("rfq_page.units")}</SelectItem>
                                <SelectItem value="meters">{tr("rfq_page.meters")}</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="target_price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prix cible (USD) — optionnel</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="Ex : 5.50" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={e => e.key === "Enter" && fileInputRef.current?.click()}
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); void onFiles(e.dataTransfer.files); }}
                      className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-muted/50 transition-colors"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept=".jpg,.jpeg,.png,.pdf"
                        multiple
                        onChange={e => void onFiles(e.target.files)}
                      />
                      <UploadCloud className="h-8 w-8 text-muted-foreground mb-3" />
                      <p className="text-sm font-medium">{tr("rfq.upload")}</p>
                      <p className="text-xs text-muted-foreground mt-1">{tr("rfq_page.file_formats")}</p>
                      {files.length > 0 && (
                        <ul className="mt-4 w-full text-left space-y-1">
                          {files.map((f, i) => (
                            <li key={i} className="flex items-center justify-between text-xs bg-muted rounded px-2 py-1">
                              <span className="truncate">{f.name}</span>
                              <button type="button" onClick={ev => { ev.stopPropagation(); setFiles(files.filter((_, j) => j !== i)); }}>
                                <X className="h-3 w-3" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <FormField
                      control={form.control}
                      name="destination_country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pays de destination</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={tr("rfq_page.choose_destination")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="France">France 🇫🇷 — Marseille / Le Havre</SelectItem>
                              <SelectItem value="Émirats arabes unis">Émirats (UAE) 🇦🇪 — Jebel Ali / Abu Dhabi</SelectItem>
                              <SelectItem value="Allemagne">Allemagne 🇩🇪</SelectItem>
                              <SelectItem value="Espagne">Espagne 🇪🇸</SelectItem>
                              <SelectItem value="Algérie (export)">Algérie export 🇩🇿 — Dédouanement</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="port_depart"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Port de départ (Algérie)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder={tr("rfq_page.choose_port")} /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {ports.filter(p => p.country_code === "DZ").map(p => (
                                  <SelectItem key={p.code} value={`${p.name} (${p.code})`}>
                                    {p.name} — {p.city}
                                  </SelectItem>
                                ))}
                                {!ports.length && (
                                  <>
                                    <SelectItem value="Port d'Alger (DZALG)">Port d&apos;Alger</SelectItem>
                                    <SelectItem value="Port de Béjaïa (DZBJA)">Port de Béjaïa</SelectItem>
                                    <SelectItem value="Port d'Oran (DZORN)">Port d&apos;Oran</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="port_arrival"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Port d&apos;arrivée (optionnel)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger><SelectValue placeholder={tr("rfq_page.destination_port")} /></SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {ports.filter(p => p.country_code !== "DZ").map(p => (
                                  <SelectItem key={p.code} value={`${p.name} (${p.code})`}>
                                    {p.name} — {p.country}
                                  </SelectItem>
                                ))}
                                {!ports.length && (
                                  <>
                                    <SelectItem value="Marseille (FRMRS)">Marseille</SelectItem>
                                    <SelectItem value="Jebel Ali (AEJEA)">Jebel Ali</SelectItem>
                                    <SelectItem value="Le Havre (FRLEH)">Le Havre</SelectItem>
                                  </>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="requested_incoterm"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Incoterm souhaité</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={tr("rfq_page.choose_incoterm")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="FOB">FOB — Free on Board</SelectItem>
                              <SelectItem value="EXW">EXW — Ex Works</SelectItem>
                              <SelectItem value="CIF">CIF — Cost, Insurance & Freight</SelectItem>
                              <SelectItem value="CFR">CFR — Cost & Freight</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Exigences supplémentaires / message</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={tr("rfq_page.message_placeholder")}
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                    <div className="bg-muted p-4 rounded-lg space-y-4 text-sm">
                      <h3 className="font-semibold border-b pb-2">{tr("rfq_page.summary")}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-muted-foreground block text-xs">{tr("rfq_page.summary_product")}</span>
                          <span className="font-medium">{currentData.product_name}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs">{tr("rfq_page.summary_quantity")}</span>
                          <span className="font-medium">{currentData.quantity} {currentData.quantity_unit}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs">{tr("rfq_page.summary_destination")}</span>
                          <span className="font-medium">{currentData.destination_country}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs">{tr("rfq_page.summary_ports")}</span>
                          <span className="font-medium">{currentData.port_depart} → {currentData.port_arrival || "—"}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-xs">{tr("rfq_page.summary_incoterm")}</span>
                          <span className="font-medium">{currentData.requested_incoterm}</span>
                        </div>
                        {currentData.target_price && (
                          <div>
                            <span className="text-muted-foreground block text-xs">{tr("rfq_page.summary_target")}</span>
                            <span className="font-medium">{currentData.target_price} USD</span>
                          </div>
                        )}
                      </div>
                      {currentData.message && (
                        <div>
                          <span className="text-muted-foreground block text-xs">{tr("rfq_page.summary_message")}</span>
                          <p className="font-medium mt-1 whitespace-pre-wrap">{currentData.message}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  {step > 1 ? (
                    <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                      {tr("common.back")}
                    </Button>
                  ) : (
                    <div />
                  )}
                  <Button
                    type={step < 3 ? "button" : "submit"}
                    onClick={step < 3 ? () => void goNextStep() : undefined}
                    className="gap-2"
                    disabled={submitting}
                  >
                    {step === 1 ? tr("rfq.next_logistics") : step === 2 ? tr("rfq.next_review") : tr("rfq.submit")}
                    {step < 3 && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
      <BuyerFooter />
    </div>
  );
}
