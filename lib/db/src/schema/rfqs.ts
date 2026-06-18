import { pgTable, serial, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const rfqsTable = pgTable("rfqs", {
  id: serial("id").primaryKey(),
  productName: text("product_name").notNull(),
  productDescription: text("product_description"),
  quantity: real("quantity").notNull(),
  quantityUnit: text("quantity_unit").notNull().default("kg"),
  destinationCountry: text("destination_country").notNull(),
  requestedIncoterm: text("requested_incoterm").notNull(),
  targetPrice: real("target_price"),
  message: text("message"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertRfqSchema = createInsertSchema(rfqsTable).omit({ id: true, createdAt: true });
export type InsertRfq = z.infer<typeof insertRfqSchema>;
export type Rfq = typeof rfqsTable.$inferSelect;
