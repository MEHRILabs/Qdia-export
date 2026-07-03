import type { Request, Response, NextFunction } from "express";

interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

/** Nettoyage périodique des buckets expirés. */
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of store) {
    if (now > bucket.resetAt) store.delete(key);
  }
}, 60_000).unref();

function clientKey(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") return forwarded.split(",")[0]?.trim() ?? "unknown";
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

export function rateLimit(opts: {
  windowMs: number;
  max: number;
  message?: string;
  skip?: (req: Request) => boolean;
}) {
  const message = opts.message ?? "Trop de requêtes — réessayez plus tard.";

  return (req: Request, res: Response, next: NextFunction): void => {
    if (opts.skip?.(req)) {
      next();
      return;
    }

    const key = `${clientKey(req)}:${req.path}`;
    const now = Date.now();
    let bucket = store.get(key);

    if (!bucket || now > bucket.resetAt) {
      bucket = { count: 0, resetAt: now + opts.windowMs };
      store.set(key, bucket);
    }

    bucket.count += 1;
    res.setHeader("X-RateLimit-Limit", String(opts.max));
    res.setHeader("X-RateLimit-Remaining", String(Math.max(0, opts.max - bucket.count)));

    if (bucket.count > opts.max) {
      res.status(429).json({ error: message });
      return;
    }

    next();
  };
}

/** Limite globale API — anti-scraping / brute-force. */
export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  message: "Limite API atteinte. Réessayez dans quelques minutes.",
});

/** Auth : login, register, OTP. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Trop de tentatives de connexion. Réessayez dans 15 minutes.",
});

/** Routes IA coûteuses. */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: "Limite requêtes IA atteinte. Patientez une minute.",
});

/** Écritures catalogue (import, création). */
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: "Trop d'opérations d'écriture. Réessayez bientôt.",
});
