import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nContext";
import { FileSpreadsheet, Loader2, Upload } from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Props {
  onDone?: () => void;
}

export function ExcelImportButton({ onDone }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { tr } = useI18n();
  const [loading, setLoading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async ev => {
      try {
        const base64 = (ev.target?.result as string).split(",")[1];
        const resp = await fetch(`${BASE}/api/products/import-excel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ file_base64: base64, publish: false }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.error ?? "Import échoué");

        toast({
          title: tr("excel_import.success"),
          description: tr("excel_import.success_desc").replace("{count}", String(data.imported)),
        });
        if (data.errors?.length) {
          toast({ title: tr("excel_import.warnings"), description: data.errors.join(", "), variant: "destructive" });
        }
        onDone?.();
      } catch (err) {
        toast({
          title: tr("excel_import.import_error"),
          description: String(err instanceof Error ? err.message : err),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      <Button
        variant="outline"
        className="gap-2"
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading
          ? <><Loader2 className="h-4 w-4 animate-spin" /> {tr("excel_import.importing")}</>
          : <><Upload className="h-4 w-4" /> {tr("excel_import.import_btn")}</>}
      </Button>
    </>
  );
}

export function ExcelImportHint() {
  const { tr } = useI18n();
  return (
    <div className="rounded-lg border border-[#0461A5]/20 bg-[#E8F2FB]/50 p-4 text-sm text-[#334257] flex gap-3">
      <FileSpreadsheet className="h-5 w-5 text-[#0461A5] shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-[#073B74] mb-1">{tr("excel_import.hint_title")}</p>
        <p className="text-xs text-[#656566] leading-relaxed">{tr("excel_import.hint_body")}</p>
      </div>
    </div>
  );
}
