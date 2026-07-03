import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const isProd = process.env.NODE_ENV === "production";
const url = process.env.DATABASE_URL ?? "";
const needsSsl = /render\.com|neon\.tech|supabase|vercel-storage|sslmode=require|dpg-/i.test(url);
const strictSsl = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true";

export const pool = new Pool({
  connectionString: url,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
  ssl: isProd || needsSsl
    ? { rejectUnauthorized: strictSsl }
    : undefined,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
export type { AiWizardStep, AiSessionStatus, AiChatMessage, AiExtractedData, AiStudioVersion, AiSession, InsertAiSession } from "./schema/ai-sessions";
export { aiSessionsTable } from "./schema/ai-sessions";
export { usersTable, otpCodesTable } from "./schema/users";
export { portsTable } from "./schema/ports";
export { customsTariffsTable } from "./schema/customs";
export { transactionsTable, fcmTokensTable, invoicesTable } from "./schema/commerce";
export {
  cartItemsTable, ordersTable, disputesTable, oemRequestsTable,
  sampleRequestsTable, supplierReviewsTable, trackingEventsTable,
} from "./schema/marketplace";
export { catalogVariantsTable } from "./schema/catalog";
