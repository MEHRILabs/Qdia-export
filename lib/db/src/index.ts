import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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
