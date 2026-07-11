import { desc, eq, inArray } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import { hasRealProductImage } from "./product-enrichment";
import { logger } from "../lib/logger";

const PREMIUM_LIMIT = 6;

/** Évite les syncs concurrentes (deadlock Render). */
let syncing: Promise<number> | null = null;

/**
 * Met en avant les produits publiés avec vraie photo.
 * Ne fait plus `UPDATE … SET is_featured=false` sur toute la table
 * (cause de deadlocks + crash process pendant le scrape).
 */
export async function syncPremiumFeaturedProducts(limit = PREMIUM_LIMIT): Promise<number> {
  if (syncing) return syncing;

  syncing = (async () => {
    try {
      const rows = await db
        .select({
          id: productsTable.id,
          imageUrl: productsTable.imageUrl,
          isFeatured: productsTable.isFeatured,
        })
        .from(productsTable)
        .where(eq(productsTable.exportStatus, "published"))
        .orderBy(desc(productsTable.rating), desc(productsTable.id))
        .limit(Math.max(limit * 20, 200));

      const withPhoto = rows.filter(p => hasRealProductImage(p.imageUrl));
      const featuredIds = withPhoto.slice(0, limit).map(p => p.id);
      const featuredSet = new Set(featuredIds);

      const toEnable = featuredIds.filter(id => {
        const row = rows.find(r => r.id === id);
        return row && !row.isFeatured;
      });
      const toDisable = rows
        .filter(r => r.isFeatured && !featuredSet.has(r.id))
        .map(r => r.id);

      if (toDisable.length) {
        await db
          .update(productsTable)
          .set({ isFeatured: false })
          .where(inArray(productsTable.id, toDisable));
      }
      if (toEnable.length) {
        await db
          .update(productsTable)
          .set({ isFeatured: true })
          .where(inArray(productsTable.id, toEnable));
      }

      return featuredIds.length;
    } finally {
      syncing = null;
    }
  })();

  return syncing;
}

/** Après ajout de photo — ne doit jamais faire planter le process. */
export async function promoteProductToFeatured(_productId: number): Promise<void> {
  try {
    // Marque juste ce produit featured s'il a une photo (léger), sync global différé
    const [p] = await db
      .select({ id: productsTable.id, imageUrl: productsTable.imageUrl, exportStatus: productsTable.exportStatus })
      .from(productsTable)
      .where(eq(productsTable.id, _productId))
      .limit(1);
    if (p && p.exportStatus === "published" && hasRealProductImage(p.imageUrl)) {
      await db.update(productsTable).set({ isFeatured: true }).where(eq(productsTable.id, p.id));
    }
  } catch (err) {
    logger.warn({ err, productId: _productId }, "promoteProductToFeatured ignoré");
  }
}
