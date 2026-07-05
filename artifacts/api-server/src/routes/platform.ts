import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, messagesTable, favoritesTable, reviewsTable, productViewsTable, usersTable, suppliersTable, productsTable, transactionsTable, ordersTable } from "@workspace/db";
import { eq, and, or, desc, asc, sql, inArray } from "drizzle-orm";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth";
import { aiCompleteMini } from "../services/ai/engine";
import { sendPushToUser } from "../services/fcm";
import { broadcastMessage } from "../services/websocket";

const router: IRouter = Router();

// ─── Messages ────────────────────────────────────────────────────────────────
router.get("/messages/threads", requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.user!.id;
  try {
    const rows = await db.select().from(messagesTable)
      .where(or(eq(messagesTable.senderId, uid), eq(messagesTable.receiverId, uid)))
      .orderBy(desc(messagesTable.createdAt))
      .limit(500);

    const partnerIds = new Set<number>();
    for (const m of rows) {
      partnerIds.add(m.senderId === uid ? m.receiverId : m.senderId);
    }

    const partners = partnerIds.size
      ? await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role })
        .from(usersTable)
        .where(inArray(usersTable.id, [...partnerIds]))
      : [];

    const threads = [...partnerIds].map(pid => {
      const msgs = rows.filter(m => m.senderId === pid || m.receiverId === pid);
      const last = msgs[0];
      const partner = partners.find(p => p.id === pid);
      return {
        partner_id: pid,
        partner_name: partner?.name ?? partner?.email ?? `Utilisateur #${pid}`,
        partner_email: partner?.email,
        partner_role: partner?.role,
        last_message: last?.body ?? "",
        last_at: last?.createdAt.toISOString() ?? null,
        unread: msgs.filter(m => m.receiverId === uid && !m.read).length,
        rfq_id: last?.rfqId ?? null,
      };
    }).sort((a, b) => (b.last_at ?? "").localeCompare(a.last_at ?? ""));

    res.json({ data: threads });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Erreur chargement messages" });
  }
});

router.get("/messages/contacts", requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.user!.id;
  const role = req.user!.role;

  if (role === "admin") {
    const rows = await db.select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      company_name: usersTable.companyName,
      supplier_id: usersTable.supplierId,
    }).from(usersTable)
      .where(sql`${usersTable.id} != ${uid} AND ${usersTable.role} IN ('supplier', 'buyer')`)
      .orderBy(usersTable.name)
      .limit(300);
    res.json({ data: rows.map(u => ({
      id: u.id,
      name: u.name ?? u.email ?? `Utilisateur #${u.id}`,
      email: u.email,
      role: u.role,
      company: u.company_name,
      supplier_id: u.supplier_id,
    })) });
    return;
  }

  const [adminUser] = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, company_name: usersTable.companyName })
    .from(usersTable).where(eq(usersTable.role, "admin")).limit(1);

  const msgRows = await db.select().from(messagesTable)
    .where(or(eq(messagesTable.senderId, uid), eq(messagesTable.receiverId, uid)))
    .orderBy(desc(messagesTable.createdAt)).limit(300);

  const partnerIds = new Set<number>();
  for (const m of msgRows) {
    partnerIds.add(m.senderId === uid ? m.receiverId : m.senderId);
  }
  if (adminUser && adminUser.id !== uid) partnerIds.add(adminUser.id);

  const partners = partnerIds.size
    ? await db.select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      company_name: usersTable.companyName,
      supplier_id: usersTable.supplierId,
    }).from(usersTable).where(inArray(usersTable.id, [...partnerIds]))
    : [];

  res.json({ data: partners.map(u => ({
    id: u.id,
    name: u.name ?? u.email ?? `Utilisateur #${u.id}`,
    email: u.email,
    role: u.role,
    company: u.company_name,
    supplier_id: u.supplier_id,
  })) });
});

router.get("/messages/partner/:partnerId", requireAuth, async (req: AuthedRequest, res) => {
  const partnerId = parseInt(String(req.params.partnerId), 10);
  if (Number.isNaN(partnerId)) {
    res.status(400).json({ error: "ID partenaire invalide" });
    return;
  }
  const [partner] = await db.select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    role: usersTable.role,
    company_name: usersTable.companyName,
    supplier_id: usersTable.supplierId,
  }).from(usersTable).where(eq(usersTable.id, partnerId)).limit(1);

  if (!partner) {
    res.status(404).json({ error: "Utilisateur introuvable — vérifiez qu'il a un compte actif." });
    return;
  }
  res.json({
    id: partner.id,
    name: partner.name ?? partner.email ?? `Utilisateur #${partner.id}`,
    email: partner.email,
    role: partner.role,
    company: partner.company_name,
    supplier_id: partner.supplier_id,
  });
});

router.get("/messages/thread/:partnerId", requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.user!.id;
  const partnerId = parseInt(String(req.params.partnerId), 10);
  if (Number.isNaN(partnerId)) {
    res.status(400).json({ error: "ID partenaire invalide" });
    return;
  }
  try {
    const rows = await db.select().from(messagesTable)
      .where(or(
        and(eq(messagesTable.senderId, uid), eq(messagesTable.receiverId, partnerId)),
        and(eq(messagesTable.senderId, partnerId), eq(messagesTable.receiverId, uid)),
      ))
      .orderBy(asc(messagesTable.createdAt))
      .limit(200);

    await db.update(messagesTable).set({ read: true })
      .where(and(eq(messagesTable.receiverId, uid), eq(messagesTable.senderId, partnerId)));

    res.json({ data: rows.map(m => ({
      id: m.id,
      rfq_id: m.rfqId,
      sender_id: m.senderId,
      receiver_id: m.receiverId,
      body: m.body,
      read: m.read,
      created_at: m.createdAt.toISOString(),
    })) });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Erreur chargement conversation" });
  }
});

router.get("/messages", requireAuth, async (req: AuthedRequest, res) => {
  const uid = req.user!.id;
  const rows = await db.select().from(messagesTable)
    .where(or(eq(messagesTable.senderId, uid), eq(messagesTable.receiverId, uid)))
    .orderBy(desc(messagesTable.createdAt))
    .limit(100);
  res.json({ data: rows.map(m => ({
    id: m.id,
    rfq_id: m.rfqId,
    sender_id: m.senderId,
    receiver_id: m.receiverId,
    body: m.body,
    read: m.read,
    created_at: m.createdAt.toISOString(),
  })) });
});

router.post("/messages", requireAuth, async (req: AuthedRequest, res) => {
  const body = z.object({
    receiver_id: z.coerce.number().int().positive(),
    body: z.string().min(1).max(5000),
    rfq_id: z.coerce.number().int().positive().optional(),
  }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  if (body.data.receiver_id === req.user!.id) {
    res.status(400).json({ error: "Impossible de s'envoyer un message à soi-même." });
    return;
  }

  try {
    const [receiver] = await db.select({ id: usersTable.id }).from(usersTable)
      .where(eq(usersTable.id, body.data.receiver_id)).limit(1);
    if (!receiver) {
      res.status(404).json({ error: "Destinataire introuvable — l'exportateur doit créer un compte sur QDIA." });
      return;
    }

    const [msg] = await db.insert(messagesTable).values({
      senderId: req.user!.id,
      receiverId: body.data.receiver_id,
      body: body.data.body.trim(),
      rfqId: body.data.rfq_id,
    }).returning();

    const shaped = {
      id: msg.id,
      rfq_id: msg.rfqId,
      sender_id: msg.senderId,
      receiver_id: msg.receiverId,
      body: msg.body,
      read: msg.read,
      created_at: msg.createdAt.toISOString(),
    };

    try {
      await sendPushToUser(body.data.receiver_id, "Nouveau message QDIA", body.data.body.slice(0, 80));
    } catch { /* notification non bloquante */ }
    try {
      broadcastMessage(shaped);
    } catch { /* websocket non bloquant */ }

    res.status(201).json(shaped);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Erreur envoi message" });
  }
});

// ─── Favoris ─────────────────────────────────────────────────────────────────
router.get("/favorites", requireAuth, async (req: AuthedRequest, res) => {
  const rows = await db.select({ productId: favoritesTable.productId })
    .from(favoritesTable)
    .where(eq(favoritesTable.userId, req.user!.id));
  res.json({ product_ids: rows.map(r => r.productId) });
});

router.post("/favorites/:productId", requireAuth, async (req: AuthedRequest, res) => {
  const productId = parseInt(String(req.params.productId), 10);
  if (Number.isNaN(productId)) {
    res.status(400).json({ error: "ID produit invalide" });
    return;
  }
  await db.insert(favoritesTable).values({ userId: req.user!.id, productId })
    .onConflictDoNothing({ target: [favoritesTable.userId, favoritesTable.productId] });
  res.json({ ok: true });
});

router.delete("/favorites/:productId", requireAuth, async (req: AuthedRequest, res) => {
  const productId = parseInt(String(req.params.productId), 10);
  await db.delete(favoritesTable).where(
    and(eq(favoritesTable.userId, req.user!.id), eq(favoritesTable.productId, productId)),
  );
  res.json({ ok: true });
});

// ─── Avis ────────────────────────────────────────────────────────────────────
router.get("/products/:id/reviews", async (req, res) => {
  const productId = parseInt(String(req.params.id), 10);
  const rows = await db.select().from(reviewsTable)
    .where(eq(reviewsTable.productId, productId))
    .orderBy(desc(reviewsTable.createdAt));
  const avg = rows.length ? rows.reduce((s, r) => s + r.rating, 0) / rows.length : 0;
  res.json({
    average: Math.round(avg * 10) / 10,
    count: rows.length,
    reviews: rows.map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      created_at: r.createdAt.toISOString(),
    })),
  });
});

router.post("/products/:id/reviews", requireAuth, async (req: AuthedRequest, res) => {
  const productId = parseInt(String(req.params.id), 10);
  const parsed = z.object({ rating: z.number().min(1).max(5), comment: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, productId)).limit(1);
  const [review] = await db.insert(reviewsTable).values({
    userId: req.user!.id,
    productId,
    supplierId: product?.supplierId,
    rating: parsed.data.rating,
    comment: parsed.data.comment,
  }).returning();

  const all = await db.select().from(reviewsTable).where(eq(reviewsTable.productId, productId));
  const avg = all.reduce((s, r) => s + r.rating, 0) / all.length;
  await db.update(productsTable).set({
    rating: Math.round(avg * 10) / 10,
    reviewCount: all.length,
  }).where(eq(productsTable.id, productId));

  res.status(201).json({ id: review.id });
});

// ─── Profil ──────────────────────────────────────────────────────────────────
router.patch("/auth/profile", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z.object({
    name: z.string().min(1).optional(),
    company_name: z.string().optional(),
    wilaya: z.string().optional(),
    logo_url: z.string().url().optional().or(z.literal("")),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const [user] = await db.update(usersTable).set({
    ...(d.name ? { name: d.name } : {}),
    ...(d.company_name !== undefined ? { companyName: d.company_name } : {}),
    ...(d.wilaya !== undefined ? { wilaya: d.wilaya } : {}),
    ...(d.logo_url !== undefined ? { logoUrl: d.logo_url || null } : {}),
  }).where(eq(usersTable.id, req.user!.id)).returning();
  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      company_name: user.companyName,
      wilaya: user.wilaya,
      logo_url: user.logoUrl,
      subscription_tier: user.subscriptionTier,
    },
  });
});

// ─── Vérification exportateur ────────────────────────────────────────────────
router.get("/verification/status", requireAuth, async (req: AuthedRequest, res) => {
  const user = req.user!;
  let level = 0;
  const steps: Array<{ id: string; label: string; done: boolean }> = [
    { id: "email", label: "Email vérifié", done: Boolean(user.email) },
    { id: "profile", label: "Profil complété", done: false },
    { id: "product", label: "Premier produit publié", done: false },
    { id: "rfq", label: "Première RFQ répondue", done: false },
  ];

  const [u] = await db.select().from(usersTable).where(eq(usersTable.id, user.id)).limit(1);
  steps[1].done = Boolean(u?.companyName && u?.wilaya);

  if (user.supplier_id) {
    const prods = await db.select().from(productsTable)
      .where(and(eq(productsTable.supplierId, user.supplier_id), eq(productsTable.exportStatus, "published")));
    steps[2].done = prods.length > 0;
    const [sup] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, user.supplier_id)).limit(1);
    level = sup?.verificationLevel ?? (steps.filter(s => s.done).length);
  } else {
    level = steps.filter(s => s.done).length;
  }

  res.json({
    level,
    max_level: 3,
    progress_pct: Math.round((steps.filter(s => s.done).length / steps.length) * 100),
    steps,
    badge: level >= 3 ? "Or" : level >= 2 ? "Argent" : "Bronze",
  });
});

// ─── Alertes conformité ──────────────────────────────────────────────────────
const COMPLIANCE_RULES: Record<string, string[]> = {
  FR: ["Certificat phytosanitaire", "Certificat d'origine EUR.1", "Halal si produit alimentaire"],
  US: ["FDA registration (food)", "Certificat USDA si applicable", "Embargo check"],
  AE: ["Certificat Halal obligatoire", "Certificat sanitaire", "Étiquetage arabe"],
  UK: ["Certificat phytosanitaire UK", "Déclaration douanière post-Brexit"],
};

router.get("/compliance/alerts", (req, res) => {
  const dest = String(req.query.destination ?? "FR").toUpperCase();
  const category = String(req.query.category ?? "Agriculture & Food");
  const alerts = COMPLIANCE_RULES[dest] ?? ["Certificat d'origine", "Facture commerciale", "Liste de colisage"];
  if (/food|agri|huile|datte/i.test(category)) {
    alerts.push("Contrôle SPS (sanitaire/phytosanitaire)");
  }
  res.json({ destination: dest, category, alerts });
});

// ─── Benchmark prix (IA ou fallback) ─────────────────────────────────────────
router.post("/pricing/benchmark", async (req, res) => {
  const parsed = z.object({
    product_name: z.string(),
    destination: z.string().default("FR"),
    price_usd: z.number().optional(),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const raw = await aiCompleteMini(
      `Benchmark export B2B pour "${parsed.data.product_name}" vers ${parsed.data.destination}. ` +
      `Prix fourni: ${parsed.data.price_usd ?? "N/A"} USD. ` +
      `Réponds JSON: {"market_low":0,"market_avg":0,"market_high":0,"position":"competitive|high|low","tip":"..."}`,
    );
    const json = JSON.parse(raw.replace(/```json|```/g, "").trim());
    res.json(json);
  } catch {
    const base = parsed.data.price_usd ?? 5;
    res.json({
      market_low: base * 0.85,
      market_avg: base,
      market_high: base * 1.2,
      position: "competitive",
      tip: "Positionnez-vous sur la qualité Made in Algeria 🇩🇿",
    });
  }
});

// ─── Analytics vues produit ──────────────────────────────────────────────────
router.post("/products/:id/view", async (req, res) => {
  const productId = parseInt(String(req.params.id), 10);
  const userId = req.body?.user_id as number | undefined;
  await db.insert(productViewsTable).values({ productId, userId: userId ?? null });
  const [{ count }] = await db.select({ count: sql<number>`count(*)::int` })
    .from(productViewsTable).where(eq(productViewsTable.productId, productId));
  res.json({ views: count });
});

// ─── Admin plateforme ────────────────────────────────────────────────────────
router.get("/admin/stats", requireAuth, requireRole("admin"), async (_req, res) => {
  const users = await db.select().from(usersTable);
  const products = await db.select().from(productsTable);
  const suppliers = await db.select().from(suppliersTable);
  const txs = await db.select().from(transactionsTable);
  const orders = await db.select({ count: sql<number>`count(*)::int` }).from(ordersTable);
  const totalCommission = txs.reduce((s, t) => s + (t.commissionAmount ?? 0), 0);
  const totalVolume = txs.reduce((s, t) => s + (t.amount ?? 0), 0);
  const withoutPhoto = products.filter(p => !p.imageUrl && !(p.images?.length)).length;
  const withoutPricing = products.filter(p => !p.priceFob || p.priceFob <= 0).length;
  const exportAuthorized = products.filter(p => p.exportAuthorized).length;
  const exportPending = products.filter(p => p.exportStatus === "published" && !p.exportAuthorized).length;
  res.json({
    users: users.length,
    products: products.length,
    suppliers: suppliers.length,
    published: products.filter(p => p.exportStatus === "published").length,
    pending: products.filter(p => p.exportStatus === "pending").length,
    orders_count: orders[0]?.count ?? 0,
    commission_rate_pct: 3,
    total_commission_usd: Math.round(totalCommission * 100) / 100,
    transaction_volume_usd: Math.round(totalVolume * 100) / 100,
    transactions_count: txs.length,
    without_photo: withoutPhoto,
    without_pricing: withoutPricing,
    export_authorized: exportAuthorized,
    export_pending: exportPending,
    subscription_tiers: { bronze: 0, silver: 29, gold: 99 },
  });
});

export default router;
