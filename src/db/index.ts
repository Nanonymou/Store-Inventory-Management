import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Drizzle database client (postgres-js driver). Reads the connection string
 * from DATABASE_URL (falls back to POSTGRES_URL, which Vercel Postgres sets).
 *
 * A single connection is reused across hot reloads in development to avoid
 * exhausting the connection pool.
 */
const connectionString =
  process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";

/**
 * Whether a connection string is configured. When false, postgres-js falls back
 * to localhost:5432 and every query fails with ECONNREFUSED — the health check
 * uses this flag to report "unconfigured" instead of that cryptic error.
 */
export const hasDatabaseUrl = connectionString !== "";

if (!hasDatabaseUrl) {
  // Surface a clear message rather than a cryptic driver error at query time.
  console.warn(
    "[db] DATABASE_URL / POSTGRES_URL is not set — database queries will fail.",
  );
}

const globalForDb = globalThis as unknown as {
  __pgClient?: ReturnType<typeof postgres>;
};

/**
 * Options tuned for serverless (Vercel + Neon/Supabase pooler):
 * - `max: 1` keeps each function instance to a single connection.
 * - `prepare: false` is required for transaction-mode poolers (PgBouncer /
 *   Supavisor / Neon pooled endpoint), which don't support prepared statements.
 * - short idle/connect timeouts release connections promptly.
 * Point the connection string at the POOLED endpoint in production.
 */
const client =
  globalForDb.__pgClient ??
  postgres(connectionString, {
    max: 1,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 15,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pgClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
