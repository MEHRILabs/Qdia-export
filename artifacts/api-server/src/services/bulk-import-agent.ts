import { db, productsTable, suppliersTable } from "@workspace/db";
import { logger } from "../lib/logger";
import {
  parseExcelProducts,
  wholesaleToIncoterms,
  type ExcelProductRow,
} from "./excel-import";
import {
  scrapeImagesFromPages,
  fetchImageAsBase64,
  toDataUrl,
  type ScrapedImage,
} from "./image-scraper";
import { aiVisionJson } from "./ai/engine";
import { PRODUCT_SYSTEM_PROMPT, buildProductPrompt, parseJsonFromAi } from "./ai/types";
import { agentOrchestrator } from "./agent-orchestrator";

export interface BulkImportOptions {
  file_base64?: string;
  source_urls?: string[];
  image_urls?: string[];
  scrape_images?: boolean;
  enrich_with_ai?: boolean;
  publish?: boolean;
  destination_country?: string;
  port_code?: string;
  supplier_id?: number;
}

export interface BulkImportItemResult {
  name: string;
  status: "imported" | "skipped" | "error";
  product_id?: number;
  image_url?: string;
  message?: string;
}

export interface BulkImportResult {
  session_id: string;
  scraped_images: number;
  imported: number;
  skipped: number;
  errors: number;
  items: BulkImportItemResult[];
}

async function ensureDefaultSupplier(): Promise<{ id: number; name: string; location?: string | null }> {
  const [existing] = await db.select().from(suppliersTable).limit(1);
  if (existing) {
    return { id: existing.id, name: existing.companyName, location: existing.wilaya };
  }
  const [created] = await db.insert(suppliersTable).values({
    companyName: "Coopérative QDIA Demo",
    wilaya: "Béjaïa",
    verified: true,
    verificationLevel: 2,
  }).returning();
  return { id: created.id, name: created.companyName, location: created.wilaya };
}

async function enrichProductWithVision(
  row: ExcelProductRow,
  imageBase64?: string,
): Promise<Partial<ExcelProductRow> & { seo_tags?: string[] }> {
  if (!imageBase64) return {};

  const desc = row.description ?? row.name;
  const { data: raw } = await aiVisionJson(
    PRODUCT_SYSTEM_PROMPT,
    buildProductPrompt(desc, "FR", row.price_wholesale ?? row.price_retail),
    imageBase64,
  );

  const ai = parseJsonFromAi(raw) as {
    name_fr?: string;
    description_fr?: string;
    category?: string;
    suggested_moq?: number;
    suggested_moq_unit?: string;
    suggested_port?: string;
    certifications?: string[];
    seo_tags?: string[];
  };
  return {
    name: ai.name_fr || row.name,
    description: ai.description_fr || row.description,
    category: ai.category || row.category,
    moq: ai.suggested_moq ?? row.moq,
    moq_unit: ai.suggested_moq_unit ?? row.moq_unit,
    port_depart: ai.suggested_port ?? row.port_depart,
    certifications: ai.certifications?.length ? ai.certifications : row.certifications,
    seo_tags: ai.seo_tags,
  };
}

async function resolveImageForRow(
  row: ExcelProductRow,
  index: number,
  scraped: ScrapedImage[],
  directUrls: string[],
): Promise<string | undefined> {
  if (row.image_url && row.image_url.startsWith("http")) return row.image_url;

  if (row.source_url) {
    try {
      const pageImages = await scrapeImagesFromPages([row.source_url]);
      if (pageImages[0]) return pageImages[0].url;
    } catch (err) {
      logger.warn({ err, source: row.source_url }, "row source scrape failed");
    }
  }

  if (directUrls[index]) return directUrls[index];
  if (scraped[index]) return scraped[index].url;
  return undefined;
}

export async function runBulkImport(options: BulkImportOptions): Promise<BulkImportResult> {
  const session = await agentOrchestrator.createSession(options.supplier_id);
  const items: BulkImportItemResult[] = [];

  let rows: ExcelProductRow[] = [];
  if (options.file_base64) {
    const buffer = Buffer.from(options.file_base64, "base64");
    rows = parseExcelProducts(buffer);
  }

  let scraped: ScrapedImage[] = [];
  const directUrls = (options.image_urls ?? []).filter(u => u.startsWith("http"));

  if (options.scrape_images !== false && (options.source_urls?.length ?? 0) > 0) {
    scraped = await scrapeImagesFromPages(options.source_urls ?? []);
  }

  if (rows.length === 0 && scraped.length > 0) {
    rows = scraped.map((img, i) => ({
      name: img.alt?.trim() || `Produit importé ${i + 1}`,
      category: "Agriculture & Food",
      moq: 100,
      moq_unit: "kg",
      port_depart: "Alger",
      image_url: img.url,
      source_url: img.source_page,
    }));
  }

  if (rows.length === 0 && directUrls.length > 0) {
    rows = directUrls.map((url, i) => ({
      name: `Produit image ${i + 1}`,
      category: "Agriculture & Food",
      moq: 100,
      moq_unit: "kg",
      port_depart: "Alger",
      image_url: url,
    }));
  }

  if (rows.length === 0) {
    return {
      session_id: session.id,
      scraped_images: scraped.length,
      imported: 0,
      skipped: 0,
      errors: 1,
      items: [{ name: "—", status: "error", message: "Aucune donnée à importer (Excel, URLs ou images requis)" }],
    };
  }

  const supplier = await ensureDefaultSupplier();
  const dest = options.destination_country ?? "FR";
  const portCode = options.port_code ?? "DZBJA";

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      let imageUrl = await resolveImageForRow(row, i, scraped, directUrls);
      let imageBase64: string | undefined;

      if (imageUrl?.startsWith("http")) {
        try {
          const fetched = await fetchImageAsBase64(imageUrl);
          imageBase64 = fetched.base64;
          if (options.enrich_with_ai !== false) {
            imageUrl = toDataUrl(fetched.base64, fetched.mime);
          }
        } catch (err) {
          logger.warn({ err, imageUrl }, "image fetch failed, keeping URL");
        }
      }

      let enriched = row;
      if (options.enrich_with_ai !== false && imageBase64) {
        try {
          const aiData = await enrichProductWithVision(row, imageBase64);
          enriched = { ...row, ...aiData };
        } catch (err) {
          logger.warn({ err, name: row.name }, "AI enrich failed");
        }
      }

      const costDzd = enriched.price_wholesale ?? enriched.price_retail;
      let prices = costDzd
        ? wholesaleToIncoterms(costDzd, enriched.price_currency ?? "DZD")
        : { exw: 0, fob: 0, cfr: 0, cif: 0 };

      if (costDzd && costDzd > 0) {
        try {
          const pricing = await agentOrchestrator.runPricing(session.id, {
            product_name: enriched.name,
            cost_dzd: costDzd,
            quantity: enriched.moq,
            quantity_unit: enriched.moq_unit,
            destination_country: dest,
            port_code: portCode,
          });
          prices = {
            exw: pricing.exw_usd,
            fob: pricing.fob_usd,
            cfr: pricing.cfr_usd,
            cif: pricing.cif_usd,
          };
        } catch (err) {
          logger.warn({ err, name: enriched.name }, "pricing failed, fallback excel");
        }
      }

      const [product] = await db.insert(productsTable).values({
        name: enriched.name,
        description: enriched.description,
        category: enriched.category,
        sku: enriched.sku,
        imageUrl: imageUrl,
        images: imageUrl ? [imageUrl] : [],
        moq: enriched.moq,
        moqUnit: enriched.moq_unit,
        portDepart: enriched.port_depart,
        originWilaya: enriched.origin_wilaya,
        certifications: enriched.certifications ?? [],
        packaging: enriched.packaging,
        exportStatus: options.publish ? "published" : "pending",
        priceExw: prices.exw,
        priceFob: prices.fob,
        priceCfr: prices.cfr,
        priceCif: prices.cif,
        priceCurrency: "USD",
        priceUnit: `per ${enriched.moq_unit}`,
        priceRetail: enriched.price_retail,
        priceWholesale: enriched.price_wholesale,
        supplierId: supplier.id,
        supplierName: supplier.name,
        supplierLocation: supplier.location ?? undefined,
        targetMarkets: [dest],
      }).returning();

      items.push({
        name: enriched.name,
        status: "imported",
        product_id: product.id,
        image_url: imageUrl,
      });
    } catch (err) {
      items.push({
        name: row.name,
        status: "error",
        message: err instanceof Error ? err.message : "Erreur import",
      });
    }
  }

  return {
    session_id: session.id,
    scraped_images: scraped.length + directUrls.length,
    imported: items.filter(i => i.status === "imported").length,
    skipped: items.filter(i => i.status === "skipped").length,
    errors: items.filter(i => i.status === "error").length,
    items,
  };
}

export async function previewScrapedImages(source_urls: string[]): Promise<ScrapedImage[]> {
  return scrapeImagesFromPages(source_urls);
}
