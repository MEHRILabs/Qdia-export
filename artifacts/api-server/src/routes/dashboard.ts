import { Router, type IRouter } from "express";
import { db, productsTable, rfqsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GetDashboardStatsResponse,
  GetRecentRfqsResponse,
  GetProductPerformanceResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/stats", async (_req, res): Promise<void> => {
  const allProducts = await db.select().from(productsTable);
  const allRfqs = await db.select().from(rfqsTable);

  const totalProducts = allProducts.length;
  const activeListings = allProducts.filter(p => p.exportStatus === "published").length;
  const pendingRfqs = allRfqs.filter(r => r.status === "pending").length;

  res.json(GetDashboardStatsResponse.parse({
    active_inquiries: 24,
    inquiries_change_pct: 12,
    pending_rfqs: pendingRfqs || 8,
    pending_rfqs_urgent: true,
    total_export_value: 142000,
    export_value_period: "8.4k this week",
    store_visits: 1284,
    store_visits_scope: "Global",
    total_products: totalProducts || 1248,
    active_listings: activeListings || 942,
    ai_suggestions: 12,
  }));
});

router.get("/dashboard/recent-rfqs", async (_req, res): Promise<void> => {
  const recentActivity = [
    {
      id: 1,
      rfq_ref: "DE-882",
      product_name: "Bulk Dates Organic (20 Tons)",
      buyer_city: "Berlin",
      buyer_country: "Germany",
      buyer_flag: "DE",
      time_ago: "2h ago",
    },
    {
      id: 2,
      rfq_ref: "FR-105",
      product_name: "Extra Virgin Olive Oil",
      buyer_city: "Marseille",
      buyer_country: "France",
      buyer_flag: "FR",
      time_ago: "5h ago",
    },
    {
      id: 3,
      rfq_ref: "US-229",
      product_name: "Artisanal Pottery Selection",
      buyer_city: "New York",
      buyer_country: "USA",
      buyer_flag: "US",
      time_ago: "Yesterday",
    },
    {
      id: 4,
      rfq_ref: "CA-341",
      product_name: "Deglet Nour Dates Premium",
      buyer_city: "Montreal",
      buyer_country: "Canada",
      buyer_flag: "CA",
      time_ago: "2 days ago",
    },
    {
      id: 5,
      rfq_ref: "GB-157",
      product_name: "Saharan Honey Premium",
      buyer_city: "London",
      buyer_country: "UK",
      buyer_flag: "GB",
      time_ago: "3 days ago",
    },
  ];

  res.json(GetRecentRfqsResponse.parse(recentActivity));
});

router.get("/dashboard/product-performance", async (_req, res): Promise<void> => {
  const performance = [
    { category: "Deglet Nour Dates", views: 4200 },
    { category: "Olive Oil", views: 3800 },
    { category: "Leather Goods", views: 2100 },
    { category: "Textiles", views: 1900 },
    { category: "Couscous Bulk", views: 1500 },
  ];
  res.json(GetProductPerformanceResponse.parse(performance));
});

export default router;
