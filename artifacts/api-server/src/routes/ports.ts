import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, portsTable } from "@workspace/db";
import { FALLBACK_PORTS } from "../services/ports-customs";

const router: IRouter = Router();

function mapPort(p: typeof portsTable.$inferSelect | PortRow) {
  return {
    id: "id" in p ? p.id : undefined,
    code: p.code,
    name: p.name,
    city: p.city,
    country: p.country,
    country_code: "countryCode" in p ? p.countryCode : p.country_code,
    type: p.type,
    region: p.region,
    handling_fee_dzd: "handlingFeeDzd" in p ? p.handlingFeeDzd : p.handling_fee_dzd,
    freight_to_fr_dzd: "freightToFrDzd" in p ? p.freightToFrDzd : p.freight_to_fr_dzd,
    freight_to_ae_dzd: "freightToAeDzd" in p ? p.freightToAeDzd : p.freight_to_ae_dzd,
    freight_to_us_dzd: "freightToUsDzd" in p ? p.freightToUsDzd : p.freight_to_us_dzd,
  };
}

router.get("/ports", async (req, res) => {
  const country = req.query.country as string | undefined;
  try {
    const rows = await db.select().from(portsTable).where(eq(portsTable.isActive, true));
    const list = rows.length ? rows.map(mapPort) : FALLBACK_PORTS.map(mapPort);
    const filtered = country
      ? list.filter(p => p.country_code === country || p.country.toLowerCase().includes(country.toLowerCase()))
      : list;

    const grouped = {
      algeria: filtered.filter(p => p.country_code === "DZ"),
      international: filtered.filter(p => p.country_code !== "DZ"),
    };

    res.json({ ports: filtered, grouped });
  } catch {
    const list = FALLBACK_PORTS.map(mapPort);
    res.json({
      ports: list,
      grouped: {
        algeria: list.filter(p => p.country_code === "DZ"),
        international: list.filter(p => p.country_code !== "DZ"),
      },
    });
  }
});

router.get("/ports/:code", async (req, res): Promise<void> => {
  try {
    const [row] = await db.select().from(portsTable).where(eq(portsTable.code, req.params.code)).limit(1);
    if (row) {
      res.json(mapPort(row));
      return;
    }
  } catch { /* fallback */ }

  const fallback = FALLBACK_PORTS.find(p => p.code === req.params.code);
  if (!fallback) {
    res.status(404).json({ error: "Port introuvable" });
    return;
  }
  res.json(mapPort(fallback));
});

export default router;
