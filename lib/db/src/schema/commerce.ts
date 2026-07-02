import { pgTable, serial, text, integer, real, timestamp, jsonb, uniqueIndex } from "drizzle-orm/pg-core";

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  rfqId: integer("rfq_id"),
  buyerId: integer("buyer_id").notNull(),
  supplierId: integer("supplier_id"),
  amount: real("amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  commissionRate: real("commission_rate").notNull().default(0.03),
  commissionAmount: real("commission_amount").notNull(),
  netAmount: real("net_amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  status: text("status").notNull().default("pending"),
  swiftReference: text("swift_reference"),
  lcNumber: text("lc_number"),
  stripeSessionId: text("stripe_session_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const fcmTokensTable = pgTable("fcm_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  token: text("token").notNull(),
  platform: text("platform").notNull().default("web"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [uniqueIndex("fcm_user_token_idx").on(t.userId, t.token)]);

export type RfqAttachment = { name: string; mime: string; url: string; size?: number };

export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  number: text("number").notNull(),
  transactionId: integer("transaction_id"),
  rfqId: integer("rfq_id"),
  buyerId: integer("buyer_id").notNull(),
  supplierId: integer("supplier_id"),
  amount: real("amount").notNull(),
  commissionAmount: real("commission_amount").notNull(),
  netAmount: real("net_amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("issued"),
  portDepart: text("port_depart"),
  portArrival: text("port_arrival"),
  incoterm: text("incoterm"),
  productName: text("product_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
