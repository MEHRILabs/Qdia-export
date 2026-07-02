import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "../lib/logger";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
const SITE_URL = process.env.SITE_URL ?? process.env.VITE_SITE_URL ?? "http://localhost:25180";

export const SUBSCRIPTION_PLANS = {
  bronze: { tier: "bronze", priceId: process.env.STRIPE_PRICE_BRONZE ?? "", amount: 0, label: "Bronze" },
  gold: { tier: "gold", priceId: process.env.STRIPE_PRICE_GOLD ?? "", amount: 99, label: "Or" },
} as const;

function getStripe(): Stripe | null {
  if (!STRIPE_SECRET) return null;
  return new Stripe(STRIPE_SECRET);
}

export async function createSubscriptionCheckout(userId: number, plan: "bronze" | "gold") {
  const stripe = getStripe();
  if (!stripe) {
    if (plan === "bronze") {
      await db.update(usersTable).set({ subscriptionTier: "bronze" }).where(eq(usersTable.id, userId));
      return { mode: "demo" as const, tier: "bronze", url: null };
    }
    throw new Error("Stripe non configuré. Définissez STRIPE_SECRET_KEY et STRIPE_PRICE_GOLD.");
  }

  const cfg = SUBSCRIPTION_PLANS[plan];
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) throw new Error("Utilisateur introuvable");

  if (plan === "bronze" || !cfg.priceId) {
    await db.update(usersTable).set({ subscriptionTier: "bronze" }).where(eq(usersTable.id, userId));
    return { mode: "free" as const, tier: "bronze", url: null };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: cfg.priceId, quantity: 1 }],
    success_url: `${SITE_URL}/profile?subscription=success`,
    cancel_url: `${SITE_URL}/profile?subscription=cancel`,
    metadata: { userId: String(userId), tier: plan },
    customer_email: user.email ?? undefined,
  });

  return { mode: "stripe" as const, tier: plan, url: session.url };
}

export async function handleStripeWebhook(rawBody: Buffer, signature: string) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return { handled: false };

  const event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = Number(session.metadata?.userId);
    const tier = session.metadata?.tier ?? "gold";
    if (userId) {
      await db.update(usersTable).set({ subscriptionTier: tier }).where(eq(usersTable.id, userId));
      logger.info({ userId, tier }, "Abonnement activé via Stripe");
    }
  }
  return { handled: true };
}
