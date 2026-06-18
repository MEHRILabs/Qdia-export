import { Router, type IRouter } from "express";
import { db, rfqsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListRfqsResponse,
  CreateRfqBody,
  GetRfqParams,
  GetRfqResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toRfqShape(r: typeof rfqsTable.$inferSelect) {
  return {
    id: r.id,
    product_name: r.productName,
    quantity: r.quantity,
    quantity_unit: r.quantityUnit,
    destination_country: r.destinationCountry,
    requested_incoterm: r.requestedIncoterm,
    target_price: r.targetPrice,
    message: r.message,
    status: r.status as "pending" | "quoted" | "accepted" | "rejected",
    created_at: r.createdAt.toISOString(),
  };
}

router.get("/rfq", async (_req, res): Promise<void> => {
  const rows = await db.select().from(rfqsTable).orderBy(rfqsTable.createdAt);
  res.json(ListRfqsResponse.parse(rows.map(toRfqShape)));
});

router.post("/rfq", async (req, res): Promise<void> => {
  const parsed = CreateRfqBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const [rfq] = await db.insert(rfqsTable).values({
    productName: d.product_name,
    productDescription: d.product_description,
    quantity: d.quantity,
    quantityUnit: d.quantity_unit,
    destinationCountry: d.destination_country,
    requestedIncoterm: d.requested_incoterm,
    targetPrice: d.target_price,
    message: d.message,
  }).returning();
  res.status(201).json(GetRfqResponse.parse(toRfqShape(rfq)));
});

router.get("/rfq/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetRfqParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [rfq] = await db.select().from(rfqsTable)
    .where(eq(rfqsTable.id, params.data.id));
  if (!rfq) {
    res.status(404).json({ error: "RFQ not found" });
    return;
  }
  res.json(GetRfqResponse.parse(toRfqShape(rfq)));
});

export default router;
