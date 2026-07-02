import PDFDocument from "pdfkit";
import type { Product } from "@workspace/db";

function collectPdf(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}

export async function generateCertificatePdf(product: Product, supplierName?: string): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.fontSize(22).fillColor("#073B74").text("QDIA Export — Certificat produit", { align: "center" });
  doc.moveDown();
  doc.fontSize(10).fillColor("#666").text(`Émis le ${new Date().toLocaleDateString("fr-DZ")}`, { align: "center" });
  doc.moveDown(2);
  doc.fontSize(14).fillColor("#000").text(product.name, { underline: true });
  doc.moveDown();
  doc.fontSize(11).text(`Exportateur : ${supplierName ?? product.supplierName ?? "—"}`);
  doc.text(`Origine : ${product.originWilaya ?? product.supplierLocation ?? "Algérie"}`);
  doc.text(`Catégorie : ${product.category}`);
  doc.text(`MOQ : ${product.moq} ${product.moqUnit}`);
  doc.text(`Port de départ : ${product.portDepart}`);
  doc.moveDown();
  if (product.certifications?.length) {
    doc.fontSize(12).fillColor("#073B74").text("Certifications");
    doc.fontSize(11).fillColor("#000");
    for (const c of product.certifications) doc.text(`  ✓ ${c}`);
  }
  doc.moveDown(2);
  doc.fontSize(9).fillColor("#888").text(
    "Ce document atteste la conformité déclarée du produit sur la plateforme QDIA Export DZ. " +
    "Il ne remplace pas les certificats officiels (phytosanitaire, origine, Halal, etc.).",
    { align: "justify" },
  );
  doc.moveDown();
  doc.text("🇩🇿 Made in Algeria — qdiadz.com", { align: "center" });
  return collectPdf(doc);
}

export interface InvoiceLineItem {
  description: string;
  hsCode?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface InvoicePdfData {
  number: string;
  productName?: string | null;
  amount: number;
  commissionAmount: number;
  netAmount: number;
  currency: string;
  portDepart?: string | null;
  portArrival?: string | null;
  incoterm?: string | null;
  paymentMethod?: string;
  status: string;
  buyerName?: string;
  supplierName?: string;
  buyerAddress?: string;
  supplierAddress?: string;
  lines?: InvoiceLineItem[];
  notes?: string;
  signatureImageBase64?: string;
  signedBy?: string;
  signedAt?: string;
}

function drawInvoiceTable(
  doc: InstanceType<typeof PDFDocument>,
  lines: InvoiceLineItem[],
  currency: string,
  startY: number,
): number {
  const left = 50;
  const cols = [left, 280, 330, 370, 410, 470];
  const headers = ["Description", "Code HS", "Qté", "Unité", "P.U.", "Total"];

  doc.rect(left, startY, 495, 22).fill("#073B74");
  doc.fontSize(9).fillColor("#fff");
  headers.forEach((h, i) => doc.text(h, cols[i] + 4, startY + 6, { width: (cols[i + 1] ?? 545) - cols[i] - 8 }));

  let y = startY + 22;
  doc.fillColor("#000");

  for (let row = 0; row < lines.length; row++) {
    const line = lines[row];
    const rowH = 28;
    if (y + rowH > 720) {
      doc.addPage();
      y = 50;
    }
    if (row % 2 === 0) doc.rect(left, y, 495, rowH).fill("#F4F8FC");
    doc.fillColor("#1A1A2E").fontSize(8);
    doc.text(line.description.slice(0, 55), cols[0] + 4, y + 8, { width: 220 });
    doc.text(line.hsCode ?? "—", cols[1] + 4, y + 8, { width: 44 });
    doc.text(String(line.quantity), cols[2] + 4, y + 8, { width: 34 });
    doc.text(line.unit, cols[3] + 4, y + 8, { width: 34 });
    doc.text(`${line.unitPrice.toFixed(2)}`, cols[4] + 4, y + 8, { width: 54 });
    doc.text(`${line.total.toFixed(2)} ${currency}`, cols[5] + 4, y + 8, { width: 70 });
    y += rowH;
  }

  doc.rect(left, y, 495, 1).fill("#073B74");
  return y + 12;
}

function embedSignature(doc: InstanceType<typeof PDFDocument>, dataUrl: string, x: number, y: number) {
  try {
    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    const buf = Buffer.from(base64, "base64");
    doc.image(buf, x, y, { width: 140, height: 50, fit: [140, 50] });
  } catch {
    /* ignore */
  }
}

export async function generateInvoicePdf(inv: InvoicePdfData): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const dateStr = new Date().toLocaleDateString("fr-DZ", { day: "2-digit", month: "long", year: "numeric" });

  doc.rect(0, 0, 595, 90).fill("#073B74");
  doc.fontSize(22).fillColor("#F5C518").text("QDIA EXPORT DZ", 50, 28);
  doc.fontSize(11).fillColor("#fff").text("Facture commerciale / Commercial Invoice", 50, 54);
  doc.fontSize(10).fillColor("#F5C518").text(`N° ${inv.number}`, 400, 32, { width: 145, align: "right" });
  doc.fillColor("#fff").text(dateStr, 400, 50, { width: 145, align: "right" });

  doc.fontSize(10).fillColor("#073B74").text("ÉMETTEUR / EXPORTATEUR", 50, 105);
  doc.fontSize(9).fillColor("#333").text(inv.supplierName ?? "Exportateur QDIA certifié", 50, 120);
  doc.text(inv.supplierAddress ?? "Algérie — Plateforme QDIA Export DZ", 50, 133, { width: 220 });

  doc.fontSize(10).fillColor("#073B74").text("DESTINATAIRE / IMPORTATEUR", 320, 105);
  doc.fontSize(9).fillColor("#333").text(inv.buyerName ?? "Importateur international", 320, 120);
  doc.text(inv.buyerAddress ?? "À compléter sur la plateforme", 320, 133, { width: 220 });

  const metaY = 175;
  doc.roundedRect(50, metaY, 495, 52, 4).stroke("#0461A5");
  doc.fontSize(9).fillColor("#073B74");
  doc.text(`Produit : ${inv.productName ?? "—"}`, 58, metaY + 10, { width: 230 });
  doc.text(`Incoterm : ${inv.incoterm ?? "FOB"}`, 58, metaY + 26);
  doc.text(`Port départ : ${inv.portDepart ?? "—"}`, 300, metaY + 10);
  doc.text(`Port arrivée : ${inv.portArrival ?? "—"}`, 300, metaY + 26);
  doc.text(`Statut : ${inv.status.toUpperCase()}`, 430, metaY + 10);
  if (inv.paymentMethod) doc.text(`Paiement : ${inv.paymentMethod}`, 430, metaY + 26);

  const lines: InvoiceLineItem[] = inv.lines?.length
    ? inv.lines
    : [{
      description: inv.productName ?? "Marchandise export",
      hsCode: "—",
      quantity: 1,
      unit: "lot",
      unitPrice: inv.amount,
      total: inv.amount,
    }];

  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const tableEnd = drawInvoiceTable(doc, lines, inv.currency, metaY + 65);

  let y = tableEnd;
  const totalsX = 360;
  doc.fontSize(10).fillColor("#333");
  doc.text("Sous-total :", totalsX, y);
  doc.text(`${subtotal.toFixed(2)} ${inv.currency}`, 470, y, { width: 75, align: "right" });
  y += 16;
  doc.text("Commission QDIA (3 %) :", totalsX, y);
  doc.text(`-${inv.commissionAmount.toFixed(2)} ${inv.currency}`, 470, y, { width: 75, align: "right" });
  y += 16;
  doc.fontSize(11).fillColor("#073B74").text("Net exportateur :", totalsX, y);
  doc.text(`${inv.netAmount.toFixed(2)} ${inv.currency}`, 470, y, { width: 75, align: "right" });

  y += 30;
  doc.roundedRect(50, y, 240, 80, 4).stroke("#ccc");
  doc.fontSize(8).fillColor("#073B74").text("SIGNATURE ÉLECTRONIQUE", 58, y + 8);
  if (inv.signatureImageBase64) {
    embedSignature(doc, inv.signatureImageBase64, 58, y + 22);
  } else {
    doc.fontSize(9).fillColor("#999").text("_________________________", 58, y + 40);
  }
  if (inv.signedBy) doc.fontSize(8).fillColor("#333").text(inv.signedBy, 58, y + 62);
  if (inv.signedAt) doc.fontSize(7).fillColor("#888").text(inv.signedAt, 58, y + 72);

  doc.fontSize(8).fillColor("#666").text(
    inv.notes ?? "Document généré par QDIA Export DZ. Valable pour dossier export Incoterms 2020.",
    300,
    y + 10,
    { width: 245, align: "justify" },
  );
  doc.text("🇩🇿 Made in Algeria — qdiadz.com", 300, y + 55, { width: 245, align: "center" });

  return collectPdf(doc);
}

export async function generateCatalogPdf(
  products: Array<Pick<Product, "name" | "category" | "priceFob" | "priceCurrency" | "moq" | "moqUnit" | "supplierName">>,
  title = "Catalogue QDIA Export",
): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.fontSize(20).fillColor("#073B74").text(title, { align: "center" });
  doc.fontSize(10).fillColor("#666").text(`${products.length} produits — ${new Date().toLocaleDateString("fr-DZ")}`, { align: "center" });
  doc.moveDown(2);

  for (const p of products) {
    doc.fontSize(12).fillColor("#000").text(p.name);
    doc.fontSize(9).fillColor("#444")
      .text(`${p.category} | FOB ${p.priceFob} ${p.priceCurrency} | MOQ ${p.moq} ${p.moqUnit} | ${p.supplierName ?? ""}`);
    doc.moveDown(0.8);
    if (doc.y > 720) doc.addPage();
  }

  doc.moveDown();
  doc.fontSize(8).fillColor("#888").text("Généré par QDIA Export DZ — export.qdiadz.com", { align: "center" });
  return collectPdf(doc);
}
