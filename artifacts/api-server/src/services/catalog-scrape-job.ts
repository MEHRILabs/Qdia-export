/**
 * Job de scraping photos catalogue — lots courts, progression, reprise.
 * Réponse HTTP immédiate (évite timeout Render ~30s).
 */
import { eq, or, isNull, sql, asc, and } from "drizzle-orm";
import { db, productsTable } from "@workspace/db";
import { logger } from "../lib/logger";
import { PHOTO_MISS_MARKER } from "./catalog-web-scrape";

const BATCH_SIZE = 10;

export type ScrapeJobStatus = "idle" | "running" | "stopping" | "done" | "error";

export interface ScrapeJobState {
  status: ScrapeJobStatus;
  batch_size: number;
  max_ok: number | null;
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
  ids_ok: number[];
  started_at: string | null;
  updated_at: string | null;
}

const state: ScrapeJobState = {
  status: "idle",
  batch_size: BATCH_SIZE,
  max_ok: null,
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
  ids_ok: [],
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
  const [noPhotoRow] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(productsTable)
    .where(
      or(
        isNull(productsTable.imageUrl),
        eq(productsTable.imageUrl, ""),
        sql`${productsTable.imageUrl} LIKE '%qdia-photo-placeholder%'`,
        sql`${productsTable.imageUrl} LIKE '%.svg'`,
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
      and(
        or(
          isNull(productsTable.imageUrl),
          eq(productsTable.imageUrl, ""),
          sql`${productsTable.imageUrl} LIKE '%qdia-photo-placeholder%'`,
          sql`${productsTable.imageUrl} LIKE '%.svg'`,
          // Chemins /uploads morts sur Render — à re-scraper
          sql`${productsTable.imageUrl} LIKE '/uploads/%'`,
          sql`${productsTable.imageUrl} LIKE 'http%'`,
        ),
        sql`NOT (COALESCE(${productsTable.images}::text, '') LIKE ${"%" + PHOTO_MISS_MARKER + "%"})`,
      ),
    )
    .orderBy(asc(productsTable.id))
    .limit(limit);
}

async function scrapeOne(product: { id: number; name: string }) {
  const { scrapeOneProductPhoto } = await import("./catalog-web-scrape");
  const one = await scrapeOneProductPhoto(product.id);
  if (one.reason === "deja_ok") return { ok: false, skipped: true as const };
  if (one.ok) return { ok: true as const, skipped: false as const };
  return { ok: false as const, skipped: false as const, reason: one.reason };
}

async function runLoop() {
  state.status = "running";
  state.started_at = state.started_at ?? new Date().toISOString();
  touch("Démarrage du scraping…");
  await countStats();

  try {
    while (state.status === "running") {
      if (state.max_ok != null && state.ok >= state.max_ok) {
        state.status = "done";
        touch(`Objectif atteint — ${state.ok} photos.`);
        await countStats();
        break;
      }

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
        if (state.max_ok != null && state.ok >= state.max_ok) break;

        state.last_product_id = p.id;
        state.last_product_name = p.name;
        state.processed += 1;

        try {
          const one = await scrapeOne(p);
          if (one.skipped) state.skipped += 1;
          else if (one.ok) {
            state.ok += 1;
            state.ids_ok.push(p.id);
          } else {
            state.failed += 1;
            if (state.errors.length < 40) {
              state.errors.push(`${p.id}: ${one.reason ?? "aucune image"}`);
            }
          }
        } catch (e) {
          state.failed += 1;
          const msg = e instanceof Error ? e.message : String(e);
          if (state.errors.length < 40) state.errors.push(`${p.id}: ${msg}`);
        }

        touch(
          `${state.ok} OK / ${state.processed} traités` +
            (state.max_ok != null ? ` (cible ${state.max_ok})` : ""),
        );

        await new Promise((r) => setTimeout(r, 200));
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
  return { ...state, errors: [...state.errors], ids_ok: [...state.ids_ok] };
}

export async function startScrapeJob(opts?: {
  batch_size?: number;
  max_ok?: number;
}): Promise<ScrapeJobState> {
  if (state.status === "running") return getScrapeJobState();

  // Nettoyer junk publiés — sans toucher aux pending review
  try {
    const { purgeUnsafeCatalogImages, PHOTO_MISS_MARKER } = await import("./catalog-web-scrape");
    await purgeUnsafeCatalogImages();
    // Réautoriser les produits précédemment « miss » pour un nouvel essai
    await db
      .update(productsTable)
      .set({ images: [] })
      .where(sql`COALESCE(${productsTable.images}::text, '') LIKE ${"%" + PHOTO_MISS_MARKER + "%"}`);
  } catch (err) {
    logger.warn({ err }, "purge avant scrape ignorée");
  }

  state.batch_size = Math.min(Math.max(opts?.batch_size ?? BATCH_SIZE, 5), 20);
  state.max_ok =
    opts?.max_ok != null && Number.isFinite(opts.max_ok)
      ? Math.min(Math.max(Math.floor(opts.max_ok), 1), 100)
      : null;
  state.processed = 0;
  state.ok = 0;
  state.failed = 0;
  state.skipped = 0;
  state.current_batch = 0;
  state.errors = [];
  state.ids_ok = [];
  state.started_at = new Date().toISOString();
  state.status = "running";
  touch(state.max_ok ? `Job démarré (cible ${state.max_ok})` : "Job démarré");

  runner = runLoop();
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
