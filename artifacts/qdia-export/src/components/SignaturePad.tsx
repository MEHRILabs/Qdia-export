import { useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

interface Props {
  onChange: (dataUrl: string | null) => void;
  className?: string;
}

export function SignaturePad({ onChange, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fafafa";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#073B74";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    onChange(null);
  }, [onChange]);

  useEffect(() => {
    clear();
  }, [clear]);

  const pos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if ("touches" in e) {
      const t = e.touches[0];
      return { x: (t.clientX - rect.left) * scaleX, y: (t.clientY - rect.top) * scaleY };
    }
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = getCtx();
    if (!ctx) return;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };

  const move = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = getCtx();
    if (!ctx) return;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) onChange(canvas.toDataURL("image/png"));
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-[#073B74]">Signature électronique</p>
        <Button type="button" variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={clear}>
          <Eraser className="h-3 w-3" /> Effacer
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        width={400}
        height={100}
        className="w-full h-24 rounded-lg border-2 border-dashed border-[#0461A5]/30 bg-[#fafafa] touch-none cursor-crosshair"
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      <p className="text-[10px] text-muted-foreground mt-1">Signez avec la souris ou le doigt — intégrée au PDF</p>
    </div>
  );
}
