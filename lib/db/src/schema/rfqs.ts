import { pgTable, serial, text, real, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import type { RfqAttachment } from "./commerce";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rfqsTable = pgTable("rfqs", {
  id: serial("id").primaryKey(),
  productName: text("product_name").notNull(),
  productDescription: text("product_description"),
  quantity: real("quantity").notNull(),
  quantityUnit: text("quantity_unit").notNull().default("kg"),
  destinationCountry: text("destination_country").notNull(),
  portDepart: text("port_depart"),
  portArrival: text("port_arrival"),
  requestedIncoterm: text("requested_incoterm").notNull(),
  targetPrice: real("target_price"),
  message: text("message"),
  attachments: jsonb("attachments").$type<RfqAttachment[]>().notNull().default([]),
  status: text("status").notNull().default("pending"),
  buyerId: integer("buyer_id"),
  supplierId: integer("supplier_id"),
  productId: integer("product_id"),
  quotePrice: real("quote_price"),
  quoteCurrency: text("quote_currency").default("USD"),
  quoteMessage: text("quote_message"),
  quoteIncoterm: text("quote_incoterm"),
  trackingNumber: text("tracking_number"),
  shippedAt: timestamp("shipped_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRfqSchema = createInsertSchema(rfqsTable).omit({ id: true, createdAt: true });
export type InsertRfq = z.infer<typeof insertRfqSchema>;
export type Rfq = typeof rfqsTable.$inferSelect;
