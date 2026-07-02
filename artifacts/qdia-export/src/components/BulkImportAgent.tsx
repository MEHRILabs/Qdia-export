import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/contexts/I18nContext";
import {
  Bot, Globe, ImageIcon, Loader2, ScanSearch, Upload, PackagePlus,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

interface ScrapedImage {
  url: string;
  source_page?: string;
  alt?: string;
}

interface BulkItem {
  name: string;
  status: string;
  product_id?: number;
  image_url?: string;
  message?: string;
}

interface Props {
  onDone?: () => void;
}

export function BulkImportAgent({ onDone }: Props) {
  const { toast } = useToast();
  const { tr } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [excelB64, setExcelB64] = useState<string | null>(null);
  const [excelName, setExcelName] = useState("");
  const [sourceUrls, setSourceUrls] = useState("");
  const [imageUrls, setImageUrls] = useState("");
  const [destination, setDestination] = useState("FR");
  const [scraping, setScraping] = useState(false);
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState<ScrapedImage[]>([]);
  const [results, setResults] = useState<BulkItem[]>([]);

  const handleExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const data = (ev.target?.result as string).split(",")[1];
      setExcelB64(data);
      setExcelName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const scrapePreview = async () => {
    const urls = sourceUrls.split("\n").map(s => s.trim()).filter(Boolean);
    if (urls.length === 0) {
      toast({ title: tr("bulk_import.urls_required"), description: tr("bulk_import.urls_required_desc"), variant: "destructive" });
      return;
    }
    setScraping(true);
    try {
      const resp = await fetch(`${BASE}/api/ai/scrape-images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_urls: urls }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Erreur scraping");
      setPreview(data.images ?? []);
      toast({ title: tr("bulk_import.images_found").replace("{count}", String(data.count ?? 0)), description: tr("bulk_import.preview_ready") });
    } catch (e) {
      toast({ title: tr("bulk_import.scrape_failed"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setScraping(false);
    }
  };

  const runBulkImport = async () => {
    const sources = sourceUrls.split("\n").map(s => s.trim()).filter(Boolean);
    const images = imageUrls.split("\n").map(s => s.trim()).filter(Boolean);
    if (!excelB64 && sources.length === 0 && images.length === 0) {
      toast({ title: tr("bulk_import.missing_data"), description: tr("bulk_import.missing_data_desc"), variant: "destructive" });
      return;
    }

    setImporting(true);
    setResults([]);
    try {
      const resp = await fetch(`${BASE}/api/ai/bulk-import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_base64: excelB64 ?? undefined,
          source_urls: sources.length ? sources : undefined,
          image_urls: images.length ? images : undefined,
          scrape_images: true,
          enrich_with_ai: true,
          publish: false,
          destination_country: destination,
          port_code: "DZBJA",
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error ?? "Import échoué");
      setResults(data.items ?? []);
      toast({
        title: tr("bulk_import.import_done"),
        description: tr("bulk_import.import_done_desc")
          .replace("{imported}", String(data.imported))
          .replace("{errors}", String(data.errors))
          .replace("{images}", String(data.scraped_images)),
      });
      onDone?.();
    } catch (e) {
      toast({ title: tr("bulk_import.import_error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#E8F2FB] flex items-center justify-center shrink-0">
          <Bot className="h-5 w-5 text-[#0461A5]" />
        </div>
        <div>
          <h3 className="font-bold text-[#1A1A2E]">{tr("bulk_import.title")}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            {tr("bulk_import.subtitle")}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#334257]">{tr("bulk_import.excel_optional")}</label>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcel} />
          <Button variant="outline" className="w-full gap-2" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" />
            {excelName || tr("bulk_import.choose_excel")}
          </Button>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-[#334257]">{tr("bulk_import.export_destination")}</label>
          <Input value={destination} onChange={e => setDestination(e.target.value.toUpperCase())} placeholder="FR" maxLength={2} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-[#334257] flex items-center gap-1">
          <Globe className="h-3.5 w-3.5" /> {tr("bulk_import.catalog_urls")}
        </label>
        <Textarea
          value={sourceUrls}
          onChange={e => setSourceUrls(e.target.value)}
          rows={3}
          placeholder={"https://fournisseur.dz/catalogue\nhttps://cooperative.dz/produits"}
          className="text-sm resize-none"
        />
        <Button variant="secondary" size="sm" className="gap-2" onClick={scrapePreview} disabled={scraping}>
          {scraping ? <Loader2 className="h-4 w-4 animate-spin" /> : <ScanSearch className="h-4 w-4" />}
          {tr("bulk_import.scan_images")}
        </Button>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-[#334257] flex items-center gap-1">
          <ImageIcon className="h-3.5 w-3.5" /> {tr("bulk_import.direct_urls")}
        </label>
        <Textarea
          value={imageUrls}
          onChange={e => setImageUrls(e.target.value)}
          rows={2}
          placeholder="https://exemple.dz/images/produit1.jpg"
          className="text-sm resize-none"
        />
      </div>

      {preview.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs font-bold text-[#0461A5] mb-2">{tr("bulk_import.images_detected").replace("{count}", String(preview.length))}</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {preview.slice(0, 8).map(img => (
              <img
                key={img.url}
                src={img.url}
                alt={img.alt ?? "produit"}
                className="h-16 w-16 rounded-lg object-cover border shrink-0 bg-white"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ))}
          </div>
        </div>
      )}

      <Button onClick={runBulkImport} disabled={importing} className="w-full gap-2 font-bold" variant="ai">
        {importing
          ? <><Loader2 className="h-4 w-4 animate-spin" /> {tr("bulk_import.importing")}</>
          : <><PackagePlus className="h-4 w-4" /> {tr("bulk_import.import_btn")}</>}
      </Button>

      {results.length > 0 && (
        <div className="rounded-lg border p-3 max-h-40 overflow-y-auto text-xs space-y-1">
          {results.map((r, i) => (
            <div key={i} className="flex justify-between gap-2">
              <span className="truncate">{r.name}</span>
              <span className={r.status === "imported" ? "text-green-600 font-semibold" : "text-red-500"}>
                {r.status}{r.product_id ? ` #${r.product_id}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
