import { NextResponse } from "next/server";
import { count, sql } from "drizzle-orm";
import { db, hasDatabaseUrl } from "@/db";
import { users } from "@/db/schema";
import { databaseHint, isMissingRelation } from "@/lib/db/errors";

// Runs database queries — Node.js runtime required.
export const runtime = "nodejs";

/**
 * GET /api/health — liveness/readiness probe with a precise diagnosis so deploy
 * problems are self-explanatory. Public (whitelisted in the middleware).
 *
 * Reports, in order:
 *   - `db: "unconfigured"`  → DATABASE_URL not set (503)
 *   - `db: "down"`          → cannot connect (503)
 *   - `schema: "missing"`   → connected but tables absent → run migrations (503)
 *   - `schema: "ready"`     → all good (200), with `seeded` telling if there are
 *                             any users yet
 */
export async function GET() {
  if (!hasDatabaseUrl) {
    return NextResponse.json(
      {
        ok: false,
        status: "unhealthy",
        db: "unconfigured",
        hint: "DATABASE_URL / POSTGRES_URL belum di-set di environment ini. Set lalu redeploy.",
      },
      { status: 503 },
    );
  }

  // 1. Connectivity.
  try {
    await db.execute(sql`select 1`);
  } catch (err) {
    console.error("[api/health] database unreachable:", err);
    return NextResponse.json(
      { ok: false, status: "unhealthy", db: "down", hint: databaseHint(err) },
      { status: 503 },
    );
  }

  // 2. Schema readiness (does the core table exist?) + whether it's seeded.
  try {
    const [{ n }] = await db.select({ n: count() }).from(users);
    return NextResponse.json({
      ok: true,
      status: "healthy",
      db: "up",
      schema: "ready",
      seeded: n > 0,
    });
  } catch (err) {
    if (isMissingRelation(err)) {
      return NextResponse.json(
        {
          ok: false,
          status: "unhealthy",
          db: "up",
          schema: "missing",
          hint: "Tabel belum ada. Jalankan: npm run db:migrate && npm run db:seed pada database ini.",
        },
        { status: 503 },
      );
    }
    console.error("[api/health] schema check failed:", err);
    return NextResponse.json(
      {
        ok: false,
        status: "unhealthy",
        db: "up",
        schema: "unknown",
        hint: databaseHint(err),
      },
      { status: 503 },
    );
  }
}
