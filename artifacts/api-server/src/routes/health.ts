import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/config/public", (_req, res) => {
  res.json({
    google_maps_key: process.env.VITE_GOOGLE_MAPS_API_KEY
      ?? process.env.GOOGLE_MAPS_API_KEY
      ?? process.env.GOOGLE_MAPS_API_KEY_SERVER
      ?? "",
  });
});

router.get("/healthz", async (_req, res) => {
  let dbStatus = "ok";
  let productCount = 0;
  try {
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable);
    productCount = row?.count ?? 0;
  } catch {
    dbStatus = "error";
  }
  const data = HealthCheckResponse.parse({ status: dbStatus === "ok" ? "ok" : "degraded" });
  res.json({ ...data, database: dbStatus, products: productCount });
});

export default router;
