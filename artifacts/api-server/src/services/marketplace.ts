import {
  db, productsTable, productViewsTable, favoritesTable,
  cartItemsTable, ordersTable, disputesTable, oemRequestsTable,
  sampleRequestsTable, supplierReviewsTable, usersTable, messagesTable,
  suppliersTable, trackingEventsTable,
} from "@workspace/db";
import { eq, and, or, desc, sql, inArray } from "drizzle-orm";
import { logger } from "../lib/logger";
import { sendPushToUser } from "./fcm";
import { createInvoiceFromTransaction } from "./billing";
import { createTransactionFromOrder } from "./payments";

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

function priceForIncoterm(p: typeof productsTable.$inferSelect, incoterm: string) {
  switch (incoterm.toUpperCase()) {
    case "EXW": return p.priceExw;
    case "CFR": return p.priceCfr;
    case "CIF": return p.priceCif;
    case "DDP": return p.priceDdp ?? p.priceCif * 1.18;
    default: return p.priceFob;
  }
}

function enrichCartItems(
  items: Array<{ id: number; product_id: number; quantity: number; incoterm: string; notes?: string | null }>,
  products: typeof productsTable.$inferSelect[],
) {
  return items.map(item => {
    const p = products.find(pr => pr.id === item.product_id);
    const inc = item.incoterm ?? "FOB";
    const unitPrice = p ? priceForIncoterm(p, inc) : null;
    return {
      id: item.id,
      product_id: item.product_id,
      quantity: item.quantity,
      incoterm: inc,
      notes: item.notes ?? undefined,
      product_name: p?.name ?? null,
      product_image: p?.imageUrl ?? null,
      product_sku: p?.sku ?? null,
      supplier_name: p?.supplierName ?? null,
      moq: p?.moq ?? null,
      moq_unit: p?.moqUnit ?? null,
      unit_price: unitPrice,
      line_total: unitPrice != null ? unitPrice * item.quantity : null,
      currency: p?.priceCurrency ?? "USD",
    };
  });
}

export async function getCart(userId: number) {
  let items: Array<{ id: number; product_id: number; quantity: number; incoterm: string; notes?: string | null }> = [];
  if (await dbOk()) {
    try {
      const rows = await db.select().from(cartItemsTable).where(eq(cartItemsTable.userId, userId));
      items = rows.map(r => ({ id: r.id, product_id: r.productId, quantity: r.quantity, incoterm: r.incoterm ?? "FOB", notes: r.notes }));
    } catch { /* fallback mem */ }
  }
  if (!items.length) {
    items = mem.cart.filter(c => c.userId === userId).map(c => ({
      id: c.id, product_id: c.productId, quantity: c.quantity, incoterm: c.incoterm, notes: c.notes,
    }));
  }

  const productIds = [...new Set(items.map(i => i.product_id))];
  let products: typeof productsTable.$inferSelect[] = [];
  if (productIds.length && await dbOk()) {
    try {
      products = await db.select().from(productsTable).where(sql`${productsTable.id} IN (${sql.join(productIds.map(id => sql`${id}`), sql`, `)})`);
    } catch { /* ignore */ }
  }
  return enrichCartItems(items, products);
}

async function notifySupplierOfOrder(
  orderId: number,
  buyerId: number,
  supplierId: number | null | undefined,
  items: Array<{ product_name: string; quantity: number; incoterm: string; total: number }>,
) {
  if (!supplierId || !(await dbOk())) return null;

  const [supplierUser] = await db.select().from(usersTable)
    .where(eq(usersTable.supplierId, supplierId))
    .limit(1);

  const lines = items.map(i => `• ${i.product_name} × ${i.quantity} (${i.incoterm})`).join("\n");
  const body = `Nouvelle commande #${orderId}\n${lines}\n\nMerci de confirmer disponibilité et délai.`;

  if (supplierUser) {
    try {
      await db.insert(messagesTable).values({
        senderId: buyerId,
        receiverId: supplierUser.id,
        body,
      });
      void sendPushToUser(supplierUser.id, "Nouvelle commande QDIA", `Commande #${orderId}`);
    } catch { /* ignore */ }
    return {
      supplier_user_id: supplierUser.id,
      name: supplierUser.name,
      email: supplierUser.email ?? null,
      phone: supplierUser.phone ?? null,
      company: supplierUser.companyName ?? null,
    };
  }

  return { supplier_user_id: null, name: null, email: null, phone: null, company: null };
}

async function notifyAdminOfOrder(
  orderId: number,
  buyerId: number,
  total: number,
  currency: string,
  items: Array<{ product_name: string; quantity: number; incoterm: string }>,
) {
  if (!(await dbOk())) return;

  const [admin] = await db.select().from(usersTable)
    .where(eq(usersTable.role, "admin"))
    .limit(1);
  if (!admin) return;

  const [buyer] = await db.select().from(usersTable)
    .where(eq(usersTable.id, buyerId))
    .limit(1);

  const lines = items.map(i => `• ${i.product_name} × ${i.quantity} (${i.incoterm})`).join("\n");
  const buyerLabel = buyer?.name ?? buyer?.email ?? `Utilisateur #${buyerId}`;
  const body = `🛒 Nouvelle commande #${orderId}\nAcheteur : ${buyerLabel}\nTotal : ${total.toFixed(2)} ${currency}\n${lines}`;

  try {
    await db.insert(messagesTable).values({
      senderId: buyerId,
      receiverId: admin.id,
      body,
    });
    void sendPushToUser(admin.id, "Nouvelle commande QDIA", `Commande #${orderId} — ${total.toFixed(2)} ${currency}`);
  } catch { /* ignore */ }
}

async function enrichOrderRows(rows: typeof ordersTable.$inferSelect[]) {
  if (!rows.length) return [];

  const buyerIds = [...new Set(rows.map(r => r.buyerId))];
  const supplierEntityIds = [...new Set(rows.map(r => r.supplierId).filter((id): id is number => id != null))];

  let buyers: typeof usersTable.$inferSelect[] = [];
  let supplierUsers: typeof usersTable.$inferSelect[] = [];
  let suppliers: typeof suppliersTable.$inferSelect[] = [];

  if (await dbOk()) {
    try {
      if (buyerIds.length) {
        buyers = await db.select().from(usersTable).where(inArray(usersTable.id, buyerIds));
      }
      if (supplierEntityIds.length) {
        [supplierUsers, suppliers] = await Promise.all([
          db.select().from(usersTable).where(inArray(usersTable.supplierId, supplierEntityIds)),
          db.select().from(suppliersTable).where(inArray(suppliersTable.id, supplierEntityIds)),
        ]);
      }
    } catch { /* ignore */ }
  }

  return rows.map(r => {
    const buyer = buyers.find(b => b.id === r.buyerId);
    const supplierUser = supplierUsers.find(u => u.supplierId === r.supplierId);
    const supplier = suppliers.find(s => s.id === r.supplierId);
    return {
      id: r.id,
      buyer_id: r.buyerId,
      supplier_id: r.supplierId,
      buyer_name: buyer?.name ?? buyer?.email ?? null,
      buyer_email: buyer?.email ?? null,
      supplier_name: supplier?.companyName ?? supplierUser?.companyName ?? supplierUser?.name ?? null,
      supplier_user_id: supplierUser?.id ?? null,
      items: r.items,
      total_amount: r.totalAmount,
      currency: r.currency,
      status: r.status,
      payment_method: r.paymentMethod,
      transaction_id: r.transactionId,
      tracking_number: r.trackingNumber,
      carrier: r.carrier,
      trade_assurance: true,
      created_at: r.createdAt.toISOString(),
    };
  });
}

export async function addToCart(userId: number, productId: number, quantity: number, incoterm = "FOB", notes?: string) {
  if (await dbOk()) {
    try {
      const existing = await db.select().from(cartItemsTable)
        .where(and(eq(cartItemsTable.userId, userId), eq(cartItemsTable.productId, productId)))
        .limit(1);
      if (existing[0]) {
        const newQty = existing[0].quantity + quantity;
        const [row] = await db.update(cartItemsTable)
          .set({ quantity: newQty, incoterm, notes: notes ?? existing[0].notes })
          .where(eq(cartItemsTable.id, existing[0].id))
          .returning();
        return { id: row.id, product_id: row.productId, quantity: row.quantity, incoterm: row.incoterm, notes: row.notes };
      }
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

export async function updateCartItem(userId: number, itemId: number, quantity: number) {
  if (quantity <= 0) {
    await removeFromCart(userId, itemId);
    return null;
  }
  if (await dbOk()) {
    try {
      const [row] = await db.update(cartItemsTable)
        .set({ quantity })
        .where(and(eq(cartItemsTable.id, itemId), eq(cartItemsTable.userId, userId)))
        .returning();
      if (row) return { id: row.id, product_id: row.productId, quantity: row.quantity, incoterm: row.incoterm, notes: row.notes };
    } catch { /* mem */ }
  }
  const item = mem.cart.find(c => c.id === itemId && c.userId === userId);
  if (item) item.quantity = quantity;
  return item ? { id: item.id, product_id: item.productId, quantity: item.quantity, incoterm: item.incoterm, notes: item.notes } : null;
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
    const inc = item.incoterm ?? "FOB";
    const unitPrice = p ? priceForIncoterm(p, inc) : (item.unit_price ?? 1000);
    return {
      product_id: item.product_id,
      product_name: p?.name ?? item.product_name ?? `Produit #${item.product_id}`,
      quantity: item.quantity,
      unit_price: unitPrice,
      total: unitPrice * item.quantity,
      incoterm: inc,
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

      try {
        const tx = await createTransactionFromOrder(
          row.id,
          userId,
          supplierId ?? null,
          total,
          "USD",
          paymentMethod as "escrow" | "swift" | "lc",
        );
        await db.update(ordersTable).set({ transactionId: tx.id }).where(eq(ordersTable.id, row.id));
        (order as Record<string, unknown>).transaction_id = tx.id;
      } catch (err) {
        logger.warn({ err, orderId: row.id }, "Transaction escrow non créée pour la commande");
      }
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

  const supplierContact = await notifySupplierOfOrder(
    order.id as number,
    userId,
    supplierId ?? null,
    orderItems.map(i => ({
      product_name: i.product_name,
      quantity: i.quantity,
      incoterm: i.incoterm,
      total: i.total,
    })),
  );

  await notifyAdminOfOrder(
    order.id as number,
    userId,
    total,
    "USD",
    orderItems.map(i => ({
      product_name: i.product_name,
      quantity: i.quantity,
      incoterm: i.incoterm,
    })),
  );

  return { ...order, supplier_contact: supplierContact };
}

export async function getOrders(userId: number, role: string, supplierEntityId?: number | null) {
  if (await dbOk()) {
    try {
      let rows: typeof ordersTable.$inferSelect[];
      if (role === "admin") {
        rows = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(100);
      } else if (role === "supplier" && supplierEntityId) {
        rows = await db.select().from(ordersTable)
          .where(or(eq(ordersTable.buyerId, userId), eq(ordersTable.supplierId, supplierEntityId)))
          .orderBy(desc(ordersTable.createdAt)).limit(50);
      } else {
        rows = await db.select().from(ordersTable)
          .where(eq(ordersTable.buyerId, userId))
          .orderBy(desc(ordersTable.createdAt)).limit(50);
      }
      return enrichOrderRows(rows);
    } catch { /* mem */ }
  }
  const filtered = mem.orders.filter(o =>
    role === "admin"
    || o.buyer_id === userId
    || (role === "supplier" && supplierEntityId && o.supplier_id === supplierEntityId),
  );
  return filtered;
}

export async function updateOrderStatus(
  orderId: number,
  data: { status?: string; tracking_number?: string; carrier?: string },
  actor: { id: number; role: string; supplier_id?: number | null },
) {
  if (!(await dbOk())) throw new Error("Base de données indisponible");

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) throw new Error("Commande introuvable");

  const isAdmin = actor.role === "admin";
  const isSupplier = actor.role === "supplier" && actor.supplier_id != null && order.supplierId === actor.supplier_id;

  if (!isAdmin && !isSupplier) {
    throw new Error("Accès non autorisé");
  }

  if (!isAdmin && data.status) {
    const supplierAllowed: Record<string, string[]> = {
      pending_payment: ["confirmed", "cancelled"],
      confirmed: ["shipped", "cancelled"],
    };
    if (isSupplier) {
      const allowed = supplierAllowed[order.status] ?? [];
      if (!allowed.includes(data.status)) {
        throw new Error("Statut non autorisé pour le fournisseur");
      }
    } else if (!["confirmed", "shipped"].includes(data.status)) {
      throw new Error("Statut non autorisé");
    }
  }

  const [updated] = await db.update(ordersTable).set({
    status: data.status ?? order.status,
    trackingNumber: data.tracking_number ?? order.trackingNumber,
    carrier: data.carrier ?? order.carrier,
  }).where(eq(ordersTable.id, orderId)).returning();

  if (data.status === "shipped" && updated.trackingNumber) {
    try {
      await db.insert(trackingEventsTable).values({
        orderId: updated.id,
        carrier: updated.carrier ?? "DHL",
        trackingNumber: updated.trackingNumber,
        status: "shipped",
        location: "Algérie",
        description: "Colis expédié par le fournisseur",
      });
    } catch { /* table optionnelle */ }
    void sendPushToUser(updated.buyerId, "Commande expédiée", `Suivi : ${updated.trackingNumber}`);
  } else if (data.status === "confirmed") {
    void sendPushToUser(updated.buyerId, "Commande confirmée", `Votre commande #${updated.id} est confirmée par le fournisseur`);
  } else if (data.status === "cancelled") {
    void sendPushToUser(updated.buyerId, "Commande annulée", `La commande #${updated.id} a été annulée`);
  }

  const enriched = await enrichOrderRows([updated]);
  return enriched[0];
}

export async function deleteOrder(orderId: number, actor: { id: number; role: string }) {
  if (actor.role !== "admin") throw new Error("Accès réservé à l'administration");
  if (!(await dbOk())) throw new Error("Base de données indisponible");

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
  if (!order) throw new Error("Commande introuvable");

  await db.delete(ordersTable).where(eq(ordersTable.id, orderId));
  return { ok: true, id: orderId };
}

export async function getProductContact(productId: number) {
  if (!(await dbOk())) return null;

  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  if (!product?.supplierId) return null;

  const [supplierUser] = await db.select().from(usersTable)
    .where(eq(usersTable.supplierId, product.supplierId))
    .limit(1);
  const [supplier] = await db.select().from(suppliersTable)
    .where(eq(suppliersTable.id, product.supplierId))
    .limit(1);

  return {
    product_id: productId,
    product_name: product.name,
    supplier_id: product.supplierId,
    supplier_user_id: supplierUser?.id ?? null,
    name: supplierUser?.name ?? supplier?.companyName ?? product.supplierName ?? null,
    email: supplierUser?.email ?? null,
    phone: supplierUser?.phone ?? null,
    company: supplierUser?.companyName ?? supplier?.companyName ?? null,
  };
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
