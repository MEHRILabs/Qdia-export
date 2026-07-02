import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq, desc, sql } from "drizzle-orm";
import { db, transactionsTable } from "@workspace/db";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth";
import { createTransaction, fundTransaction, releaseTransaction, createTransactionOnRfqAccept } from "../services/payments";
import { COMMISSION_RATE } from "../services/commission";

const router: IRouter = Router();

function toTxShape(t: typeof transactionsTable.$inferSelect) {
  return {
    id: t.id,
    rfq_id: t.rfqId,
    buyer_id: t.buyerId,
    supplier_id: t.supplierId,
    amount: t.amount,
    currency: t.currency,
    commission_rate: t.commissionRate,
    commission_amount: t.commissionAmount,
    net_amount: t.netAmount,
    payment_method: t.paymentMethod,
    status: t.status,
    swift_reference: t.swiftReference,
    lc_number: t.lcNumber,
    created_at: t.createdAt.toISOString(),
    updated_at: t.updatedAt.toISOString(),
  };
}

router.get("/payments/transactions", requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.user!.id;
  const role = req.user!.role;
  const rows = role === "admin"
    ? await db.select().from(transactionsTable).orderBy(desc(transactionsTable.createdAt)).limit(200)
    : await db.select().from(transactionsTable)
      .where(sql`${transactionsTable.buyerId} = ${uid} OR ${transactionsTable.supplierId} = ${uid}`)
      .orderBy(desc(transactionsTable.createdAt))
      .limit(100);
  res.json({ data: rows.map(toTxShape), commission_rate_pct: COMMISSION_RATE * 100 });
});

router.post("/payments/escrow", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z.object({
    rfq_id: z.number(),
    payment_method: z.enum(["escrow", "swift", "lc"]).default("escrow"),
    swift_reference: z.string().optional(),
    lc_number: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const tx = await createTransactionOnRfqAccept(
      parsed.data.rfq_id,
      req.user!.id,
      parsed.data.payment_method,
    );
    if (parsed.data.swift_reference || parsed.data.lc_number) {
      await fundTransaction(tx.id, req.user!.id, {
        swift_reference: parsed.data.swift_reference,
        lc_number: parsed.data.lc_number,
      });
    }
    res.status(201).json(toTxShape(tx));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Erreur paiement" });
  }
});

router.post("/payments/:id/fund", requireAuth, async (req: AuthedRequest, res) => {
  const id = parseInt(String(req.params.id), 10);
  const parsed = z.object({
    swift_reference: z.string().optional(),
    lc_number: z.string().optional(),
  }).safeParse(req.body);
  try {
    const tx = await fundTransaction(id, req.user!.id, parsed.success ? parsed.data : undefined);
    res.json(toTxShape(tx));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Erreur" });
  }
});

router.post("/payments/:id/release", requireAuth, async (req: AuthedRequest, res) => {
  const id = parseInt(String(req.params.id), 10);
  try {
    const tx = await releaseTransaction(id, req.user!.id, req.user!.role);
    res.json(toTxShape(tx));
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Erreur" });
  }
});

router.post("/payments/manual", requireAuth, requireRole("admin"), async (req: AuthedRequest, res) => {
  const parsed = z.object({
    rfq_id: z.number().optional(),
    buyer_id: z.number(),
    supplier_id: z.number().optional(),
    amount: z.number().positive(),
    currency: z.string().default("USD"),
    payment_method: z.enum(["escrow", "swift", "lc", "stripe"]),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const tx = await createTransaction({ ...parsed.data, buyerId: parsed.data.buyer_id });
  res.status(201).json(toTxShape(tx));
});

export default router;
