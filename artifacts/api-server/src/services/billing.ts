import { eq } from "drizzle-orm";
import { db, invoicesTable, transactionsTable, rfqsTable, ordersTable } from "@workspace/db";

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
  } else if (tx.notes) {
    try {
      const meta = JSON.parse(tx.notes) as { order_id?: number };
      if (meta.order_id) {
        const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, meta.order_id)).limit(1);
        if (order) {
          const items = order.items as Array<{ product_name?: string; incoterm?: string }>;
          productName = items.map(i => i.product_name).filter(Boolean).join(", ") || `Commande #${meta.order_id}`;
          incoterm = items[0]?.incoterm ?? null;
        }
      }
    } catch { /* ignore */ }
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
