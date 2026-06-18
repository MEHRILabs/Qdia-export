import { Router, type IRouter } from "express";
import { db, suppliersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  ListSuppliersResponse,
  GetSupplierParams,
  GetSupplierResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function toSupplierShape(s: typeof suppliersTable.$inferSelect) {
  return {
    id: s.id,
    company_name: s.companyName,
    country: s.country,
    wilaya: s.wilaya,
    verified: s.verified,
    verification_level: s.verificationLevel,
    platform_years: s.platformYears,
    response_rate: s.responseRate,
    transaction_count: s.transactionCount,
    description: s.description,
    avatar: s.avatar,
  };
}

router.get("/suppliers", async (_req, res): Promise<void> => {
  const rows = await db.select().from(suppliersTable);
  res.json(ListSuppliersResponse.parse(rows.map(toSupplierShape)));
});

router.get("/suppliers/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetSupplierParams.safeParse({ id: parseInt(raw, 10) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [supplier] = await db.select().from(suppliersTable)
    .where(eq(suppliersTable.id, params.data.id));
  if (!supplier) {
    res.status(404).json({ error: "Supplier not found" });
    return;
  }
  res.json(GetSupplierResponse.parse(toSupplierShape(supplier)));
});

export default router;
