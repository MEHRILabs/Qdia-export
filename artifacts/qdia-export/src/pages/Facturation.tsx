import { useState, useRef, useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useListProducts } from "@workspace/api-client-react";
import { SupplierSidebar } from "@/components/SupplierSidebar";
import { InvoiceSheet } from "@/components/InvoiceSheet";
import { SignaturePad } from "@/components/SignaturePad";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { platformApi } from "@/lib/platform-api";
import { apiUrl } from "@/lib/api-base";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useI18n } from "@/contexts/I18nContext";
import {
  FileDown, DollarSign, Ship, Sparkles, Printer, FileText,
  PenLine, Package, CheckCircle2,
} from "lucide-react";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { getAuthToken } from "@/lib/api-auth";
import { calcTotals, newInvoiceNumber, type InvoiceLine } from "@/lib/invoice-types";

type SavedInvoice = {
  id: number;
  number: string;
  product_name?: string;
  amount: number;
  commission_amount: number;
  net_amount: number;
  currency: string;
  status: string;
  port_depart?: string;
  port_arrival?: string;
  incoterm?: string;
  transaction_id?: number;
};

const STEPS = [
  { icon: Package, titleKey: "facturation_page.step1_title", descKey: "facturation_page.step1_desc" },
  { icon: Sparkles, titleKey: "facturation_page.step2_title", descKey: "facturation_page.step2_desc" },
  { icon: PenLine, titleKey: "facturation_page.step3_title", descKey: "facturation_page.step3_desc" },
];

function FacturationContent() {
  const { toast } = useToast();
  const { tr } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const printRef = useRef<HTMLDivElement>(null);

  const [productId, setProductId] = useState<string>("");
  const [lines, setLines] = useState<InvoiceLine[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [buyerName, setBuyerName] = useState("Importateur international");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [incoterm, setIncoterm] = useState("FOB");
  const [portDepart, setPortDepart] = useState("Béjaïa");
  const [portArrival, setPortArrival] = useState("Marseille");
  const [invoiceNumber] = useState(newInvoiceNumber);

  const { data: productsData } = useListProducts({ limit: 50 });
  const products = productsData?.data ?? [];

  const selected = useMemo(
    () => products.find(p => String(p.id) === productId),
    [products, productId],
  );

  const totals = useMemo(() => calcTotals(lines), [lines]);

  const { data, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => platformApi.getInvoices(),
  });
  const invoices = (data?.data ?? []) as SavedInvoice[];

  const fillWithAi = async () => {
    if (!selected && !productId) {
      toast({ title: tr("facturation_page.choose_product_toast"), variant: "destructive" });
      return;
    }
    setAiLoading(true);
    try {
      const res = await platformApi.invoiceAiLines({
        product_id: selected?.id,
        product_name: selected?.name ?? "Produit export",
        category: selected?.category,
        price_fob: selected?.prices?.fob,
        moq: selected?.moq,
        moq_unit: selected?.moq_unit,
        port_depart: selected?.port_depart ?? portDepart,
        port_arrival: portArrival,
        incoterm,
        currency: selected?.prices?.currency ?? "USD",
        certifications: selected?.certifications,
      });
      setLines(res.lines);
      setAiNote(res.notes ?? (res.source === "ai" ? "Tableau généré par IA" : "Modèle QDIA"));
      if (selected?.port_depart) setPortDepart(selected.port_depart);
      toast({ title: tr("facturation_page.table_filled"), description: res.notes });
    } catch (e) {
      toast({ title: tr("facturation_page.ai_error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  const buildPdfPayload = useCallback(() => ({
    number: invoiceNumber,
    product_name: selected?.name ?? "Export algérien",
    amount: totals.amount,
    commission_amount: totals.commissionAmount,
    net_amount: totals.netAmount,
    currency: selected?.prices?.currency ?? "USD",
    port_depart: portDepart,
    port_arrival: portArrival,
    incoterm,
    status: "issued",
    buyer_name: buyerName,
    supplier_name: user?.name ?? selected?.supplier_name ?? "Exportateur QDIA",
    buyer_address: buyerAddress || undefined,
    supplier_address: selected?.supplier_location ?? "Algérie",
    lines,
    notes: aiNote ?? undefined,
    signature_data_url: signature ?? undefined,
    signed_by: signature ? (user?.name ?? "Signataire QDIA") : undefined,
    signed_at: signature ? new Date().toLocaleString("fr-DZ") : undefined,
  }), [invoiceNumber, selected, totals, portDepart, portArrival, incoterm, buyerName, buyerAddress, user, lines, aiNote, signature]);

  const downloadPdf = async () => {
    if (!lines.length) {
      toast({ title: tr("facturation_page.fill_table_first"), variant: "destructive" });
      return;
    }
    const token = getAuthToken();
    const res = await fetch(apiUrl("/api/billing/invoices/preview-pdf"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(buildPdfPayload()),
    });
    if (!res.ok) {
      toast({ title: tr("facturation_page.pdf_unavailable"), variant: "destructive" });
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoiceNumber}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: tr("facturation_page.pdf_downloaded") });
  };

  const printInvoice = () => {
    if (!lines.length) {
      toast({ title: tr("facturation_page.fill_table_first"), variant: "destructive" });
      return;
    }
    window.print();
  };

  const downloadSavedPdf = async (id: number, number: string) => {
    const token = getAuthToken();
    let url = apiUrl(`/api/billing/invoices/${id}.pdf`);
    if (signature) {
      const params = new URLSearchParams({ signature, signed_by: user?.name ?? "" });
      url += `?${params}`;
    }
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!res.ok) {
      toast({ title: tr("facturation_page.pdf_unavailable"), variant: "destructive" });
      return;
    }
    const blob = await res.blob();
    const obj = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = obj;
    a.download = `${number}.pdf`;
    a.click();
    URL.revokeObjectURL(obj);
  };

  const fund = async (txId?: number) => {
    if (!txId) return;
    try {
      await platformApi.fundPayment(txId);
      toast({ title: tr("facturation_page.payment_confirmed_escrow") });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    }
  };

  const release = async (txId?: number) => {
    if (!txId) return;
    try {
      await platformApi.releasePayment(txId);
      toast({ title: tr("facturation_page.funds_released_exporter") });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    } catch (e) {
      toast({ title: tr("common.error"), description: String(e instanceof Error ? e.message : e), variant: "destructive" });
    }
  };

  const dateLabel = new Date().toLocaleDateString("fr-DZ", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #invoice-print-area, #invoice-print-area * { visibility: visible !important; }
          #invoice-print-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            z-index: 99999 !important;
            box-shadow: none !important;
          }
          aside, header, .no-print { display: none !important; }
        }
      `}</style>

      <div className="min-h-screen flex">
        <div className="no-print">
          <SupplierSidebar activePath="/facturation" />
        </div>
        <main className="flex-1 p-6 md:p-8 max-w-5xl no-print-main">
          <h1 className="text-2xl font-black mb-2 flex items-center gap-2 no-print">
            <DollarSign className="h-7 w-7 text-primary" /> {tr("facturation.title")}
          </h1>
          <p className="text-sm text-muted-foreground mb-6 no-print">
            {tr("facturation.subtitle")}
          </p>

          {/* Guide */}
          <div className="grid sm:grid-cols-3 gap-3 mb-8 no-print">
            {STEPS.map(({ icon: Icon, titleKey, descKey }) => (
              <Card key={titleKey} className="border-[#0461A5]/15">
                <CardContent className="p-4">
                  <Icon className="h-5 w-5 text-[#0461A5] mb-2" />
                  <p className="font-bold text-sm">{tr(titleKey)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{tr(descKey)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Création facture */}
          <Card className="mb-8 no-print">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5" /> {tr("facturation_page.new_invoice_title").replace("{number}", invoiceNumber)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>{tr("facturation_page.export_product")}</Label>
                  <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger><SelectValue placeholder={tr("facturation_page.choose_product")} /></SelectTrigger>
                    <SelectContent>
                      {products.map(p => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{tr("rfq.incoterm")}</Label>
                  <Select value={incoterm} onValueChange={setIncoterm}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["FOB", "CIF", "CFR", "EXW"].map(v => (
                        <SelectItem key={v} value={v}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>{tr("facturation_page.importer")}</Label>
                  <Input value={buyerName} onChange={e => setBuyerName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{tr("facturation_page.importer_address")}</Label>
                  <Input value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)} placeholder={tr("facturation_page.city_country")} />
                </div>
                <div className="space-y-1.5">
                  <Label>{tr("facturation_page.departure_port")}</Label>
                  <Input value={portDepart} onChange={e => setPortDepart(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>{tr("facturation_page.arrival_port")}</Label>
                  <Input value={portArrival} onChange={e => setPortArrival(e.target.value)} />
                </div>
              </div>

              <Button onClick={() => void fillWithAi()} disabled={aiLoading} className="gap-2 bg-[#073B74]">
                <Sparkles className="h-4 w-4" />
                {aiLoading ? tr("facturation_page.ai_loading") : tr("facturation.ai_fill")}
              </Button>
              {aiNote && (
                <p className="text-xs text-[#0461A5] flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {aiNote}
                </p>
              )}

              <SignaturePad onChange={setSignature} />

              <div className="flex flex-wrap gap-2 pt-2">
                <Button variant="outline" className="gap-1" onClick={printInvoice} disabled={!lines.length}>
                  <Printer className="h-4 w-4" /> {tr("common.print")}
                </Button>
                <Button className="gap-1" onClick={() => void downloadPdf()} disabled={!lines.length}>
                  <FileDown className="h-4 w-4" /> {tr("facturation.download_pdf")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Aperçu facture présentable */}
          {lines.length > 0 && (
            <div className="mb-10">
              <p className="text-sm font-bold text-[#073B74] mb-3 no-print">{tr("facturation.preview")}</p>
              <InvoiceSheet
                printRef={printRef}
                number={invoiceNumber}
                date={dateLabel}
                productName={selected?.name ?? "Produit export"}
                supplierName={user?.name ?? selected?.supplier_name ?? "Exportateur QDIA certifié"}
                buyerName={buyerName}
                supplierAddress={selected?.supplier_location ?? "Algérie — QDIA Export DZ"}
                buyerAddress={buyerAddress}
                portDepart={portDepart}
                portArrival={portArrival}
                incoterm={incoterm}
                currency={selected?.prices?.currency ?? "USD"}
                lines={lines}
                commissionAmount={totals.commissionAmount}
                netAmount={totals.netAmount}
                status="issued"
                signatureDataUrl={signature}
                signedBy={signature ? (user?.name ?? "Signataire") : undefined}
                notes={aiNote ?? undefined}
              />
            </div>
          )}

          {/* Factures enregistrées */}
          <div className="no-print">
            <h2 className="text-lg font-bold mb-4">{tr("facturation_page.saved_invoices")}</h2>
            {isLoading && <p className="text-muted-foreground">{tr("common.loading")}</p>}
            <div className="space-y-4">
              {invoices.map(inv => (
                <Card key={inv.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base">{inv.number}</CardTitle>
                      <Badge>{inv.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {inv.product_name && <p><strong>{tr("facturation_page.product_label")}</strong> {inv.product_name}</p>}
                    <p><strong>{tr("facturation_page.amount_label")}</strong> {inv.amount.toFixed(2)} {inv.currency}</p>
                    <p><strong>{tr("facturation_page.commission_label")}</strong> {inv.commission_amount.toFixed(2)} {inv.currency}</p>
                    <p><strong>{tr("facturation_page.net_label")}</strong> {inv.net_amount.toFixed(2)} {inv.currency}</p>
                    {(inv.port_depart || inv.port_arrival) && (
                      <p className="flex items-center gap-1 text-[#0461A5]">
                        <Ship className="h-4 w-4" />
                        {inv.port_depart ?? "—"} → {inv.port_arrival ?? inv.port_depart ?? "—"}
                        {inv.incoterm && ` · ${inv.incoterm}`}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => void downloadSavedPdf(inv.id, inv.number)}>
                        <FileDown className="h-3 w-3" /> {tr("facturation_page.invoice_pdf")}
                      </Button>
                      {inv.transaction_id && (
                        <>
                          <Button size="sm" onClick={() => fund(inv.transaction_id)}>{tr("transactions.confirm_payment")}</Button>
                          <Button size="sm" variant="secondary" onClick={() => release(inv.transaction_id)}>{tr("transactions.release_funds")}</Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!isLoading && !invoices.length && (
                <p className="text-muted-foreground text-sm">
                  {tr("facturation_page.empty_invoices")}
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export default function Facturation() {
  return (
    <ProtectedRoute roles={["supplier", "admin", "buyer"]}>
      <FacturationContent />
    </ProtectedRoute>
  );
}
