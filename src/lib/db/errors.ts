/**
 * Classify raw database errors into actionable categories so routes can return
 * clear messages instead of a generic 500. postgres-js/Drizzle wrap the driver
 * error, so we walk a couple of `cause` levels to find the real code.
 */

function errorCode(err: unknown, depth = 0): string | undefined {
  if (depth > 4 || typeof err !== "object" || err === null) return undefined;
  const e = err as { code?: unknown; cause?: unknown };
  if (typeof e.code === "string") return e.code;
  return errorCode(e.cause, depth + 1);
}

/** A relation/table does not exist — the schema has not been migrated (42P01). */
export function isMissingRelation(err: unknown): boolean {
  return errorCode(err) === "42P01";
}

/** The database server cannot be reached (bad/absent DATABASE_URL, SSL, host). */
export function isConnectionError(err: unknown): boolean {
  const code = errorCode(err);
  return (
    code === "ECONNREFUSED" ||
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT" ||
    code === "EAI_AGAIN" ||
    code === "CONNECT_TIMEOUT" ||
    code === "ECONNRESET"
  );
}

/** Password/auth failure against the database (28P01 / 28000). */
export function isAuthError(err: unknown): boolean {
  const code = errorCode(err);
  return code === "28P01" || code === "28000";
}

/** Any error meaning "the database isn't ready to serve requests yet". */
export function isDatabaseUnavailable(err: unknown): boolean {
  return isConnectionError(err) || isMissingRelation(err) || isAuthError(err);
}

/** A short, actionable Indonesian hint for a database error. */
export function databaseHint(err: unknown): string {
  if (isMissingRelation(err)) {
    return "Skema belum dimigrasikan. Jalankan: npm run db:migrate && npm run db:seed pada database ini.";
  }
  if (isAuthError(err)) {
    return "Kredensial database salah. Periksa user/password pada DATABASE_URL.";
  }
  if (isConnectionError(err)) {
    return "Database tidak terjangkau. Periksa DATABASE_URL (pakai endpoint pooled + ?sslmode=require) lalu redeploy.";
  }
  return "Kesalahan database tidak dikenal.";
}
