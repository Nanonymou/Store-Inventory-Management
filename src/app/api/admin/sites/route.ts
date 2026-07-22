import { NextResponse } from "next/server";
import { AuthorizationError } from "@/lib/auth/rbac";
import { requireAdminApi } from "@/lib/auth/api-guard";
import { listAllSitesWithStats } from "@/lib/reference/service";

// Reads the database + session — Node.js runtime required.
export const runtime = "nodejs";

/**
 * GET /api/admin/sites — Admin-only management list of all 11 sites, each with
 * the count of users assigned to it. A non-Admin request is denied (403) and
 * audited.
 */
export async function GET() {
  try {
    await requireAdminApi("admin_sites:list");
    const sites = await listAllSitesWithStats();
    return NextResponse.json({ ok: true, count: sites.length, sites });
  } catch (err) {
    if (err instanceof AuthorizationError) {
      return NextResponse.json(
        { ok: false, error: err.message },
        { status: err.status },
      );
    }
    console.error("[api/admin/sites] GET failed:", err);
    return NextResponse.json(
      { ok: false, error: "Terjadi kesalahan pada server." },
      { status: 500 },
    );
  }
}
