import { Router, type IRouter } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db, customsTariffsTable } from "@workspace/db";
import { calculateCustoms, FALLBACK_CUSTOMS, FALLBACK_PORTS } from "../services/ports-customs";

const router: IRouter = Router();

const calcSchema = z.object({
  product_category: z.string(),
  destination_code: z.enum(["FR", "AE", "US", "DZ", "TN", "ES", "IT", "UK", "SA"]),
  cif_value_dzd: z.number().positive(),
  port_code: z.string().optional(),
});

router.get("/customs", async (req, res) => {
  const dest = req.query.destination as string | undefined;
  try {
    const rows = await db.select().from(customsTariffsTable).where(eq(customsTariffsTable.isActive, true));
    let list = rows.length
      ? rows.map(r => ({
          destination_country: r.destinationCountry,
          destination_code: r.destinationCode,
          product_category: r.productCategory,
          hs_code: r.hsCode,
          duty_rate_pct: r.dutyRatePct,
          vat_rate_pct: r.vatRatePct,
          customs_fee_dzd: r.customsFeeDzd,
          documentation_fee_dzd: r.documentationFeeDzd,
          notes: r.notes,
        }))
      : [...FALLBACK_CUSTOMS];

    if (dest) list = list.filter(t => t.destination_code === dest);
    res.json({ tariffs: list });
  } catch {
    let list = [...FALLBACK_CUSTOMS];
    if (dest) list = list.filter(t => t.destination_code === dest);
    res.json({ tariffs: list });
  }
});

router.post("/customs/calculate", (req, res) => {
  try {
    const body = calcSchema.parse(req.body);
    const result = calculateCustoms(body, FALLBACK_PORTS, FALLBACK_CUSTOMS);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Calcul douane invalide" });
  }
});

export default router;
