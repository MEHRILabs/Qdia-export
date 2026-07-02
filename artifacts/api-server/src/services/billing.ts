import { eq } from "drizzle-orm";
import { db, invoicesTable, transactionsTable, rfqsTable } from "@workspace/db";

export async function createInvoiceFromTransaction(txId: number) {
  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, txId)).limit(1);
  if (!tx) throw new Error("Transaction introuvable");

  const [existing] = await db.select().from(invoicesTable)
    .where(eq(invoicesTable.transactionId, txId)).limit(1);
  if (existing) return existing;

  let portDepart: string | null = null;
  let portArrival: string | null = null;
  let incoterm: string | null = null;
  let productName: string | null = null;

  if (tx.rfqId) {
    const [rfq] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, tx.rfqId)).limit(1);
    if (rfq) {
      portDepart = rfq.portDepart;
      portArrival = rfq.portArrival;
      incoterm = rfq.quoteIncoterm ?? rfq.requestedIncoterm;
      productName = rfq.productName;
    }
  }

  const number = `QDIA-${new Date().getFullYear()}-${String(txId).padStart(5, "0")}`;
  const [inv] = await db.insert(invoicesTable).values({
    number,
    transactionId: txId,
    rfqId: tx.rfqId,
    buyerId: tx.buyerId,
    supplierId: tx.supplierId,
    amount: tx.amount,
    commissionAmount: tx.commissionAmount,
    netAmount: tx.netAmount,
    currency: tx.currency,
    status: tx.status === "released" ? "paid" : tx.status === "funded" ? "issued" : "draft",
    portDepart,
    portArrival,
    incoterm,
    productName,
  }).returning();

  return inv;
}
