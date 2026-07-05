import { pgTable, serial, text, integer, boolean, real, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { suppliersTable } from "./suppliers";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  sku: text("sku"),
  imageUrl: text("image_url"),
  images: text("images").array().notNull().default([]),
  supplierId: integer("supplier_id").notNull().references(() => suppliersTable.id),
  supplierName: text("supplier_name"),
  supplierLocation: text("supplier_location"),
  moq: real("moq").notNull(),
  moqUnit: text("moq_unit").notNull().default("kg"),
  portDepart: text("port_depart").notNull().default("Alger"),
  originWilaya: text("origin_wilaya"),
  certifications: text("certifications").array().notNull().default([]),
  packaging: text("packaging"),
  processing: text("processing"),
  exportStatus: text("export_status").notNull().default("published"),
  priceExw: real("price_exw").notNull(),
  priceFob: real("price_fob").notNull(),
  priceCfr: real("price_cfr").notNull(),
  priceCif: real("price_cif").notNull(),
  priceCurrency: text("price_currency").notNull().default("USD"),
  priceUnit: text("price_unit").notNull().default("per liter"),
  priceRetail: real("price_retail"),
  priceWholesale: real("price_wholesale"),
  rating: real("rating"),
  reviewCount: integer("review_count"),
  ordersFulfilled: integer("orders_fulfilled"),
  targetMarkets: text("target_markets").array().notNull().default([]),
  isFeatured: boolean("is_featured").notNull().default(false),
  originCountry: text("origin_country").notNull().default("DZ"),
  exportAuthorized: boolean("export_authorized").notNull().default(true),
  stockCountries: text("stock_countries").array().notNull().default(["DZ"]),
  priceDdp: real("price_ddp"),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
