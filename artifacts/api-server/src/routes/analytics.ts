import { Router, type IRouter } from "express";
import { requireAuth } from "../middleware/auth";
import { getAnalyticsOverview } from "../services/analytics";

const router: IRouter = Router();

router.get("/analytics/overview", requireAuth, async (_req, res) => {
  try {
    const data = await getAnalyticsOverview();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Analytics indisponible" });
  }
});

export default router;
