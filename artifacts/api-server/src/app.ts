import express, { type Express } from "express";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pinoHttp from "pino-http";
import router from "./routes";
import subscriptionsRouter, { stripeWebhookHandler } from "./routes/subscriptions";
import { logger } from "./lib/logger";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

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
app.use(cors());

app.use("/api/subscriptions/webhook", express.raw({ type: "application/json" }), (req, res, next) => {
  (req as express.Request & { rawBody?: Buffer }).rawBody = req.body as Buffer;
  next();
}, stripeWebhookHandler);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.use("/api", router);

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
