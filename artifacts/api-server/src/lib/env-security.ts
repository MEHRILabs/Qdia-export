import { logger } from "./logger";

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Vérifie les secrets obligatoires au démarrage — empêche un déploiement vulnérable. */
export function validateSecurityEnv(): void {
  if (!isProduction()) {
    logger.warn("Mode développement — certaines protections sont assouplies.");
    return;
  }

  const jwt = process.env.JWT_SECRET?.trim();
  if (!jwt || jwt.length < 32) {
    throw new Error(
      "JWT_SECRET obligatoire en production (min. 32 caractères). Générez : openssl rand -base64 48",
    );
  }

  if (jwt.includes("change") || jwt.includes("dev-secret")) {
    throw new Error("JWT_SECRET ne doit pas être une valeur par défaut en production.");
  }

  if (process.env.QDIA_DEMO_AUTH === "1") {
    throw new Error("QDIA_DEMO_AUTH=1 interdit en production.");
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL obligatoire en production.");
  }

  logger.info("Contrôles de sécurité production OK");
}

export function getJwtSecretBytes(): Uint8Array {
  const raw = process.env.JWT_SECRET?.trim();
  if (!raw) {
    if (isProduction()) {
      throw new Error("JWT_SECRET manquant.");
    }
    return new TextEncoder().encode("qdia-dev-secret-change-in-production");
  }
  return new TextEncoder().encode(raw);
}

export function getAllowedOrigins(): string[] {
  const fromEnv = process.env.CORS_ORIGINS?.split(",").map(s => s.trim()).filter(Boolean) ?? [];
  if (fromEnv.length) return fromEnv;

  const vercelUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
  const renderUrl = process.env.RENDER_EXTERNAL_URL?.trim() || null;
  const frontend = process.env.FRONTEND_URL?.trim();
  const defaults = [
    "http://localhost:25180",
    "http://127.0.0.1:25180",
    "http://localhost:5173",
    frontend,
    vercelUrl,
    renderUrl,
  ].filter(Boolean) as string[];

  return isProduction() ? defaults.filter(Boolean) : [...defaults, "http://localhost:8080"];
}
