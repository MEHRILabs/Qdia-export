import { pgTable, serial, text, integer, real, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";

export const cartItemsTable = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity: real("quantity").notNull(),
  incoterm: text("incoterm").default("FOB"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").notNull(),
  supplierId: integer("supplier_id"),
  items: jsonb("items").notNull().default([]),
  totalAmount: real("total_amount").notNull(),
  currency: text("currency").notNull().default("USD"),
  incoterm: text("incoterm").default("FOB"),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method"),
  transactionId: integer("transaction_id"),
  sourceRfqId: integer("source_rfq_id"),
  trackingNumber: text("tracking_number"),
  carrier: text("carrier"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const disputesTable = pgTable("disputes", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").notNull(),
  orderId: integer("order_id"),
  buyerId: integer("buyer_id").notNull(),
  supplierId: integer("supplier_id"),
  reason: text("reason").notNull(),
  description: text("description"),
  status: text("status").notNull().default("open"),
  resolution: text("resolution"),
  refundAmount: real("refund_amount"),
  mediatorNotes: text("mediator_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const oemRequestsTable = pgTable("oem_requests", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  buyerId: integer("buyer_id").notNull(),
  supplierId: integer("supplier_id"),
  requestType: text("request_type").notNull(),
  logoUrl: text("logo_url"),
  specs: text("specs"),
  quantity: real("quantity"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sampleRequestsTable = pgTable("sample_requests", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  buyerId: integer("buyer_id").notNull(),
  supplierId: integer("supplier_id"),
  quantity: real("quantity").notNull().default(1),
  shippingAddress: text("shipping_address"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const supplierReviewsTable = pgTable("supplier_reviews", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull(),
  userId: integer("user_id").notNull(),
  rating: real("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trackingEventsTable = pgTable("tracking_events", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id"),
  rfqId: integer("rfq_id"),
  carrier: text("carrier").notNull(),
  trackingNumber: text("tracking_number").notNull(),
  status: text("status").notNull(),
  location: text("location"),
  description: text("description"),
  eventAt: timestamp("event_at", { withTimezone: true }).notNull().defaultNow(),
});
