import { defineConfig } from "drizzle-kit";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const url = process.env.DATABASE_URL;
const needsSsl = /render\.com|neon\.tech|supabase|sslmode=require/i.test(url);

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  dialect: "postgresql",
  dbCredentials: {
    url,
    ...(needsSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  },
});
