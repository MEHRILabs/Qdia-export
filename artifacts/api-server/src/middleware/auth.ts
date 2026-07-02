import type { Request, Response, NextFunction } from "express";
import { verifyToken, getUserById, type PublicUser } from "../services/auth";

export interface AuthedRequest extends Request {
  user?: PublicUser;
  tokenPayload?: Awaited<ReturnType<typeof verifyToken>>;
}

export async function optionalAuth(req: AuthedRequest, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return next();

  const payload = await verifyToken(header.slice(7));
  if (payload) {
    req.tokenPayload = payload;
    req.user = await getUserById(Number(payload.sub)) ?? undefined;
  }
  next();
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentification requise." });
    return;
  }

  const payload = await verifyToken(header.slice(7));
  if (!payload) {
    res.status(401).json({ error: "Token invalide ou expiré." });
    return;
  }

  const user = await getUserById(Number(payload.sub));
  if (!user) {
    res.status(401).json({ error: "Utilisateur introuvable." });
    return;
  }

  req.tokenPayload = payload;
  req.user = user;
  next();
}

export function requireRole(...roles: string[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Accès non autorisé." });
      return;
    }
    next();
  };
}
