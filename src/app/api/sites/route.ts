import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AuthorizationError, requireUser } from "@/lib/auth/rbac";
import { listSitesForUser } from "@/lib/reference/service";

// Reads the database + session — Node.js runtime required.
export const runtime = "nodejs";

/**
 * GET /api/sites — the sites the caller may see. Admin gets all 11 locations;
 * a Storeman gets only their bound site.
 */
export async function GET() {
  try {
    const user = requireUser(await getSession());
    const sites = await listSitesForUser(user);
    return NextResponse.json({ ok: true, sites });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status },
      );
    }
    console.error("[api/sites] GET failed:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan pada server." },
      { status: 500 },
    );
  }
}
