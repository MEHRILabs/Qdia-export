import { desc, eq } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import { hasRealProductImage } from "./product-enrichment";

const PREMIUM_LIMIT = 6;

/** Met en avant les produits publiés avec vraie photo (dashboard accueil). */
export async function syncPremiumFeaturedProducts(limit = PREMIUM_LIMIT): Promise<number> {
  await db.update(productsTable).set({ isFeatured: false });

  const rows = await db.select().from(productsTable)
    .where(eq(productsTable.exportStatus, "published"))
    .orderBy(desc(productsTable.rating), desc(productsTable.id));

  const withPhoto = rows.filter(p => hasRealProductImage(p.imageUrl));
  const featured = withPhoto.slice(0, limit);

  for (const p of featured) {
    await db.update(productsTable)
      .set({ isFeatured: true })
      .where(eq(productsTable.id, p.id));
  }

  return featured.length;
}

/** Après ajout de photo ou publication — recalcule la sélection premium. */
export async function promoteProductToFeatured(_productId: number): Promise<void> {
  await syncPremiumFeaturedProducts(PREMIUM_LIMIT);
}
