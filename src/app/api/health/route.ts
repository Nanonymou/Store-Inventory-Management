import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

// Runs a database query — Node.js runtime required.
export const runtime = "nodejs";

/**
 * GET /api/health — liveness/readiness probe. Runs a trivial query to confirm
 * the database is reachable. Public (whitelisted in the middleware). Returns 200
 * when healthy, 503 when the database cannot be reached.
 */
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return NextResponse.json({ ok: true, status: "healthy", db: "up" });
  } catch (err) {
    console.error("[api/health] database unreachable:", err);
    return NextResponse.json(
      { ok: false, status: "unhealthy", db: "down" },
      { status: 503 },
    );
  }
}
