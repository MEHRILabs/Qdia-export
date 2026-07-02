import { pgTable, serial, text, real, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const portsTable = pgTable("ports", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  countryCode: text("country_code").notNull(),
  type: text("type").notNull().default("seaport"),
  region: text("region"),
  handlingFeeDzd: real("handling_fee_dzd").notNull().default(800),
  freightToFrDzd: real("freight_to_fr_dzd"),
  freightToAeDzd: real("freight_to_ae_dzd"),
  freightToUsDzd: real("freight_to_us_dzd"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertPortSchema = createInsertSchema(portsTable).omit({ id: true });
export type InsertPort = z.infer<typeof insertPortSchema>;
export type Port = typeof portsTable.$inferSelect;
