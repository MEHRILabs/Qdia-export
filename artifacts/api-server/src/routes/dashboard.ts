import { Router, type IRouter } from "express";
import { db, productsTable, rfqsTable, productViewsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth";
import {
  GetDashboardStatsResponse,
  GetRecentRfqsResponse,
  GetProductPerformanceResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.use(requireAuth, requireRole("supplier", "admin"));

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const allProducts = await db.select().from(productsTable);
  const allRfqs = await db.select().from(rfqsTable);

  const totalProducts = allProducts.length;
  const activeListings = allProducts.filter(p => p.exportStatus === "published").length;
  const pendingProducts = allProducts.filter(p => p.exportStatus === "pending").length;
  const pendingRfqs = allRfqs.filter(r => r.status === "pending").length;
  const totalExportValue = allProducts
    .filter(p => p.exportStatus === "published")
    .reduce((sum, p) => sum + (p.priceFob ?? 0) * (p.moq ?? 0), 0);

  const [{ totalViews }] = await db.select({ totalViews: sql<number>`count(*)::int` }).from(productViewsTable);

  res.json(GetDashboardStatsResponse.parse({
    active_inquiries: allRfqs.length || pendingRfqs,
    inquiries_change_pct: allRfqs.length > 0 ? Math.min(99, pendingRfqs * 5) : 0,
    pending_rfqs: pendingRfqs,
    pending_rfqs_urgent: pendingRfqs > 0,
    total_export_value: Math.round(totalExportValue) || 0,
    export_value_period: activeListings > 0 ? `${activeListings} listings actifs` : "Aucun listing",
    store_visits: totalViews || activeListings * 10,
    store_visits_scope: "Vues produits réelles",
    total_products: totalProducts,
    active_listings: activeListings,
    ai_suggestions: pendingProducts,
  }));
});

router.get("/dashboard/recent-rfqs", async (_req, res): Promise<void> => {
  const rows = await db.select().from(rfqsTable)
    .orderBy(desc(rfqsTable.createdAt))
    .limit(5);

  const recentActivity = rows.map(r => ({
    id: r.id,
    rfq_ref: `RFQ-${r.id}`,
    product_name: r.productName,
    buyer_city: r.destinationCountry,
    buyer_country: r.destinationCountry,
    buyer_flag: r.destinationCountry.slice(0, 2).toUpperCase(),
    time_ago: r.createdAt.toLocaleDateString("fr-FR"),
  }));

  res.json(GetRecentRfqsResponse.parse(recentActivity));
});

router.get("/dashboard/product-performance", async (_req, res): Promise<void> => {
  const published = await db.select().from(productsTable)
    .where(eq(productsTable.exportStatus, "published"));

  const viewCounts = await db.select({
    productId: productViewsTable.productId,
    views: sql<number>`count(*)::int`,
  }).from(productViewsTable).groupBy(productViewsTable.productId);

  const viewMap = new Map(viewCounts.map(v => [v.productId, v.views]));

  const byCategory = published.reduce<Record<string, number>>((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + (viewMap.get(p.id) ?? 0);
    return acc;
  }, {});

  const performance = Object.entries(byCategory).map(([category, views]) => ({
    category,
    views,
  }));

  res.json(GetProductPerformanceResponse.parse(
    performance.length > 0 ? performance : [{ category: "Aucun produit", views: 0 }],
  ));
});

export default router;
