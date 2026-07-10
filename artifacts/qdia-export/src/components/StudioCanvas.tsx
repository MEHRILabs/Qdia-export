import { useEffect, useRef, useState, useCallback } from "react";
import { Canvas, FabricImage, FabricText } from "fabric";
import { Button } from "@/components/ui/button";
import { Download, RotateCw, ZoomIn, ZoomOut, ShieldCheck, Columns2 } from "lucide-react";

interface Props {
  originalBase64: string | null;
  resultBase64: string | null;
  showBadge?: boolean;
  onExport?: (sizes: { thumb: string; card: string; hd: string }) => void;
}

const SIZES = [
  { key: "thumb" as const, label: "Thumb 150px", max: 150 },
  { key: "card" as const, label: "Card 600px", max: 600 },
  { key: "hd" as const, label: "HD 1200px", max: 1200 },
];

export function StudioCanvas({ originalBase64, resultBase64, showBadge = true, onExport }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<Canvas | null>(null);
  const [splitView, setSplitView] = useState(false);
  const [activeImage, setActiveImage] = useState<"result" | "original">("result");

  const displayB64 = activeImage === "result" && resultBase64 ? resultBase64 : originalBase64;

  const loadImage = useCallback(async (b64: string | null) => {
    if (!fabricRef.current || !b64) return;
    const canvas = fabricRef.current;
    canvas.clear();
    canvas.backgroundColor = "#ffffff";

    const img = await FabricImage.fromURL(`data:image/png;base64,${b64}`);
    const maxDim = 480;
    const scale = Math.min(maxDim / (img.width ?? 1), maxDim / (img.height ?? 1), 1);
    img.scale(scale);
    img.set({
      left: (canvas.width! - (img.width! * scale)) / 2,
      top: (canvas.height! - (img.height! * scale)) / 2,
      selectable: true,
      hasControls: true,
    });
    canvas.add(img);
    canvas.setActiveObject(img);

    if (showBadge) {
      const badge = new FabricText("🇩🇿 QDIA Verified", {
        left: canvas.width! - 140,
        top: canvas.height! - 36,
        fontSize: 11,
        fontFamily: "system-ui, sans-serif",
        fill: "#ffffff",
        backgroundColor: "rgba(7, 59, 116, 0.9)",
        padding: 6,
        selectable: false,
      });
      canvas.add(badge);
    }
    canvas.renderAll();
  }, [showBadge]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = new Canvas(canvasRef.current, {
      width: 520,
      height: 520,
      backgroundColor: "#ffffff",
    });
    fabricRef.current = canvas;
    return () => { canvas.dispose(); fabricRef.current = null; };
  }, []);

  useEffect(() => {
    loadImage(displayB64 ?? null);
  }, [displayB64, loadImage]);

  const rotate = () => {
    const obj = fabricRef.current?.getActiveObject();
    if (obj) { obj.rotate((obj.angle ?? 0) + 90); fabricRef.current?.renderAll(); }
  };

  const zoom = (factor: number) => {
    const obj = fabricRef.current?.getActiveObject();
    if (obj) { obj.scale((obj.scaleX ?? 1) * factor); fabricRef.current?.renderAll(); }
  };

  const exportSize = async (max: number): Promise<string> => {
    const canvas = fabricRef.current;
    if (!canvas) return "";
    const dataUrl = canvas.toDataURL({ format: "png", multiplier: max / 520 });
    return dataUrl.split(",")[1] ?? "";
  };

  const handleExportAll = async () => {
    const sizes = {
      thumb: await exportSize(150),
      card: await exportSize(600),
      hd: await exportSize(1200),
    };
    onExport?.(sizes);
    for (const { key, label } of SIZES) {
      const b64 = sizes[key];
      const a = document.createElement("a");
      a.href = `data:image/png;base64,${b64}`;
      a.download = `qdia-${key}.png`;
      a.click();
    }
  };

  if (!originalBase64 && !resultBase64) return null;

  return (
    <div className="space-y-4 w-full max-w-2xl">
      <div className="flex flex-wrap gap-2 justify-center">
        <Button size="sm" variant="outline" onClick={() => setSplitView(v => !v)} className="gap-1.5">
          <Columns2 className="h-3.5 w-3.5" /> {splitView ? "Vue simple" : "Avant / Après"}
        </Button>
        {resultBase64 && (
          <>
            <Button size="sm" variant={activeImage === "original" ? "default" : "outline"} onClick={() => setActiveImage("original")}>Original</Button>
            <Button size="sm" variant={activeImage === "result" ? "default" : "outline"} onClick={() => setActiveImage("result")}>Résultat</Button>
          </>
        )}
        <Button size="sm" variant="outline" onClick={rotate}><RotateCw className="h-3.5 w-3.5" /></Button>
        <Button size="sm" variant="outline" onClick={() => zoom(1.1)}><ZoomIn className="h-3.5 w-3.5" /></Button>
        <Button size="sm" variant="outline" onClick={() => zoom(0.9)}><ZoomOut className="h-3.5 w-3.5" /></Button>
        <Button size="sm" variant="gold" onClick={handleExportAll} className="gap-1.5 font-bold">
          <Download className="h-3.5 w-3.5" /> Export 3 tailles
        </Button>
      </div>

      {splitView && originalBase64 && resultBase64 ? (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border p-2 text-center">
            <p className="text-[10px] font-bold text-[#9CA3AF] mb-2 uppercase">Avant</p>
            <img src={`data:image/jpeg;base64,${originalBase64}`} alt="Avant" className="max-h-[240px] mx-auto object-contain" />
          </div>
          <div className="bg-white rounded-xl border p-2 text-center relative">
            <p className="text-[10px] font-bold text-[#04BB7B] mb-2 uppercase">Après</p>
            <img src={`data:image/png;base64,${resultBase64}`} alt="Après" className="max-h-[240px] mx-auto object-contain" />
            {showBadge && (
              <span className="absolute bottom-3 right-3 text-[9px] bg-[#073B74] text-white px-2 py-0.5 rounded flex items-center gap-1">
                <ShieldCheck className="h-2.5 w-2.5" /> QDIA
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border shadow-lg p-4 flex justify-center">
          <canvas ref={canvasRef} className="rounded-xl border border-[#E5E7EB]" />
        </div>
      )}
    </div>
  );
}
