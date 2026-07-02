import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import { requireAuth, requireRole } from "../middleware/auth";
import { generateCertificatePdf, generateCatalogPdf } from "../services/pdf-generator";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/documents/catalog.pdf", async (_req, res) => {
  try {
    let products: typeof productsTable.$inferSelect[] = [];
    try {
      products = await db.select().from(productsTable)
        .where(eq(productsTable.exportStatus, "published"))
        .limit(200);
    } catch (dbErr) {
      logger.warn({ err: dbErr }, "Catalog PDF sans BDD — catalogue vide");
    }
    const pdf = await generateCatalogPdf(products);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="qdia-catalogue.pdf"');
    res.send(pdf);
  } catch (err) {
    logger.error({ err }, "catalog.pdf failed");
    res.status(500).json({ error: err instanceof Error ? err.message : "Erreur génération PDF" });
  }
});

router.get("/documents/products/:id/certificate.pdf", async (req, res) => {
  const id = parseInt(String(req.params.id), 10);
  try {
    const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!product) {
      res.status(404).json({ error: "Produit introuvable" });
      return;
    }
    const pdf = await generateCertificatePdf(product);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="qdia-certificat-${id}.pdf"`);
    res.send(pdf);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Erreur PDF" });
  }
});

router.get("/documents/supplier/:supplierId/catalog.pdf", requireAuth, requireRole("supplier", "admin"), async (req, res) => {
  const supplierId = parseInt(String(req.params.supplierId), 10);
  const products = await db.select().from(productsTable)
    .where(eq(productsTable.supplierId, supplierId));
  const pdf = await generateCatalogPdf(products, "Catalogue exportateur QDIA");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="catalogue-fournisseur-${supplierId}.pdf"`);
  res.send(pdf);
});

export default router;
