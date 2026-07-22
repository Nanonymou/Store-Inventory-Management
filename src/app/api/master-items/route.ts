import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { AuthorizationError, requireUser } from "@/lib/auth/rbac";
import { listMasterItems } from "@/lib/master-item/service";

// Reads the database + session — Node.js runtime required.
export const runtime = "nodejs";

/**
 * GET /api/master-items?section=…&q=…&includeInactive=1
 *
 * Returns the master item catalog (joined with sections), optionally filtered by
 * section and keyword. Available to any authenticated user — both Admin (catalog
 * management) and Storeman (transaction input) need to read items. By default
 * only active items are returned.
 */
export async function GET(req: Request) {
  try {
    requireUser(await getSession());
    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section") ?? undefined;
    const query = searchParams.get("q") ?? undefined;
    const activeOnly = searchParams.get("includeInactive") !== "1";

    const items = await listMasterItems({ section, query, activeOnly });
    return NextResponse.json({ ok: true, count: items.length, items });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status },
      );
    }
    console.error("[api/master-items] GET failed:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan pada server." },
      { status: 500 },
    );
  }
}
