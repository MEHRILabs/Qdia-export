import { eq } from "drizzle-orm";
import { db, transactionsTable, rfqsTable, usersTable, ordersTable } from "@workspace/db";
import { calcCommission, COMMISSION_RATE } from "./commission";
import { sendPushToUser } from "./fcm";
import { createInvoiceFromTransaction } from "./billing";

export type PaymentMethod = "escrow" | "swift" | "lc" | "stripe";

export async function createTransaction(input: {
  rfqId?: number | null;
  buyerId: number;
  supplierId?: number | null;
  amount: number;
  currency?: string;
  paymentMethod: PaymentMethod;
  swiftReference?: string;
  lcNumber?: string;
  notes?: string;
}) {
  const { commissionAmount, netAmount, commissionRate } = calcCommission(input.amount);
  const [tx] = await db.insert(transactionsTable).values({
    rfqId: input.rfqId ?? null,
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
    notes: input.notes,
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
    const [supplierUser] = await db.select().from(usersTable)
      .where(eq(usersTable.supplierId, tx.supplierId))
      .limit(1);
    if (supplierUser) {
      await sendPushToUser(
        supplierUser.id,
        "Paiement reçu (Escrow)",
        `Fonds bloqués : ${tx.amount} ${tx.currency} — commission QDIA ${(COMMISSION_RATE * 100).toFixed(0)}%`,
      );
    }
  }

  if (tx.notes) {
    try {
      const meta = JSON.parse(tx.notes) as { order_id?: number };
      if (meta.order_id) {
        await db.update(ordersTable).set({ status: "confirmed" }).where(eq(ordersTable.id, meta.order_id));
      }
    } catch { /* ignore */ }
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

export async function createTransactionFromOrder(
  orderId: number,
  buyerId: number,
  supplierId: number | null | undefined,
  amount: number,
  currency: string,
  paymentMethod: PaymentMethod,
) {
  const tx = await createTransaction({
    buyerId,
    supplierId: supplierId ?? null,
    amount,
    currency,
    paymentMethod,
    notes: JSON.stringify({ order_id: orderId }),
  });
  await sendPushToUser(
    buyerId,
    "Commande enregistrée",
    `Commande #${orderId} — confirmez le paiement Escrow (${amount.toFixed(2)} ${currency})`,
  );
  if (supplierId) {
    const [supplierUser] = await db.select().from(usersTable)
      .where(eq(usersTable.supplierId, supplierId))
      .limit(1);
    if (supplierUser) {
      await sendPushToUser(
        supplierUser.id,
        "Nouvelle commande",
        `Commande #${orderId} en attente de paiement — ${amount.toFixed(2)} ${currency}`,
      );
    }
  }
  return tx;
}
