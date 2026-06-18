import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard, Package, MessageSquare, FileText,
  ShieldCheck, Sparkles, Send, ImagePlus, ChevronRight,
  Loader2, CheckCircle2, AlertTriangle, RefreshCw,
  Tag, Globe, Boxes, Anchor, DollarSign, Languages,
  Wand2, Upload, X,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface GeneratedProduct {
  name_fr: string; name_en: string; name_ar: string;
  description_fr: string; description_en: string; description_ar?: string;
  category: string;
  specs: Record<string, string>;
  suggested_moq: number; suggested_moq_unit: string; suggested_port: string;
  certifications: string[]; seo_tags: string[]; compliance_alerts: string[];
}

interface PricingResult {
  exw_usd: number; fob_usd: number; cfr_usd: number; cif_usd: number;
  exw_eur: number; fob_eur: number;
  exchange_rate_dzd_usd: number;
  breakdown: Record<string, number>;
  market_benchmark: string | null;
  price_range_note: string | null;
}

// ─── Sidebar (shared) ─────────────────────────────────────────────────────────
function SupplierSidebar() {
  return (
    <aside className="w-64 border-r bg-card hidden md:flex flex-col shrink-0">
      <div className="p-6 border-b">
        <Link href="/" className="font-bold text-xl flex items-center gap-2 text-primary">
          <img src="/logo.png" alt="QDIA Export" className="h-8 w-8 object-contain" onError={e => (e.currentTarget.style.display = "none")} />
          QDIA Export
        </Link>
        <p className="text-xs text-muted-foreground mt-1">Supplier Center · Verified Exporter</p>
      </div>
      <div className="p-4 flex-1">
        <nav className="space-y-1">
          {[
            { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
            { href: "/supplier", icon: Package, label: "Product Management" },
            { href: "/agent-ia", icon: Sparkles, label: "Agent IA", active: true },
            { href: "/", icon: MessageSquare, label: "Inquiries" },
            { href: "/rfq", icon: FileText, label: "RFQ Portal" },
            { href: "/", icon: ShieldCheck, label: "Verification" },
          ].map(({ href, icon: Icon, label, active }) => (
            <Link key={label} href={href}
              className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors font-medium ${active
                ? "bg-primary/10 text-primary"
                : "hover:bg-muted text-muted-foreground"}`}>
              <Icon className="h-4 w-4" /> {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="p-4 border-t">
        <Button className="w-full" asChild>
          <Link href="/rfq">Post RFQ</Link>
        </Button>
      </div>
    </aside>
  );
}

// ─── STEP INDICATOR ───────────────────────────────────────────────────────────
type Step = "chat" | "generate" | "pricing" | "studio" | "publish";
const STEPS: { id: Step; label: string; icon: typeof Sparkles }[] = [
  { id: "chat", label: "Assistant IA", icon: MessageSquare },
  { id: "generate", label: "Fiche Produit", icon: Package },
  { id: "pricing", label: "Pricing Export", icon: DollarSign },
  { id: "studio", label: "Studio Image", icon: Wand2 },
  { id: "publish", label: "Publication", icon: Globe },
];

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function AgentIA() {
  const { toast } = useToast();
  const [activeStep, setActiveStep] = useState<Step>("chat");

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Bonjour ! Je suis l'Agent IA QDIA Export. Je vous aide à publier vos produits algériens sur le marché international.\n\nComment puis-je vous aider ? Décrivez-moi votre produit (nom, origine, caractéristiques) et je génèrerai une fiche export complète en 3 langues avec les prix Incoterms.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Generate state
  const [genDescription, setGenDescription] = useState("");
  const [genTargetMarket, setGenTargetMarket] = useState("FR");
  const [genCost, setGenCost] = useState("");
  const [genImage, setGenImage] = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [generatedProduct, setGeneratedProduct] = useState<GeneratedProduct | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Pricing state
  const [pricingCost, setPricingCost] = useState("");
  const [pricingQty, setPricingQty] = useState("1000");
  const [pricingUnit, setPricingUnit] = useState("kg");
  const [pricingDest, setPricingDest] = useState("FR");
  const [pricingMargin, setPricingMargin] = useState("15");
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null);

  // Studio state
  const [studioImage, setStudioImage] = useState<string | null>(null);
  const [studioAction, setStudioAction] = useState<"studio_scene" | "white_background" | "enhance">("studio_scene");
  const [studioProductName, setStudioProductName] = useState("");
  const [studioScene, setStudioScene] = useState("");
  const [studioLoading, setStudioLoading] = useState(false);
  const [studioResult, setStudioResult] = useState<string | null>(null);
  const studioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ─── Chat Streaming ──────────────────────────────────────────────────────────
  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    const history = messages.filter(m => m.role !== "assistant" || messages.indexOf(m) > 0);
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);

    let assistantContent = "";
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    try {
      const resp = await fetch(`${BASE}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg, history }),
      });

      if (!resp.ok) throw new Error("Erreur serveur");

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value);
        const lines = text.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) break;
              if (data.content) {
                assistantContent += data.content;
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: assistantContent };
                  return updated;
                });
              }
            } catch { /* skip malformed */ }
          }
        }
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible de contacter l'agent IA.", variant: "destructive" });
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, messages, toast]);

  // ─── Generate Product ────────────────────────────────────────────────────────
  const generateProduct = async () => {
    if (!genDescription.trim()) {
      toast({ title: "Requis", description: "Décrivez votre produit.", variant: "destructive" });
      return;
    }
    setGenLoading(true);
    setGeneratedProduct(null);
    try {
      const resp = await fetch(`${BASE}/api/ai/generate-product`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: genDescription,
          target_market: genTargetMarket || undefined,
          cost_dzd: genCost ? parseFloat(genCost) : undefined,
          image_base64: genImage ?? undefined,
        }),
      });
      if (!resp.ok) throw new Error("Erreur");
      const data = await resp.json();
      setGeneratedProduct(data);
      if (genDescription && !studioProductName) setStudioProductName(data.name_fr);
      toast({ title: "Fiche générée !", description: "Votre fiche produit est prête en 3 langues." });
    } catch {
      toast({ title: "Erreur", description: "Génération échouée. Réessayez.", variant: "destructive" });
    } finally {
      setGenLoading(false);
    }
  };

  // ─── Calculate Pricing ───────────────────────────────────────────────────────
  const calculatePricing = async () => {
    if (!pricingCost || !genDescription) {
      toast({ title: "Requis", description: "Coût de revient et description produit nécessaires.", variant: "destructive" });
      return;
    }
    setPricingLoading(true);
    setPricingResult(null);
    try {
      const resp = await fetch(`${BASE}/api/ai/calculate-pricing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_name: generatedProduct?.name_fr ?? genDescription,
          cost_dzd: parseFloat(pricingCost),
          quantity: parseFloat(pricingQty),
          quantity_unit: pricingUnit,
          destination_country: pricingDest,
          vendor_margin_pct: parseFloat(pricingMargin),
        }),
      });
      if (!resp.ok) throw new Error("Erreur");
      const data = await resp.json();
      setPricingResult(data);
      toast({ title: "Pricing calculé !", description: "Prix EXW/FOB/CFR/CIF prêts." });
    } catch {
      toast({ title: "Erreur", description: "Calcul pricing échoué.", variant: "destructive" });
    } finally {
      setPricingLoading(false);
    }
  };

  // ─── Studio ──────────────────────────────────────────────────────────────────
  const handleStudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setStudioImage((ev.target?.result as string).split(",")[1]);
    reader.readAsDataURL(file);
  };

  const runStudio = async () => {
    if (!studioImage) {
      toast({ title: "Requis", description: "Uploadez une image produit.", variant: "destructive" });
      return;
    }
    setStudioLoading(true);
    setStudioResult(null);
    try {
      const resp = await fetch(`${BASE}/api/ai/studio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: studioImage,
          action: studioAction,
          product_name: studioProductName || undefined,
          scene_description: studioScene || undefined,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Erreur studio");
      }
      const data = await resp.json();
      setStudioResult(data.image_base64);
      toast({ title: "Image traitée !", description: "Studio IA terminé." });
    } catch (e) {
      toast({ title: "Erreur Studio", description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setStudioLoading(false);
    }
  };

  // ─── Image upload for generate ───────────────────────────────────────────────
  const handleGenImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setGenImage((ev.target?.result as string).split(",")[1]);
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      <SupplierSidebar />

      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Header */}
        <header className="border-b bg-card px-6 py-4 flex items-center gap-3 shrink-0">
          <div className="p-2 rounded-lg bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Agent IA QDIA</h1>
            <p className="text-xs text-muted-foreground">Publiez vos produits en quelques minutes grâce à l'intelligence artificielle</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="gap-1 text-green-700 border-green-300 bg-green-50">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
              IA Active
            </Badge>
          </div>
        </header>

        {/* Step Tabs */}
        <div className="border-b bg-card px-6 overflow-x-auto">
          <div className="flex gap-0 min-w-max">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = activeStep === step.id;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  data-testid={`step-tab-${step.id}`}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{i + 1}. {step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 md:p-8 max-w-5xl mx-auto w-full">

          {/* ── STEP 1: CHAT ── */}
          {activeStep === "chat" && (
            <div className="flex flex-col h-[calc(100vh-220px)] min-h-[500px]">
              <div className="mb-4">
                <h2 className="text-xl font-bold mb-1">Assistant IA</h2>
                <p className="text-sm text-muted-foreground">Décrivez votre produit, l'agent IA vous guidera vers la publication.</p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
                {messages.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-muted text-foreground rounded-tl-none"}`}>
                      {msg.content || (msg.role === "assistant" && chatLoading && i === messages.length - 1
                        ? <span className="flex gap-1 items-center"><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce" /><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.15s]" /><span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0.3s]" /></span>
                        : msg.content)}
                    </div>
                    {msg.role === "user" && (
                      <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5 text-primary-foreground text-xs font-bold">
                        P
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-2 mb-3">
                {[
                  "Génère une fiche pour mon huile d'olive de Béjaïa",
                  "Calcule le prix FOB pour mes dattes Deglet Nour",
                  "Quelles certifications pour exporter vers l'UE ?",
                  "Aide-moi à rédiger la description en anglais",
                ].map(s => (
                  <button key={s} onClick={() => setChatInput(s)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border bg-card hover:bg-muted transition-colors text-muted-foreground">
                    {s}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Textarea
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                  placeholder="Décrivez votre produit ou posez une question à l'agent IA..."
                  className="resize-none min-h-[52px] max-h-[120px]"
                  data-testid="input-chat"
                  rows={2}
                />
                <Button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} className="shrink-0 h-[52px] w-[52px] p-0" data-testid="button-send-chat">
                  {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={() => setActiveStep("generate")} className="gap-2" data-testid="button-next-generate">
                  Générer la fiche produit <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── STEP 2: GENERATE ── */}
          {activeStep === "generate" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-1">Génération de Fiche Produit</h2>
                <p className="text-sm text-muted-foreground">L'IA génère le titre, la description (FR/EN/AR), la catégorie, les specs et les tags SEO.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Input panel */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Description du produit *</label>
                    <Textarea
                      value={genDescription}
                      onChange={e => setGenDescription(e.target.value)}
                      placeholder="Ex: Huile d'olive extra vierge première pression à froid, wilaya de Béjaïa, acidité < 0.8%, bouteilles en verre 750ml ou bidons 5L..."
                      rows={4}
                      data-testid="input-gen-description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Marché cible</label>
                      <select value={genTargetMarket} onChange={e => setGenTargetMarket(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        data-testid="select-gen-market">
                        {[["FR", "France"], ["DE", "Allemagne"], ["US", "États-Unis"], ["UK", "Royaume-Uni"], ["ES", "Espagne"], ["CA", "Canada"], ["AE", "Émirats"]].map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Coût revient (DZD/unité)</label>
                      <Input value={genCost} onChange={e => setGenCost(e.target.value)} placeholder="Ex: 450" type="number" data-testid="input-gen-cost" />
                    </div>
                  </div>

                  {/* Image upload */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Photo produit (optionnel — améliore la précision)</label>
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleGenImageUpload} />
                    {genImage ? (
                      <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden">
                        <img src={`data:image/jpeg;base64,${genImage}`} alt="Product" className="w-full h-full object-contain" />
                        <button onClick={() => setGenImage(null)} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => imageInputRef.current?.click()}
                        className="w-full h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                        data-testid="button-upload-image">
                        <ImagePlus className="h-5 w-5" />
                        Cliquez pour uploader une photo
                      </button>
                    )}
                  </div>

                  <Button onClick={generateProduct} disabled={genLoading} className="w-full gap-2" data-testid="button-generate-product">
                    {genLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Génération en cours...</> : <><Sparkles className="h-4 w-4" /> Générer la fiche IA</>}
                  </Button>
                </div>

                {/* Result panel */}
                <div className="bg-muted/40 border rounded-xl p-5 min-h-[400px]">
                  {genLoading && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-primary font-medium mb-4">
                        <Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours avec GPT-4o Vision...
                      </div>
                      {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}
                    </div>
                  )}

                  {!genLoading && !generatedProduct && (
                    <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
                      <Sparkles className="h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium">La fiche générée apparaîtra ici</p>
                      <p className="text-xs mt-1">Titre, description en 3 langues, catégorie, specs, certifications</p>
                    </div>
                  )}

                  {generatedProduct && (
                    <div className="space-y-4 text-sm">
                      <div className="flex items-center gap-2 text-green-700 font-semibold">
                        <CheckCircle2 className="h-4 w-4" /> Fiche générée avec succès
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-base">{generatedProduct.name_fr}</div>
                        <div className="text-muted-foreground text-xs">{generatedProduct.name_en} · {generatedProduct.name_ar}</div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="gap-1"><Tag className="h-3 w-3" />{generatedProduct.category}</Badge>
                        <Badge variant="outline" className="gap-1"><Anchor className="h-3 w-3" />{generatedProduct.suggested_port}</Badge>
                        <Badge variant="outline" className="gap-1"><Boxes className="h-3 w-3" />MOQ: {generatedProduct.suggested_moq} {generatedProduct.suggested_moq_unit}</Badge>
                      </div>

                      <div>
                        <p className="font-medium mb-1 flex items-center gap-1"><Languages className="h-3.5 w-3.5" /> Description FR</p>
                        <p className="text-muted-foreground text-xs leading-relaxed line-clamp-4">{generatedProduct.description_fr}</p>
                      </div>

                      {Object.keys(generatedProduct.specs).length > 0 && (
                        <div>
                          <p className="font-medium mb-1.5">Spécifications</p>
                          <div className="grid grid-cols-2 gap-1">
                            {Object.entries(generatedProduct.specs).map(([k, v]) => (
                              <div key={k} className="text-xs"><span className="text-muted-foreground">{k}:</span> {v}</div>
                            ))}
                          </div>
                        </div>
                      )}

                      {generatedProduct.certifications.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {generatedProduct.certifications.map(c => (
                            <Badge key={c} variant="outline" className="text-xs gap-1"><CheckCircle2 className="h-3 w-3 text-green-600" />{c}</Badge>
                          ))}
                        </div>
                      )}

                      {generatedProduct.compliance_alerts.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                          <p className="font-medium text-amber-800 text-xs mb-1 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Alertes conformité</p>
                          {generatedProduct.compliance_alerts.map((a, i) => (
                            <p key={i} className="text-xs text-amber-700">{a}</p>
                          ))}
                        </div>
                      )}

                      <div className="pt-2 flex justify-end">
                        <Button size="sm" onClick={() => setActiveStep("pricing")} className="gap-1">
                          Calculer le pricing <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: PRICING ── */}
          {activeStep === "pricing" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-1">Calcul Pricing Export</h2>
                <p className="text-sm text-muted-foreground">Calculez vos prix EXW → FOB → CFR → CIF avec benchmark IA de marché.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Inputs */}
                <div className="space-y-4">
                  <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground border">
                    <p className="font-medium text-foreground mb-1">Produit</p>
                    <p>{generatedProduct?.name_fr ?? genDescription ?? "Non défini — retournez à l'étape 2"}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Coût de revient (DZD/unité) *</label>
                      <Input value={pricingCost} onChange={e => setPricingCost(e.target.value)} placeholder="Ex: 450" type="number" data-testid="input-pricing-cost" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Quantité</label>
                      <Input value={pricingQty} onChange={e => setPricingQty(e.target.value)} placeholder="1000" type="number" data-testid="input-pricing-qty" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Unité</label>
                      <select value={pricingUnit} onChange={e => setPricingUnit(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        {["kg", "tons", "liters", "units"].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Destination</label>
                      <select value={pricingDest} onChange={e => setPricingDest(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        data-testid="select-pricing-dest">
                        {[["FR", "France"], ["DE", "Allemagne"], ["US", "États-Unis"], ["UK", "Royaume-Uni"], ["ES", "Espagne"], ["CA", "Canada"], ["AE", "Émirats"]].map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium mb-1.5 block">Marge vendeur (%)</label>
                      <Input value={pricingMargin} onChange={e => setPricingMargin(e.target.value)} placeholder="15" type="number" data-testid="input-pricing-margin" />
                    </div>
                  </div>

                  <Button onClick={calculatePricing} disabled={pricingLoading || !pricingCost} className="w-full gap-2" data-testid="button-calculate-pricing">
                    {pricingLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Calcul en cours...</> : <><DollarSign className="h-4 w-4" /> Calculer EXW/FOB/CFR/CIF</>}
                  </Button>
                </div>

                {/* Result */}
                <div className="space-y-4">
                  {pricingLoading && (
                    <div className="bg-muted/40 border rounded-xl p-5 space-y-3">
                      <div className="flex items-center gap-2 text-sm text-primary font-medium">
                        <Loader2 className="h-4 w-4 animate-spin" /> Calcul Incoterms + analyse IA marché...
                      </div>
                      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  )}

                  {pricingResult && (
                    <div className="space-y-4">
                      {/* Incoterms table */}
                      <div className="rounded-xl border overflow-hidden">
                        <div className="bg-primary px-4 py-2.5 text-primary-foreground text-xs font-semibold uppercase tracking-wide">
                          Prix indicatifs par Incoterm (USD / {pricingUnit})
                        </div>
                        <div className="grid grid-cols-4 divide-x">
                          {[
                            { label: "EXW", usd: pricingResult.exw_usd, eur: pricingResult.exw_eur, desc: "Sortie usine" },
                            { label: "FOB", usd: pricingResult.fob_usd, eur: pricingResult.fob_eur, desc: "Port Algérie" },
                            { label: "CFR", usd: pricingResult.cfr_usd, eur: null, desc: "Port dest." },
                            { label: "CIF", usd: pricingResult.cif_usd, eur: null, desc: "Avec assurance" },
                          ].map(({ label, usd, eur, desc }) => (
                            <div key={label} className="p-3 text-center bg-card">
                              <div className="text-xs font-semibold text-muted-foreground mb-0.5">{label}</div>
                              <div className="text-lg font-bold text-primary">${usd}</div>
                              {eur && <div className="text-xs text-muted-foreground">€{eur}</div>}
                              <div className="text-[10px] text-muted-foreground mt-0.5">{desc}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Breakdown */}
                      <div className="bg-muted/30 rounded-lg border p-4">
                        <p className="text-xs font-semibold mb-2.5 text-muted-foreground uppercase">Détail des coûts (DZD)</p>
                        <div className="space-y-1">
                          {Object.entries(pricingResult.breakdown).map(([k, v]) => (
                            <div key={k} className="flex justify-between text-xs">
                              <span className="text-muted-foreground">{k}</span>
                              <span className="font-medium">{typeof v === "number" && v < 100 ? `${v}%` : v.toLocaleString()}</span>
                            </div>
                          ))}
                          <div className="pt-1 text-[10px] text-muted-foreground">Taux: 1 DZD = {pricingResult.exchange_rate_dzd_usd} USD</div>
                        </div>
                      </div>

                      {/* AI Benchmark */}
                      {pricingResult.market_benchmark && (
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                          <p className="text-xs font-semibold text-primary mb-1.5 flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5" /> Analyse IA du marché
                          </p>
                          <p className="text-xs leading-relaxed text-muted-foreground">{pricingResult.market_benchmark}</p>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button size="sm" onClick={() => setActiveStep("studio")} className="gap-1">
                          Studio Image <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {!pricingLoading && !pricingResult && (
                    <div className="bg-muted/40 border rounded-xl p-8 flex flex-col items-center justify-center text-center text-muted-foreground min-h-[200px]">
                      <DollarSign className="h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium">Les prix Incoterms apparaîtront ici</p>
                      <p className="text-xs mt-1">EXW → FOB → CFR → CIF calculés automatiquement</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: STUDIO ── */}
          {activeStep === "studio" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold mb-1">Studio Image IA</h2>
                <p className="text-sm text-muted-foreground">Transformez vos photos amateurs en visuels professionnels pour le catalogue export.</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Left: controls */}
                <div className="space-y-4">
                  {/* Action selector */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Type de traitement IA</label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: "studio_scene" as const, label: "Scène Studio IA", desc: "Génère un décor professionnel adapté au produit", icon: Sparkles },
                        { id: "white_background" as const, label: "Fond Blanc Pro", desc: "Fond blanc pur, ombre légère — style catalogue", icon: RefreshCw },
                        { id: "enhance" as const, label: "Amélioration Photo", desc: "Lumière, netteté et qualité professionnelle", icon: Wand2 },
                      ].map(({ id, label, desc, icon: Icon }) => (
                        <button key={id} onClick={() => setStudioAction(id)}
                          data-testid={`button-studio-${id}`}
                          className={`flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-all ${studioAction === id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border hover:border-primary/50 text-muted-foreground"}`}>
                          <Icon className="h-4 w-4 shrink-0" />
                          <div>
                            <div className="text-sm font-medium text-foreground">{label}</div>
                            <div className="text-xs text-muted-foreground">{desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Nom du produit</label>
                    <Input value={studioProductName} onChange={e => setStudioProductName(e.target.value)} placeholder="Ex: Huile d'olive extra vierge" data-testid="input-studio-product" />
                  </div>

                  {studioAction === "studio_scene" && (
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Description de scène (optionnel)</label>
                      <Textarea value={studioScene} onChange={e => setStudioScene(e.target.value)}
                        placeholder="Ex: Cuisine méditerranéenne ensoleillée, olives fraîches en arrière-plan..." rows={2} />
                    </div>
                  )}

                  {/* Upload */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Photo produit *</label>
                    <input ref={studioInputRef} type="file" accept="image/*" className="hidden" onChange={handleStudioUpload} />
                    {studioImage ? (
                      <div className="relative w-full h-40 bg-muted rounded-lg overflow-hidden">
                        <img src={`data:image/jpeg;base64,${studioImage}`} alt="Upload" className="w-full h-full object-contain" />
                        <button onClick={() => { setStudioImage(null); setStudioResult(null); }}
                          className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1">
                          <X className="h-3 w-3" />
                        </button>
                        <Badge className="absolute bottom-2 left-2 text-[10px]">Original</Badge>
                      </div>
                    ) : (
                      <button onClick={() => studioInputRef.current?.click()}
                        className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                        data-testid="button-studio-upload">
                        <Upload className="h-5 w-5" />
                        Glissez votre photo ou cliquez pour uploader
                        <span className="text-xs">JPG, PNG, WebP — max 10MB</span>
                      </button>
                    )}
                  </div>

                  <Button onClick={runStudio} disabled={studioLoading || !studioImage} className="w-full gap-2" data-testid="button-run-studio">
                    {studioLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> Traitement IA en cours...</> : <><Wand2 className="h-4 w-4" /> Lancer le Studio IA</>}
                  </Button>
                </div>

                {/* Right: result */}
                <div className="space-y-4">
                  {studioLoading && (
                    <div className="bg-muted/40 border rounded-xl overflow-hidden">
                      <div className="p-4 border-b flex items-center gap-2 text-sm text-primary font-medium">
                        <Loader2 className="h-4 w-4 animate-spin" /> Génération image IA en cours (30-60s)...
                      </div>
                      <div className="p-4">
                        <Skeleton className="w-full aspect-square rounded-lg" />
                      </div>
                    </div>
                  )}

                  {studioResult && !studioLoading && (
                    <div className="bg-muted/40 border rounded-xl overflow-hidden">
                      <div className="p-3 border-b flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                          <CheckCircle2 className="h-4 w-4" /> Image traitée
                        </div>
                        <a href={`data:image/png;base64,${studioResult}`} download="qdia-product.png">
                          <Button size="sm" variant="outline" className="gap-1 text-xs">
                            <Upload className="h-3 w-3" /> Télécharger
                          </Button>
                        </a>
                      </div>
                      <div className="p-4">
                        <img src={`data:image/png;base64,${studioResult}`} alt="Studio Result" className="w-full rounded-lg object-contain" />
                        <div className="mt-2 flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                          <ShieldCheck className="h-3 w-3" /> QDIA VERIFIED ASSET
                        </div>
                      </div>
                    </div>
                  )}

                  {!studioLoading && !studioResult && (
                    <div className="bg-muted/40 border rounded-xl aspect-square flex flex-col items-center justify-center text-center text-muted-foreground">
                      <Wand2 className="h-12 w-12 mb-3 opacity-20" />
                      <p className="font-medium">L'image traitée apparaîtra ici</p>
                      <p className="text-xs mt-1">Scène studio professionnelle générée par l'IA</p>
                    </div>
                  )}
                </div>
              </div>

              {studioResult && (
                <div className="flex justify-end">
                  <Button onClick={() => setActiveStep("publish")} className="gap-2">
                    Publier le produit <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 5: PUBLISH ── */}
          {activeStep === "publish" && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div className="text-center">
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Prêt pour publication</h2>
                <p className="text-muted-foreground text-sm">Votre produit a été traité par l'agent IA. Vérifiez le récapitulatif et publiez-le.</p>
              </div>

              <div className="bg-card border rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Récapitulatif</h3>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${generatedProduct ? "bg-green-100" : "bg-muted"}`}>
                      {generatedProduct ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <span className="text-xs text-muted-foreground">1</span>}
                    </div>
                    <div>
                      <div className="font-medium">Fiche produit</div>
                      {generatedProduct ? (
                        <div className="text-muted-foreground text-xs">{generatedProduct.name_fr} · {generatedProduct.category}</div>
                      ) : <div className="text-xs text-amber-600">Non générée — retournez à l'étape 2</div>}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${pricingResult ? "bg-green-100" : "bg-muted"}`}>
                      {pricingResult ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <span className="text-xs text-muted-foreground">2</span>}
                    </div>
                    <div>
                      <div className="font-medium">Prix export</div>
                      {pricingResult ? (
                        <div className="text-muted-foreground text-xs">FOB ${pricingResult.fob_usd} · CIF ${pricingResult.cif_usd} / {pricingUnit}</div>
                      ) : <div className="text-xs text-amber-600">Non calculé — retournez à l'étape 3</div>}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${studioResult ? "bg-green-100" : "bg-amber-100"}`}>
                      {studioResult ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <AlertTriangle className="h-3 w-3 text-amber-600" />}
                    </div>
                    <div>
                      <div className="font-medium">Image studio</div>
                      <div className="text-xs text-muted-foreground">{studioResult ? "Image traitée et prête" : "Optionnel — vous pouvez publier sans"}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setActiveStep("generate")}>
                  Modifier la fiche
                </Button>
                <Button className="flex-1 gap-2" disabled={!generatedProduct} data-testid="button-publish"
                  onClick={() => toast({ title: "Produit soumis !", description: "En attente de validation par l'équipe QDIA (24-48h)." })}>
                  <Globe className="h-4 w-4" /> Soumettre pour validation
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Après validation par l'équipe QDIA, votre produit sera visible sur le portail acheteur international.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
