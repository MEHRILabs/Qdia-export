import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { createSubscriptionCheckout, handleStripeWebhook } from "../services/stripe-service";

const router: IRouter = Router();

router.post("/subscriptions/checkout", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = z.object({ plan: z.enum(["bronze", "gold"]) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const result = await createSubscriptionCheckout(req.user!.id, parsed.data.plan);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Erreur abonnement" });
  }
});

export async function stripeWebhookHandler(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") {
    res.status(400).json({ error: "Signature manquante" });
    return;
  }
  try {
    const raw = (req as Request & { rawBody?: Buffer }).rawBody ?? (req.body as Buffer);
    const result = await handleStripeWebhook(raw, sig);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Webhook invalide" });
  }
}

export default router;
