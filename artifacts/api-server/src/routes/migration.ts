import { Router, type IRouter } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { migrateFromMysql } from "../services/mysql-migration";

const router: IRouter = Router();

router.post("/admin/migrate-mysql", requireAuth, requireRole("admin"), async (_req, res) => {
  const result = await migrateFromMysql();
  res.json(result);
});

router.get("/admin/migrate-mysql/status", requireAuth, requireRole("admin"), (_req, res) => {
  res.json({
    configured: Boolean(process.env.MYSQL_DATABASE),
    host: process.env.MYSQL_HOST ?? "127.0.0.1",
    database: process.env.MYSQL_DATABASE ?? "multi_food_db",
  });
});

export default router;
