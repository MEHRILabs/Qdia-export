import { Router, type IRouter } from "express";
import { z } from "zod";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth";
import {
  getCart, addToCart, updateCartItem, removeFromCart, checkout, getOrders, reorder,
  createDispute, getDisputes, mediateDispute,
  createOemRequest, createSampleRequest,
  getSupplierReviews, postSupplierReview, getRecommendations,
} from "../services/marketplace";
import { trackParcel, detectCarrier, type Carrier } from "../services/tracking";
import { broadcastDisputeUpdate, broadcastOrderUpdate } from "../services/websocket";
import { sendPushToUser } from "../services/fcm";

const router: IRouter = Router();

// ─── Panier & Checkout ───────────────────────────────────────────────────────
router.get("/cart", requireAuth, async (req: AuthedRequest, res) => {
  const items = await getCart(req.user!.id);
  res.json({ data: items });
});

router.post("/cart", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z.object({
    product_id: z.number(),
    quantity: z.number().positive(),
    incoterm: z.string().optional(),
    notes: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const item = await addToCart(req.user!.id, parsed.data.product_id, parsed.data.quantity, parsed.data.incoterm, parsed.data.notes);
  res.status(201).json(item);
});

router.delete("/cart/:id", requireAuth, async (req: AuthedRequest, res) => {
  await removeFromCart(req.user!.id, parseInt(String(req.params.id), 10));
  res.json({ ok: true });
});

router.patch("/cart/:id", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z.object({ quantity: z.number().positive() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const item = await updateCartItem(req.user!.id, parseInt(String(req.params.id), 10), parsed.data.quantity);
  if (!item) { res.status(404).json({ error: "Article introuvable" }); return; }
  res.json(item);
});

router.post("/cart/checkout", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z.object({
    payment_method: z.enum(["escrow", "swift", "lc"]).default("escrow"),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const order = await checkout(req.user!.id, parsed.data.payment_method);
    broadcastOrderUpdate(req.user!.id, order);
    if (order.supplier_id) broadcastOrderUpdate(order.supplier_id as number, order);
    res.status(201).json(order);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Erreur checkout" });
  }
});

// ─── Commandes & Réachat ─────────────────────────────────────────────────────
router.get("/orders", requireAuth, async (req: AuthedRequest, res) => {
  const orders = await getOrders(req.user!.id, req.user!.role);
  res.json({ data: orders });
});

router.post("/orders/:id/reorder", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const cart = await reorder(req.user!.id, parseInt(String(req.params.id), 10));
    res.json({ data: cart, message: "Produits ajoutés au panier" });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Erreur" });
  }
});

// ─── Trade Assurance / Litiges ───────────────────────────────────────────────
router.get("/disputes", requireAuth, async (req: AuthedRequest, res) => {
  const data = await getDisputes(req.user!.id, req.user!.role);
  res.json({ data });
});

router.post("/disputes", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z.object({
    transaction_id: z.number(),
    order_id: z.number().optional(),
    supplier_id: z.number().optional(),
    reason: z.string().min(3),
    description: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const dispute = await createDispute({
    transactionId: parsed.data.transaction_id,
    orderId: parsed.data.order_id,
    buyerId: req.user!.id,
    supplierId: parsed.data.supplier_id,
    reason: parsed.data.reason,
    description: parsed.data.description,
  });
  const notifyIds = [req.user!.id, parsed.data.supplier_id].filter(Boolean) as number[];
  broadcastDisputeUpdate(notifyIds, dispute);
  if (parsed.data.supplier_id) {
    void sendPushToUser(parsed.data.supplier_id, "Litige Trade Assurance", parsed.data.reason);
  }
  res.status(201).json(dispute);
});

router.patch("/disputes/:id", requireAuth, requireRole("admin"), async (req: AuthedRequest, res) => {
  const parsed = z.object({
    action: z.enum(["refund", "resolve", "reject"]),
    notes: z.string().optional(),
    refund_amount: z.number().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const dispute = await mediateDispute(
    parseInt(String(req.params.id), 10),
    parsed.data.action,
    parsed.data.notes,
    parsed.data.refund_amount,
  );
  res.json(dispute);
});

// ─── OEM / ODM ───────────────────────────────────────────────────────────────
router.post("/oem-requests", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z.object({
    product_id: z.number(),
    supplier_id: z.number().optional(),
    request_type: z.enum(["oem", "odm"]),
    logo_url: z.string().optional(),
    specs: z.string().min(5),
    quantity: z.number().positive().optional(),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const req_ = await createOemRequest({ ...parsed.data, buyer_id: req.user!.id });
  if (parsed.data.supplier_id) {
    void sendPushToUser(parsed.data.supplier_id, "Demande OEM/ODM", `Nouvelle demande ${parsed.data.request_type.toUpperCase()}`);
  }
  res.status(201).json(req_);
});

// ─── Échantillons ────────────────────────────────────────────────────────────
router.post("/sample-requests", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z.object({
    product_id: z.number(),
    supplier_id: z.number().optional(),
    quantity: z.number().positive().default(1),
    shipping_address: z.string().min(5),
  }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const req_ = await createSampleRequest({ ...parsed.data, buyer_id: req.user!.id });
  if (parsed.data.supplier_id) {
    void sendPushToUser(parsed.data.supplier_id, "Demande échantillon", "Un acheteur demande un échantillon");
  }
  res.status(201).json(req_);
});

// ─── Avis fournisseur ────────────────────────────────────────────────────────
router.get("/suppliers/:id/reviews", async (req, res) => {
  const stats = await getSupplierReviews(parseInt(String(req.params.id), 10));
  res.json(stats);
});

router.post("/suppliers/:id/reviews", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z.object({ rating: z.number().min(1).max(5), comment: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const review = await postSupplierReview(
    parseInt(String(req.params.id), 10),
    req.user!.id,
    parsed.data.rating,
    parsed.data.comment,
  );
  res.status(201).json(review);
});

// ─── Suivi colis temps réel (DHL/FedEx/Maersk) ───────────────────────────────
router.get("/tracking/:carrier/:number", async (req, res) => {
  const carrier = (req.params.carrier as Carrier) || detectCarrier(req.params.number);
  const result = trackParcel(carrier, req.params.number);
  res.json(result);
});

router.get("/tracking", async (req, res) => {
  const number = String(req.query.number ?? "");
  const carrier = (req.query.carrier as Carrier) || detectCarrier(number);
  if (!number) { res.status(400).json({ error: "number required" }); return; }
  res.json(trackParcel(carrier, number));
});

// ─── Recommandations IA acheteur (route also in products.ts) ─────────────────

export default router;
