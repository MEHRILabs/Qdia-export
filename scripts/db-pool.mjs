import pg from "pg";

const { Pool } = pg;

/** Pool PostgreSQL avec SSL pour hébergeurs distants (Render, Neon, etc.). */
export function createDbPool(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error("DATABASE_URL requis");
  }
  const remote = /render\.com|neon\.tech|supabase|vercel-storage|sslmode=require/i.test(connectionString);
  const strictSsl = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true";
  return new Pool({
    connectionString,
    ...(remote ? { ssl: { rejectUnauthorized: strictSsl } } : {}),
    max: 10,
    connectionTimeoutMillis: 15_000,
  });
}

export async function testDbConnection(): Promise<boolean> {
  const pool = createDbPool();
  try {
    await pool.query("SELECT 1");
    return true;
  } catch {
    return false;
  } finally {
    await pool.end();
  }
}
