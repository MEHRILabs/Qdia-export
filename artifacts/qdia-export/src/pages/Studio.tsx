import { useState, useRef, useMemo } from "react";
import { Link } from "wouter";
import { SupplierSidebar } from "@/components/SupplierSidebar";
import { StudioCanvas } from "@/components/StudioCanvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nContext";
import {
  Sparkles, Eraser, ShieldCheck,
  Upload, Loader2, Wand2, X, ImageIcon, Scissors,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

type StudioAction = "remove_background" | "studio_scene" | "white_background" | "enhance";

export default function Studio() {
  const { toast } = useToast();
  const { tr } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [action, setAction] = useState<StudioAction>("remove_background");
  const [productName, setProductName] = useState("");
  const [scene, setScene] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBadge, setShowBadge] = useState(true);
  const [provider, setProvider] = useState<string | null>(null);

  const TOOLS = useMemo(() => [
    { id: "remove_background" as const, label: tr("studio_page.tool_cutout"), desc: tr("studio_page.tool_cutout_desc"), icon: Scissors },
    { id: "white_background" as const, label: tr("studio_page.tool_white"), desc: tr("studio_page.tool_white_desc"), icon: Eraser },
    { id: "studio_scene" as const, label: tr("studio_page.tool_scene"), desc: tr("studio_page.tool_scene_desc"), icon: Sparkles },
    { id: "enhance" as const, label: tr("studio_page.tool_enhance"), desc: tr("studio_page.tool_enhance_desc"), icon: Wand2 },
  ], [tr]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setImage((ev.target?.result as string).split(",")[1]);
      setResult(null);
      setProvider(null);
    };
    reader.readAsDataURL(file);
  };

  const runStudio = async () => {
    if (!image) {
      toast({ title: tr("studio_page.photo_required"), description: tr("studio_page.photo_required_desc"), variant: "destructive" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const resp = await fetch(`${BASE}/api/ai/studio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_base64: image,
          action,
          product_name: productName || undefined,
          scene_description: scene || undefined,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? tr("studio_page.error_studio"));
      }
      const data = await resp.json();
      setResult(data.image_base64);
      setProvider(data.provider ?? null);
      toast({
        title: tr("studio_page.done"),
        description: tr("studio_page.done_desc").replace("{provider}", data.provider ?? "IA"),
      });
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#E5E7EB]">
      <SupplierSidebar activePath="/studio" />

      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        <header className="h-16 bg-white border-b border-[#E5E7EB] flex items-center px-4 md:px-6 shrink-0 gap-4">
          <div className="min-w-0">
            <h1 className="font-bold text-[#1A1A2E] text-base md:text-lg truncate">{tr("studio.title")}</h1>
            <p className="text-[11px] text-[#9CA3AF] hidden sm:block">
              {tr("studio_page.providers")}
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="hidden sm:inline-flex" asChild>
              <Link href="/agent-ia">{tr("studio_page.back_agent")}</Link>
          </Button>
        </div>
      </header>

        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          <aside className="w-full lg:w-[300px] xl:w-[320px] bg-white border-b lg:border-b-0 lg:border-r border-[#E5E7EB] flex flex-col shrink-0">
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] mb-3">{tr("studio_page.selected_tool")}</p>
                <div className="space-y-2">
                  {TOOLS.map(({ id, label, desc, icon: Icon }) => (
                    <button key={id} type="button" onClick={() => setAction(id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        action === id
                          ? "border-[#0461A5] bg-[#E8F2FB] shadow-sm"
                          : "border-[#E5E7EB] hover:border-[#0461A5]/40 hover:bg-[#FAFBFC]"
                      }`}>
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                        action === id ? "bg-[#0461A5] text-white" : "bg-[#F1F5F9] text-[#0461A5]"
                      }`}>
                        <Icon className="h-4 w-4" />
              </div>
              <div>
                        <p className="font-semibold text-sm text-[#1A1A2E]">{label}</p>
                        <p className="text-[11px] text-[#9CA3AF]">{desc}</p>
              </div>
            </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-[#E5E7EB]">
              <div>
                  <label className="text-xs font-semibold text-[#334257] mb-1.5 block">{tr("studio_page.product_name")}</label>
                  <Input value={productName} onChange={e => setProductName(e.target.value)}
                    placeholder={tr("studio_page.product_name_placeholder")} className="h-9 text-sm" />
              </div>
                {action === "studio_scene" && (
              <div>
                    <label className="text-xs font-semibold text-[#334257] mb-1.5 block">{tr("studio_page.scene_desc")}</label>
                    <Textarea value={scene} onChange={e => setScene(e.target.value)} rows={2}
                      className="text-sm resize-none" placeholder={tr("studio_page.scene_placeholder")} />
              </div>
                )}
                <label className="flex items-center gap-2.5 text-xs text-[#656566] cursor-pointer">
                  <input type="checkbox" checked={showBadge} onChange={e => setShowBadge(e.target.checked)}
                    className="rounded accent-[#0461A5]" />
                  <ShieldCheck className="h-3.5 w-3.5 text-[#0461A5]" />
                  {tr("studio_page.watermark")}
                </label>
              </div>
            </div>

            <div className="p-5 border-t border-[#E5E7EB] bg-[#FAFBFC]">
              <Button onClick={runStudio} disabled={loading || !image} variant="ai" className="w-full h-11 font-bold gap-2">
                {loading
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> {tr("studio_page.processing")}</>
                  : <><Wand2 className="h-4 w-4" /> {tr("studio_page.generate")}</>}
              </Button>
          </div>
        </aside>

          <main className="flex-1 qdia-studio-workspace flex flex-col items-center justify-center p-6 md:p-10 min-h-[400px] gap-6">
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />

            {loading ? (
              <div className="w-full max-w-lg bg-white rounded-2xl border p-8 shadow-sm text-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#0461A5] mx-auto mb-4" />
                <p className="font-semibold text-[#1A1A2E]">{tr("studio_page.generating")}</p>
                <p className="text-sm text-[#9CA3AF]">{tr("studio_page.generating_hint")}</p>
              </div>
            ) : image || result ? (
              <>
                {provider && (
                  <span className="text-xs bg-[#E8F2FB] text-[#0461A5] px-3 py-1 rounded-full font-semibold">
                    {tr("studio_page.provider").replace("{name}", provider)}
                  </span>
                )}
                <StudioCanvas originalBase64={image} resultBase64={result} showBadge={showBadge} />
                <button type="button" onClick={() => { setImage(null); setResult(null); setProvider(null); }}
                  className="text-xs text-[#9CA3AF] hover:text-[#0461A5] flex items-center gap-1">
                  <X className="h-3.5 w-3.5" /> {tr("studio_page.new_image")}
                </button>
              </>
            ) : (
              <button type="button" onClick={() => inputRef.current?.click()}
                className="w-full max-w-md bg-white rounded-2xl border-2 border-dashed border-[#94A3B8] p-10 flex flex-col items-center gap-4 hover:border-[#0461A5] transition-all group">
                <div className="h-16 w-16 rounded-2xl bg-[#E8F2FB] flex items-center justify-center group-hover:bg-[#0461A5] transition-colors">
                  <Upload className="h-7 w-7 text-[#0461A5] group-hover:text-white transition-colors" />
            </div>
                <p className="font-bold text-[#1A1A2E]">{tr("studio_page.upload_title")}</p>
                <span className="text-xs text-[#9CA3AF] flex items-center gap-1">
                  <ImageIcon className="h-3.5 w-3.5" /> {tr("studio_page.upload_formats")}
                </span>
              </button>
            )}
          </main>
          </div>
      </div>
    </div>
  );
}
