import {
  db, productsTable, productViewsTable, favoritesTable,
  cartItemsTable, ordersTable, disputesTable, oemRequestsTable,
  sampleRequestsTable, supplierReviewsTable,
} from "@workspace/db";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";

let nextId = 1000;
const mem = {
  cart: [] as Array<{ id: number; userId: number; productId: number; quantity: number; incoterm: string; notes?: string }>,
  orders: [] as Array<Record<string, unknown>>,
  disputes: [] as Array<Record<string, unknown>>,
  oem: [] as Array<Record<string, unknown>>,
  samples: [] as Array<Record<string, unknown>>,
  supplierReviews: [] as Array<Record<string, unknown>>,
};

async function dbOk(): Promise<boolean> {
  try {
    await db.select({ id: productsTable.id }).from(productsTable).limit(1);
    return true;
  } catch {
    return false;
  }
}

export async function getCart(userId: number) {
  if (await dbOk()) {
    try {
      const rows = await db.select().from(cartItemsTable).where(eq(cartItemsTable.userId, userId));
      return rows.map(r => ({ id: r.id, product_id: r.productId, quantity: r.quantity, incoterm: r.incoterm, notes: r.notes }));
    } catch { /* fallback mem */ }
  }
  return mem.cart.filter(c => c.userId === userId).map(c => ({
    id: c.id, product_id: c.productId, quantity: c.quantity, incoterm: c.incoterm, notes: c.notes,
  }));
}

export async function addToCart(userId: number, productId: number, quantity: number, incoterm = "FOB", notes?: string) {
  if (await dbOk()) {
    try {
      const [row] = await db.insert(cartItemsTable).values({ userId, productId, quantity, incoterm, notes }).returning();
      return { id: row.id, product_id: row.productId, quantity: row.quantity, incoterm: row.incoterm, notes: row.notes };
    } catch { /* mem */ }
  }
  const existing = mem.cart.find(c => c.userId === userId && c.productId === productId);
  if (existing) {
    existing.quantity += quantity;
    return { id: existing.id, product_id: existing.productId, quantity: existing.quantity, incoterm: existing.incoterm, notes: existing.notes };
  }
  const item = { id: ++nextId, userId, productId, quantity, incoterm, notes };
  mem.cart.push(item);
  return { id: item.id, product_id: item.productId, quantity: item.quantity, incoterm: item.incoterm, notes: item.notes };
}

export async function removeFromCart(userId: number, itemId: number) {
  if (await dbOk()) {
    try {
      await db.delete(cartItemsTable).where(and(eq(cartItemsTable.id, itemId), eq(cartItemsTable.userId, userId)));
      return;
    } catch { /* mem */ }
  }
  mem.cart = mem.cart.filter(c => !(c.id === itemId && c.userId === userId));
}

export async function checkout(userId: number, paymentMethod: string) {
  const items = await getCart(userId);
  if (!items.length) throw new Error("Panier vide");

  const productIds = items.map(i => i.product_id);
  let products: typeof productsTable.$inferSelect[] = [];
  if (await dbOk()) {
    products = await db.select().from(productsTable).where(sql`${productsTable.id} IN (${sql.join(productIds.map(id => sql`${id}`), sql`, `)})`);
  }

  const orderItems = items.map(item => {
    const p = products.find(pr => pr.id === item.product_id);
    const unitPrice = p?.priceFob ?? 1000;
    return {
      product_id: item.product_id,
      product_name: p?.name ?? `Produit #${item.product_id}`,
      quantity: item.quantity,
      unit_price: unitPrice,
      total: unitPrice * item.quantity,
      incoterm: item.incoterm,
      supplier_id: p?.supplierId,
    };
  });
  const total = orderItems.reduce((s, i) => s + i.total, 0);
  const supplierId = orderItems[0]?.supplier_id as number | undefined;

  const order = {
    id: ++nextId,
    buyer_id: userId,
    supplier_id: supplierId ?? null,
    items: orderItems,
    total_amount: total,
    currency: "USD",
    status: "pending_payment",
    payment_method: paymentMethod,
    trade_assurance: true,
    created_at: new Date().toISOString(),
  };

  if (await dbOk()) {
    try {
      const [row] = await db.insert(ordersTable).values({
        buyerId: userId,
        supplierId: supplierId,
        items: orderItems,
        totalAmount: total,
        paymentMethod,
        status: "pending_payment",
      }).returning();
      order.id = row.id;
    } catch { mem.orders.push(order); }
  } else {
    mem.orders.push(order);
  }

  if (await dbOk()) {
    try {
      await db.delete(cartItemsTable).where(eq(cartItemsTable.userId, userId));
    } catch { mem.cart = mem.cart.filter(c => c.userId !== userId); }
  } else {
    mem.cart = mem.cart.filter(c => c.userId !== userId);
  }

  return order;
}

export async function getOrders(userId: number, role: string) {
  if (await dbOk()) {
    try {
      const rows = role === "admin"
        ? await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(100)
        : await db.select().from(ordersTable)
          .where(sql`${ordersTable.buyerId} = ${userId} OR ${ordersTable.supplierId} = ${userId}`)
          .orderBy(desc(ordersTable.createdAt)).limit(50);
      return rows.map(r => ({
        id: r.id, buyer_id: r.buyerId, supplier_id: r.supplierId,
        items: r.items, total_amount: r.totalAmount, currency: r.currency,
        status: r.status, payment_method: r.paymentMethod, transaction_id: r.transactionId,
        tracking_number: r.trackingNumber, carrier: r.carrier,
        trade_assurance: true, created_at: r.createdAt.toISOString(),
      }));
    } catch { /* mem */ }
  }
  return mem.orders.filter(o =>
    role === "admin" || o.buyer_id === userId || o.supplier_id === userId,
  );
}

export async function reorder(userId: number, orderId: number) {
  const orders = await getOrders(userId, "buyer");
  const source = orders.find(o => o.id === orderId);
  if (!source) throw new Error("Commande introuvable");
  const items = source.items as Array<{ product_id: number; quantity: number; incoterm?: string }>;
  for (const item of items) {
    await addToCart(userId, item.product_id, item.quantity, item.incoterm ?? "FOB");
  }
  return getCart(userId);
}

export async function createDispute(data: {
  transactionId: number; buyerId: number; supplierId?: number;
  orderId?: number; reason: string; description?: string;
}) {
  const dispute = {
    id: ++nextId,
    transaction_id: data.transactionId,
    order_id: data.orderId ?? null,
    buyer_id: data.buyerId,
    supplier_id: data.supplierId ?? null,
    reason: data.reason,
    description: data.description ?? "",
    status: "open",
    trade_assurance: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  if (await dbOk()) {
    try {
      const [row] = await db.insert(disputesTable).values({
        transactionId: data.transactionId,
        orderId: data.orderId,
        buyerId: data.buyerId,
        supplierId: data.supplierId,
        reason: data.reason,
        description: data.description,
        status: "open",
      }).returning();
      dispute.id = row.id;
    } catch { mem.disputes.push(dispute); }
  } else {
    mem.disputes.push(dispute);
  }
  return dispute;
}

export async function getDisputes(userId: number, role: string) {
  if (await dbOk()) {
    try {
      const rows = role === "admin"
        ? await db.select().from(disputesTable).orderBy(desc(disputesTable.createdAt)).limit(100)
        : await db.select().from(disputesTable)
          .where(sql`${disputesTable.buyerId} = ${userId} OR ${disputesTable.supplierId} = ${userId}`)
          .orderBy(desc(disputesTable.createdAt)).limit(50);
      return rows.map(r => ({
        id: r.id, transaction_id: r.transactionId, order_id: r.orderId,
        buyer_id: r.buyerId, supplier_id: r.supplierId, reason: r.reason,
        description: r.description, status: r.status, resolution: r.resolution,
        refund_amount: r.refundAmount, mediator_notes: r.mediatorNotes,
        trade_assurance: true,
        created_at: r.createdAt.toISOString(), updated_at: r.updatedAt.toISOString(),
      }));
    } catch { /* mem */ }
  }
  return mem.disputes.filter(d =>
    role === "admin" || d.buyer_id === userId || d.supplier_id === userId,
  );
}

export async function mediateDispute(id: number, action: "refund" | "resolve" | "reject", notes?: string, refundAmount?: number) {
  const update = {
    status: action === "refund" ? "refunded" : action === "resolve" ? "resolved" : "rejected",
    resolution: action,
    mediator_notes: notes,
    refund_amount: refundAmount,
    updated_at: new Date().toISOString(),
  };
  if (await dbOk()) {
    try {
      await db.update(disputesTable).set({
        status: update.status,
        resolution: update.resolution,
        mediatorNotes: notes,
        refundAmount,
        updatedAt: new Date(),
      }).where(eq(disputesTable.id, id));
    } catch {
      const d = mem.disputes.find(x => x.id === id);
      if (d) Object.assign(d, update);
    }
  } else {
    const d = mem.disputes.find(x => x.id === id);
    if (d) Object.assign(d, update);
  }
  return getDisputes(0, "admin").then(all => all.find(d => d.id === id));
}

export async function createOemRequest(data: Record<string, unknown>) {
  const req = { id: ++nextId, ...data, status: "pending", created_at: new Date().toISOString() };
  if (await dbOk()) {
    try {
      const [row] = await db.insert(oemRequestsTable).values({
        productId: data.product_id as number,
        buyerId: data.buyer_id as number,
        supplierId: data.supplier_id as number | undefined,
        requestType: data.request_type as string,
        logoUrl: data.logo_url as string | undefined,
        specs: data.specs as string | undefined,
        quantity: data.quantity as number | undefined,
      }).returning();
      req.id = row.id;
    } catch { mem.oem.push(req); }
  } else mem.oem.push(req);
  return req;
}

export async function createSampleRequest(data: Record<string, unknown>) {
  const req = { id: ++nextId, ...data, status: "pending", created_at: new Date().toISOString() };
  if (await dbOk()) {
    try {
      const [row] = await db.insert(sampleRequestsTable).values({
        productId: data.product_id as number,
        buyerId: data.buyer_id as number,
        supplierId: data.supplier_id as number | undefined,
        quantity: (data.quantity as number) ?? 1,
        shippingAddress: data.shipping_address as string | undefined,
      }).returning();
      req.id = row.id;
    } catch { mem.samples.push(req); }
  } else mem.samples.push(req);
  return req;
}

export async function getSupplierReviews(supplierId: number) {
  if (await dbOk()) {
    try {
      const rows = await db.select().from(supplierReviewsTable)
        .where(eq(supplierReviewsTable.supplierId, supplierId))
        .orderBy(desc(supplierReviewsTable.createdAt)).limit(50);
      const avg = rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : 0;
      return {
        average: Math.round(avg * 10) / 10,
        count: rows.length,
        reviews: rows.map(r => ({ id: r.id, rating: r.rating, comment: r.comment, user_id: r.userId, created_at: r.createdAt.toISOString() })),
      };
    } catch { /* mem */ }
  }
  const rows = mem.supplierReviews.filter(r => r.supplier_id === supplierId);
  const avg = rows.length ? rows.reduce((s, r) => s + (r.rating as number), 0) / rows.length : 0;
  return { average: avg, count: rows.length, reviews: rows };
}

export async function postSupplierReview(supplierId: number, userId: number, rating: number, comment?: string) {
  const review = { id: ++nextId, supplier_id: supplierId, user_id: userId, rating, comment, created_at: new Date().toISOString() };
  if (await dbOk()) {
    try {
      const [row] = await db.insert(supplierReviewsTable).values({ supplierId, userId, rating, comment }).returning();
      review.id = row.id;
    } catch { mem.supplierReviews.push(review); }
  } else mem.supplierReviews.push(review);
  return review;
}

export async function getRecommendations(userId: number | null, productId?: number, limit = 8) {
  let products: typeof productsTable.$inferSelect[] = [];
  if (await dbOk()) {
    products = await db.select().from(productsTable)
      .where(eq(productsTable.exportStatus, "published"))
      .limit(100);
  }
  if (!products.length) return [];

  let category: string | undefined;
  if (productId) {
    const p = products.find(pr => pr.id === productId);
    category = p?.category;
  }
  if (userId && await dbOk()) {
    try {
      const favs = await db.select().from(favoritesTable).where(eq(favoritesTable.userId, userId)).limit(10);
      const views = await db.select().from(productViewsTable).where(eq(productViewsTable.userId, userId)).limit(20);
      const interestIds = new Set([...favs.map(f => f.productId), ...views.map(v => v.productId)]);
      const interestCats = products.filter(p => interestIds.has(p.id)).map(p => p.category);
      if (interestCats.length) category = interestCats[0];
    } catch { /* ignore */ }
  }

  const recs = products
    .filter(p => p.id !== productId)
    .filter(p => !category || p.category === category)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, limit);

  return recs.map(p => ({
    id: p.id, name: p.name, category: p.category, image_url: p.imageUrl,
    price_fob: p.priceFob, moq: p.moq, supplier_name: p.supplierName,
    reason: category ? "similar_category" : "trending",
  }));
}

export function filterProducts(
  products: typeof productsTable.$inferSelect[],
  filters: {
    moq_min?: number; moq_max?: number; price_min?: number; price_max?: number;
    origin_wilaya?: string; supplier_id?: number; incoterm?: string; search?: string;
  },
) {
  return products.filter(p => {
    if (filters.moq_min != null && p.moq < filters.moq_min) return false;
    if (filters.moq_max != null && p.moq > filters.moq_max) return false;
    if (filters.price_min != null && p.priceFob < filters.price_min) return false;
    if (filters.price_max != null && p.priceFob > filters.price_max) return false;
    if (filters.origin_wilaya && p.originWilaya !== filters.origin_wilaya) return false;
    if (filters.supplier_id != null && p.supplierId !== filters.supplier_id) return false;
    if (filters.search && !p.name.toLowerCase().includes(filters.search.toLowerCase())) return false;
    return true;
  });
}
