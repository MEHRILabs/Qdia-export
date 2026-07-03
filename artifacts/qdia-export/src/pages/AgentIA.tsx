import { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "wouter";
import { SupplierSidebar } from "@/components/SupplierSidebar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAgentSession } from "@/hooks/useAgentSession";
import { useI18n } from "@/contexts/I18nContext";
import { StudioCanvas } from "@/components/StudioCanvas";
import { PricingExplanation } from "@/components/PricingExplanation";
import { AI_CREDIT_COSTS } from "@/lib/ai-credits";
import { apiUrl } from "@/lib/api-base";
import { authJsonHeaders, getAuthToken } from "@/lib/api-auth";
import {
  MessageSquare, Package, Sparkles, Send, ImagePlus, ChevronRight,
  Loader2, CheckCircle2, AlertTriangle, RefreshCw,
  Tag, Globe, Boxes, Anchor, DollarSign, Languages,
  Wand2, Upload, X, ShieldCheck,
} from "lucide-react";

function parseUploadedImage(dataUrl: string): { base64: string; mime: string } {
  const match = dataUrl.match(/^data:(image\/[\w+.-]+);base64,(.+)$/s);
  if (match) return { mime: match[1], base64: match[2] };
  return { mime: "image/jpeg", base64: dataUrl.split(",")[1] ?? dataUrl };
}

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
  exw_dzd: number; fob_dzd: number; cfr_dzd: number; cif_dzd: number;
  exw_usd: number; fob_usd: number; cfr_usd: number; cif_usd: number;
  exw_eur: number; fob_eur: number; cfr_eur?: number; cif_eur?: number;
  exw_aed: number; fob_aed: number; cfr_aed?: number; cif_aed?: number;
  exchange_rate_dzd_usd: number;
  exchange_rate_dzd_eur?: number;
  exchange_rate_dzd_aed?: number;
  breakdown: Record<string, number>;
  market_benchmark: string | null;
  price_range_note: string | null;
  pricing_sources?: Record<string, string>;
}

// ─── STEP INDICATOR ───────────────────────────────────────────────────────────
type Step = "chat" | "generate" | "pricing" | "studio" | "publish";

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function AgentIA() {
  const { toast } = useToast();
  const { tr } = useI18n();
  const { sessionId, session, loading: sessionLoading, reset: resetSession, markComplete, refresh } = useAgentSession();
  const [activeStep, setActiveStep] = useState<Step>("chat");

  const STEPS = [
    { id: "chat" as const, label: tr("agent.step_assistant"), icon: MessageSquare },
    { id: "generate" as const, label: tr("agent.step_product_sheet"), icon: Package },
    { id: "pricing" as const, label: tr("agent.step_pricing_export"), icon: DollarSign },
    { id: "studio" as const, label: tr("agent.step_studio_image"), icon: Wand2 },
    { id: "publish" as const, label: tr("agent.step_publication"), icon: Globe },
  ];

  const SUGGESTIONS = [
    tr("agent.suggestion_1"),
    tr("agent.suggestion_2"),
    tr("agent.suggestion_3"),
    tr("agent.suggestion_4"),
  ];

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: tr("agent.welcome"),
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
  const [genImageMime, setGenImageMime] = useState("image/jpeg");
  const [genLoading, setGenLoading] = useState(false);
  const [generatedProduct, setGeneratedProduct] = useState<GeneratedProduct | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Pricing state
  const [pricingCost, setPricingCost] = useState("");
  const [pricingQty, setPricingQty] = useState("1000");
  const [pricingUnit, setPricingUnit] = useState("kg");
  const [pricingDest, setPricingDest] = useState("FR");
  const [pricingMargin, setPricingMargin] = useState("15");
  const [pricingPackaging, setPricingPackaging] = useState("0");
  const [pricingPackagingSecondary, setPricingPackagingSecondary] = useState("");
  const [pricingPackagingSecondaryCost, setPricingPackagingSecondaryCost] = useState("0");
  const [pricingTransport, setPricingTransport] = useState("0");
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null);

  // Publish state
  const [publishLoading, setPublishLoading] = useState(false);
  const [publishedId, setPublishedId] = useState<number | null>(null);

  // Studio state
  const [studioImage, setStudioImage] = useState<string | null>(null);
  const [studioImageMime, setStudioImageMime] = useState("image/jpeg");
  const [studioAction, setStudioAction] = useState<"remove_background" | "studio_scene" | "white_background" | "enhance">("remove_background");
  const [studioProductName, setStudioProductName] = useState("");
  const [studioScene, setStudioScene] = useState("");
  const [studioLoading, setStudioLoading] = useState(false);
  const [studioResult, setStudioResult] = useState<string | null>(null);
  const studioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (activeStep === "pricing" && genCost && !pricingCost) {
      setPricingCost(genCost);
    }
  }, [activeStep, genCost, pricingCost]);

  useEffect(() => {
    if (activeStep === "studio" && genImage && !studioImage) {
      setStudioImage(genImage);
    }
  }, [activeStep, genImage, studioImage]);

  const resetForNewProduct = useCallback(async () => {
    await resetSession();
    setActiveStep("chat");
    setPublishedId(null);
    setGeneratedProduct(null);
    setGenDescription("");
    setGenCost("");
    setGenImage(null);
    setPricingResult(null);
    setStudioResult(null);
    setStudioImage(null);
    setChatInput("");
    setMessages([{
      role: "assistant",
      content: tr("agent.welcome_new"),
    }]);
  }, [resetSession, tr]);

  useEffect(() => {
    if (!session || sessionLoading) return;
    const ext = session.extracted_data as Record<string, unknown>;
    if (ext.product_name && typeof ext.product_name === "string") setGenDescription(ext.product_name);
    if (ext.cost_dzd) setGenCost(String(ext.cost_dzd));
    if (ext.target_market && typeof ext.target_market === "string") setGenTargetMarket(ext.target_market);
    if (session.generated_product) setGeneratedProduct(session.generated_product as unknown as GeneratedProduct);
    if (session.pricing_result) setPricingResult(session.pricing_result as unknown as PricingResult);
    if (session.studio_images?.length) {
      const last = session.studio_images[session.studio_images.length - 1];
      setStudioResult(last.image_base64);
    }
    if (session.chat_history?.length) {
      setMessages([
        { role: "assistant", content: tr("agent.welcome_continue") },
        ...session.chat_history,
      ]);
    }
    if (session.current_step && session.current_step !== "chat") {
      setActiveStep(session.current_step as Step);
    }
  }, [session?.id, sessionLoading]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("new") === "1") {
      resetForNewProduct();
      window.history.replaceState({}, "", `${import.meta.env.BASE_URL.replace(/\/$/, "")}/agent-ia`);
    }
  }, [resetForNewProduct]);

  const handleSuggestion = (text: string, generateSheet?: boolean) => {
    if (generateSheet) {
      setGenDescription(text.replace(/^Génère une fiche pour /, ""));
      setActiveStep("generate");
      return;
    }
    setChatInput(text);
  };

  const goToGenerate = () => {
    const lastUser = [...messages].reverse().find(m => m.role === "user");
    if (lastUser && !genDescription) setGenDescription(lastUser.content);
    setActiveStep("generate");
  };

  // ─── Chat Streaming ──────────────────────────────────────────────────────────
  const sendChat = useCallback(async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setChatLoading(true);

    let assistantContent = "";
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    try {
      const resp = await fetch(apiUrl("/api/ai/chat"), {
        method: "POST",
        headers: authJsonHeaders(),
        body: JSON.stringify({ message: userMsg, session_id: sessionId }),
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
              if (data.done) {
                if (data.suggested_step === "product") setActiveStep("generate");
                else if (data.suggested_step === "pricing") setActiveStep("pricing");
                else if (data.suggested_step === "image") setActiveStep("studio");
                if (data.extracted?.product_name && !genDescription) setGenDescription(data.extracted.product_name);
                if (data.extracted?.cost_dzd && !genCost) setGenCost(String(data.extracted.cost_dzd));
                if (sessionId) refresh(sessionId);
                break;
              }
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
      toast({ title: tr("common.error"), variant: "destructive" });
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, messages, toast, sessionId, genDescription, genCost, refresh]);

  // ─── Generate Product ────────────────────────────────────────────────────────
  const generateProduct = async () => {
    if (!genDescription.trim()) {
      toast({ title: tr("common.required"), description: tr("agent.describe_label"), variant: "destructive" });
      return;
    }
    setGenLoading(true);
    setGeneratedProduct(null);
    try {
      const cost = genCost ? parseFloat(genCost) : undefined;
      const resp = await fetch(apiUrl("/api/ai/generate-product"), {
        method: "POST",
        headers: authJsonHeaders(),
        body: JSON.stringify({
          description: genDescription,
          target_market: genTargetMarket || undefined,
          cost_dzd: cost != null && Number.isFinite(cost) ? cost : undefined,
          image_base64: genImage ?? undefined,
          session_id: sessionId,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error((data as { error?: string }).error ?? "Erreur génération");
      setGeneratedProduct(data);
      if (genDescription && !studioProductName) setStudioProductName(data.name_fr);
      if (data._fallback) {
        toast({
          title: "Fiche générée (mode secours)",
          description: data._fallback_reason ?? "Quota IA épuisé — fiche basique créée. Rechargez OpenAI/Gemini.",
          variant: "destructive",
        });
      } else {
        toast({ title: tr("agent.sheet_success") });
      }
    } catch (e) {
      toast({
        title: tr("common.error"),
        description: e instanceof Error ? e.message : tr("agent.generate_first"),
        variant: "destructive",
      });
    } finally {
      setGenLoading(false);
    }
  };

  // ─── Calculate Pricing ───────────────────────────────────────────────────────
  const calculatePricing = async () => {
    if (!pricingCost || (!genDescription && !generatedProduct)) {
      toast({ title: tr("common.required"), description: tr("agent.cost_required"), variant: "destructive" });
      return;
    }
    setPricingLoading(true);
    setPricingResult(null);
    try {
      const resp = await fetch(apiUrl("/api/ai/calculate-pricing"), {
        method: "POST",
        headers: authJsonHeaders(),
        body: JSON.stringify({
          product_name: generatedProduct?.name_fr ?? genDescription,
          cost_dzd: parseFloat(pricingCost),
          quantity: parseFloat(pricingQty),
          quantity_unit: pricingUnit,
          destination_country: pricingDest,
          vendor_margin_pct: parseFloat(pricingMargin),
          packaging_cost_dzd: (parseFloat(pricingPackaging) || 0) + (parseFloat(pricingPackagingSecondaryCost) || 0),
          local_transport_dzd: parseFloat(pricingTransport) || 0,
          session_id: sessionId,
        }),
      });
      if (!resp.ok) throw new Error("Erreur");
      const data = await resp.json();
      setPricingResult(data);
      toast({ title: tr("agent.calculate_btn") });
    } catch {
      toast({ title: tr("common.error"), description: tr("agent.pricing_placeholder"), variant: "destructive" });
    } finally {
      setPricingLoading(false);
    }
  };

  // ─── Studio ──────────────────────────────────────────────────────────────────
  const handleStudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseUploadedImage(ev.target?.result as string);
      setStudioImage(parsed.base64);
      setStudioImageMime(parsed.mime);
    };
    reader.readAsDataURL(file);
  };

  const runStudio = async () => {
    if (!studioImage) {
      toast({ title: tr("common.required"), description: tr("agent.product_photo_required"), variant: "destructive" });
      return;
    }
    setStudioLoading(true);
    setStudioResult(null);
    try {
      const resp = await fetch(apiUrl("/api/ai/studio"), {
        method: "POST",
        headers: authJsonHeaders(),
        body: JSON.stringify({
          image_base64: studioImage,
          action: studioAction,
          product_name: studioProductName || undefined,
          scene_description: studioScene || undefined,
          session_id: sessionId,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? tr("studio_page.error_studio"));
      }
      const data = await resp.json();
      setStudioResult(data.image_base64);
      toast({ title: tr("studio_page.done"), description: tr("studio.processed_success") });
    } catch (e) {
      toast({ title: tr("studio_page.error_studio"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setStudioLoading(false);
    }
  };

  // ─── Publish Product ───────────────────────────────────────────────────────
  const publishProduct = async () => {
    if (!generatedProduct) {
      toast({ title: tr("common.required"), description: tr("agent.generate_first"), variant: "destructive" });
      return;
    }
    setPublishLoading(true);
    try {
      const specs = generatedProduct.specs;
      const resp = await fetch(apiUrl("/api/products"), {
        method: "POST",
        headers: authJsonHeaders(),
        body: JSON.stringify({
          name: generatedProduct.name_fr,
          description: [
            generatedProduct.description_fr,
            generatedProduct.description_en && `EN: ${generatedProduct.description_en}`,
            generatedProduct.description_ar && `AR: ${generatedProduct.description_ar}`,
            generatedProduct.seo_tags?.length ? `SEO: ${generatedProduct.seo_tags.join(", ")}` : "",
          ].filter(Boolean).join("\n\n"),
          category: generatedProduct.category,
          moq: generatedProduct.suggested_moq,
          moq_unit: generatedProduct.suggested_moq_unit,
          port_depart: generatedProduct.suggested_port,
          origin_wilaya: specs["Origine"] ?? specs["origine"] ?? undefined,
          certifications: generatedProduct.certifications,
          packaging: [
            specs["Conditionnement"] ?? specs["conditionnement"],
            specs["Emballage secondaire"] ?? pricingPackagingSecondary,
          ].filter(Boolean).join(" · ") || undefined,
          processing: specs["Normes"] ?? specs["normes"] ?? undefined,
          prices: {
            exw: pricingResult?.exw_usd ?? 0,
            fob: pricingResult?.fob_usd ?? 0,
            cfr: pricingResult?.cfr_usd ?? 0,
            cif: pricingResult?.cif_usd ?? 0,
            currency: "USD",
            unit: `per ${pricingUnit}`,
          },
          target_markets: [genTargetMarket],
          export_status: "pending",
          image_url: studioResult ? `data:image/png;base64,${studioResult}` : genImage ? `data:${genImageMime};base64,${genImage}` : undefined,
          images: studioResult ? [`data:image/png;base64,${studioResult}`] : [],
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "Erreur publication");
      }
      const data = await resp.json();
      setPublishedId(data.id);
      if (sessionId) await markComplete(data.id);
      toast({
        title: tr("agent.publish_success_title"),
        description: tr("agent.publish_pending").replace("{id}", String(data.id)),
      });
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setPublishLoading(false);
    }
  };

  // ─── Image upload for generate ───────────────────────────────────────────────
  const handleGenImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const parsed = parseUploadedImage(ev.target?.result as string);
      setGenImage(parsed.base64);
      setGenImageMime(parsed.mime);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen qdia-producer-page flex flex-col md:flex-row">
      <SupplierSidebar activePath="/agent-ia" />

      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Header */}
        <header className="border-b bg-white px-6 py-4 flex items-center gap-3 shrink-0 shadow-sm">
          <div className="p-2 rounded-lg bg-[#E8F2FB]">
            <Sparkles className="h-5 w-5 text-[#0461A5]" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#1A1A2E]">{tr("agent.header_title")}</h1>
            <p className="text-xs text-[#656566]">{tr("agent.header_subtitle")}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="success" className="gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-white inline-block animate-pulse" />
              {tr("agent.ia_active")}
            </Badge>
          </div>
        </header>

        {/* Step Tabs — stepper QDIA */}
        <div className="border-b bg-white px-6 overflow-x-auto shadow-sm">
          <div className="flex gap-2 min-w-max py-3">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = activeStep === step.id;
              const stepIndex = STEPS.findIndex(s => s.id === activeStep);
              const isDone = i < stepIndex;
              return (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(step.id)}
                  data-testid={`step-tab-${step.id}`}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap ${isActive
                    ? "bg-[#0461A5] text-white shadow-md"
                    : isDone
                      ? "bg-[#04BB7B] text-white"
                      : "bg-[#E5E7EB] text-[#9CA3AF] hover:bg-[#E8F2FB]"}`}
                >
                  <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${isActive ? "bg-white/20" : isDone ? "bg-white/20" : "bg-white"}`}>
                    {isDone ? "✓" : i + 1}
                  </span>
                  <Icon className="h-3.5 w-3.5 hidden sm:block" />
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 md:p-8 max-w-5xl mx-auto w-full">

          {/* ── STEP 1: CHAT ── */}
          {activeStep === "chat" && (
            <div className="flex flex-col h-[calc(100vh-220px)] min-h-[500px] qdia-card overflow-hidden">
              <div className="qdia-chat-header flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span className="font-semibold text-sm">{tr("agent.assistant_header")}</span>
              </div>
              <div className="p-4 flex flex-col flex-1">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-[#1A1A2E] mb-1">{tr("agent.step_assistant")}</h2>
                <p className="text-sm text-[#656566]">{tr("agent.chat_subtitle")}</p>
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
                    <div className={`max-w-[75%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user"
                      ? "qdia-chat-user"
                      : "qdia-chat-ai"}`}>
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
                {SUGGESTIONS.map((s, i) => (
                  <button key={s} onClick={() => handleSuggestion(s, i === 0)} className="qdia-chip">
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
                  placeholder={tr("agent.chat_placeholder")}
                  className="resize-none min-h-[52px] max-h-[120px]"
                  data-testid="input-chat"
                  rows={2}
                />
                <Button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} className="shrink-0 h-[52px] w-[52px] p-0" data-testid="button-send-chat">
                  {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>

              <div className="mt-4 flex justify-end">
                <Button onClick={goToGenerate} variant="ai" className="gap-2" data-testid="button-next-generate">
                  {tr("agent.generate_sheet_btn")} <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: GENERATE ── */}
          {activeStep === "generate" && (
            <div className="space-y-6 qdia-card p-6">
              <div>
                <h2 className="text-xl font-bold mb-1">{tr("agent.generate_title")}</h2>
                <p className="text-sm text-muted-foreground">{tr("agent.generate_subtitle")}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Input panel */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">{tr("agent.product_description")}</label>
                    <Textarea
                      value={genDescription}
                      onChange={e => setGenDescription(e.target.value)}
                      placeholder={tr("agent.describe_hint")}
                      rows={4}
                      data-testid="input-gen-description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{tr("agent.target_market")}</label>
                      <select value={genTargetMarket} onChange={e => setGenTargetMarket(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        data-testid="select-gen-market">
                        {[["FR", "France"], ["DE", "Allemagne"], ["US", "États-Unis"], ["UK", "Royaume-Uni"], ["ES", "Espagne"], ["CA", "Canada"], ["AE", "Émirats"]].map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{tr("agent.cost_dzd")}</label>
                      <Input value={genCost} onChange={e => setGenCost(e.target.value)} placeholder="Ex: 450" type="number" data-testid="input-gen-cost" />
                    </div>
                  </div>

                  {/* Image upload */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">{tr("agent.product_photo_opt")}</label>
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleGenImageUpload} />
                    {genImage ? (
                      <div className="relative w-full h-32 bg-muted rounded-lg overflow-hidden">
                        <img src={`data:${genImageMime};base64,${genImage}`} alt="Product" className="w-full h-full object-contain" />
                        <button onClick={() => { setGenImage(null); setGenImageMime("image/jpeg"); }} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => imageInputRef.current?.click()}
                        className="w-full h-24 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                        data-testid="button-upload-image">
                        <ImagePlus className="h-5 w-5" />
                        {tr("agent.upload_photo_click")}
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-[#0461A5] font-semibold mb-2">
                    {tr("agent.credits_cost_sheet").replace("{n}", String(AI_CREDIT_COSTS.product_sheet_3lang))}
                  </p>
                  <p className="text-[11px] text-muted-foreground mb-3">{tr("agent.credits_info")}</p>

                  <Button onClick={generateProduct} disabled={genLoading} className="w-full gap-2" data-testid="button-generate-product">
                    {genLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> {tr("agent.generating")}</> : <><Sparkles className="h-4 w-4" /> {tr("agent.generate_btn")}</>}
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
                      <p className="font-medium">{tr("agent.sheet_placeholder")}</p>
                      <p className="text-xs mt-1">{tr("agent.sheet_placeholder_hint")}</p>
                    </div>
                  )}

                  {generatedProduct && (
                    <div className="space-y-4 text-sm">
                      <div className="flex items-center gap-2 text-green-700 font-semibold">
                        <CheckCircle2 className="h-4 w-4" /> {tr("agent.sheet_success")}
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

                      <div>
                        <p className="font-medium mb-1">Description EN</p>
                        <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3">{generatedProduct.description_en}</p>
                      </div>

                      {generatedProduct.description_ar && (
                        <div>
                          <p className="font-medium mb-1">Description AR</p>
                          <p className="text-muted-foreground text-xs leading-relaxed line-clamp-3" dir="rtl">{generatedProduct.description_ar}</p>
                        </div>
                      )}

                      {generatedProduct.seo_tags.length > 0 && (
                        <div>
                          <p className="font-medium mb-1.5">Tags SEO</p>
                          <div className="flex flex-wrap gap-1">
                            {generatedProduct.seo_tags.map(tag => (
                              <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

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
                        <div className="qdia-alert-warning rounded-lg p-3">
                          <p className="font-medium text-xs mb-1 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Alertes conformité</p>
                          {generatedProduct.compliance_alerts.map((a, i) => (
                            <p key={i} className="text-xs text-amber-700">{a}</p>
                          ))}
                        </div>
                      )}

                      <div className="pt-2 flex justify-end">
                        <Button size="sm" onClick={() => setActiveStep("pricing")} className="gap-1">
                          {tr("agent.calculate_pricing_btn")} <ChevronRight className="h-3.5 w-3.5" />
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
            <div className="space-y-6 qdia-card p-6">
              <div>
                <h2 className="text-xl font-bold mb-1">{tr("agent.pricing_title")}</h2>
                <p className="text-sm text-muted-foreground">{tr("agent.pricing_subtitle")}</p>
              </div>

              <PricingExplanation />

              <div className="grid md:grid-cols-2 gap-6">
                {/* Inputs */}
                <div className="space-y-4">
                  <div className="bg-muted/30 rounded-lg p-4 text-sm text-muted-foreground border">
                    <p className="font-medium text-foreground mb-1">{tr("agent.product_label")}</p>
                    <p>{generatedProduct?.name_fr ?? genDescription ?? tr("agent.product_undefined")}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{tr("agent.cost_required")}</label>
                      <Input value={pricingCost} onChange={e => setPricingCost(e.target.value)} placeholder="Ex: 450" type="number" data-testid="input-pricing-cost" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{tr("agent.quantity")}</label>
                      <Input value={pricingQty} onChange={e => setPricingQty(e.target.value)} placeholder="1000" type="number" data-testid="input-pricing-qty" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{tr("agent.unit_label")}</label>
                      <select value={pricingUnit} onChange={e => setPricingUnit(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                        {["kg", "tons", "liters", "units"].map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{tr("agent.destination_label")}</label>
                      <select value={pricingDest} onChange={e => setPricingDest(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        data-testid="select-pricing-dest">
                        {[["FR", "France"], ["DE", "Allemagne"], ["US", "États-Unis"], ["UK", "Royaume-Uni"], ["ES", "Espagne"], ["CA", "Canada"], ["AE", "Émirats"]].map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium mb-1.5 block">{tr("agent.vendor_margin")}</label>
                      <Input value={pricingMargin} onChange={e => setPricingMargin(e.target.value)} placeholder="15" type="number" data-testid="input-pricing-margin" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{tr("agent.packaging_cost")}</label>
                      <Input value={pricingPackaging} onChange={e => setPricingPackaging(e.target.value)} placeholder="0" type="number" data-testid="input-pricing-packaging" />
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium mb-1.5 block">{tr("agent.packaging_secondary")}</label>
                      <Input
                        value={pricingPackagingSecondary}
                        onChange={e => setPricingPackagingSecondary(e.target.value)}
                        placeholder={tr("agent.packaging_secondary_hint")}
                        data-testid="input-pricing-packaging-secondary"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{tr("agent.packaging_secondary_cost")}</label>
                      <Input value={pricingPackagingSecondaryCost} onChange={e => setPricingPackagingSecondaryCost(e.target.value)} placeholder="0" type="number" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{tr("agent.local_transport")}</label>
                      <Input value={pricingTransport} onChange={e => setPricingTransport(e.target.value)} placeholder="0" type="number" data-testid="input-pricing-transport" />
                    </div>
                  </div>

                  <Button onClick={calculatePricing} disabled={pricingLoading || !pricingCost} className="w-full gap-2" data-testid="button-calculate-pricing">
                    {pricingLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> {tr("agent.calculating")}</> : <><DollarSign className="h-4 w-4" /> {tr("agent.calculate_btn")}</>}
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
                          Prix indicatifs par Incoterm (DZD, USD, EUR & AED / {pricingUnit})
                        </div>
                        <div className="grid grid-cols-4 divide-x">
                          {[
                            { label: "EXW", dzd: pricingResult.exw_dzd, usd: pricingResult.exw_usd, eur: pricingResult.exw_eur, aed: pricingResult.exw_aed, desc: "Sortie usine" },
                            { label: "FOB", dzd: pricingResult.fob_dzd, usd: pricingResult.fob_usd, eur: pricingResult.fob_eur, aed: pricingResult.fob_aed, desc: "Port Algérie" },
                            { label: "CFR", dzd: pricingResult.cfr_dzd, usd: pricingResult.cfr_usd, eur: pricingResult.cfr_eur, aed: pricingResult.cfr_aed, desc: "Port dest." },
                            { label: "CIF", dzd: pricingResult.cif_dzd, usd: pricingResult.cif_usd, eur: pricingResult.cif_eur, aed: pricingResult.cif_aed, desc: "Avec assurance" },
                          ].map(({ label, dzd, usd, eur, aed, desc }) => (
                            <div key={label} className={`p-3 text-center bg-card ${label === "FOB" ? "qdia-incoterm-active rounded-lg" : ""}`}>
                              <div className="text-xs font-semibold text-muted-foreground mb-0.5">{label}</div>
                              <div className="text-base font-bold text-primary">{dzd?.toLocaleString()} DZD</div>
                              <div className="text-sm font-semibold text-primary">${usd}</div>
                              {eur != null && <div className="text-xs text-muted-foreground">€{eur}</div>}
                              {aed != null && <div className="text-xs text-muted-foreground">{aed} AED</div>}
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
                          <div className="pt-1 text-[10px] text-muted-foreground">
                            Taux: 1 DZD = {pricingResult.exchange_rate_dzd_usd} USD · {pricingResult.exchange_rate_dzd_eur} EUR · {pricingResult.exchange_rate_dzd_aed} AED
                          </div>
                        </div>
                      </div>

                      {pricingResult.pricing_sources && (
                        <div className="bg-muted/20 rounded-lg border p-3 text-[10px] text-muted-foreground space-y-1">
                          <p className="font-semibold text-foreground">{tr("agent.pricing_tables_used")}</p>
                          {Object.entries(pricingResult.pricing_sources).map(([k, v]) => (
                            <p key={k}><span className="font-medium">{k}:</span> {v}</p>
                          ))}
                        </div>
                      )}

                      {pricingResult.price_range_note && (
                        <p className="text-[10px] text-muted-foreground italic">{pricingResult.price_range_note}</p>
                      )}

                      {/* AI Benchmark */}
                      {pricingResult.market_benchmark && (
                        <div className="qdia-info-card p-4">
                          <p className="text-xs font-semibold text-[#0461A5] mb-1.5 flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5" /> Analyse IA du marché
                          </p>
                          <p className="text-xs leading-relaxed text-muted-foreground">{pricingResult.market_benchmark}</p>
                        </div>
                      )}

                      <div className="flex justify-end">
                        <Button size="sm" onClick={() => setActiveStep("studio")} className="gap-1">
                          {tr("agent.studio_image_btn")} <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {!pricingLoading && !pricingResult && (
                    <div className="bg-muted/40 border rounded-xl p-8 flex flex-col items-center justify-center text-center text-muted-foreground min-h-[200px]">
                      <DollarSign className="h-10 w-10 mb-3 opacity-30" />
                      <p className="font-medium">{tr("agent.pricing_placeholder")}</p>
                      <p className="text-xs mt-1">{tr("agent.pricing_placeholder_hint")}</p>
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
                <h2 className="text-xl font-bold mb-1">{tr("agent.studio_page_title")}</h2>
                <p className="text-sm text-muted-foreground">{tr("agent.studio_page_subtitle")}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Left: controls */}
                <div className="space-y-4">
                  {/* Action selector */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">{tr("agent.treatment_type")}</label>
                    <div className="grid grid-cols-1 gap-2">
                      {[
                        { id: "remove_background" as const, label: "Détourage remove.bg", desc: "Suppression du fond automatique", icon: RefreshCw },
                        { id: "studio_scene" as const, label: "Scène Studio IA", desc: "Décor professionnel (OpenAI / Gemini)", icon: Sparkles },
                        { id: "white_background" as const, label: "Fond Blanc Pro", desc: "Packshot catalogue e-commerce", icon: RefreshCw },
                        { id: "enhance" as const, label: "Amélioration Photo", desc: "Lumière, netteté et qualité pro", icon: Wand2 },
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
                    <label className="text-sm font-medium mb-1.5 block">{tr("studio_page.product_name")}</label>
                    <Input value={studioProductName} onChange={e => setStudioProductName(e.target.value)} placeholder={tr("studio_page.product_name_placeholder")} data-testid="input-studio-product" />
                  </div>

                  {studioAction === "studio_scene" && (
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">{tr("agent.scene_description")}</label>
                      <Textarea value={studioScene} onChange={e => setStudioScene(e.target.value)}
                        placeholder="Ex: Cuisine méditerranéenne ensoleillée, olives fraîches en arrière-plan..." rows={2} />
                    </div>
                  )}

                  {/* Upload */}
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">{tr("agent.product_photo_required")}</label>
                    <input ref={studioInputRef} type="file" accept="image/*" className="hidden" onChange={handleStudioUpload} />
                    {studioImage ? (
                      <div className="relative w-full h-40 bg-muted rounded-lg overflow-hidden">
                        <img src={`data:${studioImageMime};base64,${studioImage}`} alt="Upload" className="w-full h-full object-contain" />
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
                        {tr("agent.upload_drag")}
                        <span className="text-xs">{tr("agent.upload_formats")}</span>
                      </button>
                    )}
                  </div>

                  <Button onClick={runStudio} disabled={studioLoading || !studioImage} className="w-full gap-2" data-testid="button-run-studio">
                    {studioLoading ? <><Loader2 className="h-4 w-4 animate-spin" /> {tr("agent.processing")}</> : <><Wand2 className="h-4 w-4" /> {tr("agent.run_studio_btn")}</>}
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
                    <StudioCanvas originalBase64={studioImage} resultBase64={studioResult} showBadge />
                  )}

                  {!studioLoading && !studioResult && (
                    <div className="bg-muted/40 border rounded-xl aspect-square flex flex-col items-center justify-center text-center text-muted-foreground">
                      <Wand2 className="h-12 w-12 mb-3 opacity-20" />
                      <p className="font-medium">{tr("agent.result_placeholder")}</p>
                      <p className="text-xs mt-1">{tr("agent.result_hint")}</p>
                    </div>
                  )}
                </div>
              </div>

              {studioResult && (
                <div className="flex justify-end">
                  <Button onClick={() => setActiveStep("publish")} className="gap-2">
                    {tr("agent.publish_product_btn")} <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ── STEP 5: PUBLISH ── */}
          {activeStep === "publish" && (
            <div className="space-y-6 max-w-xl mx-auto">
              <div className="text-center">
                <div className={`inline-flex items-center justify-center h-16 w-16 rounded-full mb-4 ${publishedId ? "bg-green-100" : "bg-green-100"}`}>
                  {publishedId ? <CheckCircle2 className="h-8 w-8 text-green-600" /> : <CheckCircle2 className="h-8 w-8 text-green-600" />}
                </div>
                <h2 className="text-2xl font-bold mb-2">{publishedId ? tr("agent.publish_success_title") : tr("agent.ready_publish")}</h2>
                <p className="text-muted-foreground text-sm">
                  {publishedId
                    ? tr("agent.publish_pending").replace("{id}", String(publishedId))
                    : tr("agent.publish_review")}
                </p>
              </div>

              <div className="bg-card border rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">{tr("agent.summary")}</h3>

                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${generatedProduct ? "bg-green-100" : "bg-muted"}`}>
                      {generatedProduct ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <span className="text-xs text-muted-foreground">1</span>}
                    </div>
                    <div>
                      <div className="font-medium">{tr("agent.sheet_item")}</div>
                      {generatedProduct ? (
                        <div className="text-muted-foreground text-xs">{generatedProduct.name_fr} · {generatedProduct.category}</div>
                      ) : <div className="text-xs text-amber-600">{tr("agent.sheet_missing")}</div>}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${pricingResult ? "bg-green-100" : "bg-muted"}`}>
                      {pricingResult ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <span className="text-xs text-muted-foreground">2</span>}
                    </div>
                    <div>
                      <div className="font-medium">{tr("agent.export_price")}</div>
                      {pricingResult ? (
                        <div className="text-muted-foreground text-xs">FOB ${pricingResult.fob_usd} · CIF ${pricingResult.cif_usd} / {pricingUnit}</div>
                      ) : <div className="text-xs text-amber-600">{tr("agent.price_missing")}</div>}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className={`mt-0.5 h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${studioResult ? "bg-green-100" : "bg-amber-100"}`}>
                      {studioResult ? <CheckCircle2 className="h-3 w-3 text-green-600" /> : <AlertTriangle className="h-3 w-3 text-amber-600" />}
                    </div>
                    <div>
                      <div className="font-medium">{tr("agent.studio_image_item")}</div>
                      <div className="text-xs text-muted-foreground">{studioResult ? tr("agent.studio_ready") : tr("agent.studio_optional")}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setActiveStep("generate")} disabled={publishLoading}>
                  {tr("agent.edit_sheet")}
                </Button>
                <Button className="flex-1 gap-2" variant="ai" disabled={!generatedProduct || publishLoading || !!publishedId} data-testid="button-publish"
                  onClick={publishProduct}>
                  {publishLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
                  {publishedId ? tr("agent.submitted_btn") : tr("agent.submit_validation")}
                </Button>
              </div>

              {publishedId && (
                <div className="flex flex-col sm:flex-row justify-center gap-3">
                  <Button variant="outline" asChild>
                    <Link href="/products">{tr("agent.view_catalog")}</Link>
                  </Button>
                  <Button variant="gold" onClick={resetForNewProduct}>
                    <Sparkles className="h-4 w-4 mr-2" /> {tr("agent.add_another")}
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href="/supplier">{tr("agent.my_products_link")}</Link>
                  </Button>
                </div>
              )}

              <p className="text-xs text-center text-muted-foreground">
                {tr("agent.after_validation")}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
