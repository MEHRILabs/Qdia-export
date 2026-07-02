import { eq } from "drizzle-orm";
import { db, transactionsTable, rfqsTable } from "@workspace/db";
import { calcCommission, COMMISSION_RATE } from "./commission";
import { sendPushToUser } from "./fcm";
import { createInvoiceFromTransaction } from "./billing";

export type PaymentMethod = "escrow" | "swift" | "lc" | "stripe";

export async function createTransaction(input: {
  rfqId: number;
  buyerId: number;
  supplierId?: number | null;
  amount: number;
  currency?: string;
  paymentMethod: PaymentMethod;
  swiftReference?: string;
  lcNumber?: string;
}) {
  const { commissionAmount, netAmount, commissionRate } = calcCommission(input.amount);
  const [tx] = await db.insert(transactionsTable).values({
    rfqId: input.rfqId,
    buyerId: input.buyerId,
    supplierId: input.supplierId,
    amount: input.amount,
    currency: input.currency ?? "USD",
    commissionRate,
    commissionAmount,
    netAmount,
    paymentMethod: input.paymentMethod,
    status: "pending",
    swiftReference: input.swiftReference,
    lcNumber: input.lcNumber,
  }).returning();

  try {
    await createInvoiceFromTransaction(tx.id);
  } catch { /* facture optionnelle si tables pas migrées */ }

  return tx;
}

export async function fundTransaction(txId: number, userId: number, refs?: { swift_reference?: string; lc_number?: string }) {
  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, txId)).limit(1);
  if (!tx) throw new Error("Transaction introuvable");
  if (tx.buyerId !== userId) throw new Error("Non autorisé");
  if (tx.status !== "pending") throw new Error("Transaction déjà traitée");

  const [updated] = await db.update(transactionsTable).set({
    status: "funded",
    swiftReference: refs?.swift_reference ?? tx.swiftReference,
    lcNumber: refs?.lc_number ?? tx.lcNumber,
    updatedAt: new Date(),
  }).where(eq(transactionsTable.id, txId)).returning();

  if (tx.supplierId) {
    await sendPushToUser(
      tx.supplierId,
      "Paiement reçu (Escrow)",
      `Fonds bloqués : ${tx.amount} ${tx.currency} — commission QDIA ${(COMMISSION_RATE * 100).toFixed(0)}%`,
    );
  }
  return updated;
}

export async function releaseTransaction(txId: number, userId: number, role: string) {
  const [tx] = await db.select().from(transactionsTable).where(eq(transactionsTable.id, txId)).limit(1);
  if (!tx) throw new Error("Transaction introuvable");
  if (role !== "admin" && tx.buyerId !== userId) throw new Error("Non autorisé");
  if (tx.status !== "funded") throw new Error("La transaction doit être financée");

  const [updated] = await db.update(transactionsTable).set({
    status: "released",
    updatedAt: new Date(),
  }).where(eq(transactionsTable.id, txId)).returning();

  if (tx.supplierId) {
    await sendPushToUser(tx.supplierId, "Fonds libérés", `Vous recevez ${tx.netAmount} ${tx.currency} (net après commission).`);
  }
  return updated;
}

export async function createTransactionOnRfqAccept(rfqId: number, buyerId: number, paymentMethod: PaymentMethod) {
  const [rfq] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, rfqId)).limit(1);
  if (!rfq?.quotePrice) throw new Error("Devis requis avant paiement");
  const amount = rfq.quotePrice * rfq.quantity;
  return createTransaction({
    rfqId,
    buyerId,
    supplierId: rfq.supplierId,
    amount,
    currency: rfq.quoteCurrency ?? "USD",
    paymentMethod,
  });
}
