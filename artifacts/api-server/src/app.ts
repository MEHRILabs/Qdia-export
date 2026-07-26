import express, { type Express } from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pinoHttp from "pino-http";
import router from "./routes";
import subscriptionsRouter, { stripeWebhookHandler } from "./routes/subscriptions";
import { logger } from "./lib/logger";
import { getAllowedOrigins, isProduction } from "./lib/env-security";
import { securityHeaders } from "./middleware/security-headers";
import { globalApiLimiter } from "./middleware/rate-limit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

if (isProduction()) {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");
app.use(securityHeaders);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

const allowedOrigins = getAllowedOrigins();
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    // Flutter web / Chrome local (acheteur) — localhost n'importe quel port
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) {
      callback(null, true);
      return;
    }
    if (!isProduction()) {
      callback(null, true);
      return;
    }
    logger.warn({ origin }, "Origine CORS refusée");
    callback(new Error("Origine non autorisée"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use("/api/subscriptions/webhook", express.raw({ type: "application/json" }), (req, res, next) => {
  (req as express.Request & { rawBody?: Buffer }).rawBody = req.body as Buffer;
  next();
}, stripeWebhookHandler);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use("/uploads", express.static(path.join(__dirname, "../uploads"), {
  dotfiles: "deny",
  index: false,
  setHeaders(res, filePath) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    if (filePath.endsWith(".svg")) {
      res.setHeader("Content-Type", "image/svg+xml");
      res.setHeader("Content-Security-Policy", "default-src 'none'");
    }
  },
}));

app.use("/api", globalApiLimiter, router);

const serveWeb = process.env.SERVE_WEB === "1" || process.env.SERVE_WEB === "true";
if (serveWeb) {
  const webRoot = path.join(__dirname, "../../qdia-export/dist/public");
  app.use(express.static(webRoot, { index: false }));
  app.get(/^(?!\/api\/)(?!\/uploads\/).*/, (_req, res) => {
    res.sendFile(path.join(webRoot, "index.html"));
  });
  logger.info({ webRoot }, "Site web servi par l'API (mode SERVE_WEB)");
}

export default app;
