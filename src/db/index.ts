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

if (!connectionString) {
  // Surface a clear message rather than a cryptic driver error at query time.
  console.warn(
    "[db] DATABASE_URL / POSTGRES_URL is not set — database queries will fail.",
  );
}

const globalForDb = globalThis as unknown as {
  __pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__pgClient ??
  postgres(connectionString, { max: 1, prepare: false });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__pgClient = client;
}

export const db = drizzle(client, { schema });
export { schema };
