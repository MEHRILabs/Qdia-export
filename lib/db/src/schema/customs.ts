import { pgTable, serial, text, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customsTariffsTable = pgTable("customs_tariffs", {
  id: serial("id").primaryKey(),
  destinationCountry: text("destination_country").notNull(),
  destinationCode: text("destination_code").notNull(),
  productCategory: text("product_category").notNull(),
  hsCode: text("hs_code"),
  dutyRatePct: real("duty_rate_pct").notNull().default(0),
  vatRatePct: real("vat_rate_pct").notNull().default(0),
  customsFeeDzd: real("customs_fee_dzd").notNull().default(0),
  documentationFeeDzd: real("documentation_fee_dzd").notNull().default(500),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertCustomsTariffSchema = createInsertSchema(customsTariffsTable).omit({ id: true });
export type InsertCustomsTariff = z.infer<typeof insertCustomsTariffSchema>;
export type CustomsTariff = typeof customsTariffsTable.$inferSelect;
