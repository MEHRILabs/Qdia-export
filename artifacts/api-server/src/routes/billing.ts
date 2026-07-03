import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { db, invoicesTable, transactionsTable, productsTable } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { canAccessInvoice, canAccessTransaction } from "../middleware/access-control";
import { createInvoiceFromTransaction } from "../services/billing";
import { generateInvoicePdf, type InvoiceLineItem } from "../services/pdf-generator";
import { generateInvoiceLines } from "../services/invoice-ai";

const router: IRouter = Router();

const aiLinesSchema = z.object({
  product_id: z.number().optional(),
  product_name: z.string().min(1),
  category: z.string().optional(),
  description: z.string().optional(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  price_fob: z.number().optional(),
  currency: z.string().optional(),
  incoterm: z.string().optional(),
  port_depart: z.string().optional(),
  port_arrival: z.string().optional(),
  moq: z.number().optional(),
  moq_unit: z.string().optional(),
  certifications: z.array(z.string()).optional(),
});

const lineSchema = z.object({
  description: z.string(),
  hs_code: z.string().optional(),
  quantity: z.number(),
  unit: z.string(),
  unit_price: z.number(),
  total: z.number(),
});

const previewPdfSchema = z.object({
  number: z.string(),
  product_name: z.string().optional(),
  amount: z.number(),
  commission_amount: z.number(),
  net_amount: z.number(),
  currency: z.string().default("USD"),
  port_depart: z.string().optional(),
  port_arrival: z.string().optional(),
  incoterm: z.string().optional(),
  payment_method: z.string().optional(),
  status: z.string().default("issued"),
  buyer_name: z.string().optional(),
  supplier_name: z.string().optional(),
  buyer_address: z.string().optional(),
  supplier_address: z.string().optional(),
  lines: z.array(lineSchema).optional(),
  notes: z.string().optional(),
  signature_data_url: z.string().optional(),
  signed_by: z.string().optional(),
  signed_at: z.string().optional(),
});

function toInvoiceShape(i: typeof invoicesTable.$inferSelect) {
  return {
    id: i.id,
    number: i.number,
    transaction_id: i.transactionId,
    rfq_id: i.rfqId,
    amount: i.amount,
    commission_amount: i.commissionAmount,
    net_amount: i.netAmount,
    currency: i.currency,
    status: i.status,
    port_depart: i.portDepart,
    port_arrival: i.portArrival,
    incoterm: i.incoterm,
    product_name: i.productName,
    created_at: i.createdAt.toISOString(),
  };
}

function mapLines(lines: z.infer<typeof lineSchema>[]): InvoiceLineItem[] {
  return lines.map(l => ({
    description: l.description,
    hsCode: l.hs_code,
    quantity: l.quantity,
    unit: l.unit,
    unitPrice: l.unit_price,
    total: l.total,
  }));
}

router.get("/billing/invoices", requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.user!.id;
  const role = req.user!.role;
  try {
    const rows = role === "admin"
      ? await db.select().from(invoicesTable).orderBy(desc(invoicesTable.createdAt)).limit(100)
      : await db.select().from(invoicesTable)
        .where(sql`${invoicesTable.buyerId} = ${uid} OR ${invoicesTable.supplierId} = ${uid}`)
        .orderBy(desc(invoicesTable.createdAt))
        .limit(50);
    res.json({ data: rows.map(toInvoiceShape), commission_rate_pct: 3 });
  } catch (err) {
    res.json({ data: [], commission_rate_pct: 3, warning: err instanceof Error ? err.message : "BDD non migrée" });
  }
});

router.post("/billing/invoices/ai-lines", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const body = aiLinesSchema.parse(req.body);
    if (body.product_id) {
      try {
        const [p] = await db.select().from(productsTable).where(eq(productsTable.id, body.product_id)).limit(1);
        if (p) {
          body.product_name = p.name;
          body.category = body.category ?? p.category;
          body.description = body.description ?? p.description ?? undefined;
          body.price_fob = body.price_fob ?? p.priceFob ?? undefined;
          body.moq = body.moq ?? p.moq ?? undefined;
          body.moq_unit = body.moq_unit ?? p.moqUnit ?? undefined;
          body.port_depart = body.port_depart ?? p.portDepart ?? undefined;
          body.certifications = body.certifications ?? p.certifications ?? undefined;
        }
      } catch {
        /* BDD optionnelle */
      }
    }
    const result = await generateInvoiceLines(body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Erreur IA" });
  }
});

router.post("/billing/invoices/preview-pdf", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const body = previewPdfSchema.parse(req.body);
    const pdf = await generateInvoicePdf({
      number: body.number,
      productName: body.product_name,
      amount: body.amount,
      commissionAmount: body.commission_amount,
      netAmount: body.net_amount,
      currency: body.currency,
      portDepart: body.port_depart,
      portArrival: body.port_arrival,
      incoterm: body.incoterm,
      paymentMethod: body.payment_method,
      status: body.status,
      buyerName: body.buyer_name,
      supplierName: body.supplier_name,
      buyerAddress: body.buyer_address,
      supplierAddress: body.supplier_address,
      lines: body.lines ? mapLines(body.lines) : undefined,
      notes: body.notes,
      signatureImageBase64: body.signature_data_url,
      signedBy: body.signed_by,
      signedAt: body.signed_at,
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${body.number}.pdf"`);
    res.send(pdf);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Erreur PDF" });
  }
});

router.post("/billing/invoices/from-transaction/:txId", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const txId = parseInt(String(req.params.txId), 10);
    const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, txId)).limit(1);
    if (!tx) {
      res.status(404).json({ error: "Transaction introuvable" });
      return;
    }
    if (!canAccessTransaction(req.user!, tx)) {
      res.status(403).json({ error: "Accès refusé à cette transaction." });
      return;
    }
    const inv = await createInvoiceFromTransaction(txId);
    res.status(201).json(toInvoiceShape(inv));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Erreur" });
  }
});

router.get("/billing/invoices/:id.pdf", requireAuth, async (req: AuthedRequest, res) => {
  const id = parseInt(String(req.params.id), 10);
  const sig = typeof req.query.signature === "string" ? req.query.signature : undefined;
  const signedBy = typeof req.query.signed_by === "string" ? req.query.signed_by : undefined;
  try {
    const [inv] = await db.select().from(invoicesTable).where(eq(invoicesTable.id, id)).limit(1);
    if (!inv) {
      res.status(404).json({ error: "Facture introuvable" });
      return;
    }
    if (!canAccessInvoice(req.user!, inv)) {
      res.status(403).json({ error: "Accès refusé à cette facture." });
      return;
    }
    let paymentMethod: string | undefined;
    if (inv.transactionId) {
      const [tx] = await db.select().from(transactionsTable)
        .where(eq(transactionsTable.id, inv.transactionId)).limit(1);
      paymentMethod = tx?.paymentMethod;
    }
    const pdf = await generateInvoicePdf({
      number: inv.number,
      productName: inv.productName,
      amount: inv.amount,
      commissionAmount: inv.commissionAmount,
      netAmount: inv.netAmount,
      currency: inv.currency,
      portDepart: inv.portDepart,
      portArrival: inv.portArrival,
      incoterm: inv.incoterm,
      paymentMethod,
      status: inv.status,
      signatureImageBase64: sig,
      signedBy: signedBy ?? req.user?.name,
      signedAt: new Date().toLocaleString("fr-DZ"),
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${inv.number}.pdf"`);
    res.send(pdf);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Erreur PDF" });
  }
});

export default router;
