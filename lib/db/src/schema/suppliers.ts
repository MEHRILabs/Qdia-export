import { pgTable, serial, text, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const suppliersTable = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull(),
  country: text("country").notNull().default("Algeria"),
  wilaya: text("wilaya").notNull(),
  verified: boolean("verified").notNull().default(false),
  verificationLevel: integer("verification_level").notNull().default(1),
  platformYears: integer("platform_years").notNull().default(1),
  responseRate: real("response_rate").notNull().default(0),
  transactionCount: integer("transaction_count").notNull().default(0),
  description: text("description"),
  avatar: text("avatar"),
});

export const insertSupplierSchema = createInsertSchema(suppliersTable).omit({ id: true });
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliersTable.$inferSelect;
