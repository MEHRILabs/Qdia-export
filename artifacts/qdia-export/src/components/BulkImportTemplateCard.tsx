import { useState } from "react";
import { Download, FileSpreadsheet, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/contexts/I18nContext";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api-base";

const COLUMNS = [
  "nom", "description", "categorie", "prix_par_piece", "prix_gros",
  "moq", "unite", "port", "wilaya", "devise", "conditionnement",
  "certifications", "image_url", "url_source",
];

export function BulkImportTemplateCard() {
  const { tr } = useI18n();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const downloadTemplate = async () => {
    try {
      setDownloading(true);
      const res = await fetch(apiUrl("/api/products/import-template"));
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "qdia-produits-template.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast({
        title: tr("common.error"),
        description: err instanceof Error ? err.message : "Téléchargement du modèle impossible.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-dashed border-[#0461A5]/40 bg-gradient-to-br from-[#F0F4FF] to-white p-6 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-start gap-6">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-[#0461A5]" />
            <h2 className="text-lg font-bold text-[#1A1A2E]">{tr("supplier_page.template_title")}</h2>
          </div>
          <p className="text-sm text-[#656566] leading-relaxed">{tr("supplier_page.template_desc")}</p>
          <ul className="space-y-1.5">
            {COLUMNS.slice(0, 6).map(col => (
              <li key={col} className="flex items-center gap-2 text-xs text-[#334257]">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#04BB7B] shrink-0" />
                <code className="bg-white/80 px-1.5 py-0.5 rounded border text-[11px]">{col}</code>
              </li>
            ))}
            <li className="text-[11px] text-[#9CA3AF] pl-5">+ {COLUMNS.length - 6} {tr("supplier_page.template_more_cols")}</li>
          </ul>
        </div>
        <div className="flex flex-col gap-3 shrink-0 lg:min-w-[220px]">
          <Button variant="gold" size="lg" className="font-bold gap-2 w-full" onClick={downloadTemplate} disabled={downloading}>
            {downloading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
            {tr("supplier_page.excel_template")}
          </Button>
          <p className="text-[11px] text-center text-[#9CA3AF]">{tr("supplier_page.template_hint")}</p>
        </div>
      </div>
    </div>
  );
}
