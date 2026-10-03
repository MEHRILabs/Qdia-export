import fs from "node:fs";
import path from "node:path";
import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, rfqsTable, transactionsTable } from "@workspace/db";
import { eq, desc, or, and, isNull } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { canAccessRfq } from "../middleware/access-control";
import { createTransactionOnRfqAccept, fundTransaction } from "../services/payments";
import { sendPushToUser } from "../services/fcm";
import { uploadsDir } from "../lib/runtime-paths";

const router: IRouter = Router();
const UPLOAD_DIR = path.join(uploadsDir(), "rfq");

type RfqStatus = "pending" | "quoted" | "accepted" | "rejected" | "shipped";

function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

function toRfqShape(r: typeof rfqsTable.$inferSelect) {
  return {
    id: r.id,
    product_name: r.productName,
    product_description: r.productDescription,
    product_id: r.productId,
    quantity: r.quantity,
    quantity_unit: r.quantityUnit,
    destination_country: r.destinationCountry,
    port_depart: r.portDepart,
    port_arrival: r.portArrival,
    requested_incoterm: r.requestedIncoterm,
    target_price: r.targetPrice,
    message: r.message,
    attachments: r.attachments ?? [],
    status: r.status as RfqStatus,
    buyer_id: r.buyerId,
    supplier_id: r.supplierId,
    quote_price: r.quotePrice,
    quote_currency: r.quoteCurrency,
    quote_message: r.quoteMessage,
    quote_incoterm: r.quoteIncoterm,
    tracking_number: r.trackingNumber,
    shipped_at: r.shippedAt?.toISOString() ?? null,
    created_at: r.createdAt.toISOString(),
    updated_at: r.updatedAt.toISOString(),
  };
}

router.get("/rfq", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const uid = req.user!.id;
  const role = req.user!.role;
  const supplierId = req.user!.supplier_id;
  try {
    let rows;
    if (role === "admin") {
      rows = await db.select().from(rfqsTable).orderBy(desc(rfqsTable.createdAt)).limit(100);
    } else if (role === "supplier" && supplierId) {
      rows = await db.select().from(rfqsTable)
        .where(or(eq(rfqsTable.supplierId, supplierId), and(eq(rfqsTable.status, "pending"), isNull(rfqsTable.supplierId))))
        .orderBy(desc(rfqsTable.createdAt))
        .limit(50);
    } else {
      rows = await db.select().from(rfqsTable)
        .where(eq(rfqsTable.buyerId, uid))
        .orderBy(desc(rfqsTable.createdAt))
        .limit(50);
    }
    res.json({ data: rows.map(toRfqShape) });
  } catch {
    res.json({ data: [] });
  }
});

router.post("/rfq", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const parsed = z.object({
    product_name: z.string().min(1),
    product_description: z.string().optional(),
    product_id: z.number().optional(),
    quantity: z.number().positive(),
    quantity_unit: z.string().default("kg"),
    destination_country: z.string().min(1),
    port_depart: z.string().optional(),
    port_arrival: z.string().optional(),
    requested_incoterm: z.string().min(1),
    target_price: z.number().optional(),
    message: z.string().optional(),
    supplier_id: z.number().optional(),
    attachments: z.array(z.object({
      name: z.string(),
      mime: z.string(),
      data: z.string(),
    })).optional(),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const d = parsed.data;
  const attachments: Array<{ name: string; mime: string; url: string; size?: number }> = [];

  if (d.attachments?.length) {
    ensureUploadDir();
    for (const file of d.attachments) {
      const buf = Buffer.from(file.data, "base64");
      if (buf.length > 10 * 1024 * 1024) {
        res.status(400).json({ error: `Fichier trop volumineux : ${file.name}` });
        return;
      }
      const safe = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const filePath = path.join(UPLOAD_DIR, safe);
      fs.writeFileSync(filePath, buf);
      attachments.push({ name: file.name, mime: file.mime, url: `/uploads/rfq/${safe}`, size: buf.length });
    }
  }

  const [rfq] = await db.insert(rfqsTable).values({
    productName: d.product_name,
    productDescription: d.product_description,
    productId: d.product_id,
    quantity: d.quantity,
    quantityUnit: d.quantity_unit,
    destinationCountry: d.destination_country,
    portDepart: d.port_depart,
    portArrival: d.port_arrival,
    requestedIncoterm: d.requested_incoterm,
    targetPrice: d.target_price,
    message: d.message,
    buyerId: req.user!.id,
    supplierId: d.supplier_id,
    attachments,
    status: "pending",
  }).returning();

  res.status(201).json(toRfqShape(rfq));
});

router.get("/rfq/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const [rfq] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, id));
  if (!rfq) {
    res.status(404).json({ error: "RFQ not found" });
    return;
  }
  if (!canAccessRfq(req.user!, rfq)) {
    res.status(403).json({ error: "Accès refusé à ce devis." });
    return;
  }
  res.json(toRfqShape(rfq));
});

router.patch("/rfq/:id", requireAuth, async (req: AuthedRequest, res): Promise<void> => {
  const id = parseInt(String(req.params.id), 10);
  const [existing] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, id));
  if (!existing) {
    res.status(404).json({ error: "RFQ not found" });
    return;
  }

  const parsed = z.object({
    action: z.enum(["quote", "accept", "reject", "ship"]),
    quote_price: z.number().optional(),
    quote_currency: z.string().optional(),
    quote_message: z.string().optional(),
    quote_incoterm: z.string().optional(),
    tracking_number: z.string().optional(),
    payment_method: z.enum(["escrow", "swift", "lc"]).optional(),
    swift_reference: z.string().optional(),
    lc_number: z.string().optional(),
  }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const role = req.user!.role;
  const { action } = parsed.data;
  const updates: Partial<typeof rfqsTable.$inferInsert> = { updatedAt: new Date() };

  if (action === "quote") {
    if (role !== "supplier" && role !== "admin") {
      res.status(403).json({ error: "Réservé aux exportateurs" });
      return;
    }
    updates.status = "quoted";
    updates.quotePrice = parsed.data.quote_price;
    updates.quoteCurrency = parsed.data.quote_currency ?? "USD";
    updates.quoteMessage = parsed.data.quote_message;
    updates.quoteIncoterm = parsed.data.quote_incoterm;
    updates.supplierId = req.user!.supplier_id ?? existing.supplierId;
    if (existing.buyerId) {
      await sendPushToUser(existing.buyerId, "Nouveau devis RFQ", `Devis reçu pour ${existing.productName}`);
    }
  } else if (action === "accept" || action === "reject") {
    if (role !== "buyer" && role !== "admin" && existing.buyerId !== req.user!.id) {
      res.status(403).json({ error: "Réservé à l'acheteur" });
      return;
    }
    updates.status = action === "accept" ? "accepted" : "rejected";
    if (action === "accept" && existing.quotePrice) {
      try {
        await createTransactionOnRfqAccept(
          id,
          req.user!.id,
          parsed.data.payment_method ?? "escrow",
        );
        if (parsed.data.swift_reference || parsed.data.lc_number) {
          const [tx] = await db.select().from(transactionsTable)
            .where(eq(transactionsTable.rfqId, id))
            .orderBy(desc(transactionsTable.createdAt))
            .limit(1);
          if (tx) {
            await fundTransaction(tx.id, req.user!.id, {
              swift_reference: parsed.data.swift_reference,
              lc_number: parsed.data.lc_number,
            });
          }
        }
      } catch {
        /* transaction optionnelle si déjà créée */
      }
      if (existing.supplierId) {
        await sendPushToUser(existing.supplierId, "RFQ acceptée", `${existing.productName} — préparez l'expédition`);
      }
    }
  } else if (action === "ship") {
    if (role !== "supplier" && role !== "admin") {
      res.status(403).json({ error: "Réservé aux exportateurs" });
      return;
    }
    updates.status = "shipped";
    updates.trackingNumber = parsed.data.tracking_number;
    updates.shippedAt = new Date();
    if (existing.buyerId) {
      await sendPushToUser(existing.buyerId, "Expédition en cours", `Suivi : ${parsed.data.tracking_number ?? "—"}`);
    }
  }

  const [rfq] = await db.update(rfqsTable).set(updates).where(eq(rfqsTable.id, id)).returning();
  res.json(toRfqShape(rfq));
});

export default router;
