import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { suppliersTable } from "./suppliers";

export type AiWizardStep = "chat" | "generate" | "pricing" | "studio" | "publish";
export type AiSessionStatus = "active" | "completed" | "abandoned";

export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiExtractedData {
  product_name?: string;
  origin_wilaya?: string;
  cost_dzd?: number;
  price_retail?: number;
  price_wholesale?: number;
  moq?: number;
  moq_unit?: string;
  packaging?: string;
  target_market?: string;
  category_hint?: string;
}

export interface AiStudioVersion {
  version: number;
  action: string;
  image_base64: string;
  thumb_base64?: string;
  card_base64?: string;
  created_at: string;
}

export const aiSessionsTable = pgTable("ai_sessions", {
  id: text("id").primaryKey(),
  supplierId: integer("supplier_id").references(() => suppliersTable.id),
  currentStep: text("current_step").notNull().default("chat"),
  status: text("status").notNull().default("active"),
  chatHistory: jsonb("chat_history").$type<AiChatMessage[]>().notNull().default([]),
  extractedData: jsonb("extracted_data").$type<AiExtractedData>().notNull().default({}),
  generatedProduct: jsonb("generated_product"),
  pricingResult: jsonb("pricing_result"),
  studioImages: jsonb("studio_images").$type<AiStudioVersion[]>().notNull().default([]),
  publishedProductId: integer("published_product_id"),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AiSession = typeof aiSessionsTable.$inferSelect;
export type InsertAiSession = typeof aiSessionsTable.$inferInsert;
