import { Router, type IRouter } from "express";
import { db, categoriesTable } from "@workspace/db";
import { ListCategoriesResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/categories", async (_req, res): Promise<void> => {
  const categories = await db.select().from(categoriesTable);
  res.json(ListCategoriesResponse.parse(categories.map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    icon: c.icon,
    product_count: c.productCount,
  }))));
});

export default router;
