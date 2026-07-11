/**
 * Job de scraping photos catalogue — lots de 50, progression, reprise.
 * Les produits déjà avec vraie photo sont ignorés (reprise naturelle).
 */
import { eq, or, isNull, sql, asc } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { fetchImageAsBase64 } from "./image-scraper";
import { saveCatalogImage } from "./catalog-image-store";
import { processCatalogPhoto } from "./catalog-image-process";
import { hasRealProductImage, needsPhoto } from "./product-enrichment";
import { promoteProductToFeatured } from "./featured-products";
import {
  extractBingImageUrls,
  searchProductImageUrls,
} from "./catalog-web-scrape";

const BATCH_SIZE = 50;
const MIN_BYTES = 8_000;

export type ScrapeJobStatus = "idle" | "running" | "stopping" | "done" | "error";

export interface ScrapeJobState {
  status: ScrapeJobStatus;
  batch_size: number;
  total_products: number;
  without_photo: number;
  with_photo: number;
  processed: number;
  ok: number;
  failed: number;
  skipped: number;
  current_batch: number;
  last_product_id: number | null;
  last_product_name: string | null;
  message: string;
  errors: string[];
  started_at: string | null;
  updated_at: string | null;
}

const state: ScrapeJobState = {
  status: "idle",
  batch_size: BATCH_SIZE,
  total_products: 0,
  without_photo: 0,
  with_photo: 0,
  processed: 0,
  ok: 0,
  failed: 0,
  skipped: 0,
  current_batch: 0,
  last_product_id: null,
  last_product_name: null,
  message: "",
  errors: [],
  started_at: null,
  updated_at: null,
};

let runner: Promise<void> | null = null;

function touch(msg?: string) {
  state.updated_at = new Date().toISOString();
  if (msg) state.message = msg;
}

async function countStats() {
  const [totalRow] = await db.select({ c: sql<number>`count(*)::int` }).from(productsTable);
  const total = totalRow?.c ?? 0;
  // Approximation : sans image / placeholder / svg
  const [noPhotoRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(productsTable)
    .where(
      or(
        isNull(productsTable.imageUrl),
        eq(productsTable.imageUrl, ""),
        sql`${productsTable.imageUrl} LIKE '%qdia-photo-placeholder%'`,
        sql`${productsTable.imageUrl} LIKE '%.svg'`,
        sql`${productsTable.imageUrl} LIKE '/uploads/catalog/%' AND ${productsTable.imageUrl} NOT LIKE 'http%'`,
      ),
    );
  const without = noPhotoRow?.c ?? 0;
  state.total_products = total;
  state.without_photo = without;
  state.with_photo = Math.max(0, total - without);
}

async function nextBatch(limit: number) {
  return db
    .select()
    .from(productsTable)
    .where(
      or(
        isNull(productsTable.imageUrl),
        eq(productsTable.imageUrl, ""),
        sql`${productsTable.imageUrl} LIKE '%qdia-photo-placeholder%'`,
        sql`${productsTable.imageUrl} LIKE '%.svg'`,
      ),
    )
    .orderBy(asc(productsTable.id))
    .limit(limit);
}

async function persistProcessedImage(productId: number, sku: string | null | undefined, base64: string, sourceUrl?: string): Promise<string> {
  const ephemeral = process.env.RENDER === "true" || process.env.CATALOG_IMAGE_MODE === "remote";
  if (ephemeral && sourceUrl?.startsWith("http")) {
    return sourceUrl;
  }
  if (ephemeral) {
    return `data:image/jpeg;base64,${base64}`;
  }
  const masterId = sku?.trim() || `product_${productId}`;
  return saveCatalogImage(masterId, base64, "jpg");
}

async function scrapeOne(product: { id: number; name: string; imageUrl: string | null; sku?: string | null }) {
  const { scrapeOneProductPhoto } = await import("./catalog-web-scrape");
  const one = await scrapeOneProductPhoto(product.id);
  if (one.reason === "deja_ok") return { ok: false, skipped: true as const };
  if (one.ok) return { ok: true as const, skipped: false as const, image_url: one.image_url };
  return { ok: false as const, skipped: false as const };
}

async function runLoop() {
  state.status = "running";
  state.started_at = state.started_at ?? new Date().toISOString();
  touch("Démarrage du scraping…");
  await countStats();

  try {
    while (state.status === "running") {
      const batch = await nextBatch(state.batch_size);
      if (!batch.length) {
        state.status = "done";
        touch("Terminé — plus de produits sans photo.");
        await countStats();
        break;
      }

      state.current_batch += 1;
      touch(`Lot ${state.current_batch} — ${batch.length} produits…`);

      for (const p of batch) {
        if (state.status === "stopping") break;

        state.last_product_id = p.id;
        state.last_product_name = p.name;
        state.processed += 1;

        try {
          const one = await scrapeOne(p);
          if (one.skipped) state.skipped += 1;
          else if (one.ok) state.ok += 1;
          else {
            state.failed += 1;
            if (state.errors.length < 40) state.errors.push(`${p.id}: aucune image`);
          }
        } catch (e) {
          state.failed += 1;
          const msg = e instanceof Error ? e.message : String(e);
          if (state.errors.length < 40) state.errors.push(`${p.id}: ${msg}`);
        }

        touch(
          `Lot ${state.current_batch} — ${state.ok} OK / ${state.processed} traités · reste ~${Math.max(0, state.without_photo - state.ok)}`,
        );

        // Petite pause anti rate-limit
        await new Promise(r => setTimeout(r, 350));
      }

      await countStats();

      if (state.status === "stopping") {
        state.status = "idle";
        touch("Arrêté par l'admin — reprise possible.");
        break;
      }
    }
  } catch (err) {
    state.status = "error";
    state.message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "scrape job crash");
  } finally {
    runner = null;
    if (state.status === "running") {
      state.status = "done";
      touch("Terminé.");
    }
  }
}

export function getScrapeJobState(): ScrapeJobState {
  return { ...state, errors: [...state.errors] };
}

export async function startScrapeJob(opts?: { batch_size?: number }): Promise<ScrapeJobState> {
  if (state.status === "running") return getScrapeJobState();

  state.batch_size = Math.min(Math.max(opts?.batch_size ?? BATCH_SIZE, 10), 50);
  state.processed = 0;
  state.ok = 0;
  state.failed = 0;
  state.skipped = 0;
  state.current_batch = 0;
  state.errors = [];
  state.started_at = new Date().toISOString();
  state.status = "running";
  touch("Job démarré");

  runner = runLoop();
  // Ne pas await — réponse HTTP immédiate
  void runner;

  return getScrapeJobState();
}

export function stopScrapeJob(): ScrapeJobState {
  if (state.status === "running") {
    state.status = "stopping";
    touch("Arrêt demandé…");
  }
  return getScrapeJobState();
}

export async function refreshScrapeStats(): Promise<ScrapeJobState> {
  await countStats();
  touch();
  return getScrapeJobState();
}

// Réexport pour routes one-shot
export { extractBingImageUrls, searchProductImageUrls };
