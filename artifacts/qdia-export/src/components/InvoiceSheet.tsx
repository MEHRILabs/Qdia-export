import type { InvoiceLine } from "@/lib/invoice-types";

export interface InvoiceSheetProps {
  number: string;
  date: string;
  productName: string;
  supplierName: string;
  buyerName: string;
  supplierAddress?: string;
  buyerAddress?: string;
  portDepart?: string;
  portArrival?: string;
  incoterm?: string;
  currency: string;
  lines: InvoiceLine[];
  commissionAmount: number;
  netAmount: number;
  status: string;
  paymentMethod?: string;
  signatureDataUrl?: string | null;
  signedBy?: string;
  notes?: string;
  printRef?: React.RefObject<HTMLDivElement | null>;
}

export function InvoiceSheet({
  number,
  date,
  productName,
  supplierName,
  buyerName,
  supplierAddress,
  buyerAddress,
  portDepart,
  portArrival,
  incoterm,
  currency,
  lines,
  commissionAmount,
  netAmount,
  status,
  paymentMethod,
  signatureDataUrl,
  signedBy,
  notes,
  printRef,
}: InvoiceSheetProps) {
  const subtotal = lines.reduce((s, l) => s + l.total, 0);

  return (
    <div
      ref={printRef}
      id="invoice-print-area"
      className="invoice-sheet bg-white text-[#1A1A2E] rounded-xl border border-[#E5E7EB] shadow-lg overflow-hidden print:shadow-none print:border-0 print:rounded-none"
    >
      {/* En-tête */}
      <div className="bg-[#073B74] px-6 py-5 flex flex-wrap justify-between items-start gap-4">
        <div>
          <p className="text-[#F5C518] font-black text-xl tracking-tight">QDIA EXPORT DZ</p>
          <p className="text-white/90 text-sm mt-0.5">Facture commerciale · Commercial Invoice</p>
        </div>
        <div className="text-right">
          <p className="text-[#F5C518] font-bold text-sm">{number}</p>
          <p className="text-white/80 text-xs mt-1">{date}</p>
        </div>
      </div>

      <div className="px-6 py-5 grid sm:grid-cols-2 gap-6 text-sm">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#0461A5] mb-1">Émetteur</p>
          <p className="font-semibold">{supplierName}</p>
          <p className="text-muted-foreground text-xs mt-0.5">{supplierAddress ?? "Algérie"}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#0461A5] mb-1">Destinataire</p>
          <p className="font-semibold">{buyerName}</p>
          <p className="text-muted-foreground text-xs mt-0.5">{buyerAddress ?? "Importateur international"}</p>
        </div>
      </div>

      <div className="mx-6 mb-4 p-3 rounded-lg border border-[#0461A5]/20 bg-[#F4F8FC] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div><span className="text-muted-foreground">Produit</span><p className="font-medium truncate">{productName}</p></div>
        <div><span className="text-muted-foreground">Incoterm</span><p className="font-medium">{incoterm ?? "FOB"}</p></div>
        <div><span className="text-muted-foreground">Port départ</span><p className="font-medium">{portDepart ?? "—"}</p></div>
        <div><span className="text-muted-foreground">Port arrivée</span><p className="font-medium">{portArrival ?? "—"}</p></div>
      </div>

      {/* Tableau */}
      <div className="px-6 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-[#073B74] text-white">
              <th className="text-left p-2.5 font-semibold">Description</th>
              <th className="p-2.5 font-semibold">Code HS</th>
              <th className="p-2.5 font-semibold text-right">Qté</th>
              <th className="p-2.5 font-semibold">Unité</th>
              <th className="p-2.5 font-semibold text-right">P.U.</th>
              <th className="p-2.5 font-semibold text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className={i % 2 === 0 ? "bg-[#F8FAFC]" : "bg-white"}>
                <td className="p-2.5 border-b border-[#E5E7EB]">{line.description}</td>
                <td className="p-2.5 border-b border-[#E5E7EB] text-center">{line.hs_code ?? "—"}</td>
                <td className="p-2.5 border-b border-[#E5E7EB] text-right">{line.quantity}</td>
                <td className="p-2.5 border-b border-[#E5E7EB]">{line.unit}</td>
                <td className="p-2.5 border-b border-[#E5E7EB] text-right">{line.unit_price.toFixed(2)}</td>
                <td className="p-2.5 border-b border-[#E5E7EB] text-right font-medium">{line.total.toFixed(2)} {currency}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 flex flex-col sm:flex-row justify-between gap-6">
        <div className="sm:w-48">
          <p className="text-[10px] font-bold uppercase text-[#073B74] mb-2">Signature électronique</p>
          <div className="h-16 border border-dashed border-[#ccc] rounded-lg flex items-center justify-center bg-[#fafafa] overflow-hidden">
            {signatureDataUrl ? (
              <img src={signatureDataUrl} alt="Signature" className="max-h-14 max-w-full object-contain" />
            ) : (
              <span className="text-[10px] text-muted-foreground">Signez ci-dessous</span>
            )}
          </div>
          {signedBy && <p className="text-[10px] mt-1 font-medium">{signedBy}</p>}
        </div>
        <div className="text-sm space-y-1 sm:text-right min-w-[200px]">
          <div className="flex justify-between sm:justify-end gap-8">
            <span className="text-muted-foreground">Sous-total</span>
            <span className="font-medium">{subtotal.toFixed(2)} {currency}</span>
          </div>
          <div className="flex justify-between sm:justify-end gap-8">
            <span className="text-muted-foreground">Commission QDIA (3 %)</span>
            <span>-{commissionAmount.toFixed(2)} {currency}</span>
          </div>
          <div className="flex justify-between sm:justify-end gap-8 pt-1 border-t font-bold text-[#073B74]">
            <span>Net exportateur</span>
            <span>{netAmount.toFixed(2)} {currency}</span>
          </div>
          <p className="text-[10px] text-muted-foreground pt-1">
            Statut : {status} {paymentMethod && `· ${paymentMethod}`}
          </p>
        </div>
      </div>

      <div className="px-6 pb-5">
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          {notes ?? "Document généré par QDIA Export DZ — valable pour dossier export Incoterms 2020. 🇩🇿 Made in Algeria"}
        </p>
      </div>
    </div>
  );
}
